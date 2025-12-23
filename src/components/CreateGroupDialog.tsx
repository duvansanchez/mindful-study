import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Search } from "lucide-react";
import { useCreateGroup } from "@/hooks/useGroups";
import { useNotionDatabases } from "@/hooks/useNotion";
import { Checkbox } from "@/components/ui/checkbox";

interface CreateGroupDialogProps {
  children?: React.ReactNode;
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

export function CreateGroupDialog({ children }: CreateGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const createGroupMutation = useCreateGroup();
  const { data: allDatabases = [], isLoading: databasesLoading } = useNotionDatabases(open);

  // Filtrar bases de datos localmente (mucho más rápido)
  const filteredDatabases = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    return allDatabases.filter(db => 
      db.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 10); // Limitar a 10 resultados
  }, [allDatabases, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    try {
      await createGroupMutation.mutateAsync({
        name: name.trim(),
        color: selectedColor,
        databaseIds: selectedDatabases, // Ya son strings
      });
      
      // Resetear formulario y cerrar dialog
      setName('');
      setSelectedColor('#3B82F6');
      setSelectedDatabases([]);
      setSearchQuery('');
      setOpen(false);
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const handleDatabaseToggle = (databaseId: string) => {
    setSelectedDatabases(prev => 
      prev.includes(databaseId)
        ? prev.filter(id => id !== databaseId)
        : [...prev, databaseId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nueva agrupación
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear nueva agrupación</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la agrupación</Label>
            <Input
              id="name"
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
            <Label>Bases de datos (opcional)</Label>
            
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
                          id={database.id}
                          checked={selectedDatabases.includes(database.id)}
                          onCheckedChange={() => handleDatabaseToggle(database.id)}
                        />
                        <Label
                          htmlFor={database.id}
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

          {/* Botones */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createGroupMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createGroupMutation.isPending}
            >
              {createGroupMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando agrupación...
                </>
              ) : (
                'Crear agrupación'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}