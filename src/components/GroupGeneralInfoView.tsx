import React, { useState, useEffect } from 'react';
import { useQueries } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Loader2, Target, Edit3, X, StickyNote } from 'lucide-react';
import { DatabaseGroup, Flashcard, PlanningSession } from '@/types';
import { GroupGoal } from '@/hooks/useGroupGoals';
import { NotionService } from '@/services/notion';
import { RichTextEditor } from './RichTextEditor';
import { MarkdownRenderer } from './MarkdownRenderer';

const API_BASE = 'http://localhost:3002';

interface GroupGeneralInfoViewProps {
  groups: DatabaseGroup[];
  onBack: () => void;
  onStartSession?: (databaseId: string, flashcards: Flashcard[], studyMode: string) => void;
}

type PlanningSessionApi = Omit<PlanningSession, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

type GroupGoalApi = Omit<GroupGoal, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

export const GroupGeneralInfoView: React.FC<GroupGeneralInfoViewProps> = ({ groups, onBack, onStartSession }) => {
  const [startingSessionId, setStartingSessionId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [globalNotes, setGlobalNotes] = useState('');
  const [loadingGlobalNotes, setLoadingGlobalNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  // Cargar notas globales al montar el componente
  useEffect(() => {
    loadGlobalNotes();
  }, []);

  const loadGlobalNotes = async () => {
    try {
      setLoadingGlobalNotes(true);
      const response = await fetch(`${API_BASE}/global-notes/group-info`);
      if (response.ok) {
        const data = await response.json() as { notes: string };
        setGlobalNotes(data.notes || '');
      }
    } catch (error) {
      console.error('Error cargando notas globales:', error);
    } finally {
      setLoadingGlobalNotes(false);
    }
  };

  const handleSaveGlobalNotes = async () => {
    try {
      setSavingNotes(true);
      const response = await fetch(`${API_BASE}/global-notes/group-info`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: globalNotes })
      });

      if (response.ok) {
        setEditingNotes(false);
        console.log('✅ Notas globales guardadas');
      } else {
        alert('Error al guardar las notas');
      }
    } catch (error) {
      console.error('Error guardando notas globales:', error);
      alert('Error al guardar las notas');
    } finally {
      setSavingNotes(false);
    }
  };

  const formatStudyMode = (mode: PlanningSession['studyMode']) => {
    if (mode === 'overview') return 'Vista general';
    if (mode === 'matching') return 'Matching';
    return 'Repaso';
  };

  const planningQueries = useQueries({
    queries: groups.map((group) => ({
      queryKey: ['planning-sessions', 'general-info', group.id],
      queryFn: async (): Promise<PlanningSession[]> => {
        const response = await fetch(`${API_BASE}/groups/${group.id}/planning-sessions?t=${Date.now()}`);
        if (!response.ok) {
          return [];
        }

        const data = await response.json() as PlanningSessionApi[];
        return data.map((session) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt)
        }));
      },
      enabled: groups.length > 0,
    })),
  });

  const goalsQueries = useQueries({
    queries: groups.map((group) => ({
      queryKey: ['group-goals', 'general-info', group.id],
      queryFn: async (): Promise<GroupGoal[]> => {
        const response = await fetch(`${API_BASE}/groups/${group.id}/goals`);
        if (!response.ok) {
          return [];
        }

        const data = await response.json() as GroupGoalApi[];
        return data.map((goal) => ({
          ...goal,
          createdAt: new Date(goal.createdAt),
          updatedAt: new Date(goal.updatedAt)
        }));
      },
      enabled: groups.length > 0,
    })),
  });

  const isLoading = planningQueries.some((q) => q.isLoading) || goalsQueries.some((q) => q.isLoading);

  const handleStartSession = async (session: PlanningSession) => {
    if (!onStartSession || startingSessionId) return;

    setStartingSessionId(session.id);
    try {
      const databaseIds = session.databaseIds || (session.databaseId ? [session.databaseId] : []);

      if (databaseIds.length === 0) {
        alert('No hay bases de datos configuradas para esta sesión.');
        return;
      }

      const promises = databaseIds.map(async (dbId) => {
        const flashcards = await NotionService.getFlashcardsFromDatabase(dbId);
        return flashcards.map((flashcard) => ({ ...flashcard, databaseId: dbId }));
      });

      const results = await Promise.all(promises);
      const allFlashcards = results.flat();

      let finalFlashcards = allFlashcards;
      if (session.selectedFlashcards && session.selectedFlashcards.length > 0) {
        const selectedIds = new Set(session.selectedFlashcards);
        finalFlashcards = allFlashcards.filter((flashcard) => selectedIds.has(flashcard.id));
      }

      if (finalFlashcards.length === 0) {
        alert('No hay flashcards disponibles para esta sesión.');
        return;
      }

      onStartSession(session.databaseId, finalFlashcards, session.studyMode);
    } catch (error) {
      console.error('Error cargando flashcards desde información general:', error);
      alert('Error al cargar las flashcards. Intenta de nuevo.');
    } finally {
      setStartingSessionId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Información general agrupaciones</h1>
        <p className="text-muted-foreground">
          Resumen de planificaciones y metas/objetivos de cada agrupación.
        </p>
      </div>

      {/* Sección de Notas de agrupaciones */}
      <section className="bg-card border border-border rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Notas de agrupaciones</h2>
          </div>
          {!editingNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              disabled={loadingGlobalNotes}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Editar
            </button>
          )}
        </div>

        {editingNotes ? (
          <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">Editando notas</span>
              <button
                onClick={() => setEditingNotes(false)}
                className="p-1 hover:bg-secondary rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <RichTextEditor
              value={globalNotes}
              onChange={setGlobalNotes}
              placeholder="Escribe aquí tus notas... Usa checkboxes (- [ ]), headers (# ## ###), resaltados, listas, etc."
              disabled={savingNotes}
            />
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveGlobalNotes}
                disabled={savingNotes}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingNotes ? 'Guardando...' : 'Guardar notas'}
              </button>
              <button
                onClick={() => setEditingNotes(false)}
                className="flex-1 px-4 py-2 border border-border rounded font-medium hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-muted/50 p-4 rounded-lg border border-border min-h-[100px]">
            {loadingGlobalNotes ? (
              <div className="flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : globalNotes ? (
              <MarkdownRenderer content={globalNotes} />
            ) : (
              <p className="text-muted-foreground italic">Sin notas agregadas. Haz clic en "Editar" para añadir notas.</p>
            )}
          </div>
        )}
      </section>

      {isLoading && (
        <div className="flex items-center justify-center py-16 bg-card border border-border rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && groups.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          No hay agrupaciones disponibles.
        </div>
      )}

      {!isLoading && groups.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {groups.map((group, index) => {
            const planningSessions = planningQueries[index]?.data ?? [];
            const goals = goalsQueries[index]?.data ?? [];

            return (
              <div key={group.id} className="bg-card border border-border rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">{group.name}</h2>
                  <span className="text-xs text-muted-foreground">
                    {planningSessions.length} planificaciones · {goals.length} metas
                  </span>
                </div>

                <section className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Calendar className="w-4 h-4" />
                    Planificaciones
                  </div>

                  {planningSessions.length > 0 ? (
                    <ul className="space-y-1">
                      {planningSessions.map((session) => (
                        <li key={session.id} className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                          <span>{session.sessionName} ({session.studyMode})</span>
                          <button
                            onClick={() => handleStartSession(session)}
                            disabled={startingSessionId === session.id}
                            className="px-2 py-1 rounded border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                          >
                            {startingSessionId === session.id ? 'Cargando...' : 'Usar planificación'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin planificaciones.</p>
                  )}
                </section>

                <section className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Target className="w-4 h-4" />
                    Metas y objetivos
                  </div>

                  {goals.length > 0 ? (
                    <ul className="space-y-1">
                      {goals.map((goal) => (
                        <li key={goal.id} className="text-sm text-muted-foreground">
                          {goal.title} {goal.completed ? '· Completada' : '· Pendiente'}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin metas u objetivos.</p>
                  )}
                </section>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
