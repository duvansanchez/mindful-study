import { useState } from "react";
import { KnowledgeState, Statistics, Flashcard } from "@/types";
import { StateBadge } from "./StateBadge";
import { FlashcardFilters } from "./FlashcardFilters";
import { Play, Filter } from "lucide-react";

interface ReviewSetupProps {
  stats: Statistics;
  databaseName: string;
  databaseId: string;
  flashcards: Flashcard[];
  mode?: 'review' | 'matching'; // Nueva prop para indicar el modo
  onStart: (selectedCards: Flashcard[]) => void;
  onCancel: () => void;
}

export function ReviewSetup({ stats, databaseName, databaseId, flashcards, mode = 'review', onStart, onCancel }: ReviewSetupProps) {
  const [selectedStates, setSelectedStates] = useState<KnowledgeState[]>(['tocado', 'verde']);
  const [filteredCards, setFilteredCards] = useState<Flashcard[]>(flashcards);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const toggleState = (state: KnowledgeState) => {
    setSelectedStates(prev => 
      prev.includes(state) 
        ? prev.filter(s => s !== state)
        : [...prev, state]
    );
  };

  // Aplicar filtros de estado a las tarjetas ya filtradas por filtros avanzados
  const finalFilteredCards = filteredCards.filter(card => selectedStates.includes(card.state));
  
  // Calcular estadísticas de las tarjetas filtradas
  const filteredStats = {
    tocado: filteredCards.filter(c => c.state === 'tocado').length,
    verde: filteredCards.filter(c => c.state === 'verde').length,
    solido: filteredCards.filter(c => c.state === 'solido').length,
    total: filteredCards.length
  };

  const totalSelected = finalFilteredCards.length;

  const handleStart = () => {
    // Ordenar por menos visto primero (por fecha de creación como proxy)
    const sortedCards = [...finalFilteredCards].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    onStart(sortedCards);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-xl bg-card border border-border shadow-lg animate-slide-up">
        <h2 className="text-xl font-semibold text-foreground mb-1">
          {mode === 'matching' ? 'Iniciar Modo Matching' : 'Iniciar repaso'}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {databaseName}
        </p>

        {/* Filtros avanzados */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">Filtros avanzados</h3>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Filter className="w-4 h-4" />
              {showAdvancedFilters ? 'Ocultar' : 'Mostrar'} filtros
            </button>
          </div>
          
          {showAdvancedFilters && (
            <FlashcardFilters
              flashcards={flashcards}
              onFilterChange={setFilteredCards}
              databaseId={databaseId}
              className="mb-4"
            />
          )}
          
          {filteredCards.length !== flashcards.length && (
            <div className="text-sm text-muted-foreground mb-4 p-3 bg-secondary/50 rounded-lg">
              📊 Mostrando {filteredCards.length} de {flashcards.length} tarjetas después de aplicar filtros
            </div>
          )}
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-sm text-muted-foreground">
            Selecciona qué estados repasar:
          </p>
          
          <div className="space-y-3">
            {(['tocado', 'verde', 'solido'] as KnowledgeState[]).map((state) => (
              <button
                key={state}
                onClick={() => toggleState(state)}
                disabled={filteredStats[state] === 0}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                  selectedStates.includes(state)
                    ? 'border-foreground/20 bg-secondary'
                    : 'border-border hover:border-muted-foreground/20'
                } ${filteredStats[state] === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    selectedStates.includes(state)
                      ? 'border-foreground bg-foreground'
                      : 'border-muted-foreground'
                  }`}>
                    {selectedStates.includes(state) && (
                      <svg className="w-3 h-3 text-background" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                      </svg>
                    )}
                  </div>
                  <StateBadge state={state} size="sm" />
                </div>
                <span className="text-sm text-muted-foreground">
                  {filteredStats[state]} tarjetas
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-sm text-muted-foreground mb-6">
          {totalSelected > 0 
            ? `${totalSelected} tarjetas seleccionadas (orden: menos visto primero)`
            : 'Selecciona al menos un estado'
          }
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleStart}
            disabled={totalSelected === 0}
            className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            {mode === 'matching' ? 'Iniciar Matching' : 'Comenzar'} ({totalSelected})
          </button>
        </div>
      </div>
    </div>
  );
}
