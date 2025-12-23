import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { DatabaseCard } from "@/components/DatabaseCard";
import { GroupCard } from "@/components/GroupCard";
import { StatsOverview } from "@/components/StatsOverview";
import { DetailedStatsCard } from "@/components/DetailedStatsCard";
import { ReviewSetup } from "@/components/ReviewSetup";
import { FlashcardReview } from "@/components/FlashcardReview";
import { OverviewMode } from "@/components/OverviewMode";
import { ModeSelection } from "@/components/ModeSelection";
import { NotionSetup } from "@/components/NotionSetup";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { EditGroupDialog } from "@/components/EditGroupDialog";
import { DeleteGroupDialog } from "@/components/DeleteGroupDialog";
import { useNotionDatabases, useNotionFlashcards, useNotionConnection, useNotionStats, useFilteredFlashcards, useUpdateFlashcardState, useUpdateFlashcardReviewDate } from "@/hooks/useNotion";
import { useGroups } from "@/hooks/useGroups";
import { KnowledgeState, Flashcard, DatabaseGroup, Statistics } from "@/types";
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
  
  // Estados para los diálogos de agrupaciones
  const [editingGroup, setEditingGroup] = useState<DatabaseGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<DatabaseGroup | null>(null);

  // Notion hooks
  const { data: databases = [], isLoading: databasesLoading, error: databasesError } = useNotionDatabases();
  const { data: flashcards = [], isLoading: flashcardsLoading } = useNotionFlashcards(selectedDatabaseId);
  const { data: isConnected = false, isLoading: connectionLoading } = useNotionConnection();
  const updateFlashcardMutation = useUpdateFlashcardState();
  const updateReviewDateMutation = useUpdateFlashcardReviewDate();

  // Groups hooks
  const { data: groups = [], isLoading: groupsLoading } = useGroups();

  // Componente para la vista de estadísticas del grupo
  const GroupStatsView = ({ selectedGroup, databases, databaseCounts, onBack, onEditGroup, onDatabaseClick }) => {
    // Obtener estadísticas reales de las bases de datos del grupo
    const [groupStats, setGroupStats] = useState({ tocado: 0, verde: 0, solido: 0, total: 0 });
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    useEffect(() => {
      const loadGroupStats = async () => {
        if (!selectedGroup.databaseIds || selectedGroup.databaseIds.length === 0) {
          setGroupStats({ tocado: 0, verde: 0, solido: 0, total: 0 });
          setIsLoadingStats(false);
          return;
        }

        setIsLoadingStats(true);
        try {
          const totalStats = { tocado: 0, verde: 0, solido: 0, total: 0 };
          
          // Obtener estadísticas de cada base de datos del grupo
          for (const dbId of selectedGroup.databaseIds) {
            try {
              const response = await fetch(`/api/notion/databases/${dbId}/flashcards`);
              if (response.ok) {
                const flashcards = await response.json();
                
                flashcards.forEach(card => {
                  totalStats.total++;
                  switch (card.state?.toLowerCase()) {
                    case 'tocado':
                      totalStats.tocado++;
                      break;
                    case 'verde':
                      totalStats.verde++;
                      break;
                    case 'sólido':
                    case 'solido':
                      totalStats.solido++;
                      break;
                  }
                });
              }
            } catch (error) {
              console.error(`Error loading stats for database ${dbId}:`, error);
            }
          }
          
          setGroupStats(totalStats);
        } catch (error) {
          console.error('Error loading group stats:', error);
        } finally {
          setIsLoadingStats(false);
        }
      };

      loadGroupStats();
    }, [selectedGroup.databaseIds]);
    
    return (
      <div className="space-y-6 animate-fade-in">
        <button 
          onClick={onBack}
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

        {/* Estadísticas generales del grupo */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-foreground">Estadísticas del grupo</h3>
          <button
            onClick={() => {
              setIsLoadingStats(true);
              // Trigger reload by changing the key
              const loadGroupStats = async () => {
                if (!selectedGroup.databaseIds || selectedGroup.databaseIds.length === 0) {
                  setGroupStats({ tocado: 0, verde: 0, solido: 0, total: 0 });
                  setIsLoadingStats(false);
                  return;
                }

                try {
                  const totalStats = { tocado: 0, verde: 0, solido: 0, total: 0 };
                  
                  for (const dbId of selectedGroup.databaseIds) {
                    try {
                      const response = await fetch(`/api/notion/databases/${dbId}/flashcards`);
                      if (response.ok) {
                        const flashcards = await response.json();
                        
                        flashcards.forEach(card => {
                          totalStats.total++;
                          switch (card.state?.toLowerCase()) {
                            case 'tocado':
                              totalStats.tocado++;
                              break;
                            case 'verde':
                              totalStats.verde++;
                              break;
                            case 'sólido':
                            case 'solido':
                              totalStats.solido++;
                              break;
                          }
                        });
                      }
                    } catch (error) {
                      console.error(`Error loading stats for database ${dbId}:`, error);
                    }
                  }
                  
                  setGroupStats(totalStats);
                } catch (error) {
                  console.error('Error loading group stats:', error);
                } finally {
                  setIsLoadingStats(false);
                }
              };
              loadGroupStats();
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            disabled={isLoadingStats}
          >
            {isLoadingStats ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
        
        {isLoadingStats ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Sincronizando estadísticas...</span>
          </div>
        ) : (
          <StatsOverview stats={groupStats} />
        )}

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
                      onClick={() => onDatabaseClick(database.id)}
                    />
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Esta agrupación no tiene bases de datos asociadas.</p>
              <button 
                onClick={() => onEditGroup(selectedGroup)}
                className="mt-2 text-primary hover:underline"
              >
                Agregar bases de datos
              </button>
            </div>
          )}
        </section>
      </div>
    );
  };

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
  const overallStats = flashcardsStats;

  const selectedDatabase = databases.find(db => db.id === selectedDatabaseId);

  const handleDatabaseClick = (databaseId: string) => {
    setSelectedDatabaseId(databaseId);
    setView('mode-selection');
  };

  const handleStartActiveReview = (selectedStates: KnowledgeState[]) => {
    setView('review-setup');
  };

  const handleStartOverviewMode = () => {
    setView('overview');
  };

  const handleStartReview = (selectedStates: KnowledgeState[]) => {
    const filteredCards = flashcards
      .filter(card => selectedStates.includes(card.state))
      .sort((a, b) => {
        // Ordenar por "menos visto primero"
        if (a.viewCount !== b.viewCount) {
          return a.viewCount - b.viewCount;
        }
        // Si tienen el mismo viewCount, ordenar por última revisión (más antiguo primero)
        if (!a.lastReviewed && !b.lastReviewed) return 0;
        if (!a.lastReviewed) return -1;
        if (!b.lastReviewed) return 1;
        return a.lastReviewed.getTime() - b.lastReviewed.getTime();
      });
    
    setReviewCards(filteredCards);
    setCurrentCardIndex(0);
    setView('review');
  };

  const handleStateChange = async (newState: KnowledgeState) => {
    const currentCard = reviewCards[currentCardIndex];
    
    try {
      const result = await updateFlashcardMutation.mutateAsync({
        flashcardId: currentCard.id,
        newState,
      });
      
      // Update local state
      setReviewCards(prev => prev.map(c => 
        c.id === currentCard.id ? { ...c, state: newState } : c
      ));
      
      // Retornar solo el resultado del cambio de estado (sin mensaje de fecha)
      return { success: result.success, updated: result.updated };
    } catch (error) {
      console.error('Error updating flashcard state:', error);
      throw error;
    }
  };

  const handleNextCard = async () => {
    // Actualizar fecha de repaso de la tarjeta actual antes de pasar a la siguiente
    const currentCard = reviewCards[currentCardIndex];
    if (currentCard) {
      try {
        console.log('📅 Actualizando fecha de repaso al pasar a siguiente tarjeta:', currentCard.id);
        await updateReviewDateMutation.mutateAsync(currentCard.id);
      } catch (error) {
        console.error('Error updating review date:', error);
        // No bloquear el flujo si falla la actualización de fecha
      }
    }
    
    // Pasar a la siguiente tarjeta o terminar el repaso
    if (currentCardIndex < reviewCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
    } else {
      setView('home');
      setSelectedDatabaseId(null);
    }
  };

  const handleCloseReview = () => {
    setView('home');
    setSelectedDatabaseId(null);
    setReviewCards([]);
    setCurrentCardIndex(0);
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

  // Helper functions for stats
  const getStatsForDatabase = (databaseId: string): Statistics => {
    // In a real implementation, you'd fetch flashcards for this database
    return { tocado: 0, verde: 0, solido: 0, total: 0 };
  };

  const getStatsForGroup = (databaseIds: string[]): Statistics => {
    // Calcular estadísticas combinadas de todas las bases de datos del grupo
    const totalStats = { tocado: 0, verde: 0, solido: 0, total: 0 };
    
    // Por ahora, usar datos mock basados en las bases de datos conocidas
    // En una implementación real, necesitarías obtener las flashcards de cada base de datos
    const mockStatsPerDatabase = {
      '2c576585-c8ed-8120-961b-e9ad0498e162': { tocado: 5, verde: 8, solido: 4, total: 17 }, // Conceptos - Terminos
      '2c576585-c8ed-8134-9eff-e346521d15e5': { tocado: 1, verde: 1, solido: 0, total: 2 },   // Artículos
      '2c576585-c8ed-8161-8637-dd175fe3e2ba': { tocado: 3, verde: 4, solido: 2, total: 9 }    // Conocimiento
    };
    
    databaseIds.forEach(dbId => {
      const dbStats = mockStatsPerDatabase[dbId];
      if (dbStats) {
        totalStats.tocado += dbStats.tocado;
        totalStats.verde += dbStats.verde;
        totalStats.solido += dbStats.solido;
        totalStats.total += dbStats.total;
      }
    });
    
    return totalStats;
  };

  const getLastReviewedForGroup = (databaseIds: string[]): Date | null => {
    // Mock: simular última revisión hace algunos días
    if (databaseIds.length > 0) {
      return new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Últimos 7 días
    }
    return null;
  };

  const getReviewedThisWeekForGroup = (databaseIds: string[]): number => {
    // Mock: simular tarjetas revisadas esta semana
    return Math.floor(Math.random() * 20) + 5; // Entre 5 y 25 tarjetas
  };

  // Show setup if no token is configured
  if (!import.meta.env.VITE_NOTION_TOKEN) {
    if (view === 'notion-setup') {
      return <NotionSetup onComplete={() => setView('home')} />;
    }
    
    return (
      <div className="min-h-screen bg-background">
        <Header 
          title="Knowledge Base" 
          subtitle="Gestiona tu conocimiento"
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
          title="Knowledge Base" 
          subtitle="Gestiona tu conocimiento"
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
        title="Knowledge Base" 
        subtitle="Gestiona tu conocimiento"
      />

      <main className="container max-w-4xl py-8 px-6">
        {view === 'home' && (
          <div className="space-y-8 animate-fade-in">
            {/* Connection Status */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wifi className="w-4 h-4 text-green-500" />
              Conectado a Notion
            </div>

            {/* Overall Stats */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-foreground">Estado general</h2>
                <button 
                  onClick={() => setView('stats')}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <BarChart3 className="w-4 h-4" />
                  Ver detalle
                </button>
              </div>
              <StatsOverview stats={overallStats} />
            </section>

            {/* Database Groups */}
            {(groups.length > 0 || !groupsLoading) && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-foreground">Agrupaciones</h2>
                  <CreateGroupDialog />
                </div>
                
                {/* Solo mostrar grupos si las bases de datos ya se cargaron */}
                {!databasesLoading && databases.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groups.map(group => {
                      const groupDatabases = databases.filter(db => group.databaseIds.includes(db.id));
                      return (
                        <GroupCard
                          key={group.id}
                          group={group}
                          databases={groupDatabases}
                          onClick={() => handleGroupClick(group)}
                          onEdit={setEditingGroup}
                          onDelete={setDeletingGroup}
                        />
                      );
                    })}
                    {groups.length === 0 && !groupsLoading && (
                      <div className="col-span-full text-center py-8 text-muted-foreground">
                        <p className="mb-4">No tienes agrupaciones personalizadas aún</p>
                        <CreateGroupDialog>
                          <button className="text-primary hover:underline">
                            Crear tu primera agrupación
                          </button>
                        </CreateGroupDialog>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Cargando agrupaciones...</span>
                  </div>
                )}
              </section>
            )}

            {/* Databases */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-foreground">Bases de datos</h2>
                <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="w-4 h-4" />
                  Conectar
                </button>
              </div>
              
              {databasesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Cargando bases de datos...</span>
                </div>
              ) : databasesError ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Error al cargar las bases de datos: {databasesError.message}
                  </AlertDescription>
                </Alert>
              ) : databases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No se encontraron bases de datos en Notion.</p>
                  <p className="text-sm mt-2">Asegúrate de que tu integración tenga acceso a las bases de datos.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {databases.map(database => {
                    // Usar el conteo cacheado si está disponible, sino el del servidor
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
              )}
            </section>
          </div>
        )}

        {view === 'stats' && (
          <div className="space-y-6 animate-fade-in">
            <button 
              onClick={() => setView('home')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Volver
            </button>
            
            <h2 className="text-xl font-semibold text-foreground">Estadísticas detalladas</h2>
            
            <StatsOverview stats={overallStats} title="Vista general" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {databases.map(database => (
                <div key={database.id} className="p-4 rounded-lg bg-card border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{database.icon}</span>
                    <h3 className="font-medium text-foreground">{database.name}</h3>
                  </div>
                  <StatsOverview stats={getStatsForDatabase(database.id)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'group-stats' && selectedGroup && (
          <GroupStatsView 
            selectedGroup={selectedGroup}
            databases={databases}
            databaseCounts={databaseCounts}
            onBack={() => {
              setView('home');
              setSelectedGroup(null);
            }}
            onEditGroup={setEditingGroup}
            onDatabaseClick={handleDatabaseClick}
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
          onClose={handleCloseOverview}
        />
      )}

      {/* Review Setup Modal */}
      {view === 'review-setup' && selectedDatabase && (
        <ReviewSetup
          stats={reviewSetupStats}
          databaseName={selectedDatabase.name}
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
