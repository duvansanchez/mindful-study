import React, { useState, useMemo } from 'react';
import { ReferencePoint, useDeleteReferencePoint, useUpdateReferencePoint } from '@/hooks/useReferencePoints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bookmark, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  MapPin,
  ChevronDown,
  ChevronRight,
  Search,
  StickyNote,
  Eye
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DeleteReferenceDialog } from './DeleteReferenceDialog';
import { ReferencePointDiagnostic } from './ReferencePointDiagnostic';
import { ReferencePointNoteModal } from './ReferencePointNoteModal';

interface ReferencePointsPanelProps {
  referencePoints: ReferencePoint[];
  onNavigateToReference: (referencePoint: ReferencePoint) => void;
  onClearTooltipAndHighlights?: () => void;
  onShowAllReferences?: () => void;
  isLoading?: boolean;
  contentText?: string; // Texto del contenido para diagnóstico
}

const CATEGORIES = [
  { value: 'no-dominaba', label: 'No dominaba o no tenía en cuenta', color: '#EF4444' },
  { value: 'investigar', label: 'Próximo a investigar o tener en cuenta', color: '#F59E0B' },
  { value: 'ejemplo', label: 'Ejemplo', color: '#10B981' },
  { value: 'frase', label: 'Frase', color: '#8B5CF6' },
];

