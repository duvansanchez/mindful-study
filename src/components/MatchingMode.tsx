import { useState, useEffect } from "react";
import { Flashcard } from "@/types";
import { X, Check, RotateCcw, Shuffle, Trophy, Clock, Loader2, Eye, EyeOff, Network, Link2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RelationshipNetworkModal } from "./RelationshipNetworkModal";

interface MatchingPair {
  id: string;
  title: string;
  content: string;
  fullContent: string; // Contenido completo sin truncar
  flashcardId: string;
}

interface Relationship {
  id: string;
  fromId: string;
  toId: string;
  fromType: 'title' | 'content';
  toType: 'title' | 'content';
  reason?: string; // Opcional: razón de la relación
}

interface MatchingModeProps {
  cards: Flashcard[];
  onClose: () => void;
}

export default function MatchingMode({ cards, onClose }: MatchingModeProps) {
  const [pairs, setPairs] = useState<MatchingPair[]>([]);
  const [shuffledContents, setShuffledContents] = useState<MatchingPair[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [correctMatches, setCorrectMatches] = useState<Set<string>>(new Set());
  const [incorrectMatches, setIncorrectMatches] = useState<Set<string>>(new Set());
  const [isCompleted, setIsCompleted] = useState(false);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [expandedContents, setExpandedContents] = useState<Set<string>>(new Set()); // Track expanded content items
  
  // Estados para el modo de relaciones
  const [relationshipMode, setRelationshipMode] = useState(false);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [selectedForRelation, setSelectedForRelation] = useState<{id: string, type: 'title' | 'content'} | null>(null);
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);

  // Cargar contenido de todas las flashcards al inicio
  useEffect(() => {
    const loadAllContent = async () => {
      console.log('🎮 Iniciando carga de contenido para', cards.length, 'flashcards');
      
      const gamePairs: MatchingPair[] = [];
      
      for (const card of cards) {
        if (!card.title || card.title.trim().length === 0) continue;
        
        try {
          console.log('🔍 Cargando contenido para:', card.title);
          
          // Usar el servicio de Notion directamente para obtener el contenido
          const response = await fetch(`/api/flashcards/${card.id}/content`);
          const detailedContent = await response.json();
          
          console.log('🔍 Contenido recibido para', card.title, ':', detailedContent);
          
          let extractedContent = "";
          
          // Primero intentar usar el campo content directamente
          if (detailedContent?.content && detailedContent.content.trim().length > 0) {
            extractedContent = detailedContent.content;
            console.log('🔍 Usando contenido directo para', card.title, ':', extractedContent);
          } 
          // Si no hay content, intentar extraer de bloques
          else if (Array.isArray(detailedContent?.blocks) && detailedContent.blocks.length > 0) {
            console.log('🔍 Procesando', detailedContent.blocks.length, 'bloques');
            
            const extractTextFromBlocks = (blocks: unknown[]): string => {
              return blocks.map(block => {
                if (typeof block !== 'object' || !block) return '';
                
                const blockObj = block as Record<string, unknown>;
                const blockType = blockObj.type as string;
                console.log('🔍 Procesando bloque tipo:', blockType, 'para', card.title);
                
                // Función helper para extraer rich_text
                const extractRichText = (richTextArray: unknown): string => {
                  console.log('🔍 rich_text recibido:', richTextArray);
                  if (!Array.isArray(richTextArray)) {
                    console.log('🔍 rich_text no es array');
                    return '';
                  }
                  const result = richTextArray
                    .map((text: unknown) => {
                      console.log('🔍 Procesando texto:', text);
                      if (typeof text === 'object' && text && 'plain_text' in text) {
                        const plainText = (text as { plain_text?: string }).plain_text || '';
                        console.log('🔍 plain_text extraído:', plainText);
                        return plainText;
                      }
                      return '';
                    })
                    .join('');
                  console.log('🔍 Resultado final de rich_text:', result);
                  return result;
                };

                // Extraer texto según el tipo de bloque
                if (blockType === 'paragraph' && blockObj.paragraph) {
                  const paragraph = blockObj.paragraph as Record<string, unknown>;
                  console.log('🔍 Objeto paragraph completo:', paragraph);
                  const text = extractRichText(paragraph.rich_text);
                  console.log('🔍 Texto extraído de paragraph:', text);
                  return text;
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
            
            extractedContent = extractTextFromBlocks(detailedContent.blocks);
            console.log('🔍 Contenido extraído de bloques para', card.title, ':', extractedContent);
          } else {
            // Fallback al contenido simple
            extractedContent = detailedContent?.content || card.content || '';
            console.log('🔍 Usando contenido simple para', card.title, ':', extractedContent);
          }

          // Si no hay contenido, usar el contenido básico de la flashcard
          if (!extractedContent || extractedContent.trim().length === 0) {
            extractedContent = card.content || "Sin contenido disponible";
          }

          // Guardar el contenido completo
          const fullContent = extractedContent;
          
          // Crear versión truncada para la interfaz
          let truncatedContent = extractedContent;
          if (extractedContent.length > 200) {
            const lastSpace = extractedContent.lastIndexOf(' ', 200);
            const cutPoint = lastSpace > 160 ? lastSpace : 200;
            truncatedContent = extractedContent.substring(0, cutPoint) + '...';
          }

          console.log('🔍 Contenido final para', card.title, ':', truncatedContent);
          
          gamePairs.push({
            id: card.id,
            title: card.title,
            content: truncatedContent,
            fullContent: fullContent,
            flashcardId: card.id
          });
          
        } catch (error) {
          console.error('❌ Error cargando contenido para', card.title, ':', error);
          // En caso de error, usar el contenido básico
          const fallbackContent = card.content || "Sin contenido disponible";
          gamePairs.push({
            id: card.id,
            title: card.title,
            content: fallbackContent,
            fullContent: fallbackContent,
            flashcardId: card.id
          });
        }
      }

      console.log('🎮 Matching Mode listo con', gamePairs.length, 'pares');
      setPairs(gamePairs);
      
      // Mezclar los contenidos aleatoriamente
      const shuffled = [...gamePairs].sort(() => Math.random() - 0.5);
      setShuffledContents(shuffled);
      setIsLoading(false);
    };

    if (cards.length > 0) {
      loadAllContent();
    }
  }, [cards]);

  const handleTitleClick = (titleId: string) => {
    if (relationshipMode) {
      handleRelationshipClick(titleId, 'title');
      return;
    }
    
    if (correctMatches.has(titleId)) return;
    
    setSelectedTitle(titleId);
    setSelectedContent(null);
    
    if (selectedContent) {
      tryMatch(titleId, selectedContent);
    }
  };

  const handleContentClick = (contentId: string) => {
    if (relationshipMode) {
      handleRelationshipClick(contentId, 'content');
      return;
    }
    
    if (correctMatches.has(contentId)) return;
    
    setSelectedContent(contentId);
    setSelectedTitle(null);
    
    if (selectedTitle) {
      tryMatch(selectedTitle, contentId);
    }
  };

  const handleRelationshipClick = (id: string, type: 'title' | 'content') => {
    if (!selectedForRelation) {
      // Primer elemento seleccionado
      setSelectedForRelation({ id, type });
    } else {
      // Segundo elemento seleccionado - crear relación
      if (selectedForRelation.id !== id) {
        const newRelationship: Relationship = {
          id: `${selectedForRelation.id}-${id}-${Date.now()}`,
          fromId: selectedForRelation.id,
          toId: id,
          fromType: selectedForRelation.type,
          toType: type
        };
        
        // Verificar que no exista ya esta relación
        const exists = relationships.some(rel => 
          (rel.fromId === newRelationship.fromId && rel.toId === newRelationship.toId) ||
          (rel.fromId === newRelationship.toId && rel.toId === newRelationship.fromId)
        );
        
        if (!exists) {
          setRelationships(prev => [...prev, newRelationship]);
        }
      }
      
      setSelectedForRelation(null);
    }
  };

  const tryMatch = (titleId: string, contentId: string) => {
    const isCorrect = titleId === contentId;
    
    if (isCorrect) {
      setCorrectMatches(prev => new Set([...prev, titleId]));
      
      setSelectedTitle(null);
      setSelectedContent(null);
      
      if (correctMatches.size + 1 === pairs.length) {
        setIsCompleted(true);
        setEndTime(new Date());
      }
    } else {
      // Mostrar mensaje de error sin revelar respuestas correctas
      setShowErrorMessage(true);
      
      // Limpiar la selección y el mensaje de error después de un momento
      setTimeout(() => {
        setSelectedTitle(null);
        setSelectedContent(null);
        setShowErrorMessage(false);
      }, 1500);
    }
  };

  const resetGame = () => {
    setCorrectMatches(new Set());
    setIncorrectMatches(new Set());
    setSelectedTitle(null);
    setSelectedContent(null);
    setIsCompleted(false);
    setStartTime(new Date());
    setEndTime(null);
    setShowErrorMessage(false);
    setExpandedContents(new Set()); // Reset expanded contents
    
    // Reset relationship mode
    setRelationshipMode(false);
    setRelationships([]);
    setSelectedForRelation(null);
    setShowRelationshipModal(false);
    
    const shuffled = [...pairs].sort(() => Math.random() - 0.5);
    setShuffledContents(shuffled);
  };

  const toggleContentExpansion = (contentId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the content selection
    setExpandedContents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contentId)) {
        newSet.delete(contentId);
      } else {
        newSet.add(contentId);
      }
      return newSet;
    });
  };

  const toggleRelationshipMode = () => {
    setRelationshipMode(!relationshipMode);
    setSelectedForRelation(null);
    setSelectedTitle(null);
    setSelectedContent(null);
  };

  const removeRelationship = (relationshipId: string) => {
    setRelationships(prev => prev.filter(rel => rel.id !== relationshipId));
  };

  const getRelationshipsForItem = (itemId: string) => {
    return relationships.filter(rel => rel.fromId === itemId || rel.toId === itemId);
  };

  const getElapsedTime = (): string => {
    const end = endTime || new Date();
    const elapsed = Math.floor((end.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getItemStyle = (id: string, isTitle: boolean) => {
    const isSelected = isTitle ? selectedTitle === id : selectedContent === id;
    const isCorrect = correctMatches.has(id);
    const isIncorrect = incorrectMatches.has(id);
    const isSelectedForRelation = selectedForRelation?.id === id;
    const hasRelationships = getRelationshipsForItem(id).length > 0;
    
    let baseStyle = "p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 relative ";
    
    if (relationshipMode) {
      if (isSelectedForRelation) {
        baseStyle += "bg-purple-50 border-purple-400 text-purple-800 dark:bg-purple-900/20 dark:border-purple-500 dark:text-purple-200 scale-105 ";
      } else if (hasRelationships) {
        baseStyle += "bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-200 ";
      } else {
        baseStyle += "bg-card border-border hover:border-purple/50 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 ";
      }
    } else {
      if (isCorrect) {
        baseStyle += "bg-green-50 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-600 dark:text-green-200 cursor-default ";
      } else if (isIncorrect) {
        baseStyle += "bg-red-50 border-red-300 text-red-800 dark:bg-red-900/20 dark:border-red-600 dark:text-red-200 animate-pulse ";
      } else if (isSelected) {
        baseStyle += "bg-blue-50 border-blue-400 text-blue-800 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-200 scale-105 ";
      } else {
        baseStyle += "bg-card border-border hover:border-primary/50 hover:bg-accent/50 ";
      }
    }
    
    return baseStyle;
  };

  // Pantalla de carga
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Preparando Modo Matching</h2>
          <p className="text-muted-foreground mb-4">
            Cargando contenido detallado de las flashcards desde Notion...
          </p>
        </div>
      </div>
    );
  }

  if (pairs.length === 0) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Shuffle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No hay flashcards disponibles</h2>
          <p className="text-muted-foreground mb-6">
            No se encontraron flashcards válidas para el modo matching.
          </p>
          <Button onClick={onClose}>Volver a selección de modo</Button>
        </div>
      </div>
    );
  }

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
          <div>
            <h1 className="text-xl font-semibold">Modo Matching</h1>
            <p className="text-sm text-muted-foreground">
              Conecta cada título con su contenido de Notion
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {getElapsedTime()}
          </div>
          
          <div className="text-sm text-muted-foreground">
            {correctMatches.size} / {pairs.length} completados
          </div>
          
          {relationships.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Link2 className="w-4 h-4" />
                {relationships.length} relaciones
              </span>
            </div>
          )}
          
          <Button
            onClick={() => setShowRelationshipModal(!showRelationshipModal)}
            variant="outline"
            size="sm"
            className={`flex items-center gap-2 ${relationships.length > 0 ? 'text-blue-600 border-blue-300' : ''}`}
          >
            <Network className="w-4 h-4" />
            Ver Red
          </Button>
          
          <Button
            onClick={toggleRelationshipMode}
            variant={relationshipMode ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {relationshipMode ? 'Salir de relaciones' : 'Modo relaciones'}
          </Button>
          
          <Button
            onClick={resetGame}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Shuffle className="w-4 h-4" />
            Reiniciar
          </Button>
        </div>
      </header>

      {/* Error message */}
      {showErrorMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg animate-bounce">
            ❌ ¡Incorrecto! Inténtalo de nuevo
          </div>
        </div>
      )}

      {/* Relationship mode instructions */}
      {relationshipMode && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-purple-500 text-white px-6 py-3 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              {selectedForRelation ? 
                'Selecciona otro elemento para crear una relación' : 
                'Selecciona dos elementos para relacionarlos'
              }
            </div>
          </div>
        </div>
      )}

      {/* Relationship Network Modal */}
      <RelationshipNetworkModal
        isOpen={showRelationshipModal}
        onClose={() => setShowRelationshipModal(false)}
        pairs={pairs}
        relationships={relationships}
        onRemoveRelationship={removeRelationship}
      />

      {/* Game completed overlay */}
      {isCompleted && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <div className="bg-background p-8 rounded-lg border shadow-lg text-center max-w-md">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">¡Completado!</h2>
            <p className="text-muted-foreground mb-4">
              Has emparejado todas las flashcards correctamente
            </p>
            <p className="text-lg font-semibold mb-6">
              Tiempo: {getElapsedTime()}
            </p>
            <div className="flex gap-3">
              <Button onClick={resetGame} variant="outline" className="flex-1">
                <RotateCcw className="w-4 h-4 mr-2" />
                Jugar de nuevo
              </Button>
              <Button onClick={onClose} className="flex-1">
                Finalizar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Títulos (izquierda) */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-center mb-4 text-primary">
                Títulos
              </h3>
              {pairs.map((pair) => (
                <div
                  key={`title-${pair.id}`}
                  onClick={() => handleTitleClick(pair.id)}
                  className={getItemStyle(pair.id, true)}
                >
                  <div className="flex items-center gap-3">
                    {correctMatches.has(pair.id) && !relationshipMode && (
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                    )}
                    {relationshipMode && selectedForRelation?.id === pair.id && (
                      <Zap className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    )}
                    <div className="font-medium flex-1">{pair.title}</div>
                    {getRelationshipsForItem(pair.id).length > 0 && (
                      <div className="flex items-center gap-1 text-blue-500">
                        <Link2 className="w-4 h-4" />
                        <span className="text-xs">{getRelationshipsForItem(pair.id).length}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Contenidos (derecha) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-primary">
                  Contenido de Notion
                </h3>
                <button
                  onClick={() => {
                    const expandableContent = shuffledContents.filter(pair => pair.fullContent.length > pair.content.length);
                    
                    if (expandableContent.length === 0) return;
                    
                    const expandableIds = expandableContent.map(pair => pair.id);
                    const allExpandableAreExpanded = expandableIds.every(id => expandedContents.has(id));
                    
                    if (allExpandableAreExpanded) {
                      // Contraer todos
                      setExpandedContents(new Set());
                    } else {
                      // Expandir todos los que tienen contenido adicional
                      setExpandedContents(new Set(expandableIds));
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                  title="Mostrar/ocultar todo el contenido"
                >
                  {(() => {
                    const expandableContent = shuffledContents.filter(pair => pair.fullContent.length > pair.content.length);
                    const expandableIds = expandableContent.map(pair => pair.id);
                    const allExpandableAreExpanded = expandableIds.length > 0 && expandableIds.every(id => expandedContents.has(id));
                    
                    return allExpandableAreExpanded ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Ocultar todos
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Mostrar todos
                      </>
                    );
                  })()}
                </button>
              </div>
              {shuffledContents.map((pair) => {
                const isExpanded = expandedContents.has(pair.id);
                const hasMoreContent = pair.fullContent.length > pair.content.length;
                const displayContent = isExpanded ? pair.fullContent : pair.content;
                
                return (
                  <div
                    key={`content-${pair.id}`}
                    onClick={() => handleContentClick(pair.id)}
                    className={getItemStyle(pair.id, false)}
                  >
                    <div className="flex items-start gap-3">
                      {correctMatches.has(pair.id) && !relationshipMode && (
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      )}
                      {relationshipMode && selectedForRelation?.id === pair.id && (
                        <Zap className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="text-sm leading-relaxed flex-1">
                        {displayContent}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getRelationshipsForItem(pair.id).length > 0 && (
                          <div className="flex items-center gap-1 text-blue-500">
                            <Link2 className="w-4 h-4" />
                            <span className="text-xs">{getRelationshipsForItem(pair.id).length}</span>
                          </div>
                        )}
                        {hasMoreContent && (
                          <button
                            onClick={(e) => toggleContentExpansion(pair.id, e)}
                            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            title={isExpanded ? "Mostrar menos" : "Mostrar más"}
                          >
                            {isExpanded ? (
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-secondary">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(correctMatches.size / pairs.length) * 100}%` }}
        />
      </div>
    </div>
  );
}