import { useState, useEffect, useRef, useCallback } from "react";
import { Flashcard, KnowledgeState } from "@/types";
import { StateBadge } from "./StateBadge";
import { NotionRenderer } from "./NotionRenderer";
import type { NotionBlock } from "./NotionRenderer";
import { ChevronDown, ChevronUp, Clock, Link2, StickyNote, X, MessageSquarePlus, Send, Loader2, Trash2, AlertCircle, MessageSquare, RotateCcw, Edit3, Check, X as XIcon, Bookmark } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useFlashcardContent } from "@/hooks/useNotion";
import { useReviewNotes, useAddReviewNote, useDeleteReviewNote, useUpdateReviewNote } from "@/hooks/useReviewNotes";
import { useFlashcardReviewCount } from "@/hooks/useStudyTracking";
import { useReferencePoints, useCreateReferencePoint, useTextSelection, type ReferencePoint } from "@/hooks/useReferencePoints";
import { ReferencePointsPanel } from "./ReferencePointsPanel";
import { CreateReferencePointDialog } from "./CreateReferencePointDialog";
import { FloatingReferenceButton } from "./FloatingReferenceButton";

interface FlashcardReviewProps {
  card: Flashcard;
  currentIndex: number;
  totalCards: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious?: () => void;
  onStateChange: (state: KnowledgeState) => void;
}

