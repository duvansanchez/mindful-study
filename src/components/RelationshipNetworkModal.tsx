import React, { useRef, useEffect, useState } from 'react';
import { X, Network, Trash2, ZoomIn, ZoomOut, RotateCcw, Check, Link2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MatchingPair {
  id: string;
  title: string;
  content: string;
  fullContent: string;
  flashcardId: string;
}

interface Relationship {
  id: string;
  fromId: string;
  toId: string;
  fromType: 'title' | 'content';
  toType: 'title' | 'content';
  reason?: string;
}

interface RelationshipNetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  pairs: MatchingPair[];
  relationships: Relationship[];
  onRemoveRelationship: (relationshipId: string) => void;
}

export const RelationshipNetworkModal: React.FC<RelationshipNetworkModalProps> = ({
  isOpen,
  onClose,
  pairs,
  relationships,
  onRemoveRelationship
}) => {
  const [selectedRelationship, setSelectedRelationship] = useState<string | null>(null);
  const [, forceUpdate] = useState({});
  const [expandedContents, setExpandedContents] = useState<Set<string>>(new Set());

  // Forzar re-render después de que el DOM se actualice para calcular posiciones correctas
  useEffect(() => {
    if (isOpen && relationships.length > 0) {
      const timer = setTimeout(() => {
        forceUpdate({});
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, relationships, expandedContents]); // Agregar expandedContents para recalcular cuando cambie

  const toggleContentExpansion = (contentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  if (!isOpen) return null;

  const getRelationshipsForItem = (itemId: string, itemType: 'title' | 'content') => {
    return relationships.filter(rel => 
      (rel.fromId === itemId && rel.fromType === itemType) || 
      (rel.toId === itemId && rel.toType === itemType)
    );
  };

  const getItemStyle = (itemId: string, itemType: 'title' | 'content', hasRelationships: boolean) => {
    let baseStyle = "p-4 rounded-lg border-2 transition-all duration-200 relative ";
    
    if (hasRelationships) {
      baseStyle += "bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-200 ";
    } else {
      baseStyle += "bg-card border-border ";
    }
    
    return baseStyle;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-[95vw] h-[95vh] flex flex-col bg-background rounded-lg border shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Network className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Red de Relaciones</h2>
              <p className="text-sm text-muted-foreground">
                {relationships.length} conexiones creadas entre elementos
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedRelationship && (
              <Button
                onClick={() => {
                  onRemoveRelationship(selectedRelationship);
                  setSelectedRelationship(null);
                }}
                variant="destructive"
                size="sm"
                title="Eliminar relación seleccionada"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar relación
              </Button>
            )}
            
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {relationships.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Network className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay relaciones creadas</h3>
                <p className="text-muted-foreground">
                  Activa el modo relaciones en el matching para crear conexiones entre elementos.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto relative">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative" id="relationship-container">
                {/* Títulos con relaciones (izquierda) */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-center mb-4 text-primary">
                    Títulos
                  </h3>
                  {pairs
                    .filter(pair => {
                      // Solo mostrar títulos que tienen relaciones
                      return relationships.some(rel => 
                        (rel.fromId === pair.id && rel.fromType === 'title') ||
                        (rel.toId === pair.id && rel.toType === 'title')
                      );
                    })
                    .map((pair, index) => {
                      const titleRelationships = getRelationshipsForItem(pair.id, 'title');
                      
                      return (
                        <div
                          key={`title-${pair.id}`}
                          data-item-id={`${pair.id}-title`}
                          data-item-index={index}
                          className="p-4 rounded-lg border-2 bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-200 transition-all duration-200 relative"
                        >
                          <div className="flex items-center gap-3">
                            <div className="font-medium flex-1">{pair.title}</div>
                            <div className="flex items-center gap-1 text-blue-500">
                              <Link2 className="w-4 h-4" />
                              <span className="text-xs">{titleRelationships.length}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Contenidos con relaciones (derecha) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-primary">
                      Contenido de Notion
                    </h3>
                    {(() => {
                      const contentsWithRelations = pairs.filter(pair => {
                        return relationships.some(rel => 
                          (rel.fromId === pair.id && rel.fromType === 'content') ||
                          (rel.toId === pair.id && rel.toType === 'content')
                        );
                      });
                      
                      const expandableContent = contentsWithRelations.filter(pair => pair.fullContent.length > pair.content.length);
                      
                      if (expandableContent.length === 0) return null;
                      
                      const expandableIds = expandableContent.map(pair => pair.id);
                      const allExpandableAreExpanded = expandableIds.length > 0 && expandableIds.every(id => expandedContents.has(id));
                      
                      return (
                        <button
                          onClick={() => {
                            if (allExpandableAreExpanded) {
                              setExpandedContents(new Set());
                            } else {
                              setExpandedContents(new Set(expandableIds));
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                          title="Mostrar/ocultar todo el contenido"
                        >
                          {allExpandableAreExpanded ? (
                            <>
                              <EyeOff className="w-4 h-4" />
                              Ocultar todos
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              Mostrar todos
                            </>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                  {pairs
                    .filter(pair => {
                      // Solo mostrar contenidos que tienen relaciones
                      return relationships.some(rel => 
                        (rel.fromId === pair.id && rel.fromType === 'content') ||
                        (rel.toId === pair.id && rel.toType === 'content')
                      );
                    })
                    .map((pair, index) => {
                      const contentRelationships = getRelationshipsForItem(pair.id, 'content');
                      const isExpanded = expandedContents.has(pair.id);
                      const hasMoreContent = pair.fullContent.length > pair.content.length;
                      const displayContent = isExpanded ? pair.fullContent : pair.content;
                      
                      return (
                        <div
                          key={`content-${pair.id}`}
                          data-item-id={`${pair.id}-content`}
                          data-item-index={index}
                          className="p-4 rounded-lg border-2 bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-200 transition-all duration-200 relative"
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-sm leading-relaxed flex-1">
                              {displayContent}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="flex items-center gap-1 text-blue-500">
                                <Link2 className="w-4 h-4" />
                                <span className="text-xs">{contentRelationships.length}</span>
                              </div>
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

                {/* SVG para las líneas de conexión */}
                <svg 
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  style={{ top: 0, left: 0 }}
                >
                  <defs>
                    {/* Definir marcadores de flecha para cada color */}
                    {relationships.map((rel, index) => {
                      const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'];
                      const color = selectedRelationship === rel.id ? '#ef4444' : colors[index % colors.length];
                      return (
                        <marker
                          key={`arrow-${rel.id}`}
                          id={`arrow-${rel.id}`}
                          viewBox="0 0 10 10"
                          refX="9"
                          refY="3"
                          markerWidth="6"
                          markerHeight="6"
                          orient="auto"
                        >
                          <path d="M0,0 L0,6 L9,3 z" fill={color} />
                        </marker>
                      );
                    })}
                  </defs>
                  
                  {relationships.map((rel, index) => {
                    // Encontrar los elementos DOM para calcular posiciones reales
                    const fromElement = document.querySelector(`[data-item-id="${rel.fromId}-${rel.fromType}"]`);
                    const toElement = document.querySelector(`[data-item-id="${rel.toId}-${rel.toType}"]`);
                    
                    if (!fromElement || !toElement) return null;
                    
                    const container = document.getElementById('relationship-container');
                    if (!container) return null;
                    
                    const containerRect = container.getBoundingClientRect();
                    const fromRect = fromElement.getBoundingClientRect();
                    const toRect = toElement.getBoundingClientRect();
                    
                    // Calcular posiciones relativas al contenedor
                    const fromX = fromRect.left - containerRect.left + fromRect.width;
                    const fromY = fromRect.top - containerRect.top + fromRect.height / 2;
                    const toX = toRect.left - containerRect.left;
                    const toY = toRect.top - containerRect.top + toRect.height / 2;
                    
                    // Crear curva para evitar superposiciones
                    const midX = (fromX + toX) / 2;
                    const curveOffset = (index % 3 - 1) * 50; // Offset vertical para separar líneas
                    const controlY1 = fromY + curveOffset;
                    const controlY2 = toY + curveOffset;
                    
                    // Colores únicos para cada relación
                    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'];
                    const color = selectedRelationship === rel.id ? '#ef4444' : colors[index % colors.length];
                    
                    return (
                      <g key={rel.id}>
                        {/* Línea curva */}
                        <path
                          d={`M ${fromX} ${fromY} C ${midX} ${controlY1}, ${midX} ${controlY2}, ${toX} ${toY}`}
                          stroke={color}
                          strokeWidth={selectedRelationship === rel.id ? '4' : '3'}
                          fill="none"
                          strokeDasharray={rel.fromType === rel.toType ? '8,4' : '0'}
                          className="cursor-pointer"
                          onClick={() => setSelectedRelationship(selectedRelationship === rel.id ? null : rel.id)}
                          markerEnd={`url(#arrow-${rel.id})`}
                        />
                        
                        {/* Etiqueta en el medio de la línea */}
                        <circle
                          cx={midX}
                          cy={(controlY1 + controlY2) / 2}
                          r="12"
                          fill={color}
                          className="cursor-pointer"
                          onClick={() => setSelectedRelationship(selectedRelationship === rel.id ? null : rel.id)}
                        />
                        <text
                          x={midX}
                          y={(controlY1 + controlY2) / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="10"
                          fontWeight="bold"
                          className="cursor-pointer pointer-events-none"
                        >
                          {index + 1}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              
              {/* Lista de relaciones */}
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Relaciones Creadas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {relationships.map((rel, index) => {
                    const fromItem = pairs.find(p => p.id === rel.fromId);
                    const toItem = pairs.find(p => p.id === rel.toId);
                    
                    if (!fromItem || !toItem) return null;
                    
                    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'];
                    const relationColor = colors[index % colors.length];
                    
                    return (
                      <div 
                        key={rel.id} 
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedRelationship === rel.id 
                            ? 'border-red-400 bg-red-50 dark:bg-red-900/20' 
                            : 'border-border bg-card hover:border-blue-400'
                        }`}
                        onClick={() => setSelectedRelationship(selectedRelationship === rel.id ? null : rel.id)}
                        style={{ 
                          borderLeftWidth: '6px', 
                          borderLeftColor: relationColor 
                        }}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 mb-2">
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: relationColor }}
                            >
                              {index + 1}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {rel.fromType === rel.toType ? 'Mismo tipo' : 'Tipos diferentes'}
                            </span>
                          </div>
                          
                          <div className="text-sm">
                            <div className="font-medium text-blue-600 flex items-center gap-2">
                              {rel.fromType === 'title' ? '📋' : '📄'} 
                              <span className="truncate">
                                {rel.fromType === 'title' ? fromItem.title : fromItem.content.substring(0, 30) + '...'}
                              </span>
                            </div>
                            <div className="text-center text-muted-foreground my-1">
                              {rel.fromType === rel.toType ? '↔️' : '🔄'}
                            </div>
                            <div className="font-medium text-green-600 flex items-center gap-2">
                              {rel.toType === 'title' ? '📋' : '📄'} 
                              <span className="truncate">
                                {rel.toType === 'title' ? toItem.title : toItem.content.substring(0, 30) + '...'}
                              </span>
                            </div>
                          </div>
                          
                          {selectedRelationship === rel.id && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveRelationship(rel.id);
                                setSelectedRelationship(null);
                              }}
                              variant="destructive"
                              size="sm"
                              className="w-full mt-2"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Eliminar
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer con leyenda */}
        <div className="border-t p-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-blue-500"></div>
                <span>Línea sólida: diferentes tipos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-blue-500 border-dashed border-t-2 border-blue-500"></div>
                <span>Línea punteada: mismo tipo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">1</div>
                <span>Número de relación</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📋 Títulos</span>
                <span>📄 Contenidos</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Cada relación tiene un color y número único • Haz clic en líneas o tarjetas para seleccionar
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};