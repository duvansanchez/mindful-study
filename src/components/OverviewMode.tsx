import { useState } from "react";
import { Flashcard } from "@/types";
import { StateBadge } from "./StateBadge";
import { NotionRenderer } from "./NotionRenderer";
import { X, Eye, EyeOff, StickyNote, ArrowLeft, BookOpen, MessageSquare } from "lucide-react";
import { useFlashcardContent } from "@/hooks/useNotion";
import { useReviewNotes } from "@/hooks/useReviewNotes";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface OverviewModeProps {
  flashcards: Flashcard[];
  databaseName: string;
  onClose: () => void;
}

interface FlashcardOverviewCardProps {
  card: Flashcard;
}

const FlashcardOverviewCard: React.FC<FlashcardOverviewCardProps> = ({ card }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  
  // Lazy loading del contenido solo cuando se revela
  const { data: detailedContent, isLoading: contentLoading } = useFlashcardContent(
    isRevealed ? card.id : null
  );

  // Cargar notas de repaso (siempre visibles en vista general)
  const { data: reviewNotes = [], isLoading: notesLoading } = useReviewNotes(card.id);

  const handleToggleContent = () => {
    setIsRevealed(!isRevealed);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header de la tarjeta con estado prominente */}
      <div className="space-y-4 mb-4">
        {/* Título y estado prominente */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-medium text-foreground text-base leading-relaxed flex-1">
              {card.title}
            </h3>
          </div>
          
          {/* Estado de dominio prominente */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Nivel de dominio:</span>
            <StateBadge state={card.state} size="sm" showLabel={true} />
          </div>
        </div>

        {/* Nota propia de la tarjeta (si existe) */}
        {card.notes && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
            <StickyNote className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium mb-1">Nota propia</p>
              <p className="text-sm text-foreground leading-relaxed">
                {card.notes}
              </p>
            </div>
          </div>
        )}

        {/* Notas de repaso (siempre visibles) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">
              Notas de repaso ({reviewNotes.length})
            </span>
          </div>
          
          {notesLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b border-muted-foreground"></div>
              Cargando notas...
            </div>
          ) : reviewNotes.length > 0 ? (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {reviewNotes.slice(0, 3).map((note) => (
                <div key={note.id} className="p-2 rounded bg-secondary/50 border border-border/30">
                  <p className="text-xs text-foreground leading-relaxed mb-1">
                    {note.content}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(note.createdAt, { addSuffix: true, locale: es })}
                  </p>
                </div>
              ))}
              {reviewNotes.length > 3 && (
                <p className="text-xs text-muted-foreground text-center py-1">
                  +{reviewNotes.length - 3} notas más
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic p-2">
              Sin notas de repaso registradas
            </p>
          )}
        </div>
      </div>

      {/* Botón para revelar contenido */}
      <button
        onClick={handleToggleContent}
        className="w-full flex items-center justify-center gap-2 py-3 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors border border-border/50 hover:border-border"
      >
        {isRevealed ? (
          <>
            <EyeOff className="w-4 h-4" />
            Ocultar contenido principal
          </>
        ) : (
          <>
            <Eye className="w-4 h-4" />
            Mostrar contenido principal
          </>
        )}
      </button>

      {/* Contenido revelado */}
      {isRevealed && (
        <div className="mt-4 pt-4 border-t border-border animate-fade-in">
          <div className="bg-muted/30 rounded-md p-4">
            <p className="text-xs text-muted-foreground mb-3 font-medium">Contenido principal</p>
            {contentLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-muted-foreground">Cargando...</span>
              </div>
            ) : (
              <div className="text-sm text-foreground">
                {detailedContent?.blocks ? (
                  <div className="notion-content">
                    <NotionRenderer blocks={detailedContent.blocks as never} />
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    {(detailedContent?.content || card.content || 'Sin contenido disponible')
                      .split('\n')
                      .map((paragraph, i) => (
                        <p key={i} className="mb-2 last:mb-0 text-sm leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export function OverviewMode({ flashcards, databaseName, onClose }: OverviewModeProps) {
  const [revealedCount, setRevealedCount] = useState(0);

  // Contar tarjetas por estado
  const stats = {
    tocado: flashcards.filter(c => c.state === 'tocado').length,
    verde: flashcards.filter(c => c.state === 'verde').length,
    solido: flashcards.filter(c => c.state === 'solido').length,
    total: flashcards.length,
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <div>
              <h1 className="font-semibold text-foreground">{databaseName}</h1>
              <p className="text-sm text-muted-foreground">Vista general • Solo lectura</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{flashcards.length} tarjetas</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-state-tocado"></div>
              <span>{stats.tocado}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-state-verde"></div>
              <span>{stats.verde}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-state-solido"></div>
              <span>{stats.solido}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 overflow-auto">
        <div className="container max-w-6xl mx-auto px-6 py-6">
          {/* Información de la vista */}
          <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                  Modo de vista general
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Explora el contenido sin afectar tu progreso de aprendizaje. 
                  Usa esta vista para detectar huecos conceptuales y decidir qué repasar después.
                </p>
              </div>
            </div>
          </div>

          {/* Grid de tarjetas */}
          {flashcards.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay tarjetas disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flashcards.map((card) => (
                <FlashcardOverviewCard key={card.id} card={card} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer con información adicional */}
      <footer className="px-6 py-3 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Esta vista es solo para lectura. Los estados de aprendizaje no se modifican.
          </p>
          <p>
            {flashcards.length} tarjetas disponibles
          </p>
        </div>
      </footer>
    </div>
  );
}