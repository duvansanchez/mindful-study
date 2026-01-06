import React, { useState, useEffect } from 'react';
import { ReferencePoint, useUpdateReferencePoint } from '@/hooks/useReferencePoints';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bookmark, StickyNote, Save, Edit3, Loader2 } from 'lucide-react';

interface ReferencePointNoteModalProps {
  referencePoint: ReferencePoint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReferencePointNoteModal: React.FC<ReferencePointNoteModalProps> = ({
  referencePoint,
  open,
  onOpenChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [noteText, setNoteText] = useState('');
  const updateReferencePoint = useUpdateReferencePoint();

  // Inicializar el texto de la nota cuando se abre el modal
  useEffect(() => {
    if (referencePoint) {
      setNoteText(referencePoint.notes || '');
      setIsEditing(false);
    }
  }, [referencePoint]);

  if (!referencePoint) return null;

  const handleSaveNote = async () => {
    try {
      await updateReferencePoint.mutateAsync({
        referenceId: referencePoint.id,
        updates: {
          notes: noteText.trim() || null,
        },
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating reference point note:', error);
    }
  };

  const handleCancelEdit = () => {
    setNoteText(referencePoint.notes || '');
    setIsEditing(false);
  };

  const handleClose = () => {
    if (isEditing) {
      handleCancelEdit();
    }
    onOpenChange(false);
  };

  const getCategoryData = (category: string) => {
    const CATEGORIES = [
      { value: 'no-dominaba', label: 'No dominaba o no tenía en cuenta', color: '#EF4444' },
      { value: 'investigar', label: 'Próximo a investigar o tener en cuenta', color: '#F59E0B' },
      { value: 'ejemplo', label: 'Ejemplo', color: '#10B981' },
      { value: 'frase', label: 'Frase', color: '#8B5CF6' },
    ];
    return CATEGORIES.find(cat => cat.value === category) || CATEGORIES[0];
  };

  const categoryData = getCategoryData(referencePoint.category);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />
            Nota del Punto de Referencia
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Información del punto de referencia */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-3 mb-3">
              <div 
                className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5" 
                style={{ backgroundColor: categoryData.color }}
              />
              <div className="flex-1">
                <h3 className="font-medium text-foreground mb-1">
                  {referencePoint.referenceName}
                </h3>
                <p className="text-xs text-muted-foreground mb-2">
                  {categoryData.label}
                </p>
                <div className="text-sm text-muted-foreground bg-background rounded p-2 border border-border/50">
                  <span className="font-medium">Texto seleccionado:</span>
                  <p className="mt-1 italic">"{referencePoint.selectedText}"</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-muted-foreground" />
                <h4 className="font-medium text-foreground">Notas</h4>
              </div>
              
              {!isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="h-7"
                >
                  <Edit3 className="w-3 h-3 mr-1" />
                  {noteText.trim() ? 'Editar' : 'Agregar'}
                </Button>
              )}
            </div>
            
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Escribe tus notas sobre este punto de referencia..."
                  className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border focus:border-primary/50 focus:outline-none transition-colors resize-y min-h-[120px] max-h-[400px]"
                  rows={5}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={updateReferencePoint.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveNote}
                    disabled={updateReferencePoint.isPending}
                  >
                    {updateReferencePoint.isPending ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="w-3 h-3 mr-1" />
                        Guardar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {noteText.trim() ? (
                  <div className="p-4 rounded-lg bg-background border border-border max-h-[300px] overflow-y-auto">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {noteText}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-border text-center">
                    <StickyNote className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      No hay notas para este punto de referencia
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Haz clic en "Agregar" para añadir una nota
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {!isEditing && (
          <DialogFooter className="flex-shrink-0 mt-4">
            <Button variant="outline" onClick={handleClose}>
              Cerrar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};