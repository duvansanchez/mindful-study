import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useUpdateGroup } from "@/hooks/useGroups";
import { useNotionDatabases } from "@/hooks/useNotion";
import { Checkbox } from "@/components/ui/checkbox";
import { DatabaseGroup } from "@/types";

interface EditGroupDialogProps {
  group: DatabaseGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const colors = [
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Púrpura', value: '#8B5CF6' },
  { name: 'Naranja', value: '#F59E0B' },
  { name: 'Rojo', value: '#EF4444' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Índigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' },
];

export function EditGroupDialog({ group, open, onOpenChange }: EditGroupDialogProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>([]);

  const updateGroupMutation = useUpdateGroup();
  const { data: databases = [], isLoading: databasesLoading } = useNotionDatabases(open); // Solo cargar cuando el diálogo esté abierto

  // Actualizar formulario cuando cambie el grupo
  useEffect(() => {
    if (group) {
      setName(group.name);
      setSelectedColor(group.color);
      setSelectedDatabases(group.databaseIds || []);
    }
  }, [group]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!group || !name.trim()) return;

    try {
      // Convertir los IDs seleccionados a objetos con id y name
      const databaseObjects = selectedDatabases.map(dbId => {
        const database = databases.find(db => db.id === dbId);
        return {
          id: dbId,
          name: database?.name || null
        };
      });

      await updateGroupMutation.mutateAsync({
        groupId: group.id,
        updates: {
          name: name.trim(),
          color: selectedColor,
          databaseIds: databaseObjects,
        },
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating group:', error);
    }
  };

  const handleDatabaseToggle = (databaseId: string) => {
    setSelectedDatabases(prev => 
      prev.includes(databaseId)
        ? prev.filter(id => id !== databaseId)
        : [...prev, databaseId]
    );
  };

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar agrupación</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nombre de la agrupación</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Tecnología, Idiomas, Ciencias..."
              required
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color.value
                      ? 'border-foreground scale-110'
                      : 'border-border hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Bases de datos */}
          <div className="space-y-2">
            <Label>Bases de datos</Label>
            {databasesLoading ? (
              <div className="flex items-center justify-center py-4 border rounded-md">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Cargando bases de datos...</span>
              </div>
            ) : databases.length > 0 ? (
              <div className="max-h-32 overflow-y-auto space-y-2 border rounded-md p-2">
                {databases.map((database) => (
                  <div key={database.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-${database.id}`}
                      checked={selectedDatabases.includes(database.id)}
                      onCheckedChange={() => handleDatabaseToggle(database.id)}
                    />
                    <Label
                      htmlFor={`edit-${database.id}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      <span className="mr-2">{database.icon}</span>
                      {database.name}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 border rounded-md">
                <span className="text-sm text-muted-foreground">No se encontraron bases de datos</span>
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateGroupMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || updateGroupMutation.isPending || databasesLoading}
            >
              {updateGroupMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando cambios...
                </>
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}