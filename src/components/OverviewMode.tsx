import { useState, useMemo, useEffect, useRef } from "react";
import { Flashcard, KnowledgeState } from "@/types";
import { StateBadge } from "./StateBadge";
import { NotionRenderer } from "./NotionRenderer";
import { Eye, EyeOff, StickyNote, ArrowLeft, BookOpen, MessageSquare, Filter, ArrowUpDown, ChevronDown, Bookmark } from "lucide-react";
import { useFlashcardContent } from "@/hooks/useNotion";
import { useReviewNotes } from "@/hooks/useReviewNotes";
import { useNotesCountByDatabase } from "@/hooks/useStudyTracking";
import { useReferencePoints, useCreateReferencePoint, useTextSelection } from "@/hooks/useReferencePoints";
import { ReferencePointsPanel } from "./ReferencePointsPanel";
import { CreateReferencePointDialog } from "./CreateReferencePointDialog";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface OverviewModeProps {
  flashcards: Flashcard[];
  databaseName: string;
  databaseId: string;
  onClose: () => void;
}

type FilterState = 'all' | KnowledgeState | 'with-notes' | 'without-notes';
type SortOption = 'priority' | 'alphabetical' | 'created';

interface FlashcardOverviewCardProps {
  card: Flashcard;
}

const FlashcardOverviewCard: React.FC<FlashcardOverviewCardProps> = ({ card }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showCreateReferenceDialog, setShowCreateReferenceDialog] = useState(false);
  const [selectedTextForReference, setSelectedTextForReference] = useState("");
  const [selectionContext, setSelectionContext] = useState<{
    contextBefore: string;
    contextAfter: string;
  } | null>(null);
  
  // Función para renderizar texto con formato markdown básico (negrita)
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Texto en negrita
        const boldText = part.slice(2, -2);
        return <strong key={index} className="font-semibold text-foreground">{boldText}</strong>;
      }
      return part;
    });
  };
  
  // Lazy loading del contenido solo cuando se revela
  const { data: detailedContent, isLoading: contentLoading } = useFlashcardContent(
    isRevealed ? card.id : null
  );

  // Cargar notas de repaso (siempre visibles en vista general)
  const { data: reviewNotes = [], isLoading: notesLoading } = useReviewNotes(card.id);

  // Cargar puntos de referencia
  const { data: referencePoints = [], isLoading: referencePointsLoading } = useReferencePoints(card.id);
  const createReferencePointMutation = useCreateReferencePoint();
  const { handleTextSelection, clearSelection } = useTextSelection();

  const handleToggleContent = () => {
    setIsRevealed(!isRevealed);
  };

  // Funciones para puntos de referencia
  const handleTextSelectionForReference = () => {
    const selectionData = handleTextSelection();
    if (selectionData) {
      setSelectedTextForReference(selectionData.text);
      setSelectionContext({
        contextBefore: selectionData.contextBefore,
        contextAfter: selectionData.contextAfter
      });
      setShowCreateReferenceDialog(true);
    }
  };

  const handleCreateReferencePoint = async (data: {
    referenceName: string;
    category: string;
    color: string;
  }) => {
    try {
      await createReferencePointMutation.mutateAsync({
        flashcardId: card.id,
        data: {
          selectedText: selectedTextForReference,
          referenceName: data.referenceName,
          databaseId: card.databaseId,
          category: data.category,
          color: data.color,
          contextBefore: selectionContext?.contextBefore,
          contextAfter: selectionContext?.contextAfter,
        }
      });

      setShowCreateReferenceDialog(false);
      setSelectedTextForReference("");
      setSelectionContext(null);
      clearSelection();
    } catch (error) {
      console.error('Error creating reference point:', error);
    }
  };

  const handleNavigateToReference = (referencePoint: { selectedText: string; color: string }) => {
    // Buscar el texto en el contenido y hacer scroll
    const textToFind = referencePoint.selectedText;
    
    setTimeout(() => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent && node.textContent.includes(textToFind)) {
          const element = node.parentElement;
          if (element) {
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
            
            const originalBg = element.style.backgroundColor;
            element.style.backgroundColor = referencePoint.color + '40';
            element.style.transition = 'background-color 0.3s ease';
            
            setTimeout(() => {
              element.style.backgroundColor = originalBg;
            }, 2000);
            
            break;
          }
        }
      }
    }, 100);
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

        {/* Notas de repaso y puntos de referencia */}
        <div className="space-y-4">
          {/* Notas de repaso */}
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
                    <div className="text-xs text-foreground leading-relaxed mb-1 whitespace-pre-wrap">
                      {renderFormattedText(note.content)}
                    </div>
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

          {/* Puntos de referencia */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">
                Puntos de referencia ({referencePoints.length})
              </span>
            </div>
            
            {referencePointsLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-muted-foreground"></div>
                Cargando puntos...
              </div>
            ) : referencePoints.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {referencePoints.slice(0, 3).map((point) => (
                  <div key={point.id} className="p-2 rounded bg-secondary/50 border border-border/30">
                    <div className="flex items-center gap-2 mb-1">
                      <div 
                        className="w-2 h-2 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: point.color }}
                      />
                      <span className="text-xs font-medium text-foreground truncate">
                        {point.referenceName}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed mb-1 line-clamp-2">
                      "{point.selectedText}"
                    </div>
                    <button
                      onClick={() => handleNavigateToReference(point)}
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      Ir al texto
                    </button>
                  </div>
                ))}
                {referencePoints.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    +{referencePoints.length - 3} puntos más
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic p-2">
                Sin puntos de referencia creados
              </p>
            )}
          </div>
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
                  <div className="space-y-4">
                    <div className="notion-content">
                      <NotionRenderer blocks={detailedContent.blocks as never} />
                    </div>
                    
                    {/* Botón para crear punto de referencia */}
                    <div className="p-3 bg-muted/50 rounded-lg border border-dashed border-border">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Bookmark className="w-4 h-4" />
                        <span>Selecciona texto para crear un punto de referencia</span>
                      </div>
                      <button
                        onClick={handleTextSelectionForReference}
                        className="px-3 py-2 text-sm bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors"
                      >
                        Crear punto de referencia
                      </button>
                    </div>
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

      {/* Create Reference Point Dialog */}
      <CreateReferencePointDialog
        open={showCreateReferenceDialog}
        onOpenChange={setShowCreateReferenceDialog}
        selectedText={selectedTextForReference}
        onCreateReferencePoint={handleCreateReferencePoint}
        isCreating={createReferencePointMutation.isPending}
      />
    </div>
  );
};

