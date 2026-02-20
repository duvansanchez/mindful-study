import React from 'react';
import { useQueries } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Loader2, Target } from 'lucide-react';
import { DatabaseGroup, PlanningSession } from '@/types';
import { GroupGoal } from '@/hooks/useGroupGoals';

const API_BASE = 'http://localhost:3002';

interface GroupGeneralInfoViewProps {
  groups: DatabaseGroup[];
  onBack: () => void;
}

export const GroupGeneralInfoView: React.FC<GroupGeneralInfoViewProps> = ({ groups, onBack }) => {
  const planningQueries = useQueries({
    queries: groups.map((group) => ({
      queryKey: ['planning-sessions', 'general-info', group.id],
      queryFn: async (): Promise<PlanningSession[]> => {
        const response = await fetch(`${API_BASE}/groups/${group.id}/planning-sessions?t=${Date.now()}`);
        if (!response.ok) {
          return [];
        }

        const data = await response.json();
        return data.map((session: any) => ({
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

        const data = await response.json();
        return data.map((goal: any) => ({
          ...goal,
          createdAt: new Date(goal.createdAt),
          updatedAt: new Date(goal.updatedAt)
        }));
      },
      enabled: groups.length > 0,
    })),
  });

  const isLoading = planningQueries.some((q) => q.isLoading) || goalsQueries.some((q) => q.isLoading);

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
                        <li key={session.id} className="text-sm text-muted-foreground">
                          {session.sessionName} ({session.studyMode})
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
