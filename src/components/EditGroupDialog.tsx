import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search } from "lucide-react";
import { useUpdateGroup } from "@/hooks/useGroups";
import { useNotionDatabases } from "@/hooks/useNotion";
import { Checkbox } from "@/components/ui/checkbox";
import { DatabaseGroup } from "@/types";
import { ColorPicker } from "@/components/ColorPicker";

interface EditGroupDialogProps {
  group: DatabaseGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditGroupDialog({ group, open, onOpenChange }: EditGroupDialogProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const updateGroupMutation = useUpdateGroup();
  const { data: allDatabases = [], isLoading: databasesLoading } = useNotionDatabases(open);

  // Filtrar bases de datos localmente (mucho más rápido)
  const filteredDatabases = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    return allDatabases.filter(db => 
      db.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 10); // Limitar a 10 resultados
  }, [allDatabases, searchQuery]);

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
      await updateGroupMutation.mutateAsync({
        groupId: group.id,
        updates: {
          name: name.trim(),
          color: selectedColor,
          databaseIds: selectedDatabases, // Ya son strings
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
      <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Editar agrupación</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
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
            <ColorPicker
              selectedColor={selectedColor}
              onColorChange={setSelectedColor}
            />

            {/* Bases de datos */}
            <div className="space-y-2">
              <Label>Bases de datos</Label>

              {/* Buscador */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar bases de datos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Resultados de búsqueda */}
              {searchQuery.length > 0 && (
                <div className="border rounded-md">
                  {databasesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Cargando bases de datos...</span>
                    </div>
                  ) : filteredDatabases.length > 0 ? (
                    <div className="max-h-32 overflow-y-auto space-y-2 p-2">
                      {filteredDatabases.map((database) => (
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
                            <span className="text-xs text-muted-foreground ml-2">
                              ({database.cardCount} tarjetas)
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <span className="text-sm text-muted-foreground">
                        No se encontraron bases de datos con "{searchQuery}"
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Bases de datos seleccionadas */}
              {selectedDatabases.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Bases de datos seleccionadas ({selectedDatabases.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedDatabases.map((dbId) => {
                      const database = allDatabases.find(db => db.id === dbId);
                      return database ? (
                        <div key={dbId} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-sm">
                          <span>{database.icon}</span>
                          <span>{database.name}</span>
                          <button
                            type="button"
                            onClick={() => handleDatabaseToggle(dbId)}
                            className="ml-1 text-muted-foreground hover:text-foreground"
                          >
                            ×
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {searchQuery.length === 0 && !databasesLoading && (
                <div className="text-center py-4 border rounded-md border-dashed">
                  <span className="text-sm text-muted-foreground">
                    Escribe para buscar bases de datos
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-2 pt-4 flex-shrink-0 border-t mt-4">
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
              disabled={!name.trim() || updateGroupMutation.isPending}
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