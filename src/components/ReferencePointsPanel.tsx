import React, { useState } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ReferencePointsPanelProps {
  referencePoints: ReferencePoint[];
  onNavigateToReference: (referencePoint: ReferencePoint) => void;
  isLoading?: boolean;
}

const CATEGORIES = [
  { value: 'general', label: 'General', color: '#3B82F6' },
  { value: 'definition', label: 'Definición', color: '#10B981' },
  { value: 'example', label: 'Ejemplo', color: '#F59E0B' },
  { value: 'important', label: 'Importante', color: '#EF4444' },
  { value: 'question', label: 'Pregunta', color: '#8B5CF6' },
  { value: 'formula', label: 'Fórmula', color: '#06B6D4' },
  { value: 'concept', label: 'Concepto', color: '#84CC16' },
];

export const ReferencePointsPanel: React.FC<ReferencePointsPanelProps> = ({
  referencePoints,
  onNavigateToReference,
  isLoading = false,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const handleDelete = async (referenceId: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este punto de referencia?')) {
      try {
        await deleteReferencePoint.mutateAsync(referenceId);
      } catch (error) {
        console.error('Error deleting reference point:', error);
      }
    }
  };

  const getCategoryData = (category: string) => {
    return CATEGORIES.find(cat => cat.value === category) || CATEGORIES[0];
  };

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
    <div className="space-y-3">
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
              {referencePoints.length}
            </Badge>
          )}
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="space-y-2">
          {referencePoints.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay puntos de referencia</p>
              <p className="text-xs mt-1">
                Selecciona texto y crea tu primer punto de referencia
              </p>
            </div>
          ) : (
            referencePoints.map((referencePoint) => {
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
                            <h4 className="text-sm font-medium text-foreground truncate">
                              {referencePoint.referenceName}
                            </h4>
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
                            onClick={() => handleEdit(referencePoint)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(referencePoint.id)}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            disabled={deleteReferencePoint.isPending}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Texto seleccionado (preview) */}
                      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border-l-2"
                           style={{ borderLeftColor: categoryData.color }}>
                        <p className="line-clamp-2">
                          "{referencePoint.selectedText}"
                        </p>
                      </div>

                      {/* Botón de navegación */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNavigateToReference(referencePoint)}
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
    </div>
  );
};