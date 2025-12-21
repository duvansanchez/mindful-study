import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { DatabaseCard } from "@/components/DatabaseCard";
import { GroupCard } from "@/components/GroupCard";
import { StatsOverview } from "@/components/StatsOverview";
import { DetailedStatsCard } from "@/components/DetailedStatsCard";
import { ReviewSetup } from "@/components/ReviewSetup";
import { FlashcardReview } from "@/components/FlashcardReview";
import { NotionSetup } from "@/components/NotionSetup";
import { useNotionDatabases, useNotionFlashcards, useNotionConnection, useNotionStats, useFilteredFlashcards, useUpdateFlashcardState } from "@/hooks/useNotion";
import { mockGroups } from "@/data/mockData";
import { KnowledgeState, Flashcard, DatabaseGroup, Statistics } from "@/types";
import { Plus, BarChart3, ArrowLeft, AlertCircle, Loader2, Wifi, WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type View = 'home' | 'stats' | 'review-setup' | 'review' | 'group-stats' | 'notion-setup';

const Index = () => {
  const [view, setView] = useState<View>('home');
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<DatabaseGroup | null>(null);
  const [reviewCards, setReviewCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [databaseCounts, setDatabaseCounts] = useState<Record<string, number>>({});

  // Notion hooks
  const { data: databases = [], isLoading: databasesLoading, error: databasesError } = useNotionDatabases();
  const { data: flashcards = [], isLoading: flashcardsLoading } = useNotionFlashcards(selectedDatabaseId);
  const { data: isConnected = false, isLoading: connectionLoading } = useNotionConnection();
  const updateFlashcardMutation = useUpdateFlashcardState();

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
  const overallStats = flashcardsStats;

  const selectedDatabase = databases.find(db => db.id === selectedDatabaseId);

  const handleDatabaseClick = (databaseId: string) => {
    setSelectedDatabaseId(databaseId);
    setView('review-setup');
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
      await updateFlashcardMutation.mutateAsync({
        flashcardId: currentCard.id,
        newState,
      });
      
      // Update local state
      setReviewCards(prev => prev.map(c => 
        c.id === currentCard.id ? { ...c, state: newState } : c
      ));
    } catch (error) {
      console.error('Error updating flashcard state:', error);
    }
  };

  const handleAddReviewNote = (note: string) => {
    const currentCard = reviewCards[currentCardIndex];
    const newNote = {
      id: `note-${Date.now()}`,
      content: note,
      createdAt: new Date(),
    };
    
    // Update local state (in a real app, you'd also sync this to Notion)
    setReviewCards(prev => prev.map(c => 
      c.id === currentCard.id 
        ? { ...c, reviewNotes: [...c.reviewNotes, newNote] } 
        : c
    ));
  };

  const handleNextCard = () => {
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
    // In a real implementation, you'd fetch flashcards for these databases
    return { tocado: 0, verde: 0, solido: 0, total: 0 };
  };

  const getLastReviewedForGroup = (databaseIds: string[]): Date | null => {
    return null;
  };

  const getReviewedThisWeekForGroup = (databaseIds: string[]): number => {
    return 0;
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
            {mockGroups.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-foreground">Agrupaciones</h2>
                  <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Plus className="w-4 h-4" />
                    Nueva
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mockGroups.map(group => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      databases={databases.filter(db => group.databaseIds.includes(db.id))}
                      onClick={() => handleGroupClick(group)}
                    />
                  ))}
                </div>
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
            
            <DetailedStatsCard
              title={selectedGroup.name}
              stats={getStatsForGroup(selectedGroup.databaseIds)}
              lastReviewed={getLastReviewedForGroup(selectedGroup.databaseIds)}
              reviewedThisWeek={getReviewedThisWeekForGroup(selectedGroup.databaseIds)}
            />
          </div>
        )}
      </main>

      {/* Review Setup Modal */}
      {view === 'review-setup' && selectedDatabase && (
        <ReviewSetup
          stats={useNotionStats(flashcards)}
          databaseName={selectedDatabase.name}
          onStart={handleStartReview}
          onCancel={() => {
            setView('home');
            setSelectedDatabaseId(null);
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
          onAddReviewNote={handleAddReviewNote}
          currentIndex={currentCardIndex}
          totalCards={reviewCards.length}
        />
      )}
    </div>
  );
};

export default Index;
