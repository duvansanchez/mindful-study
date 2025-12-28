import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { DatabaseCard } from "@/components/DatabaseCard";
import { GroupCard } from "@/components/GroupCard";
import { StatsView } from "@/components/StatsView";
import { ReviewSetup } from "@/components/ReviewSetup";
import { FlashcardReview } from "@/components/FlashcardReview";
import { OverviewMode } from "@/components/OverviewMode";
import { ModeSelection } from "@/components/ModeSelection";
import { NotionSetup } from "@/components/NotionSetup";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { EditGroupDialog } from "@/components/EditGroupDialog";
import { DeleteGroupDialog } from "@/components/DeleteGroupDialog";
import { useNotionDatabases, useNotionFlashcards, useNotionConnection, useNotionStats, useUpdateFlashcardState, useUpdateFlashcardReviewDate } from "@/hooks/useNotion";
import { useGroups } from "@/hooks/useGroups";
import { useRecordStudySession } from "@/hooks/useStudyTracking";
import { KnowledgeState, Flashcard, DatabaseGroup } from "@/types";
import { Plus, BarChart3, ArrowLeft, AlertCircle, Loader2, Wifi, WifiOff, Folder } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type View = 'home' | 'stats' | 'mode-selection' | 'review-setup' | 'review' | 'overview' | 'group-stats' | 'notion-setup';

