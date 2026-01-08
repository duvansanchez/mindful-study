import React, { useState, useMemo } from 'react';
import { DatabaseGroup, Database, CreatePlanningSessionData, Flashcard, FlashcardWithDatabase } from '@/types';
import { useCreatePlanningSession } from '@/hooks/usePlanning';
import { useMultipleNotionFlashcards } from '@/hooks/useNotion';
import { FlashcardSelectionDialog } from './FlashcardSelectionDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BookOpen, 
  Eye, 
  Shuffle, 
  Loader2,
  Plus,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

interface CreatePlanningSessionDialogProps {
  group: DatabaseGroup;
  databases: Database[];
  children?: React.ReactNode;
}

const studyModeOptions = [
  {
    value: 'review' as const,
    label: 'Repaso Activo',
    description: 'Flashcards tradicionales con retroalimentación',
    icon: BookOpen,
    color: 'text-blue-600'
  },
  {
    value: 'matching' as const,
    label: 'Modo Matching',
    description: 'Conecta títulos con definiciones',
    icon: Shuffle,
    color: 'text-green-600'
  },
  {
    value: 'overview' as const,
    label: 'Vista General',
    description: 'Revisión rápida de todas las tarjetas',
    icon: Eye,
    color: 'text-purple-600'
  }
];