export function FlashcardReview({ 
  card, 
  currentIndex, 
  totalCards, 
  onClose, 
  onNext, 
  onPrevious,
  onStateChange 
}: FlashcardReviewProps) {
  const [revealed, setRevealed] = useState(false);
  // Estado para mantener la preferencia de información adicional durante la sesión
  const [showAuxiliary, setShowAuxiliary] = useState(() => {
    // Recuperar la preferencia guardada en localStorage
    const saved = localStorage.getItem('flashcard-show-auxiliary');
    return saved === 'true';
  });
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  
  // Estados para edición de notas
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  
  // Estados para puntos de referencia
  const [showCreateReferenceDialog, setShowCreateReferenceDialog] = useState(false);
  const [selectedTextForReference, setSelectedTextForReference] = useState("");
  const [selectionContext, setSelectionContext] = useState<{
    contextBefore: string;
    contextAfter: string;
  } | null>(null);
  
  const [lastReviewMessage, setLastReviewMessage] = useState<string | null>(null);
  const [dominioMessage, setDominioMessage] = useState<string | null>(null);
  const [updatingState, setUpdatingState] = useState(false);
  const [updatingReviewDate, setUpdatingReviewDate] = useState(false);

  // Estado para navegación con teclado
  const lastKeyPressRef = useRef<{ key: string; time: number } | null>(null);

  const { 
    data: detailedContent, 
    isLoading: contentLoading 
  } = useFlashcardContent(
    revealed ? card.id : null
  );

  // Cargar notas de repaso
  const { data: reviewNotes = [], isLoading: notesLoading } = useReviewNotes(card.id);
  const addNoteMutation = useAddReviewNote();
  const deleteNoteMutation = useDeleteReviewNote();
  const updateNoteMutation = useUpdateReviewNote();

  // Cargar puntos de referencia
  const { data: referencePoints = [], isLoading: referencePointsLoading } = useReferencePoints(card.id);
  const createReferencePointMutation = useCreateReferencePoint();
  const { handleTextSelection, clearSelection } = useTextSelection();

  // Cargar conteo de repasos
  const { data: reviewCount = 0, isLoading: reviewCountLoading } = useFlashcardReviewCount(card.id);

  const handleReveal = useCallback(() => {
    setRevealed(true);
  }, []);

  // Función para manejar el cambio de preferencia de información adicional
  const handleToggleAuxiliary = () => {
    const newValue = !showAuxiliary;
    setShowAuxiliary(newValue);
    // Guardar la preferencia en localStorage para mantenerla durante la sesión
    localStorage.setItem('flashcard-show-auxiliary', newValue.toString());
  };

  const handleStateChange = useCallback(async (newState: KnowledgeState) => {
    if (updatingState) return;
    
    setUpdatingState(true);
    try {
      console.log('🔄 Cambiando estado a:', newState);
      const result = await onStateChange(newState);
      console.log('📡 Resultado recibido:', result);
      
      // Verificar si hay mensaje de error sobre columna Dominio
      if (result !== undefined && result !== null) {
        const resultObj = result as unknown as { dominioMessage?: string; success?: boolean };
        if (resultObj.dominioMessage) {
          console.log('⚠️ Mensaje de dominio recibido:', resultObj.dominioMessage);
          setDominioMessage(resultObj.dominioMessage);
        } else if (resultObj.success) {
          // Limpiar mensaje de error si la operación fue exitosa
          setDominioMessage(null);
        }
      }
    } catch (error: unknown) {
      console.error('❌ Error cambiando estado:', error);
      if (error && typeof error === 'object' && 'dominioMessage' in error) {
        setDominioMessage((error as { dominioMessage: string }).dominioMessage);
      }
    } finally {
      setUpdatingState(false);
    }
  }, [updatingState, onStateChange]);

  const handleNext = useCallback(async () => {
    if (updatingReviewDate) return;
    
    setUpdatingReviewDate(true);
    try {
      // Actualizar fecha de repaso
      const response = await fetch(`/api/flashcards/${card.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      if (!result.success && result.lastReviewMessage) {
        setLastReviewMessage(result.lastReviewMessage);
      }
      
      // Resetear estado del componente (EXCEPTO showAuxiliary que se mantiene)
      setRevealed(false);
      // NO resetear showAuxiliary - mantener la preferencia del usuario
      setShowNoteInput(false);
      setNoteText("");
      setLastReviewMessage(null);
      setDominioMessage(null);
    } finally {
      setUpdatingReviewDate(false);
      onNext();
    }
  }, [card.id, updatingReviewDate, onNext]);

  // Manejar navegación con teclado (flechas simples, Enter para revelar)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Solo procesar si no estamos escribiendo en un input/textarea
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentTime = Date.now();
      const key = event.key;

      // Enter simple para revelar contenido
      if (key === 'Enter' && !revealed) {
        event.preventDefault();
        console.log('🎯 Enter - Revelar contenido');
        handleReveal();
        return;
      }

      // Atajos para cambiar estados de conocimiento
      if (key === '1' || key === '2' || key === '3') {
        event.preventDefault();
        let newState: KnowledgeState;
        
        switch (key) {
          case '1':
            newState = 'tocado';
            console.log('🎯 Tecla 1 - Cambiar a Tocado');
            break;
          case '2':
            newState = 'verde';
            console.log('🎯 Tecla 2 - Cambiar a Verde');
            break;
          case '3':
            newState = 'solido';
            console.log('🎯 Tecla 3 - Cambiar a Sólido');
            break;
          default:
            return;
        }
        
        handleStateChange(newState);
        return;
      }

      // Navegación simple con flechas (un solo clic)
      if (key === 'ArrowRight' || key === 'ArrowLeft') {
        event.preventDefault();

        if (key === 'ArrowRight' && onNext) {
          console.log('🎯 Flecha derecha - Siguiente flashcard');
          handleNext();
        } else if (key === 'ArrowLeft' && onPrevious && currentIndex > 0) {
          console.log('🎯 Flecha izquierda - Flashcard anterior');
          onPrevious();
        }
      }
    };

    // Manejar selección de texto para puntos de referencia
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        // Solo mostrar opción si hay texto seleccionado y estamos en contenido revelado
        if (revealed) {
          // Pequeño delay para asegurar que la selección esté completa
          setTimeout(() => {
            const selectedText = selection.toString().trim();
            if (selectedText.length > 0) {
              // Mostrar botón flotante o tooltip para crear punto de referencia
              console.log('📍 Texto seleccionado para punto de referencia:', selectedText);
            }
          }, 10);
        }
      }
    };

    // Agregar event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mouseup', handleMouseUp);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onNext, onPrevious, currentIndex, handleNext, handleReveal, handleStateChange, revealed]);

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

  const handleStartEditNote = (noteId: string, currentContent: string) => {
    setEditingNoteId(noteId);
    setEditingNoteText(currentContent);
  };

  const handleCancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  const handleSaveEditNote = async () => {
    if (!editingNoteId || !editingNoteText.trim()) return;

    try {
      await updateNoteMutation.mutateAsync({
        noteId: editingNoteId,
        content: editingNoteText.trim()
      });
      
      setEditingNoteId(null);
      setEditingNoteText("");
    } catch (error) {
      console.error('Error updating review note:', error);
    }
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

  const handleNavigateToReference = (referencePoint: ReferencePoint) => {
    const textToFind = referencePoint.selectedText.trim();
    
    setTimeout(() => {
      const contentArea = document.querySelector('.flashcard-content-area');
      if (!contentArea) return;
      
      // Función para encontrar y hacer scroll al texto
      const findAndScrollToText = () => {
        // Obtener todos los elementos de texto dentro del área de contenido
        const allElements = contentArea.querySelectorAll('*');
        let bestMatch = null;
        let bestScore = 0;
        
        // Normalizar el texto de búsqueda
        const normalizedSearch = textToFind.replace(/\s+/g, ' ').trim().toLowerCase();
        
        for (const element of allElements) {
          if (element.textContent && element.children.length === 0) { // Solo elementos hoja
            const elementText = element.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
            
            // Calcular score de coincidencia
            let score = 0;
            
            if (elementText.includes(normalizedSearch)) {
              score = 100; // Coincidencia exacta
            } else {
              // Calcular por palabras
              const searchWords = normalizedSearch.split(' ').filter(w => w.length > 2);
              const matchingWords = searchWords.filter(word => elementText.includes(word));
              score = (matchingWords.length / searchWords.length) * 80;
            }
            
            // Preferir elementos más pequeños (más específicos)
            if (score > 0) {
              const lengthRatio = normalizedSearch.length / elementText.length;
              if (lengthRatio > 0.3) { // Al menos 30% del elemento es nuestro texto
                score += 20;
              }
            }
            
            if (score > bestScore && score > 30) {
              bestScore = score;
              bestMatch = element;
            }
          }
        }
        
        if (!bestMatch) {
          // Buscar en elementos padre si no encuentra en hojas
          for (const element of allElements) {
            if (element.textContent) {
              const elementText = element.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
              
              if (elementText.includes(normalizedSearch)) {
                bestMatch = element;
                break;
              }
            }
          }
        }
        
        if (bestMatch) {
          // SOLO hacer scroll al elemento encontrado - SIN resaltado
          bestMatch.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
          
          return true;
        }
        
        return false;
      };
      
      const found = findAndScrollToText();
      
      if (!found) {
        // Mensaje de error
        const errorMsg = document.createElement('div');
        errorMsg.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 4px;">❌ No se encontró el texto</div>
          <div style="font-size: 12px; opacity: 0.9;">
            "${textToFind.substring(0, 40)}${textToFind.length > 40 ? '...' : ''}"
          </div>
        `;
        errorMsg.style.cssText = `
          position: fixed; top: 20px; right: 20px; background: #ef4444; color: white;
          padding: 12px 16px; border-radius: 8px; font-size: 14px; z-index: 1000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2); max-width: 300px; line-height: 1.4;
        `;
        document.body.appendChild(errorMsg);
        setTimeout(() => errorMsg.remove(), 3000);
      }
      
      // Mostrar tooltip con el nombre (más centrado, más grande, menos ancho pero mostrando todo)
      const tooltip = document.createElement('div');
      tooltip.textContent = `📍 ${referencePoint.referenceName}`;
      tooltip.style.cssText = `
        position: fixed; top: 30%; left: 50%; transform: translate(-50%, -50%);
        background: ${referencePoint.color}; color: white; padding: 12px 18px;
        border-radius: 10px; font-size: 16px; font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000; border: 3px solid white;
        opacity: 0.95; text-align: center; max-width: 300px;
        word-wrap: break-word; line-height: 1.3;
      `;
      
      document.body.appendChild(tooltip);
      setTimeout(() => tooltip.remove(), 6000);
      
    }, 100);
  };

  const quickNotes = ["No dominaba o no tenía en cuenta", "Próximo a investigar o tener en cuenta", "Sinónimo", "definición formal", "ejemplo", "fórmula", "contexto", "Explicación de relación"];

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
          <div className="text-xs text-muted-foreground/70 hidden sm:block">
            ⏎ revelar | ← → navegar | 1️⃣2️⃣3️⃣ estados
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
          
          {/* Review count display */}
          <div className="flex items-center gap-1 ml-4 px-2 py-1 rounded-md bg-secondary/50 text-secondary-foreground">
            <RotateCcw className="w-3 h-3" />
            <span className="text-xs font-medium">
              {reviewCountLoading ? '...' : reviewCount}
            </span>
          </div>
          
          {/* Botón para mostrar notas en pantallas pequeñas */}
          <div className="lg:hidden relative">
            <button
              onClick={() => setShowNotesPanel(!showNotesPanel)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              title="Mostrar/ocultar panel lateral"
            >
              <StickyNote className="w-4 h-4 text-muted-foreground" />
            </button>
            {(reviewNotes.length > 0 || referencePoints.length > 0) && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {reviewNotes.length + referencePoints.length}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main content - Two columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left column - Flashcard content */}
        <div className="flex-1 flex flex-col items-center justify-start px-4 sm:px-6 py-4 sm:py-8 overflow-auto">
          <div className="w-full max-w-4xl space-y-4 sm:space-y-6">
            {/* Warning message about date field */}
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

            {/* Warning message about Dominio field */}
            {dominioMessage && (
              <div className="animate-fade-in">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                      Columna "Dominio" no encontrada
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {dominioMessage}
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

            {/* Auxiliary info toggle - Always available */}
            <div className="animate-fade-in">
              <button
                onClick={handleToggleAuxiliary}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAuxiliary ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Información adicional
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

                    {/* Auxiliary info from all Notion columns */}
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

            {/* Reveal button or content */}
            {!revealed ? (
              <button
                onClick={handleReveal}
                className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                Revelar contenido
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
                      {/* Show title in revealed content too */}
                      <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-border">
                        <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
                          {card.title}
                        </h2>
                        <StateBadge state={card.state} size="sm" />
                      </div>
                      
                      {Array.isArray(detailedContent?.blocks) && detailedContent.blocks.length > 0 ? (
                        <div className="relative flashcard-content-area">
                          <NotionRenderer blocks={detailedContent.blocks as NotionBlock[]} />
                        </div>
                      ) : (
                        <div className="prose prose-sm flashcard-content-area">
                          {(detailedContent?.content || card.content || 'Sin contenido disponible').split('\n').map((paragraph, i) => (
                            <p key={i} className="mb-3 last:mb-0">{paragraph}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={handleNext}
                  disabled={updatingReviewDate}
                  className="w-full mt-6 py-4 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        
        {/* Right column - Review notes and Reference points */}
        <div className={`w-80 border-l border-border bg-secondary/20 flex flex-col ${showNotesPanel ? 'flex' : 'hidden lg:flex'}`}>
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">
                Panel de Estudio
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Notas y puntos de referencia
            </p>
          </div>
          
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Notas de repaso */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium text-foreground">
                    Notas de repaso ({reviewNotes.length})
                  </h4>
                </div>
                
                {notesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cargando notas...
                  </div>
                ) : reviewNotes.length > 0 ? (
                  <div className="space-y-3">
                    {reviewNotes.map((note) => (
                  <div key={note.id} className="p-3 rounded-lg bg-background border border-border shadow-sm">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        {editingNoteId === note.id ? (
                          // Modo edición
                          <div className="space-y-2">
                            <textarea
                              value={editingNoteText}
                              onChange={(e) => {
                                setEditingNoteText(e.target.value);
                                // Auto-resize del textarea
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSaveEditNote();
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  handleCancelEditNote();
                                }
                              }}
                              onFocus={(e) => {
                                // Auto-resize al hacer focus
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                              }}
                              className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border focus:border-primary/50 focus:outline-none transition-colors resize-none min-h-[80px] max-h-[200px]"
                              autoFocus
                              placeholder="Edita tu nota... (Shift+Enter para nueva línea, Enter para guardar, Esc para cancelar)"
                              rows={3}
                              style={{
                                height: 'auto',
                                minHeight: '80px'
                              }}
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={handleCancelEditNote}
                                className="px-3 py-1.5 text-xs rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1"
                                title="Cancelar edición (Esc)"
                              >
                                <XIcon className="w-3 h-3" />
                                Cancelar
                              </button>
                              <button
                                onClick={handleSaveEditNote}
                                disabled={!editingNoteText.trim() || updateNoteMutation.isPending}
                                className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center gap-1"
                                title="Guardar cambios (Enter)"
                              >
                                {updateNoteMutation.isPending ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Guardando...
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3 h-3" />
                                    Guardar
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Modo visualización
                          <>
                            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                              {renderFormattedText(note.content)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(note.createdAt, { addSuffix: true, locale: es })}
                            </p>
                          </>
                        )}
                      </div>
                      {editingNoteId !== note.id && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleStartEditNote(note.id, note.content)}
                            className="p-1 rounded hover:bg-secondary/50 hover:text-foreground transition-colors flex-shrink-0"
                            title="Editar nota"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            disabled={deleteNoteMutation.isPending}
                            className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors flex-shrink-0"
                            title="Eliminar nota"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <MessageSquare className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Sin notas de repaso</p>
                      <p className="text-xs text-muted-foreground mt-1">Agrega notas sobre lo que no dominabas</p>
                    </div>
                  )}
                </div>

                {/* Puntos de referencia */}
                <ReferencePointsPanel
                  referencePoints={referencePoints}
                  onNavigateToReference={handleNavigateToReference}
                  isLoading={referencePointsLoading}
                />
              </div>
            
            {/* Add new note */}
            <div className="border-t border-border p-4 bg-background/50">
              {!showNoteInput ? (
                <button
                  onClick={() => setShowNoteInput(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg border border-dashed border-border transition-colors"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  Agregar nota de repaso
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {quickNotes.map((quick) => (
                      <button
                        key={quick}
                        onClick={() => {
                          const formattedQuick = `**${quick}**: `;
                          setNoteText(noteText ? `${noteText}\n${formattedQuick}` : formattedQuick);
                        }}
                        className="px-2 py-1 text-xs rounded bg-secondary border border-border hover:border-primary/50 hover:text-primary transition-colors font-medium"
                      >
                        {quick}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddNote();
                        }
                      }}
                      placeholder="Escribe qué no dominabas... (Shift+Enter para nueva línea, Enter para enviar)"
                      className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border focus:border-primary/50 focus:outline-none transition-colors resize-none min-h-[60px] max-h-[120px]"
                      autoFocus
                      rows={2}
                      style={{
                        height: 'auto',
                        minHeight: '60px'
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowNoteInput(false);
                          setNoteText("");
                        }}
                        className="px-3 py-2 text-sm rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAddNote}
                        disabled={!noteText.trim() || addNoteMutation.isPending}
                        className="flex-1 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                      >
                        {addNoteMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Guardar nota
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary">
        <div 
          className="h-full bg-state-verde transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
        />
      </div>

      {/* Create Reference Point Dialog */}
      <CreateReferencePointDialog
        open={showCreateReferenceDialog}
        onOpenChange={setShowCreateReferenceDialog}
        selectedText={selectedTextForReference}
        onCreateReferencePoint={handleCreateReferencePoint}
        isCreating={createReferencePointMutation.isPending}
      />
      
      {/* Botón flotante para crear puntos de referencia */}
      <FloatingReferenceButton
        onCreateReference={handleTextSelectionForReference}
      />
    </div>
  );
}