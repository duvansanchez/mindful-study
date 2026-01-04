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
  Trash2
} from 'lucide-react';

interface GroupGoalsViewProps {
  group: DatabaseGroup;
  onBack: () => void;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate?: string;
  createdAt: string;
}

export const GroupGoalsView: React.FC<GroupGoalsViewProps> = ({
  group,
  onBack
}) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    dueDate: ''
  });

  const handleCreateGoal = () => {
    if (!newGoal.title.trim()) return;

    const goal: Goal = {
      id: Date.now().toString(),
      title: newGoal.title,
      description: newGoal.description,
      completed: false,
      dueDate: newGoal.dueDate || undefined,
      createdAt: new Date().toISOString()
    };

    setGoals(prev => [...prev, goal]);
    setNewGoal({ title: '', description: '', dueDate: '' });
    setShowCreateForm(false);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setNewGoal({
      title: goal.title,
      description: goal.description,
      dueDate: goal.dueDate || ''
    });
    setShowCreateForm(true);
  };

  const handleUpdateGoal = () => {
    if (!newGoal.title.trim() || !editingGoal) return;

    setGoals(prev => prev.map(goal => 
      goal.id === editingGoal.id 
        ? {
            ...goal,
            title: newGoal.title,
            description: newGoal.description,
            dueDate: newGoal.dueDate || undefined
          }
        : goal
    ));

    setEditingGoal(null);
    setNewGoal({ title: '', description: '', dueDate: '' });
    setShowCreateForm(false);
  };

  const handleCancelEdit = () => {
    setEditingGoal(null);
    setNewGoal({ title: '', description: '', dueDate: '' });
    setShowCreateForm(false);
  };

  const toggleGoalCompletion = (goalId: string) => {
    setGoals(prev => prev.map(goal => 
      goal.id === goalId ? { ...goal, completed: !goal.completed } : goal
    ));
  };

  const deleteGoal = (goalId: string) => {
    setGoals(prev => prev.filter(goal => goal.id !== goalId));
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
          </div>
        </div>
      </div>

      {/* Formulario de creación/edición */}
      {showCreateForm && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {editingGoal ? 'Editar Meta' : 'Nueva Meta'}
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
                onClick={editingGoal ? handleUpdateGoal : handleCreateGoal}
                disabled={!newGoal.title.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingGoal ? 'Actualizar meta' : 'Crear meta'}
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
        
        {goals.length > 0 ? (
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
                    onClick={() => toggleGoalCompletion(goal.id)}
                    className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
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
                      className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Editar meta"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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