const Index = () => {
  const [view, setView] = useState<View>('home');
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<DatabaseGroup | null>(null);
  const [reviewCards, setReviewCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [databaseCounts, setDatabaseCounts] = useState<Record<string, number>>({});
  const [studyStartTime, setStudyStartTime] = useState<Date | null>(null);
  
  // Estados para los diálogos de agrupaciones
  const [editingGroup, setEditingGroup] = useState<DatabaseGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<DatabaseGroup | null>(null);

  // Notion hooks - Solo cargar bases de datos cuando sea necesario
  const { data: databases = [], isLoading: databasesLoading } = useNotionDatabases(
    // Solo cargar bases de datos cuando estemos en vista de grupo, estadísticas o necesitemos los datos
    view === 'group-stats' || view === 'stats' || selectedDatabaseId !== null
  );
  const { data: flashcards = [] } = useNotionFlashcards(selectedDatabaseId);
  const { data: isConnected = false, isLoading: connectionLoading } = useNotionConnection();
  const updateFlashcardMutation = useUpdateFlashcardState();
  const updateReviewDateMutation = useUpdateFlashcardReviewDate();
  const recordStudySession = useRecordStudySession();

  // Groups hooks
  const { data: groups = [], isLoading: groupsLoading } = useGroups();

  // Update database count when flashcards are loaded
  useEffect(() => {
    if (selectedDatabaseId && flashcards.length > 0) {
      setDatabaseCounts(prev => ({
        ...prev,
        [selectedDatabaseId]: flashcards.length
      }));
    }
  }, [selectedDatabaseId, flashcards.length]);

  // Calculate stats with real flashcard data
  const flashcardsStats = useNotionStats(flashcards);
  const reviewSetupStats = useNotionStats(flashcards);

  const selectedDatabase = databases.find(db => db.id === selectedDatabaseId);

  const handleDatabaseClick = (databaseId: string) => {
    setSelectedDatabaseId(databaseId);
    setView('mode-selection');
  };

  const handleStartActiveReview = () => {
    setView('review-setup');
  };

  const handleStartOverviewMode = () => {
    setView('overview');
  };

  const handleStartReview = (selectedCards: Flashcard[]) => {
    setReviewCards(selectedCards);
    setCurrentCardIndex(0);
    setStudyStartTime(new Date()); // Iniciar tracking de tiempo
    setView('review');
  };

  const handleStateChange = async (newState: KnowledgeState) => {
    const currentCard = reviewCards[currentCardIndex];
    const previousState = currentCard.state;
    
    // Registrar tiempo de inicio si no existe
    if (!studyStartTime) {
      setStudyStartTime(new Date());
    }
    
    try {
      const result = await updateFlashcardMutation.mutateAsync({
        flashcardId: currentCard.id,
        newState,
      });
      
      // Update local state only if successful
      if (result.success) {
        setReviewCards(prev => prev.map(c => 
          c.id === currentCard.id ? { ...c, state: newState } : c
        ));

        // Solo registrar el cambio de estado si es diferente
        if (previousState !== newState) {
          const studyDuration = studyStartTime 
            ? Math.floor((new Date().getTime() - studyStartTime.getTime()) / 1000)
            : 0;

          // Encontrar el grupo al que pertenece esta base de datos
          const currentGroup = groups.find(group => 
            group.databaseIds.includes(currentCard.databaseId)
          );

          console.log('📊 Registrando cambio de estado:', {
            flashcardId: currentCard.id,
            databaseId: currentCard.databaseId,
            groupId: currentGroup?.id,
            previousState,
            newState,
            studyDurationSeconds: studyDuration,
          });

          recordStudySession.mutate({
            flashcardId: currentCard.id,
            databaseId: currentCard.databaseId,
            groupId: currentGroup?.id,
            previousState,
            newState,
            studyDurationSeconds: studyDuration,
          });
        }
      }
      
      // Retornar el resultado completo incluyendo mensajes de error
      return { 
        success: result.success, 
        updated: result.updated,
        dominioMessage: result.dominioMessage 
      };
    } catch (error) {
      console.error('Error updating flashcard state:', error);
      return { success: false };
    }
  };

  const handleNextCard = async () => {
    // Actualizar fecha de repaso de la tarjeta actual antes de pasar a la siguiente
    const currentCard = reviewCards[currentCardIndex];
    if (currentCard) {
      try {
        console.log('📅 Actualizando fecha de repaso al pasar a siguiente tarjeta:', currentCard.id);
        await updateReviewDateMutation.mutateAsync(currentCard.id);

        // Registrar sesión de estudio AQUÍ - cada vez que pasas una flashcard
        const studyDuration = studyStartTime 
          ? Math.floor((new Date().getTime() - studyStartTime.getTime()) / 1000)
          : 0;

        // Encontrar el grupo al que pertenece esta base de datos
        const currentGroup = groups.find(group => 
          group.databaseIds.includes(currentCard.databaseId)
        );

        console.log('📊 Registrando sesión de estudio al pasar flashcard:', {
          flashcardId: currentCard.id,
          databaseId: currentCard.databaseId,
          groupId: currentGroup?.id,
          previousState: currentCard.state, // El estado actual (puede haber cambiado)
          newState: currentCard.state, // Mismo estado (solo estamos pasando la tarjeta)
          studyDurationSeconds: studyDuration,
        });

        recordStudySession.mutate({
          flashcardId: currentCard.id,
          databaseId: currentCard.databaseId,
          groupId: currentGroup?.id,
          previousState: currentCard.state,
          newState: currentCard.state, // Mismo estado, solo registramos que se estudió
          studyDurationSeconds: studyDuration,
        });

      } catch (error) {
        console.error('Error updating review date:', error);
        // No bloquear el flujo si falla la actualización de fecha
      }
    }
    
    // Pasar a la siguiente tarjeta o terminar el repaso
    if (currentCardIndex < reviewCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setStudyStartTime(new Date()); // Reiniciar tiempo para la nueva tarjeta
    } else {
      // Es la última tarjeta, terminar el repaso
      setView('home');
      setSelectedDatabaseId(null);
      setStudyStartTime(null);
    }
  };

  const handlePreviousCard = () => {
    // Ir a la tarjeta anterior si no estamos en la primera
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
    }
  };

  const handleCloseReview = () => {
    // Registrar la tarjeta actual antes de cerrar si hay una
    const currentCard = reviewCards[currentCardIndex];
    if (currentCard && studyStartTime) {
      const studyDuration = Math.floor((new Date().getTime() - studyStartTime.getTime()) / 1000);
      const currentGroup = groups.find(group => 
        group.databaseIds.includes(currentCard.databaseId)
      );

      console.log('📊 Registrando sesión de estudio al cerrar repaso:', {
        flashcardId: currentCard.id,
        databaseId: currentCard.databaseId,
        groupId: currentGroup?.id,
        previousState: currentCard.state,
        newState: currentCard.state,
        studyDurationSeconds: studyDuration,
      });

      recordStudySession.mutate({
        flashcardId: currentCard.id,
        databaseId: currentCard.databaseId,
        groupId: currentGroup?.id,
        previousState: currentCard.state,
        newState: currentCard.state,
        studyDurationSeconds: studyDuration,
      });
    }

    setView('home');
    setSelectedDatabaseId(null);
    setReviewCards([]);
    setCurrentCardIndex(0);
    setStudyStartTime(null);
  };

  const handleCloseModeSelection = () => {
    setView('home');
    setSelectedDatabaseId(null);
  };

  const handleCloseOverview = () => {
    setView('home');
    setSelectedDatabaseId(null);
  };

  const handleGroupClick = (group: DatabaseGroup) => {
    setSelectedGroup(group);
    setView('group-stats');
  };

  // Show setup if no token is configured
  if (!import.meta.env.VITE_NOTION_TOKEN) {
    if (view === 'notion-setup') {
      return <NotionSetup onComplete={() => setView('home')} />;
    }
    
    return (
      <div className="min-h-screen bg-background">
        <Header 
          title="NotionStudy" 
          subtitle="Mindful Learning"
        />
        <main className="container max-w-4xl py-8 px-6">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Para usar esta aplicación necesitas configurar tu integración con Notion.
              <button 
                onClick={() => setView('notion-setup')}
                className="ml-2 underline hover:no-underline"
              >
                Configurar ahora
              </button>
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  // Show connection status
  if (connectionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Conectando con Notion...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Header 
          title="NotionStudy" 
          subtitle="Mindful Learning"
        />
        <main className="container max-w-4xl py-8 px-6">
          <Alert className="mb-6">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              No se pudo conectar con Notion. Verifica tu token de integración en el archivo .env
              <br />
              <span className="text-sm text-muted-foreground mt-2 block">
                Necesitas configurar VITE_NOTION_TOKEN con tu token de integración de Notion.
              </span>
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="NotionStudy" 
        subtitle="Mindful Learning"
      />

      <main className="container max-w-4xl py-8 px-6">
        {view === 'home' && (
          <div className="space-y-8 animate-fade-in">
            {/* Connection Status */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wifi className="w-4 h-4 text-green-500" />
              Conectado a Notion
            </div>

            {/* Quick Actions */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-foreground">Acciones rápidas</h2>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setView('stats')}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <BarChart3 className="w-4 h-4" />
                  Ver estadísticas
                </button>
              </div>
            </section>

            {/* Database Groups */}
            {(groups.length > 0 || !groupsLoading) && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-foreground">Agrupaciones de estudio</h2>
                  <CreateGroupDialog />
                </div>
                
                {groupsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Cargando agrupaciones...</span>
                  </div>
                ) : groups.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groups.map(group => {
                      // Para mostrar las tarjetas de grupo sin cargar estadísticas pesadas
                      return (
                        <GroupCard
                          key={group.id}
                          group={group}
                          databases={[]} // Las bases de datos se cargarán cuando se haga clic en el grupo
                          onClick={() => handleGroupClick(group)}
                          onEdit={setEditingGroup}
                          onDelete={setDeletingGroup}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Organiza tus bases de datos</h3>
                    <p className="mb-4 max-w-md mx-auto">
                      Crea agrupaciones para organizar tus bases de datos de Notion por temas o proyectos.
                    </p>
                    <CreateGroupDialog>
                      <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                        <Plus className="w-4 h-4" />
                        Crear primera agrupación
                      </button>
                    </CreateGroupDialog>
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {view === 'stats' && (
          <StatsView onBack={() => setView('home')} />
        )}

        {view === 'group-stats' && selectedGroup && (
          <div className="space-y-6 animate-fade-in">
            <button 
              onClick={() => {
                setView('home');
                setSelectedGroup(null);
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
            
            {/* Título del grupo */}
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${selectedGroup.color}20` }}
              >
                <Folder className="w-6 h-6" style={{ color: selectedGroup.color }} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">{selectedGroup.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {databases.filter(db => selectedGroup.databaseIds.includes(db.id)).length} bases de datos
                </p>
              </div>
            </div>

            {/* Bases de datos del grupo */}
            <section>
              <h3 className="text-lg font-medium text-foreground mb-4">Bases de datos</h3>
              {databases.filter(db => selectedGroup.databaseIds.includes(db.id)).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {databases
                    .filter(db => selectedGroup.databaseIds.includes(db.id))
                    .map(database => {
                      const actualCount = databaseCounts[database.id] ?? database.cardCount;
                      const databaseWithCount = { ...database, cardCount: actualCount };
                      
                      return (
                        <DatabaseCard
                          key={database.id}
                          database={databaseWithCount}
                          onClick={() => handleDatabaseClick(database.id)}
                        />
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Esta agrupación no tiene bases de datos asociadas.</p>
                  <button 
                    onClick={() => setEditingGroup(selectedGroup)}
                    className="mt-2 text-primary hover:underline"
                  >
                    Agregar bases de datos
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Mode Selection Modal */}
      {view === 'mode-selection' && selectedDatabase && (
        <ModeSelection
          stats={flashcardsStats}
          databaseName={selectedDatabase.name}
          onStartActiveReview={handleStartActiveReview}
          onStartOverviewMode={handleStartOverviewMode}
          onCancel={handleCloseModeSelection}
        />
      )}

      {/* Overview Mode */}
      {view === 'overview' && selectedDatabase && (
        <OverviewMode
          flashcards={flashcards}
          databaseName={selectedDatabase.name}
          databaseId={selectedDatabase.id}
          onClose={handleCloseOverview}
        />
      )}

      {/* Review Setup Modal */}
      {view === 'review-setup' && selectedDatabase && (
        <ReviewSetup
          stats={reviewSetupStats}
          databaseName={selectedDatabase.name}
          databaseId={selectedDatabase.id}
          flashcards={flashcards}
          onStart={handleStartReview}
          onCancel={() => {
            setView('mode-selection');
          }}
        />
      )}

      {/* Review Mode */}
      {view === 'review' && reviewCards.length > 0 && (
        <FlashcardReview
          card={reviewCards[currentCardIndex]}
          onStateChange={handleStateChange}
          onNext={handleNextCard}
          onPrevious={handlePreviousCard}
          onClose={handleCloseReview}
          currentIndex={currentCardIndex}
          totalCards={reviewCards.length}
        />
      )}

      {/* Diálogos para editar y eliminar agrupaciones */}
      <EditGroupDialog
        group={editingGroup}
        open={!!editingGroup}
        onOpenChange={(open) => !open && setEditingGroup(null)}
      />
      
      <DeleteGroupDialog
        group={deletingGroup}
        open={!!deletingGroup}
        onOpenChange={(open) => !open && setDeletingGroup(null)}
      />
    </div>
  );
};

export default Index;