export function OverviewMode({ flashcards, databaseName, databaseId, onClose }: OverviewModeProps) {
  const [filterState, setFilterState] = useState<FilterState>('all');
  const [sortOption, setSortOption] = useState<SortOption>('priority');
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Obtener conteos de notas de repaso
  const { data: notesCounts = {} } = useNotesCountByDatabase(databaseId);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar y ordenar tarjetas
  const filteredAndSortedCards = useMemo(() => {
    let filtered = flashcards;

    // Aplicar filtro por estado o notas
    if (filterState !== 'all') {
      if (filterState === 'with-notes') {
        filtered = flashcards.filter(card => notesCounts[card.id] > 0);
      } else if (filterState === 'without-notes') {
        filtered = flashcards.filter(card => !notesCounts[card.id] || notesCounts[card.id] === 0);
      } else {
        filtered = flashcards.filter(card => card.state === filterState);
      }
    }

    // Aplicar ordenamiento
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'priority':
          // Orden de prioridad: tocado > verde > sólido
          { const stateOrder = { tocado: 0, verde: 1, solido: 2 };
          return stateOrder[a.state] - stateOrder[b.state]; }
        
        case 'alphabetical':
          return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
        
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        
        default:
          return 0;
      }
    });

    return sorted;
  }, [flashcards, filterState, sortOption, notesCounts]);

  // Contar tarjetas por estado y notas
  const stats = {
    tocado: flashcards.filter(c => c.state === 'tocado').length,
    verde: flashcards.filter(c => c.state === 'verde').length,
    solido: flashcards.filter(c => c.state === 'solido').length,
    total: flashcards.length,
    withNotes: flashcards.filter(c => notesCounts[c.id] > 0).length,
    withoutNotes: flashcards.filter(c => !notesCounts[c.id] || notesCounts[c.id] === 0).length,
  };

  const getFilterLabel = (filter: FilterState) => {
    switch (filter) {
      case 'all': return 'Todas';
      case 'tocado': return 'Tocado';
      case 'verde': return 'Verde';
      case 'solido': return 'Sólido';
      case 'with-notes': return 'Con notas';
      case 'without-notes': return 'Sin notas';
      default: return 'Todas';
    }
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
          <span>{filteredAndSortedCards.length} de {flashcards.length} tarjetas</span>
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

          {/* Barra de filtros y ordenamiento */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-3">
              {/* Filtro por estado */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border"
                >
                  <Filter className="w-4 h-4" />
                  {getFilterLabel(filterState)}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
                
                {showFilters && (
                  <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-10 min-w-[160px]">
                    {/* Filtros por estado */}
                    {(['all', 'tocado', 'verde', 'solido'] as FilterState[]).map((state) => (
                      <button
                        key={state}
                        onClick={() => {
                          setFilterState(state);
                          setShowFilters(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors ${
                          filterState === state ? 'bg-secondary text-secondary-foreground' : 'text-foreground'
                        }`}
                      >
                        {state !== 'all' && <StateBadge state={state as KnowledgeState} size="xs" />}
                        {getFilterLabel(state)}
                        {state !== 'all' && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {stats[state as KnowledgeState]}
                          </span>
                        )}
                        {state === 'all' && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {stats.total}
                          </span>
                        )}
                      </button>
                    ))}
                    
                    {/* Separador */}
                    <div className="border-t border-border my-1"></div>
                    
                    {/* Filtros por notas */}
                    {(['with-notes', 'without-notes'] as FilterState[]).map((noteFilter) => (
                      <button
                        key={noteFilter}
                        onClick={() => {
                          setFilterState(noteFilter);
                          setShowFilters(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors last:rounded-b-lg ${
                          filterState === noteFilter ? 'bg-secondary text-secondary-foreground' : 'text-foreground'
                        }`}
                      >
                        <MessageSquare className="w-3 h-3" />
                        {getFilterLabel(noteFilter)}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {noteFilter === 'with-notes' ? stats.withNotes : stats.withoutNotes}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Ordenamiento */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="px-3 py-2 text-sm rounded-lg bg-secondary text-secondary-foreground border border-border focus:border-primary/50 focus:outline-none"
                >
                  <option value="priority">Por prioridad (Tocado → Verde → Sólido)</option>
                  <option value="alphabetical">Alfabético (A → Z)</option>
                  <option value="created">Más recientes primero</option>
                </select>
              </div>
            </div>

            {/* Contador de resultados */}
            <div className="text-sm text-muted-foreground">
              {filteredAndSortedCards.length === flashcards.length ? (
                `${flashcards.length} tarjetas`
              ) : (
                `${filteredAndSortedCards.length} de ${flashcards.length} tarjetas`
              )}
            </div>
          </div>

          {/* Grid de tarjetas */}
          {filteredAndSortedCards.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              {filterState === 'all' ? (
                <p className="text-muted-foreground">No hay tarjetas disponibles</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-muted-foreground">No hay tarjetas con estado "{getFilterLabel(filterState)}"</p>
                  <button
                    onClick={() => setFilterState('all')}
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    Ver todas las tarjetas
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedCards.map((card) => (
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
            {filteredAndSortedCards.length === flashcards.length 
              ? `${flashcards.length} tarjetas disponibles`
              : `${filteredAndSortedCards.length} de ${flashcards.length} tarjetas mostradas`
            }
          </p>
        </div>
      </footer>
    </div>
  );
}