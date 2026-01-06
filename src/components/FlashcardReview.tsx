import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Flashcard, KnowledgeState } from "@/types";
import { StateBadge } from "./StateBadge";
import { NotionRenderer } from "./NotionRenderer";
import type { NotionBlock } from "./NotionRenderer";
import { ChevronDown, ChevronUp, ChevronRight, Clock, Link2, StickyNote, X, MessageSquarePlus, Send, Loader2, Trash2, AlertCircle, MessageSquare, RotateCcw, Edit3, Check, X as XIcon, Bookmark } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useFlashcardContent } from "@/hooks/useNotion";
import { useReviewNotes, useAddReviewNote, useDeleteReviewNote, useUpdateReviewNote } from "@/hooks/useReviewNotes";
import { useFlashcardReviewCount } from "@/hooks/useStudyTracking";
import { useReferencePoints, useCreateReferencePoint, useTextSelection, type ReferencePoint } from "@/hooks/useReferencePoints";
import { ReferencePointsPanel } from "./ReferencePointsPanel";
import { CreateReferencePointDialog } from "./CreateReferencePointDialog";
import { FloatingReferenceButton } from "./FloatingReferenceButton";

const REFERENCE_HIGHLIGHT_ATTR = 'data-reference-highlight';

interface ExtendedTooltip extends HTMLElement {
  cleanup?: () => void;
}

type TextNodeIndexEntry = {
  node: Text | null;
  start: number;
  end: number;
};

const clearReferenceHighlights = (container: Element) => {
  const highlights = container.querySelectorAll(`[${REFERENCE_HIGHLIGHT_ATTR}="true"]`);
  highlights.forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    // Reemplazar el span por su contenido de texto
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
    parent.normalize();
  });
};

const BLOCK_TAGS = new Set([
  'P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'BLOCKQUOTE', 'PRE', 'UL', 'OL', 'SECTION', 'ARTICLE'
]);

const closestBlock = (el: Element | null, container: Element) => {
  let current: Element | null = el;
  while (current && current !== container) {
    if (BLOCK_TAGS.has(current.tagName)) return current;
    current = current.parentElement;
  }
  return container;
};

const buildTextIndex = (container: Element) => {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const text = node as Text;
      if (!text.data || text.data.length === 0) return NodeFilter.FILTER_REJECT;

      const parentEl = text.parentElement;
      if (!parentEl) return NodeFilter.FILTER_REJECT;

      // Evitar textos no visibles típicos
      const tag = parentEl.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const entries: TextNodeIndexEntry[] = [];
  let fullText = '';
  let current: Node | null;

  let prevTextNode: Text | null = null;

  while ((current = walker.nextNode())) {
    const node = current as Text;

    if (prevTextNode) {
      const prevBlock = closestBlock(prevTextNode.parentElement, container);
      const nextBlock = closestBlock(node.parentElement, container);

      // Si cambiamos de bloque, insertar un separador virtual.
      if (prevBlock !== nextBlock) {
        const sepStart = fullText.length;
        fullText += '\n';
        const sepEnd = fullText.length;
        // node null = entrada virtual (no corresponde a un Text real)
        entries.push({ node: null, start: sepStart, end: sepEnd });
      }
    }

    const start = fullText.length;
    fullText += node.data;
    const end = fullText.length;
    entries.push({ node, start, end });

    prevTextNode = node;
  }

  return { fullText, entries };
};

const resolveDomPosition = (entries: TextNodeIndexEntry[], offset: number) => {
  // Clamp
  const last = entries[entries.length - 1];
  if (!last) return null;
  const clamped = Math.max(0, Math.min(offset, last.end));

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (clamped >= entry.start && clamped <= entry.end) {
      if (entry.node) {
        return {
          node: entry.node,
          offset: clamped - entry.start,
        };
      }

      // Entrada virtual (\n). Intentar anclar al final del Text previo o al inicio del siguiente.
      for (let j = i - 1; j >= 0; j--) {
        const prev = entries[j];
        if (prev.node) return { node: prev.node, offset: prev.node.data.length };
      }
      for (let j = i + 1; j < entries.length; j++) {
        const next = entries[j];
        if (next.node) return { node: next.node, offset: 0 };
      }
      return null;
    }
  }

  // fallback: último nodo real
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.node) return { node: e.node, offset: e.node.data.length };
  }
  return null;
};