export const CreatePlanningSessionDialog: React.FC<CreatePlanningSessionDialogProps> = ({
  group,
  databases,
  children
}) => {
  const [open, setOpen] = useState(false);
  const [flashcardSelectionOpen, setFlashcardSelectionOpen] = useState(false);
  const [formData, setFormData] = useState<CreatePlanningSessionData>({
    sessionName: '',
    databaseIds: [],
    sessionNote: '',
    studyMode: 'review',
    selectedFlashcards: []
  });

  const createMutation = useCreatePlanningSession();
  
  // Cargar flashcards de todas las bases de datos seleccionadas
  const selectedDatabases = useMemo(() => 
    databases.filter(db => formData.databaseIds?.includes(db.id)) || [],
    [databases, formData.databaseIds]
  );

  // Combinar flashcards de múltiples bases de datos y agregar información de DB
  const { flashcards: rawFlashcards, isLoading: flashcardsLoading } = useMultipleNotionFlashcards(
    formData.databaseIds || []
  );

  const allFlashcards = useMemo(() => {
    return rawFlashcards.map(flashcard => {
      const database = selectedDatabases.find(db => db.id === flashcard.databaseId);
      return {
        ...flashcard,
        databaseName: database?.name || 'Base de datos desconocida',
        databaseIcon: database?.icon || '📄'
      } as FlashcardWithDatabase;
    });
  }, [rawFlashcards, selectedDatabases]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sessionName.trim()) {
      toast.error('El nombre de la sesión es requerido');
      return;
    }
    
    if (!formData.databaseIds || formData.databaseIds.length === 0) {
      toast.error('Debes seleccionar al menos una base de datos');
      return;
    }

    try {
      // Enviar tanto databaseId (para compatibilidad) como databaseIds (para múltiples DBs)
      const sessionData = {
        ...formData,
        databaseId: formData.databaseIds[0], // Para compatibilidad con esquema actual
        databaseIds: formData.databaseIds    // Para soporte de múltiples bases de datos
      };

      console.log('🚀 Creando sesión con datos:', {
        sessionName: sessionData.sessionName,
        databaseIds: sessionData.databaseIds,
        selectedFlashcards: sessionData.selectedFlashcards?.length || 0
      });

      const result = await createMutation.mutateAsync({
        groupId: group.id,
        sessionData
      });
      
      toast.success('Sesión de planificación creada exitosamente');
      setOpen(false);
      
      // Limpiar formulario
      setFormData({
        sessionName: '',
        databaseIds: [],
        sessionNote: '',
        studyMode: 'review',
        selectedFlashcards: []
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error creando la sesión');
    }
  };

  const handleInputChange = (field: keyof CreatePlanningSessionData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOpenFlashcardSelection = () => {
    if (!formData.databaseIds || formData.databaseIds.length === 0) {
      toast.error('Primero selecciona al menos una base de datos');
      return;
    }
    setFlashcardSelectionOpen(true);
  };

  const handleFlashcardSelectionConfirm = () => {
    setFlashcardSelectionOpen(false);
    // Las flashcards ya están seleccionadas en formData.selectedFlashcards
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nueva sesión
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear nueva sesión de estudio</DialogTitle>
          <DialogDescription>
            Planifica una sesión de estudio para el grupo "{group.name}"
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre de la sesión */}
          <div className="space-y-2">
            <Label htmlFor="sessionName">Nombre de la sesión</Label>
            <Input
              id="sessionName"
              placeholder="Ej: Repaso de conceptos básicos"
              value={formData.sessionName}
              onChange={(e) => handleInputChange('sessionName', e.target.value)}
              required
            />
          </div>

          {/* Bases de datos */}
          <div className="space-y-2">
            <Label>Bases de datos</Label>
            <div className="space-y-2">
              {databases.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground border border-dashed rounded-lg text-center">
                  No hay bases de datos disponibles
                </div>
              ) : (
                <div className="grid gap-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                  {databases.map((database) => (
                    <label
                      key={database.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.databaseIds?.includes(database.id) || false}
                        onChange={(e) => {
                          const currentIds = formData.databaseIds || [];
                          const newIds = e.target.checked
                            ? [...currentIds, database.id]
                            : currentIds.filter(id => id !== database.id);
                          
                          setFormData(prev => ({
                            ...prev,
                            databaseIds: newIds,
                            selectedFlashcards: [] // Limpiar selección al cambiar bases de datos
                          }));
                        }}
                        className="rounded border-border"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-lg">{database.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{database.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {database.cardCount} tarjetas
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {formData.databaseIds && formData.databaseIds.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {formData.databaseIds.length} base{formData.databaseIds.length !== 1 ? 's' : ''} de datos seleccionada{formData.databaseIds.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>

          {/* Selección de flashcards */}
          {formData.databaseIds && formData.databaseIds.length > 0 && (
            <div className="space-y-2">
              <Label>Flashcards a incluir</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenFlashcardSelection}
                  disabled={flashcardsLoading}
                  className="flex-1"
                >
                  {flashcardsLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cargando flashcards...
                    </>
                  ) : (
                    <>
                      <Filter className="w-4 h-4 mr-2" />
                      {formData.selectedFlashcards?.length 
                        ? `${formData.selectedFlashcards.length} flashcard${formData.selectedFlashcards.length !== 1 ? 's' : ''} seleccionada${formData.selectedFlashcards.length !== 1 ? 's' : ''}`
                        : 'Seleccionar flashcards específicas'
                      }
                    </>
                  )}
                </Button>
                {formData.selectedFlashcards?.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleInputChange('selectedFlashcards', [])}
                  >
                    Limpiar
                  </Button>
                )}
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  Si no seleccionas flashcards específicas, se incluirán todas las de las bases de datos seleccionadas
                </p>
                {selectedDatabases.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span>Bases seleccionadas:</span>
                    {selectedDatabases.map((db, index) => (
                      <span key={db.id} className="inline-flex items-center gap-1">
                        <span>{db.icon}</span>
                        <span className="font-medium">{db.name}</span>
                        {index < selectedDatabases.length - 1 && <span>,</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modo de estudio */}
          <div className="space-y-2">
            <Label htmlFor="studyMode">Modo de estudio</Label>
            <Select 
              value={formData.studyMode} 
              onValueChange={(value: 'review' | 'matching' | 'overview') => 
                handleInputChange('studyMode', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {studyModeOptions.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <SelectItem key={mode.value} value={mode.value}>
                      <div className="flex items-center gap-3 py-1">
                        <Icon className={`w-4 h-4 ${mode.color}`} />
                        <div>
                          <div className="font-medium">{mode.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {mode.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Nota de la sesión */}
          <div className="space-y-2">
            <Label htmlFor="sessionNote">Nota de la sesión (opcional)</Label>
            <Textarea
              id="sessionNote"
              placeholder="Agrega notas, objetivos o recordatorios para esta sesión..."
              value={formData.sessionNote}
              onChange={(e) => handleInputChange('sessionNote', e.target.value)}
              rows={3}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear sesión
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Diálogo de selección de flashcards */}
      <FlashcardSelectionDialog
        open={flashcardSelectionOpen}
        onOpenChange={setFlashcardSelectionOpen}
        flashcards={allFlashcards}
        selectedFlashcards={formData.selectedFlashcards || []}
        onSelectionChange={(selectedIds) => handleInputChange('selectedFlashcards', selectedIds)}
        onConfirm={handleFlashcardSelectionConfirm}
        isLoading={createMutation.isPending}
        databases={selectedDatabases}
      />
    </Dialog>
  );
};