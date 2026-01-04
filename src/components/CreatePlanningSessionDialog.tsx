import React, { useState } from 'react';
import { DatabaseGroup, Database, CreatePlanningSessionData } from '@/types';
import { useCreatePlanningSession } from '@/hooks/usePlanning';
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
  Plus
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
  const [formData, setFormData] = useState<CreatePlanningSessionData>({
    sessionName: '',
    databaseId: '',
    sessionNote: '',
    studyMode: 'review'
  });

  const createMutation = useCreatePlanningSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sessionName.trim()) {
      toast.error('El nombre de la sesión es requerido');
      return;
    }
    
    if (!formData.databaseId) {
      toast.error('Debes seleccionar una base de datos');
      return;
    }

    try {
      await createMutation.mutateAsync({
        groupId: group.id,
        sessionData: formData
      });
      
      toast.success('Sesión de planificación creada exitosamente');
      setOpen(false);
      
      // Limpiar formulario
      setFormData({
        sessionName: '',
        databaseId: '',
        sessionNote: '',
        studyMode: 'review'
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error creando la sesión');
    }
  };

  const handleInputChange = (field: keyof CreatePlanningSessionData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

          {/* Base de datos */}
          <div className="space-y-2">
            <Label htmlFor="database">Base de datos</Label>
            <Select 
              value={formData.databaseId} 
              onValueChange={(value) => handleInputChange('databaseId', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una base de datos" />
              </SelectTrigger>
              <SelectContent>
                {databases.map((database) => (
                  <SelectItem key={database.id} value={database.id}>
                    <div className="flex items-center gap-2">
                      <span>{database.icon}</span>
                      <span>{database.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({database.cardCount} tarjetas)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
    </Dialog>
  );
};