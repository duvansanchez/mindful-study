import { useState } from "react";
import { Header } from "@/components/Header";
import { DatabaseCard } from "@/components/DatabaseCard";
import { GroupCard } from "@/components/GroupCard";
import { StatsOverview } from "@/components/StatsOverview";
import { ReviewSetup } from "@/components/ReviewSetup";
import { FlashcardReview } from "@/components/FlashcardReview";
import { mockDatabases, mockGroups, mockFlashcards, getOverallStats, getStatsForDatabase } from "@/data/mockData";
import { KnowledgeState, Flashcard } from "@/types";
import { Plus, BarChart3 } from "lucide-react";

type View = 'home' | 'stats' | 'review-setup' | 'review';

const Index = () => {
  const [view, setView] = useState<View>('home');
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string | null>(null);
  const [reviewCards, setReviewCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [cards, setCards] = useState(mockFlashcards);

  const overallStats = getOverallStats();
  const selectedDatabase = mockDatabases.find(db => db.id === selectedDatabaseId);

  const handleDatabaseClick = (databaseId: string) => {
    setSelectedDatabaseId(databaseId);
    setView('review-setup');
  };

  const handleStartReview = (selectedStates: KnowledgeState[]) => {
    const filteredCards = cards
      .filter(c => c.databaseId === selectedDatabaseId && selectedStates.includes(c.state))
      .sort((a, b) => a.viewCount - b.viewCount);
    
    setReviewCards(filteredCards);
    setCurrentCardIndex(0);
    setView('review');
  };

  const handleStateChange = (newState: KnowledgeState) => {
    const currentCard = reviewCards[currentCardIndex];
    setCards(prev => prev.map(c => 
      c.id === currentCard.id ? { ...c, state: newState } : c
    ));
    setReviewCards(prev => prev.map(c => 
      c.id === currentCard.id ? { ...c, state: newState } : c
    ));
  };

  const handleAddReviewNote = (note: string) => {
    const currentCard = reviewCards[currentCardIndex];
    const newNote = {
      id: `note-${Date.now()}`,
      content: note,
      createdAt: new Date(),
    };
    setCards(prev => prev.map(c => 
      c.id === currentCard.id 
        ? { ...c, reviewNotes: [...c.reviewNotes, newNote] } 
        : c
    ));
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

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="Knowledge Base" 
        subtitle="Gestiona tu conocimiento"
      />

      <main className="container max-w-4xl py-8 px-6">
        {view === 'home' && (
          <div className="space-y-8 animate-fade-in">
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
                      databases={mockDatabases.filter(db => group.databaseIds.includes(db.id))}
                      onClick={() => {}}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockDatabases.map(database => (
                  <DatabaseCard
                    key={database.id}
                    database={database}
                    onClick={() => handleDatabaseClick(database.id)}
                  />
                ))}
              </div>
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
              {mockDatabases.map(database => (
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
      </main>

      {/* Review Setup Modal */}
      {view === 'review-setup' && selectedDatabase && (
        <ReviewSetup
          stats={getStatsForDatabase(selectedDatabase.id)}
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