export const ReferencePointsPanel: React.FC<ReferencePointsPanelProps> = ({
  referencePoints,
  onNavigateToReference,
  onClearTooltipAndHighlights,
  onShowAllReferences,
  isLoading = false,
  contentText = '',
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [deletingReference, setDeletingReference] = useState<ReferencePoint | null>(null);
  const [diagnosticReference, setDiagnosticReference] = useState<ReferencePoint | null>(null);
  const [noteReference, setNoteReference] = useState<ReferencePoint | null>(null);
  const [referenceFilter, setReferenceFilter] = useState<string>('all');

  const deleteReferencePoint = useDeleteReferencePoint();
  const updateReferencePoint = useUpdateReferencePoint();

  const handleEdit = (referencePoint: ReferencePoint) => {
    setEditingId(referencePoint.id);
    setEditName(referencePoint.referenceName);
    setEditCategory(referencePoint.category);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    try {
      const categoryData = CATEGORIES.find(cat => cat.value === editCategory);
      await updateReferencePoint.mutateAsync({
        referenceId: editingId,
        updates: {
          referenceName: editName.trim(),
          category: editCategory,
          color: categoryData?.color || '#3B82F6',
        },
      });
      setEditingId(null);
    } catch (error) {
      console.error('Error updating reference point:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditCategory('');
  };

  const handleDelete = async (referencePoint: ReferencePoint) => {
    setDeletingReference(referencePoint);
  };

  const handleDiagnostic = (referencePoint: ReferencePoint) => {
    setDiagnosticReference(referencePoint);
  };

  const handleShowNote = (referencePoint: ReferencePoint) => {
    // Limpiar tooltips y resaltados antes de abrir el modal
    if (onClearTooltipAndHighlights) {
      onClearTooltipAndHighlights();
    }
    setNoteReference(referencePoint);
  };

  const handleConfirmDelete = async () => {
    if (!deletingReference) return;
    
    try {
      await deleteReferencePoint.mutateAsync(deletingReference.id);
      setDeletingReference(null);
    } catch (error) {
      console.error('Error deleting reference point:', error);
    }
  };

  const getCategoryData = (category: string) => {
    return CATEGORIES.find(cat => cat.value === category) || CATEGORIES[0];
  };

  // Filtrar puntos de referencia según el filtro seleccionado
  const filteredReferencePoints = useMemo(() => {
    if (referenceFilter === 'all') {
      return referencePoints;
    }
    return referencePoints.filter(point => point.category === referenceFilter);
  }, [referencePoints, referenceFilter]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Bookmark className="w-4 h-4" />
          <span>Puntos de Referencia</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-3" data-reference-panel="true">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          <Bookmark className="w-4 h-4" />
          <span>Puntos de Referencia</span>
          {referencePoints.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {filteredReferencePoints.length}
            </Badge>
          )}
        </button>
        
        <div className="flex items-center gap-2">
          {/* Botón para mostrar todos los puntos de referencia */}
          {referencePoints.length > 0 && !isCollapsed && onShowAllReferences && (
            <Button
              size="sm"
              variant="outline"
              onClick={onShowAllReferences}
              className="h-7 px-2 text-xs"
              title="Mostrar todos los puntos de referencia en el texto"
            >
              <Eye className="w-3 h-3 mr-1" />
              Mostrar todos
            </Button>
          )}
          
          {/* Filtro de puntos de referencia */}
          {referencePoints.length > 0 && !isCollapsed && (
            <select
              value={referenceFilter}
              onChange={(e) => setReferenceFilter(e.target.value)}
              className="text-xs px-2 py-1 rounded bg-background border border-border text-foreground focus:border-primary/50 focus:outline-none max-w-32"
            >
              <option value="all">Todos ({referencePoints.length})</option>
              {CATEGORIES.map((category) => {
                const count = referencePoints.filter(point => point.category === category.value).length;
                return count > 0 ? (
                  <option key={category.value} value={category.value}>
                    {category.label} ({count})
                  </option>
                ) : null;
              })}
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="space-y-2">
          {filteredReferencePoints.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
              {referenceFilter === 'all' ? (
                <>
                  <p className="text-sm">No hay puntos de referencia</p>
                  <p className="text-xs mt-1">
                    Selecciona texto y crea tu primer punto de referencia
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm">Sin puntos de tipo "{CATEGORIES.find(cat => cat.value === referenceFilter)?.label}"</p>
                  <p className="text-xs mt-1">
                    <button 
                      onClick={() => setReferenceFilter('all')}
                      className="text-primary hover:text-primary/80 transition-colors"
                    >
                      Ver todos los puntos
                    </button>
                  </p>
                </>
              )}
            </div>
          ) : (
            filteredReferencePoints.map((referencePoint) => {
              const categoryData = getCategoryData(referencePoint.category);
              const isEditing = editingId === referencePoint.id;

              return (
                <div
                  key={referencePoint.id}
                  className="group p-3 rounded-lg border border-border hover:border-primary/50 transition-all bg-card"
                >
                  {isEditing ? (
                    /* Modo edición */
                    <div className="space-y-3">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nombre del punto de referencia"
                        className="text-sm"
                      />
                      <Select value={editCategory} onValueChange={setEditCategory}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: cat.color }}
                                />
                                {cat.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={!editName.trim() || updateReferencePoint.isPending}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={updateReferencePoint.isPending}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Modo normal */
                    <div className="space-y-2">
                      {/* Header del punto de referencia */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: categoryData.color }}
                            />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <h4 className="text-sm font-medium text-foreground truncate">
                                  {referencePoint.referenceName}
                                </h4>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-blue-600 text-white border-blue-600">
                                <p className="text-sm">{referencePoint.referenceName}</p>
                              </TooltipContent>
                            </Tooltip>
                            {/* Indicador de notas */}
                            {referencePoint.notes && referencePoint.notes.trim() && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" title="Tiene notas" />
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {categoryData.label}
                          </Badge>
                        </div>
                        
                        {/* Acciones */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleShowNote(referencePoint)}
                            className="h-6 w-6 p-0"
                            title="Ver nota"
                          >
                            <StickyNote className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDiagnostic(referencePoint)}
                            className="h-6 w-6 p-0"
                            title="Diagnosticar problema"
                          >
                            <Search className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(referencePoint)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(referencePoint)}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            disabled={deleteReferencePoint.isPending}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Texto seleccionado (preview) */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border-l-2 cursor-help hover:bg-muted/70 transition-colors"
                               style={{ borderLeftColor: categoryData.color }}>
                            <p className="line-clamp-2">
                              "{referencePoint.selectedText}"
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-md bg-slate-800 text-white border-slate-700">
                          <div className="space-y-2">
                            <div className="font-medium text-sm">Texto del punto de referencia:</div>
                            <div className="text-sm leading-relaxed whitespace-pre-wrap">
                              "{referencePoint.selectedText}"
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>

                      {/* Botón de navegación */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          console.log('🖱️ Botón "Ir al texto" clickeado para:', referencePoint.referenceName);
                          onNavigateToReference(referencePoint);
                        }}
                        className="w-full text-xs h-7"
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        Ir al texto
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
      
      {/* Diálogo de confirmación para eliminar */}
      <DeleteReferenceDialog
        referencePoint={deletingReference}
        open={!!deletingReference}
        onOpenChange={(open) => !open && setDeletingReference(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteReferencePoint.isPending}
      />

      {/* Diagnóstico de punto de referencia */}
      {diagnosticReference && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full">
            <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Diagnóstico: {diagnosticReference.referenceName}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDiagnosticReference(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4">
              <ReferencePointDiagnostic
                referencePoint={diagnosticReference}
                contentText={contentText}
                onUpdateReferencePoint={async (updates) => {
                  try {
                    await updateReferencePoint.mutateAsync({
                      referenceId: diagnosticReference.id,
                      updates
                    });
                    setDiagnosticReference(null);
                  } catch (error) {
                    console.error('Error updating reference point:', error);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de notas del punto de referencia */}
      <ReferencePointNoteModal
        referencePoint={noteReference}
        open={!!noteReference}
        onOpenChange={(open) => !open && setNoteReference(null)}
      />
      </div>
    </TooltipProvider>
  );
};