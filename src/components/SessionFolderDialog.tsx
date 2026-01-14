import React, { useState, useEffect } from 'react';
import { SessionFolder } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Folder, Loader2 } from 'lucide-react';

interface SessionFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder?: SessionFolder | null;
  onSave: (data: { folderName: string; color: string; icon: string }) => void;
  isLoading?: boolean;
}

const FOLDER_COLORS = [
  { value: '#3B82F6', label: 'Azul' },
  { value: '#10B981', label: 'Verde' },
  { value: '#F59E0B', label: 'Naranja' },
  { value: '#EF4444', label: 'Rojo' },
  { value: '#8B5CF6', label: 'Morado' },
  { value: '#EC4899', label: 'Rosa' },
  { value: '#6B7280', label: 'Gris' },
];

const FOLDER_ICONS = ['📁', '📂', '🗂️', '📚', '📖', '📝', '🎯', '⭐', '🔥', '💡'];

export const SessionFolderDialog: React.FC<SessionFolderDialogProps> = ({
  open,
  onOpenChange,
  folder,
  onSave,
  isLoading = false
}) => {
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [selectedIcon, setSelectedIcon] = useState('📁');

  useEffect(() => {
    if (folder) {
      setFolderName(folder.folderName);
      setSelectedColor(folder.color || '#3B82F6');
      setSelectedIcon(folder.icon || '📁');
    } else {
      setFolderName('');
      setSelectedColor('#3B82F6');
      setSelectedIcon('📁');
    }
  }, [folder, open]);

  const handleSave = () => {
    if (folderName.trim()) {
      onSave({
        folderName: folderName.trim(),
        color: selectedColor,
        icon: selectedIcon
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {folder ? 'Editar carpeta' : 'Nueva carpeta'}
          </DialogTitle>
          <DialogDescription>
            {folder 
              ? 'Modifica los detalles de la carpeta'
              : 'Crea una nueva carpeta para organizar tus sesiones de estudio'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nombre de la carpeta */}
          <div className="space-y-2">
            <Label htmlFor="folderName">Nombre de la carpeta</Label>
            <Input
              id="folderName"
              placeholder="Ej: Examen Final, Repaso Semanal..."
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && folderName.trim()) {
                  handleSave();
                }
              }}
            />
          </div>

          {/* Selector de icono */}
          <div className="space-y-2">
            <Label>Icono</Label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setSelectedIcon(icon)}
                  className={`
                    w-10 h-10 rounded-lg flex items-center justify-center text-xl
                    transition-all hover:scale-110
                    ${selectedIcon === icon 
                      ? 'bg-primary/20 ring-2 ring-primary' 
                      : 'bg-secondary hover:bg-secondary/80'
                    }
                  `}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Selector de color */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={`
                    w-10 h-10 rounded-lg transition-all hover:scale-110
                    ${selectedColor === color.value 
                      ? 'ring-2 ring-offset-2 ring-foreground' 
                      : ''
                    }
                  `}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Vista previa */}
          <div className="p-4 bg-secondary rounded-lg">
            <Label className="text-xs text-muted-foreground mb-2 block">Vista previa</Label>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{selectedIcon}</span>
              <span 
                className="font-medium"
                style={{ color: selectedColor }}
              >
                {folderName || 'Nombre de la carpeta'}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!folderName.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Folder className="w-4 h-4 mr-2" />
                {folder ? 'Guardar cambios' : 'Crear carpeta'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