const createRangeFromOffsets = (entries: TextNodeIndexEntry[], start: number, end: number) => {
  const startPos = resolveDomPosition(entries, start);
  const endPos = resolveDomPosition(entries, end);
  if (!startPos || !endPos) return null;

  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);
  return range;
};

const wrapRangeWithHighlight = (container: Element, range: Range, color: string) => {
  // Importante: modificaremos nodos, así que primero capturamos los Text nodes candidatos.
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  const textNodes: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) {
    textNodes.push(current as Text);
  }

  let firstHighlightEl: HTMLElement | null = null;

  for (const textNode of textNodes) {
    if (!range.intersectsNode(textNode)) continue;
    const textLen = textNode.data.length;
    if (textLen === 0) continue;

    // Calcular intersección del range con este text node
    const nodeRange = document.createRange();
    nodeRange.selectNodeContents(textNode);

    const startOffset = range.compareBoundaryPoints(Range.START_TO_START, nodeRange) <= 0
      ? 0
      : range.startContainer === textNode
        ? range.startOffset
        : (() => {
          // Si el range empieza después del inicio de este nodo, entonces es 0; si empieza dentro de otro nodo, puede ser 0.
          // Para intersección parcial sin ser startContainer, solo nos importa que intersectsNode ya filtró.
          return 0;
        })();

    const endOffset = range.compareBoundaryPoints(Range.END_TO_END, nodeRange) >= 0
      ? textLen
      : range.endContainer === textNode
        ? range.endOffset
        : (() => {
          return textLen;
        })();

    const localStart = Math.max(0, Math.min(startOffset, textLen));
    const localEnd = Math.max(0, Math.min(endOffset, textLen));
    if (localEnd <= localStart) continue;

    // Split: [before][middle][after]
    let middleNode = textNode;
    if (localEnd < middleNode.data.length) {
      middleNode.splitText(localEnd);
    }
    if (localStart > 0) {
      middleNode = middleNode.splitText(localStart);
    }

    const span = document.createElement('span');
    span.setAttribute(REFERENCE_HIGHLIGHT_ATTR, 'true');
    span.style.backgroundColor = `${color}40`;
    span.style.borderBottom = `2px solid ${color}`;
    span.style.borderRadius = '2px';
    span.style.padding = '0 1px';

    const parent = middleNode.parentNode;
    if (!parent) continue;
    parent.insertBefore(span, middleNode);
    span.appendChild(middleNode);

    if (!firstHighlightEl) firstHighlightEl = span;
  }

  return firstHighlightEl;
};

const canonicalizeWhitespaceWithMap = (input: string) => {
  // Convierte cualquier secuencia de whitespace (espacios, \n, \t, etc.) en un solo espacio.
  // Devuelve también un mapeo canonIndex -> originalIndex.
  let canon = '';
  const map: number[] = [];
  let inWs = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    // Notion/HTML a veces introduce NBSP o caracteres invisibles
    const isZeroWidth = ch === '\u200B' || ch === '\u200C' || ch === '\u200D' || ch === '\uFEFF';
    const isNbsp = ch === '\u00A0' || ch === '\u202F';
    const isWs = isZeroWidth || isNbsp || /\s/.test(ch);

    if (isWs) {
      if (!inWs) {
        canon += ' ';
        map.push(i);
        inWs = true;
      }
      continue;
    }

    inWs = false;
    canon += ch;
    map.push(i);
  }

  return { canon, map };
};

const mapCanonicalRangeToOriginal = (canonStart: number, canonEnd: number, map: number[], originalLength: number) => {
  if (map.length === 0) return null;
  const safeStart = Math.max(0, Math.min(canonStart, map.length - 1));
  const safeEnd = Math.max(0, Math.min(canonEnd, map.length));
  if (safeEnd <= safeStart) return null;

  const origStart = map[safeStart];
  const origEnd = safeEnd >= map.length ? originalLength : (map[safeEnd - 1] + 1);
  return { origStart, origEnd };
};

interface FlashcardReviewProps {
  card: Flashcard;
  currentIndex: number;
  totalCards: number;
  onClose: () => void;
  onNext: () => void;
  onRepeat: () => void; // Nueva función para repetir al final
  onPrevious?: () => void;
  onStateChange: (state: KnowledgeState) => void;
  cardsToRepeatCount?: number; // Contador de flashcards para repetir
}

