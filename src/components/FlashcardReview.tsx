import { useState } from "react";
import { Flashcard, KnowledgeState } from "@/types";
import { StateBadge } from "./StateBadge";
import { NotionRenderer } from "./NotionRenderer";
import { ChevronDown, ChevronUp, Clock, Link2, StickyNote, X, MessageSquarePlus, Send, Loader2, Trash2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useFlashcardContent } from "@/hooks/useNotion";
import { useReviewNotes, useAddReviewNote, useDeleteReviewNote } from "@/hooks/useReviewNotes";

interface FlashcardReviewProps {
  card: Flashcard;
  onStateChange: (state: KnowledgeState) => Promise<{ success: boolean; updated?: string[] }>;
  onNext: () => void;
  onClose: () => void;
  currentIndex: number;
  totalCards: number;
}

export function FlashcardReview({ 
  card, 
  onStateChange, 
  onNext, 
  onClose,
  currentIndex,
  totalCards
}: FlashcardReviewProps) {
  const [revealed, setRevealed] = useState(false);
  const [showAuxiliary, setShowAuxiliary] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [lastReviewMessage, setLastReviewMessage] = useState<string | null>(null);
  const [updatingState, setUpdatingState] = useState(false);
  const [updatingReviewDate, setUpdatingReviewDate] = useState(false);

  // Lazy loading del contenido cuando se revela la respuesta
  const { data: detailedContent, isLoading: contentLoading } = useFlashcardContent(
    revealed ? card.id : null
  );

  // Cargar notas de repaso
  const { data: reviewNotes = [], isLoading: notesLoading } = useReviewNotes(card.id);
  const addNoteMutation = useAddReviewNote();
  const deleteNoteMutation = useDeleteReviewNote();

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleStateChange = async (newState: KnowledgeState) => {
    setUpdatingState(true);
    setLastReviewMessage(null);
    
    try {
      console.log('🔄 Actualizando estado a:', newState, 'para card:', card.id);
      
      // Llamar al callback del padre que maneja la actualización
      const result = await onStateChange(newState);
      
      console.log('✅ Estado actualizado exitosamente:', result);
    } catch (error) {
      console.error('❌ Error actualizando estado:', error);
    } finally {
      setUpdatingState(false);
    }
  };

  const handleNext = async () => {
    setUpdatingReviewDate(true);
    
    try {
      // Llamar al callback del padre que actualizará la fecha de repaso
      await onNext();
    } catch (error) {
      console.error('Error al pasar a siguiente tarjeta:', error);
    } finally {
      setUpdatingReviewDate(false);
      // Limpiar estados locales
      setRevealed(false);
      setShowAuxiliary(false);
      setShowNoteInput(false);
      setNoteText("");
      setLastReviewMessage(null);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;

    try {
      await addNoteMutation.mutateAsync({
        flashcardId: card.id,
        content: noteText.trim(),
        databaseId: card.databaseId
      });
      
      setNoteText("");
      setShowNoteInput(false);
    } catch (error) {
      console.error('Error adding review note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNoteMutation.mutateAsync(noteId);
    } catch (error) {
      console.error('Error deleting review note:', error);
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
              onClick={updatingState ? undefined : () => handleStateChange(state)}
            />
          ))}
          {updatingState && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-2" />
          )}
        </div>
      </header>

      {/* Card content */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 sm:px-6 py-4 sm:py-8 overflow-auto">
        <div className="w-full max-w-2xl space-y-4 sm:space-y-6">
          {/* Mensaje de advertencia sobre campo de fecha */}
          {lastReviewMessage && (
            <div className="animate-fade-in">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                    Campo de fecha no encontrado
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    {lastReviewMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Front of card - Title */}
          <div className="text-center animate-slide-up">
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2">
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

                  {/* Información auxiliar de todas las columnas de Notion */}
                  {card.auxiliaryInfo && Object.keys(card.auxiliaryInfo).length > 0 && (
                    <div className="border-t border-border pt-4">
                      <p className="text-xs text-muted-foreground mb-3 font-medium">Información de la base de datos</p>
                      <div className="grid grid-cols-1 gap-3">
                        {Object.entries(card.auxiliaryInfo).map(([propName, propData]) => (
                          <div key={propName} className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-muted-foreground/40 mt-2 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground mb-1 font-medium">{propName}</p>
                              <p className="text-sm text-foreground break-words">{propData.value}</p>
                              {propData.type !== 'rich_text' && propData.type !== 'title' && (
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                  {propData.type === 'select' && '• Selección'}
                                  {propData.type === 'multi_select' && '• Selección múltiple'}
                                  {propData.type === 'date' && '• Fecha'}
                                  {propData.type === 'number' && '• Número'}
                                  {propData.type === 'checkbox' && '• Casilla'}
                                  {propData.type === 'url' && '• URL'}
                                  {propData.type === 'email' && '• Email'}
                                  {propData.type === 'phone_number' && '• Teléfono'}
                                  {propData.type === 'people' && '• Personas'}
                                  {propData.type === 'files' && '• Archivos'}
                                  {propData.type === 'relation' && '• Relación'}
                                  {propData.type === 'formula' && '• Fórmula'}
                                  {propData.type === 'rollup' && '• Rollup'}
                                  {propData.type === 'created_time' && '• Fecha de creación'}
                                  {propData.type === 'created_by' && '• Creado por'}
                                  {propData.type === 'last_edited_time' && '• Última edición'}
                                  {propData.type === 'last_edited_by' && '• Editado por'}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
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
              <div className="p-4 sm:p-6 rounded-lg bg-card border border-border">
                <p className="text-sm text-muted-foreground mb-3">Contenido</p>
                {contentLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Cargando contenido...</span>
                  </div>
                ) : (
                  <div className="text-foreground max-w-none">
                    {/* Mostrar título también en el contenido revelado */}
                    <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-border">
                      <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
                        {card.title}
                      </h2>
                      <StateBadge state={card.state} size="sm" />
                    </div>
                    
                    {detailedContent?.blocks ? (
                      <NotionRenderer blocks={detailedContent.blocks} />
                    ) : (
                      <div className="prose prose-sm">
                        {(detailedContent?.content || card.content || 'Sin contenido disponible').split('\n').map((paragraph, i) => (
                          <p key={i} className="mb-3 last:mb-0">{paragraph}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Review note section */}
              <div className="mt-4 animate-fade-in space-y-4">
                {/* Mostrar notas existentes */}
                {reviewNotes.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <StickyNote className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">
                        Notas de repaso ({reviewNotes.length})
                      </p>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {notesLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Cargando notas...
                        </div>
                      ) : (
                        reviewNotes.map((note) => (
                          <div key={note.id} className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
                            <div className="flex-1 space-y-1">
                              <p className="text-sm text-foreground">{note.content}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(note.createdAt, { addSuffix: true, locale: es })}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              disabled={deleteNoteMutation.isPending}
                              className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                              title="Eliminar nota"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Agregar nueva nota */}
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
                        disabled={!noteText.trim() || addNoteMutation.isPending}
                        className="px-3 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                      >
                        {addNoteMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleNext}
                disabled={updatingReviewDate}
                className="w-full mt-4 py-4 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {updatingReviewDate ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Actualizando fecha de repaso...
                  </>
                ) : (
                  'Siguiente tarjeta'
                )}
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
