import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { HomeView } from "@/components/HomeView";
import { GroupsView } from "@/components/GroupsView";
import { GroupDetailView } from "@/components/GroupDetailView";
import { StatsView } from "@/components/StatsView";
import { ReviewSetup } from "@/components/ReviewSetup";
import { FlashcardReview } from "@/components/FlashcardReview";
import { OverviewMode } from "@/components/OverviewMode";
import { ModeSelection } from "@/components/ModeSelection";
import { NotionSetup } from "@/components/NotionSetup";
import { EditGroupDialog } from "@/components/EditGroupDialog";
import { DeleteGroupDialog } from "@/components/DeleteGroupDialog";
import { useNotionDatabases, useNotionFlashcards, useNotionConnection, useNotionStats, useUpdateFlashcardState, useUpdateFlashcardReviewDate } from "@/hooks/useNotion";
import { useGroups } from "@/hooks/useGroups";
import { useRecordStudySession } from "@/hooks/useStudyTracking";
import { KnowledgeState, Flashcard, DatabaseGroup } from "@/types";
import { AlertCircle, Loader2, WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type View = 'home' | 'groups' | 'stats' | 'settings' | 'group-detail' | 'mode-selection' | 'review-setup' | 'review' | 'overview' | 'notion-setup';

const Index = () => {
  const [view, setView] = useState<View>('home');
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<DatabaseGroup | null>(null);
  const [reviewCards, setReviewCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [databaseCounts, setDatabaseCounts] = useState<Record<string, number>>({});
  const [studyStartTime, setStudyStartTime] = useState<Date | null>(null);
  const [previousView, setPreviousView] = useState<View>('home'); // Para recordar de dónde venía
  
  // Estados para los diálogos de agrupaciones
  const [editingGroup, setEditingGroup] = useState<DatabaseGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<DatabaseGroup | null>(null);

  // Notion hooks - Solo cargar bases de datos cuando sea necesario
  const { data: databases = [], isLoading: databasesLoading } = useNotionDatabases(
    // Solo cargar bases de datos cuando estemos en vista de grupo, estadísticas o necesitemos los datos
    view === 'group-detail' || view === 'stats' || selectedDatabaseId !== null
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

  // Navigation handler
  const handleNavigate = (newView: string) => {
    switch (newView) {
      case 'home':
        setView('home');
        setSelectedGroup(null);
        setSelectedDatabaseId(null);
        break;
      case 'groups':
        setView('groups');
        break;
      case 'stats':
        setView('stats');
        break;
      case 'settings':
        // Por ahora, solo mostrar un mensaje
        alert('Configuración estará disponible próximamente');
        break;
      default:
        setView(newView as View);
    }
  };

  const handleGroupClick = (group: DatabaseGroup) => {
    setSelectedGroup(group);
    setView('group-detail');
  };

  const handleBackToHome = () => {
    setView('home');
    setSelectedGroup(null);
    setSelectedDatabaseId(null);
  };

  const handleDatabaseClick = (databaseId: string) => {
    setSelectedDatabaseId(databaseId);
    setPreviousView(view); // Recordar de dónde venía
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

    // Regresar a la vista anterior
    setView(previousView);
    setSelectedDatabaseId(null);
    setReviewCards([]);
    setCurrentCardIndex(0);
    setStudyStartTime(null);
  };

  const handleCloseModeSelection = () => {
    // Regresar a la vista anterior
    setView(previousView);
    setSelectedDatabaseId(null);
  };

  const handleCloseOverview = () => {
    // Regresar a la vista anterior
    setView(previousView);
    setSelectedDatabaseId(null);
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
        currentView={view}
        onNavigate={handleNavigate}
      />

      <main className="container max-w-6xl py-8 px-6">
        {view === 'home' && (
          <HomeView />
        )}

        {view === 'groups' && (
          <GroupsView
            groups={groups}
            groupsLoading={groupsLoading}
            onGroupClick={handleGroupClick}
            onEditGroup={setEditingGroup}
            onDeleteGroup={setDeletingGroup}
          />
        )}

        {view === 'stats' && (
          <StatsView onBack={handleBackToHome} />
        )}

        {view === 'group-detail' && selectedGroup && (
          <GroupDetailView
            group={selectedGroup}
            databases={databases}
            databasesLoading={databasesLoading}
            onBack={() => setView('groups')}
            onDatabaseClick={handleDatabaseClick}
            onEditGroup={setEditingGroup}
            databaseCounts={databaseCounts}
          />
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