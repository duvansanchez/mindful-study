import { useState } from "react";
import { Flashcard, KnowledgeState } from "@/types";
import { StateBadge } from "./StateBadge";
import { ChevronDown, ChevronUp, Clock, Link2, StickyNote, X, MessageSquarePlus, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface FlashcardReviewProps {
  card: Flashcard;
  onStateChange: (state: KnowledgeState) => void;
  onNext: () => void;
  onClose: () => void;
  onAddReviewNote: (note: string) => void;
  currentIndex: number;
  totalCards: number;
}

export function FlashcardReview({ 
  card, 
  onStateChange, 
  onNext, 
  onClose,
  onAddReviewNote,
  currentIndex,
  totalCards
}: FlashcardReviewProps) {
  const [revealed, setRevealed] = useState(false);
  const [showAuxiliary, setShowAuxiliary] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleNext = () => {
    setRevealed(false);
    setShowAuxiliary(false);
    setShowNoteInput(false);
    setNoteText("");
    onNext();
  };

  const handleAddNote = () => {
    if (noteText.trim()) {
      onAddReviewNote(noteText.trim());
      setNoteText("");
      setShowNoteInput(false);
    }
  };

  const quickNotes = ["definición formal", "ejemplo", "fórmula", "contexto"];

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="text-sm text-muted-foreground">
            {currentIndex + 1} de {totalCards}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">Estado:</span>
          {(['tocado', 'verde', 'solido'] as KnowledgeState[]).map((state) => (
            <StateBadge
              key={state}
              state={state}
              size="sm"
              active={card.state === state}
              onClick={() => onStateChange(state)}
            />
          ))}
        </div>
      </header>

      {/* Card content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-auto">
        <div className="w-full max-w-2xl space-y-6">
          {/* Front of card - Title */}
          <div className="text-center animate-slide-up">
            <h1 className="text-3xl font-semibold text-foreground mb-2">
              {card.title}
            </h1>
            <StateBadge state={card.state} size="sm" />
          </div>

          {/* Auxiliary info toggle */}
          {!revealed && (
            <div className="animate-fade-in">
              <button
                onClick={() => setShowAuxiliary(!showAuxiliary)}
                className="w-full flex items-center justify-center gap-2 py-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="text-sm">Información auxiliar</span>
                {showAuxiliary ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showAuxiliary && (
                <div className="mt-4 p-4 rounded-lg bg-card border border-border space-y-4 animate-fade-in">
                  {card.notes && (
                    <div className="flex items-start gap-3">
                      <StickyNote className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Notas</p>
                        <p className="text-sm text-foreground">{card.notes}</p>
                      </div>
                    </div>
                  )}
                  
                  {card.lastReviewed && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Último repaso</p>
                        <p className="text-sm text-foreground">
                          {formatDistanceToNow(card.lastReviewed, { addSuffix: true, locale: es })}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {card.relatedConcepts.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Link2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Conceptos relacionados</p>
                        <div className="flex flex-wrap gap-2">
                          {card.relatedConcepts.map((concept, i) => (
                            <span 
                              key={i}
                              className="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground"
                            >
                              {concept}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reveal button / Answer */}
          {!revealed ? (
            <button
              onClick={handleReveal}
              className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity animate-fade-in"
            >
              Revelar respuesta
            </button>
          ) : (
            <div className="animate-slide-up">
              <div className="p-6 rounded-lg bg-card border border-border">
                <p className="text-sm text-muted-foreground mb-3">Contenido</p>
                <div className="prose prose-sm text-foreground max-w-none">
                  {card.content.split('\n').map((paragraph, i) => (
                    <p key={i} className="mb-3 last:mb-0">{paragraph}</p>
                  ))}
                </div>
              </div>

              {/* Review note section */}
              <div className="mt-4 animate-fade-in">
                {!showNoteInput ? (
                  <button
                    onClick={() => setShowNoteInput(true)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MessageSquarePlus className="w-4 h-4" />
                    ¿Qué parte no dominabas?
                  </button>
                ) : (
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
                    <p className="text-xs text-muted-foreground">Nota de repaso</p>
                    <div className="flex flex-wrap gap-2">
                      {quickNotes.map((quick) => (
                        <button
                          key={quick}
                          onClick={() => setNoteText(noteText ? `${noteText}, ${quick}` : quick)}
                          className="px-3 py-1.5 text-xs rounded-full bg-background border border-border hover:border-primary/50 hover:text-primary transition-colors"
                        >
                          {quick}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                        placeholder="Escribe qué no dominabas..."
                        className="flex-1 px-3 py-2 text-sm rounded-lg bg-background border border-border focus:border-primary/50 focus:outline-none transition-colors"
                        autoFocus
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={!noteText.trim()}
                        className="px-3 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleNext}
                className="w-full mt-4 py-4 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors"
              >
                Siguiente tarjeta
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary">
        <div 
          className="h-full bg-state-verde transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
        />
      </div>
    </div>
  );
}