export function FlashcardReview({
  card,
  currentIndex,
  totalCards,
  onClose,
  onNext,
  onRepeat,
  onPrevious,
  onStateChange,
  cardsToRepeatCount = 0
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

  // Estado para filtro de notas de repaso
  const [noteFilter, setNoteFilter] = useState<string>('all');
  const [showReviewNotes, setShowReviewNotes] = useState(true);

  // Estados para puntos de referencia
  const [showCreateReferenceDialog, setShowCreateReferenceDialog] = useState(false);
  const [selectedTextForReference, setSelectedTextForReference] = useState("");
  const [selectionContext, setSelectionContext] = useState<{
    contextBefore: string;
    contextAfter: string;
  } | null>(null);

  // Estado para el tooltip activo
  const [activeTooltip, setActiveTooltip] = useState<ExtendedTooltip | null>(null);

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
  const handleToggleAuxiliary = useCallback(() => {
    const newValue = !showAuxiliary;
    setShowAuxiliary(newValue);
    // Guardar la preferencia en localStorage para mantenerla durante la sesión
    localStorage.setItem('flashcard-show-auxiliary', newValue.toString());
  }, [showAuxiliary]);

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
      
      // Limpiar tooltip activo al cambiar de flashcard
      if (activeTooltip && activeTooltip.parentNode) {
        // Limpiar event listeners si existen
        if (activeTooltip.cleanup) {
          activeTooltip.cleanup();
        }
        activeTooltip.remove();
        setActiveTooltip(null);
      }
    } finally {
      setUpdatingReviewDate(false);
      onNext();
    }
  }, [card.id, updatingReviewDate, onNext, activeTooltip]);

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

      // Atajo para mostrar/ocultar información adicional
      if (key === 'i' || key === 'I') {
        event.preventDefault();
        console.log('🎯 Tecla I - Toggle información adicional');
        handleToggleAuxiliary();
        return;
      }

      // Atajo para repetir al final
      if (key === 'r' || key === 'R') {
        event.preventDefault();
        console.log('🎯 Tecla R - Repetir al final');
        onRepeat();
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
  }, [onNext, onRepeat, onPrevious, currentIndex, handleNext, handleReveal, handleStateChange, revealed, handleToggleAuxiliary]);

  // Función para cerrar y limpiar tooltip
  const handleClose = useCallback(() => {
    // Limpiar tooltip activo al cerrar
    if (activeTooltip && activeTooltip.parentNode) {
      // Limpiar event listeners si existen
      if (activeTooltip.cleanup) {
        activeTooltip.cleanup();
      }
      activeTooltip.remove();
      setActiveTooltip(null);
    }
    onClose();
  }, [activeTooltip, onClose]);

  // Limpiar tooltip al desmontar el componente
  useEffect(() => {
    return () => {
      if (activeTooltip && activeTooltip.parentNode) {
        // Limpiar event listeners si existen
        if (activeTooltip.cleanup) {
          activeTooltip.cleanup();
        }
        activeTooltip.remove();
      }
    };
  }, [activeTooltip]);

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
      const contentArea = document.querySelector('.flashcard-content-area');
      if (contentArea) {
        const { range } = selectionData;
        const commonAncestor = range.commonAncestorContainer;
        const commonEl = commonAncestor.nodeType === Node.ELEMENT_NODE
          ? (commonAncestor as Element)
          : (commonAncestor.parentElement);
        if (!commonEl || !contentArea.contains(commonEl)) {
          return;
        }
      }

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
    // Limpiar tooltip anterior si existe
    if (activeTooltip && activeTooltip.parentNode) {
      // Limpiar event listeners si existen
      if (activeTooltip.cleanup) {
        activeTooltip.cleanup();
      }
      activeTooltip.remove();
      setActiveTooltip(null);
    }

    const textToFind = referencePoint.selectedText;

    setTimeout(() => {
      const contentArea = document.querySelector('.flashcard-content-area');
      if (!contentArea) return;

      clearReferenceHighlights(contentArea);

      const { fullText, entries } = buildTextIndex(contentArea);
      if (!fullText || entries.length === 0) return;

      const tryExactMatch = () => {
        const matches: number[] = [];
        let fromIndex = 0;
        while (fromIndex <= fullText.length) {
          const idx = fullText.indexOf(textToFind, fromIndex);
          if (idx === -1) break;
          matches.push(idx);
          fromIndex = idx + Math.max(1, textToFind.length);
        }

        let chosenIndex: number | null = null;

        if (matches.length === 1) {
          chosenIndex = matches[0];
        } else if (matches.length > 1) {
          // Desambiguar con contexto si existe
          const before = referencePoint.contextBefore || '';
          const after = referencePoint.contextAfter || '';

          for (const idx of matches) {
            const prevSlice = before
              ? fullText.slice(Math.max(0, idx - before.length), idx)
              : '';
            const nextSlice = after
              ? fullText.slice(idx + textToFind.length, idx + textToFind.length + after.length)
              : '';

            const beforeOk = !before || prevSlice === before;
            const afterOk = !after || nextSlice === after;
            if (beforeOk && afterOk) {
              chosenIndex = idx;
              break;
            }
          }

          if (chosenIndex === null) {
            chosenIndex = matches[0];
          }
        }

        if (chosenIndex === null) return null;
        return { start: chosenIndex, end: chosenIndex + textToFind.length };
      };

      const tryCanonicalMatch = () => {
        const { canon: canonFull, map } = canonicalizeWhitespaceWithMap(fullText);
        const { canon: canonNeedle } = canonicalizeWhitespaceWithMap(textToFind);

        if (!canonNeedle || canonNeedle.trim().length === 0) return null;

        const matches: number[] = [];
        let fromIndex = 0;
        while (fromIndex <= canonFull.length) {
          const idx = canonFull.indexOf(canonNeedle, fromIndex);
          if (idx === -1) break;
          matches.push(idx);
          fromIndex = idx + Math.max(1, canonNeedle.length);
        }

        let chosenCanonIndex: number | null = null;

        if (matches.length === 1) {
          chosenCanonIndex = matches[0];
        } else if (matches.length > 1) {
          const before = referencePoint.contextBefore || '';
          const after = referencePoint.contextAfter || '';
          const { canon: canonBefore } = canonicalizeWhitespaceWithMap(before);
          const { canon: canonAfter } = canonicalizeWhitespaceWithMap(after);

          for (const idx of matches) {
            const prevSlice = canonBefore
              ? canonFull.slice(Math.max(0, idx - canonBefore.length), idx)
              : '';
            const nextSlice = canonAfter
              ? canonFull.slice(idx + canonNeedle.length, idx + canonNeedle.length + canonAfter.length)
              : '';

            const beforeOk = !canonBefore || prevSlice === canonBefore;
            const afterOk = !canonAfter || nextSlice === canonAfter;
            if (beforeOk && afterOk) {
              chosenCanonIndex = idx;
              break;
            }
          }

          if (chosenCanonIndex === null) {
            chosenCanonIndex = matches[0];
          }
        }

        if (chosenCanonIndex === null) return null;

        const mapped = mapCanonicalRangeToOriginal(
          chosenCanonIndex,
          chosenCanonIndex + canonNeedle.length,
          map,
          fullText.length
        );
        if (!mapped) return null;

        return { start: mapped.origStart, end: mapped.origEnd };
      };

      const tryFlexibleMatch = () => {
        // Búsqueda más flexible que maneja texto dividido por elementos HTML
        const words = textToFind.trim().split(/\s+/);
        if (words.length === 0) return null;

        // Buscar la primera palabra
        const firstWord = words[0];
        const matches: number[] = [];
        let fromIndex = 0;
        
        while (fromIndex <= fullText.length) {
          const idx = fullText.indexOf(firstWord, fromIndex);
          if (idx === -1) break;
          
          // Verificar si podemos encontrar las palabras siguientes cerca
          let currentPos = idx + firstWord.length;
          let allWordsFound = true;
          let endPos = currentPos;
          
          for (let i = 1; i < words.length; i++) {
            const word = words[i];
            // Buscar la siguiente palabra dentro de un rango razonable (máximo 50 caracteres)
            const searchEnd = Math.min(currentPos + 50, fullText.length);
            const wordIdx = fullText.indexOf(word, currentPos);
            
            if (wordIdx === -1 || wordIdx > searchEnd) {
              allWordsFound = false;
              break;
            }
            
            currentPos = wordIdx + word.length;
            endPos = currentPos;
          }
          
          if (allWordsFound) {
            matches.push(idx);
          }
          
          fromIndex = idx + 1;
        }

        if (matches.length > 0) {
          // Usar la primera coincidencia encontrada
          const startIdx = matches[0];
          // Calcular el final basado en la posición de la última palabra
          let endIdx = startIdx + textToFind.length;
          
          // Intentar encontrar el final real
          const lastWord = words[words.length - 1];
          const lastWordPos = fullText.indexOf(lastWord, startIdx);
          if (lastWordPos !== -1) {
            endIdx = lastWordPos + lastWord.length;
          }
          
          return { start: startIdx, end: endIdx };
        }

        return null;
      };

      const exact = tryExactMatch();
      const canonical = exact ? null : tryCanonicalMatch();
      const flexible = (exact || canonical) ? null : tryFlexibleMatch();
      const resolved = exact || canonical || flexible;

      if (!resolved) {
        try {
          const { canon: canonFull } = canonicalizeWhitespaceWithMap(fullText);
          const { canon: canonNeedle } = canonicalizeWhitespaceWithMap(textToFind);
          console.debug('❌ ReferencePoint: match no encontrado', {
            referenceId: referencePoint.id,
            referenceName: referencePoint.referenceName,
            selectedTextLen: textToFind.length,
            containerTextLen: fullText.length,
            canonSelectedTextLen: canonNeedle.length,
            canonContainerTextLen: canonFull.length,
            selectedTextPreview: textToFind.slice(0, 120),
            containerPreview: fullText.slice(0, 500),
            canonSelectedTextPreview: canonNeedle.slice(0, 120),
            canonContainerPreview: canonFull.slice(0, 500),
            contextBefore: referencePoint.contextBefore,
            contextAfter: referencePoint.contextAfter,
            hasFlashcardContentArea: !!contentArea,
          });
          
          // Búsqueda de depuración adicional
          const words = textToFind.trim().split(/\s+/);
          console.debug('� Antálisis de palabras:', {
            words,
            firstWordInContent: fullText.includes(words[0]),
            lastWordInContent: words.length > 1 ? fullText.includes(words[words.length - 1]) : 'N/A',
            allWordsInContent: words.every(word => fullText.includes(word))
          });
          
          // Señal útil: ¿alguna palabra larga aparece en el contenedor?
          const token = canonNeedle.split(' ').filter(t => t.length >= 8)[0];
          if (token) {
            console.debug('🔎 token check', { token, foundInCanonContainer: canonFull.includes(token) });
          }
        } catch (e) {
          console.debug('❌ ReferencePoint: fallo al loggear diagnóstico', e);
        }

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
        return;
      }

      const start = resolved.start;
      const end = resolved.end;
      const range = createRangeFromOffsets(entries, start, end);
      if (!range) return;

      const firstHighlight = wrapRangeWithHighlight(contentArea, range, referencePoint.color);
      if (firstHighlight) {
        firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        
        // Esperar un poco para que el scroll termine
        setTimeout(() => {
          // Crear tooltip posicionado justo arriba del resaltado
          const tooltip = document.createElement('div') as ExtendedTooltip;
          tooltip.textContent = `📍 ${referencePoint.referenceName}`;
          
          // Obtener posición del elemento resaltado después del scroll
          const rect = firstHighlight.getBoundingClientRect();
          
          // Calcular posición del tooltip usando coordenadas de viewport (fixed)
          let tooltipTop = rect.top - 100; // 100px arriba del resaltado (aumentado para evitar solapamiento)
          let tooltipLeft = rect.left + (rect.width / 2);
          
          // Ajustar si el tooltip se sale por arriba
          if (rect.top < 110) { // Ajustado también el umbral
            tooltipTop = rect.bottom + 20; // Mostrar abajo si no hay espacio arriba (aumentado margen)
          }
          
          // Ajustar si el tooltip se sale por los lados
          const tooltipWidth = 450; // ancho máximo estimado (aumentado para tooltip más ancho)
          if (tooltipLeft - tooltipWidth/2 < 10) {
            tooltipLeft = tooltipWidth/2 + 10; // Margen izquierdo
          } else if (tooltipLeft + tooltipWidth/2 > window.innerWidth - 10) {
            tooltipLeft = window.innerWidth - tooltipWidth/2 - 10; // Margen derecho
          }
          
          tooltip.style.cssText = `
            position: fixed; 
            top: ${tooltipTop}px; 
            left: ${tooltipLeft}px;
            transform: translateX(-50%);
            background: ${referencePoint.color}; 
            color: white; 
            padding: 10px 16px;
            border-radius: 10px; 
            font-size: 16px; 
            font-weight: 600;
            box-shadow: 0 6px 16px rgba(0,0,0,0.4); 
            z-index: 1000; 
            border: 2px solid white;
            opacity: 0.95; 
            text-align: center; 
            max-width: 450px;
            min-width: 120px;
            word-wrap: break-word; 
            line-height: 1.3;
            pointer-events: none;
            animation: fadeInTooltip 0.3s ease-out;
          `;
          
          // Agregar animación CSS
          if (!document.getElementById('tooltip-animation-style')) {
            const style = document.createElement('style');
            style.id = 'tooltip-animation-style';
            style.textContent = `
              @keyframes fadeInTooltip {
                from { opacity: 0; transform: translateX(-50%) translateY(10px); }
                to { opacity: 0.95; transform: translateX(-50%) translateY(0); }
              }
            `;
            document.head.appendChild(style);
          }
          
          // Agregar una pequeña flecha apuntando hacia el resaltado
          const arrow = document.createElement('div');
          const showArrowUp = rect.top >= 110; // Mostrar flecha hacia arriba si hay espacio (ajustado)
          
          arrow.style.cssText = `
            position: absolute;
            ${showArrowUp ? 'top: 100%;' : 'bottom: 100%;'}
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            ${showArrowUp 
              ? `border-top: 8px solid ${referencePoint.color};` 
              : `border-bottom: 8px solid ${referencePoint.color};`
            }
          `;
          tooltip.appendChild(arrow);

          document.body.appendChild(tooltip);
          
          // Guardar referencia del tooltip activo (no se remueve automáticamente)
          setActiveTooltip(tooltip);
          
          // Función para actualizar posición del tooltip al hacer scroll
          const updateTooltipPosition = () => {
            const newRect = firstHighlight.getBoundingClientRect();
            
            // Calcular nueva posición
            let newTooltipTop = newRect.top - 100; // 100px arriba del resaltado (aumentado)
            let newTooltipLeft = newRect.left + (newRect.width / 2);
            
            // Ajustar si se sale por arriba
            if (newRect.top < 110) { // Ajustado también el umbral
              newTooltipTop = newRect.bottom + 20; // Mostrar abajo si no hay espacio arriba (aumentado margen)
            }
            
            // Ajustar si se sale por los lados
            const tooltipWidth = 450; // ancho máximo estimado (aumentado para tooltip más ancho)
            if (newTooltipLeft - tooltipWidth/2 < 10) {
              newTooltipLeft = tooltipWidth/2 + 10;
            } else if (newTooltipLeft + tooltipWidth/2 > window.innerWidth - 10) {
              newTooltipLeft = window.innerWidth - tooltipWidth/2 - 10;
            }
            
            // Actualizar posición del tooltip
            tooltip.style.top = `${newTooltipTop}px`;
            tooltip.style.left = `${newTooltipLeft}px`;
            
            // Actualizar flecha si es necesario
            const arrow = tooltip.querySelector('div') as HTMLElement;
            if (arrow) {
              const showArrowUp = newRect.top >= 110; // Ajustado el umbral
              arrow.style.cssText = `
                position: absolute;
                ${showArrowUp ? 'top: 100%;' : 'bottom: 100%;'}
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                ${showArrowUp 
                  ? `border-top: 8px solid ${referencePoint.color};` 
                  : `border-bottom: 8px solid ${referencePoint.color};`
                }
              `;
            }
          };
          
          // Agregar listener de scroll para actualizar posición
          const scrollContainer = document.querySelector('.flashcard-content-area')?.closest('.overflow-auto') || window;
          scrollContainer.addEventListener('scroll', updateTooltipPosition);
          
          // Agregar función de cleanup al tooltip
          (tooltip as ExtendedTooltip).cleanup = () => {
            scrollContainer.removeEventListener('scroll', updateTooltipPosition);
            window.removeEventListener('scroll', updateTooltipPosition);
            window.removeEventListener('resize', updateTooltipPosition);
          };
          
          // Guardar referencia del tooltip activo (no se remueve automáticamente)
          setActiveTooltip(tooltip);
          
          // Guardar función de limpieza en el tooltip para uso posterior
          tooltip.cleanup = () => {
            window.removeEventListener('scroll', updateTooltipPosition);
            window.removeEventListener('resize', updateTooltipPosition);
          };
        }, 300); // Esperar 300ms para que termine el scroll
      }
    }, 100);
  };

  const quickNotes = ["No dominaba o no tenía en cuenta", "Próximo a investigar o tener en cuenta", "Sinónimo", "definición formal", "ejemplo", "Preguntas", "Active Recall", "Explicación de relación"];

  // Mapeo de colores para las notas que coinciden con categorías de puntos de referencia
  const getNoteColor = (noteText: string) => {
    const colorMap: Record<string, string> = {
      "No dominaba o no tenía en cuenta": "#EF4444",
      "Próximo a investigar o tener en cuenta": "#F59E0B", 
      "ejemplo": "#10B981"
    };
    
    // Limpiar el texto de los dos puntos al final si los tiene
    const cleanText = noteText.replace(/:\s*$/, '');
    
    return colorMap[cleanText] || colorMap[noteText] || "#6B7280"; // Color por defecto (gris)
  };

  // Filtrar notas de repaso según el filtro seleccionado
  const filteredReviewNotes = useMemo(() => {
    if (noteFilter === 'all') {
      return reviewNotes;
    }
    return reviewNotes.filter(note => 
      note.content.toLowerCase().includes(noteFilter.toLowerCase())
    );
  }, [reviewNotes, noteFilter]);

  // Función para extraer texto plano del contenido
  const extractPlainText = (): string => {
    if (Array.isArray(detailedContent?.blocks) && detailedContent.blocks.length > 0) {
      // Extraer texto de bloques de Notion usando un enfoque más seguro
      const extractTextFromBlocks = (blocks: unknown[]): string => {
        return blocks.map(block => {
          if (typeof block !== 'object' || !block) return '';
          
          const blockObj = block as Record<string, unknown>;
          const blockType = blockObj.type as string;
          
          // Función helper para extraer rich_text
          const extractRichText = (richTextArray: unknown): string => {
            if (!Array.isArray(richTextArray)) return '';
            return richTextArray
              .map((text: unknown) => {
                if (typeof text === 'object' && text && 'plain_text' in text) {
                  return (text as { plain_text?: string }).plain_text || '';
                }
                return '';
              })
              .join('');
          };

          // Extraer texto según el tipo de bloque
          if (blockType === 'paragraph' && blockObj.paragraph) {
            const paragraph = blockObj.paragraph as Record<string, unknown>;
            return extractRichText(paragraph.rich_text);
          }
          if (blockType === 'heading_1' && blockObj.heading_1) {
            const heading = blockObj.heading_1 as Record<string, unknown>;
            return extractRichText(heading.rich_text);
          }
          if (blockType === 'heading_2' && blockObj.heading_2) {
            const heading = blockObj.heading_2 as Record<string, unknown>;
            return extractRichText(heading.rich_text);
          }
          if (blockType === 'heading_3' && blockObj.heading_3) {
            const heading = blockObj.heading_3 as Record<string, unknown>;
            return extractRichText(heading.rich_text);
          }
          if (blockType === 'bulleted_list_item' && blockObj.bulleted_list_item) {
            const listItem = blockObj.bulleted_list_item as Record<string, unknown>;
            return extractRichText(listItem.rich_text);
          }
          if (blockType === 'numbered_list_item' && blockObj.numbered_list_item) {
            const listItem = blockObj.numbered_list_item as Record<string, unknown>;
            return extractRichText(listItem.rich_text);
          }
          if (blockType === 'quote' && blockObj.quote) {
            const quote = blockObj.quote as Record<string, unknown>;
            return extractRichText(quote.rich_text);
          }
          if (blockType === 'code' && blockObj.code) {
            const code = blockObj.code as Record<string, unknown>;
            return extractRichText(code.rich_text);
          }
          if (blockType === 'callout' && blockObj.callout) {
            const callout = blockObj.callout as Record<string, unknown>;
            return extractRichText(callout.rich_text);
          }
          
          // Procesar bloques hijos si existen
          if ('children' in blockObj && Array.isArray(blockObj.children)) {
            return extractTextFromBlocks(blockObj.children);
          }
          
          return '';
        }).filter(text => text.trim().length > 0).join('\n');
      };
      
      return extractTextFromBlocks(detailedContent.blocks);
    }
    
    return detailedContent?.content || card.content || '';
  };

  // Función para renderizar texto con formato markdown básico (negrita)
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Texto en negrita
        const boldText = part.slice(2, -2);
        const color = getNoteColor(boldText);
        return (
          <strong 
            key={index} 
            className="font-semibold" 
            style={{ color }}
          >
            {boldText}
          </strong>
        );
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
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="text-sm text-muted-foreground">
            {currentIndex + 1} de {totalCards}
            {cardsToRepeatCount > 0 && (
              <span className="ml-2 px-2 py-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium">
                🔄 {cardsToRepeatCount} para repetir
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground/70 hidden sm:block">
            ⏎ revelar | ← → navegar | 1️⃣2️⃣3️⃣ estados | 🅁 repetir
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
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">I</span>
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
                
                {/* Botones de navegación */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={onRepeat}
                    className="flex-1 py-4 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
                    title="Marcar para repetir al final de la sesión"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Repetir al final
                    {cardsToRepeatCount > 0 && (
                      <span className="bg-yellow-700 text-yellow-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                        {cardsToRepeatCount}
                      </span>
                    )}
                  </button>
                  
                  <button
                    onClick={handleNext}
                    disabled={updatingReviewDate}
                    className="flex-1 py-4 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {updatingReviewDate ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Actualizando...
                      </>
                    ) : (
                      'Siguiente tarjeta'
                    )}
                  </button>
                </div>
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
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowReviewNotes(!showReviewNotes)}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showReviewNotes ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <StickyNote className="w-4 h-4" />
                    <span>Notas de repaso</span>
                    {reviewNotes.length > 0 && (
                      <span className="ml-1 px-2 py-0.5 text-xs bg-secondary text-secondary-foreground rounded-full">
                        {filteredReviewNotes.length}
                      </span>
                    )}
                  </button>
                  
                  {/* Filtro de notas */}
                  {reviewNotes.length > 0 && showReviewNotes && (
                    <select
                      value={noteFilter}
                      onChange={(e) => setNoteFilter(e.target.value)}
                      className="text-xs px-2 py-1 rounded bg-background border border-border text-foreground focus:border-primary/50 focus:outline-none max-w-32"
                    >
                      <option value="all">Todas ({reviewNotes.length})</option>
                      {quickNotes.map((noteType) => {
                        const count = reviewNotes.filter(note => 
                          note.content.toLowerCase().includes(noteType.toLowerCase())
                        ).length;
                        return count > 0 ? (
                          <option key={noteType} value={noteType} style={{ color: getNoteColor(noteType) }}>
                            {noteType} ({count})
                          </option>
                        ) : null;
                      })}
                    </select>
                  )}
                </div>
                
                {showReviewNotes && (
                  <>
                    {notesLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cargando notas...
                      </div>
                    ) : filteredReviewNotes.length > 0 ? (
                      <div className="space-y-3">
                        {filteredReviewNotes.map((note) => (
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
                      {noteFilter === 'all' ? (
                        <>
                          <p className="text-sm text-muted-foreground">Sin notas de repaso</p>
                          <p className="text-xs text-muted-foreground mt-1">Agrega notas sobre lo que no dominabas</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">Sin notas de tipo "{noteFilter}"</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            <button 
                              onClick={() => setNoteFilter('all')}
                              className="text-primary hover:text-primary/80 transition-colors"
                            >
                              Ver todas las notas
                            </button>
                          </p>
                        </>
                      )}
                    </div>
                  )}
                  </>
                )}
              </div>

              {/* Puntos de referencia */}
                <ReferencePointsPanel
                  referencePoints={referencePoints}
                  onNavigateToReference={handleNavigateToReference}
                  isLoading={referencePointsLoading}
                  contentText={extractPlainText()}
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
                        className="px-2 py-1 text-xs rounded bg-secondary border border-border hover:border-primary/50 transition-colors font-medium"
                        style={{ color: getNoteColor(quick) }}
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