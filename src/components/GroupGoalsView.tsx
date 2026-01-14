import React, { useState } from 'react';
import { DatabaseGroup } from '@/types';
import { 
  ArrowLeft, 
  Target, 
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  Edit3,
  Trash2,
  Loader2
} from 'lucide-react';
import { 
  useGroupGoals, 
  useCreateGroupGoal, 
  useUpdateGroupGoal, 
  useDeleteGroupGoal 
} from '@/hooks/useGroupGoals';
import { toast } from 'sonner';

interface GroupGoalsViewProps {
  group: DatabaseGroup;
  onBack: () => void;
}

export const GroupGoalsView: React.FC<GroupGoalsViewProps> = ({
  group,
  onBack
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    dueDate: ''
  });

  // Hooks de React Query
  const { data: goals = [], isLoading } = useGroupGoals(group.id);
  const createGoalMutation = useCreateGroupGoal();
  const updateGoalMutation = useUpdateGroupGoal();
  const deleteGoalMutation = useDeleteGroupGoal();

  const handleCreateGoal = () => {
    if (!newGoal.title.trim()) return;

    createGoalMutation.mutate({
      groupId: group.id,
      data: {
        title: newGoal.title.trim(),
        description: newGoal.description.trim() || undefined,
        dueDate: newGoal.dueDate || undefined
      }
    }, {
      onSuccess: () => {
        toast.success('Meta creada exitosamente');
        setNewGoal({ title: '', description: '', dueDate: '' });
        setShowCreateForm(false);
      },
      onError: () => {
        toast.error('Error al crear la meta');
      }
    });
  };

  const handleEditGoal = (goal: any) => {
    setEditingGoalId(goal.id);
    setNewGoal({
      title: goal.title,
      description: goal.description || '',
      dueDate: goal.dueDate ? new Date(goal.dueDate).toISOString().split('T')[0] : ''
    });
    setShowCreateForm(true);
  };

  const handleUpdateGoal = () => {
    if (!newGoal.title.trim() || !editingGoalId) return;

    updateGoalMutation.mutate({
      goalId: editingGoalId,
      groupId: group.id,
      updates: {
        title: newGoal.title.trim(),
        description: newGoal.description.trim() || undefined,
        dueDate: newGoal.dueDate || undefined
      }
    }, {
      onSuccess: () => {
        toast.success('Meta actualizada exitosamente');
        setEditingGoalId(null);
        setNewGoal({ title: '', description: '', dueDate: '' });
        setShowCreateForm(false);
      },
      onError: () => {
        toast.error('Error al actualizar la meta');
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingGoalId(null);
    setNewGoal({ title: '', description: '', dueDate: '' });
    setShowCreateForm(false);
  };

  const toggleGoalCompletion = (goalId: string, currentCompleted: boolean) => {
    updateGoalMutation.mutate({
      goalId,
      groupId: group.id,
      updates: { completed: !currentCompleted }
    }, {
      onSuccess: () => {
        toast.success(!currentCompleted ? 'Meta completada' : 'Meta marcada como pendiente');
      },
      onError: () => {
        toast.error('Error al actualizar la meta');
      }
    });
  };

  const deleteGoal = (goalId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta meta?')) return;

    deleteGoalMutation.mutate({
      goalId,
      groupId: group.id
    }, {
      onSuccess: () => {
        toast.success('Meta eliminada exitosamente');
      },
      onError: () => {
        toast.error('Error al eliminar la meta');
      }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header con navegación */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al grupo
        </button>
        
        <button 
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva meta
        </button>
      </div>
      
      {/* Información del grupo */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div 
            className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${group.color}20` }}
          >
            <Target className="w-8 h-8" style={{ color: group.color }} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Metas y Objetivos: {group.name}
            </h1>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cargando metas...</span>
              </div>
            ) : (
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  <span>{goals.length} meta{goals.length !== 1 ? 's' : ''} total{goals.length !== 1 ? 'es' : ''}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{goals.filter(g => g.completed).length} completada{goals.filter(g => g.completed).length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Formulario de creación/edición */}
      {showCreateForm && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {editingGoalId ? 'Editar Meta' : 'Nueva Meta'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Título de la meta *
              </label>
              <input
                type="text"
                value={newGoal.title}
                onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ej: Completar todas las flashcards de nivel verde"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Descripción
              </label>
              <textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe los detalles de esta meta..."
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none resize-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Fecha límite (opcional)
              </label>
              <input
                type="date"
                value={newGoal.dueDate}
                onChange={(e) => setNewGoal(prev => ({ ...prev, dueDate: e.target.value }))}
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:border-primary/50 focus:outline-none"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={editingGoalId ? handleUpdateGoal : handleCreateGoal}
                disabled={!newGoal.title.trim() || createGoalMutation.isPending || updateGoalMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(createGoalMutation.isPending || updateGoalMutation.isPending) && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {editingGoalId ? 'Actualizar meta' : 'Crear meta'}
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de metas */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Metas del grupo</h2>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-16 bg-card border border-border rounded-lg">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : goals.length > 0 ? (
          <div className="space-y-3">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className={`bg-card border border-border rounded-lg p-4 transition-all duration-200 ${
                  goal.completed ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleGoalCompletion(goal.id, goal.completed)}
                    disabled={updateGoalMutation.isPending}
                    className="mt-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {goal.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <h3 className={`font-medium text-foreground mb-1 ${
                      goal.completed ? 'line-through text-muted-foreground' : ''
                    }`}>
                      {goal.title}
                    </h3>
                    
                    {goal.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {goal.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Creada {new Date(goal.createdAt).toLocaleDateString('es-ES')}
                      </span>
                      {goal.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Vence {new Date(goal.dueDate).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditGoal(goal)}
                      disabled={updateGoalMutation.isPending}
                      className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                      title="Editar meta"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      disabled={deleteGoalMutation.isPending}
                      className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                      title="Eliminar meta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card border border-border rounded-lg">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto mb-4">
                <Target className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Sin metas definidas
              </h3>
              <p className="text-muted-foreground mb-6">
                Establece objetivos claros para tu aprendizaje en este grupo.
                Las metas te ayudan a mantener el enfoque y medir tu progreso.
              </p>
              <button 
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Crear primera meta
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};