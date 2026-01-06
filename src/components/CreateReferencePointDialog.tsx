import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Bookmark, Loader2 } from 'lucide-react';

interface CreateReferencePointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText: string;
  onCreateReferencePoint: (data: {
    referenceName: string;
    category: string;
    color: string;
  }) => void;
  isCreating?: boolean;
}

const CATEGORIES = [
  { value: 'no-dominaba', label: 'No dominaba o no tenía en cuenta', color: '#EF4444' },
  { value: 'investigar', label: 'Próximo a investigar o tener en cuenta', color: '#F59E0B' },
];

export const CreateReferencePointDialog: React.FC<CreateReferencePointDialogProps> = ({
  open,
  onOpenChange,
  selectedText,
  onCreateReferencePoint,
  isCreating = false,
}) => {
  const [referenceName, setReferenceName] = useState('');
  const [category, setCategory] = useState('general');
  const [color, setColor] = useState('#3B82F6');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!referenceName.trim()) {
      return;
    }

    onCreateReferencePoint({
      referenceName: referenceName.trim(),
      category,
      color,
    });
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    const categoryData = CATEGORIES.find(cat => cat.value === newCategory);
    if (categoryData) {
      setColor(categoryData.color);
    }
  };

  const handleClose = () => {
    setReferenceName('');
    setCategory('general');
    setColor('#3B82F6');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />
            Crear Punto de Referencia
          </DialogTitle>
          <DialogDescription>
            Guarda este fragmento como un punto de referencia para navegación rápida.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Texto seleccionado */}
          <div className="space-y-2">
            <Label htmlFor="selected-text">Texto seleccionado</Label>
            <Textarea
              id="selected-text"
              value={selectedText}
              readOnly
              className="min-h-[80px] bg-muted text-sm"
              placeholder="Texto seleccionado aparecerá aquí..."
            />
          </div>

          {/* Nombre del punto de referencia */}
          <div className="space-y-2">
            <Label htmlFor="reference-name">Nombre del punto de referencia *</Label>
            <Input
              id="reference-name"
              value={referenceName}
              onChange={(e) => setReferenceName(e.target.value)}
              placeholder="Ej: Definición de X, Ejemplo importante, etc."
              required
            />
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger>
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
          </div>

          {/* Preview del color */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Color de resaltado:</span>
            <div 
              className="w-4 h-4 rounded border border-border" 
              style={{ backgroundColor: color }}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!referenceName.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creando...
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4 mr-2" />
                  Crear Punto
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};