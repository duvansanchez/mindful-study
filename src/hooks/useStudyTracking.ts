import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KnowledgeState } from '@/types';

interface StudySession {
  flashcardId: string;
  databaseId: string;
  groupId?: string;
  previousState: KnowledgeState;
  newState: KnowledgeState;
  studyDurationSeconds?: number;
  reviewNotes?: string;
}

interface StudyStats {
  FlashcardsStudied: number;
  TotalStudyTimeSeconds: number;
  StateChangesTocado: number;
  StateChangesToVerde: number;
  StateChangesToSolido: number;
  StudyDays: number;
}

// Hook para registrar una sesión de estudio
export const useRecordStudySession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: StudySession) => {
      const response = await fetch('/api/study-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(session),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidar estadísticas relacionadas
      queryClient.invalidateQueries({ queryKey: ['study-stats'] });
      queryClient.invalidateQueries({ queryKey: ['last-study', variables.groupId] });
    },
    onError: (error) => {
      console.error('Error recording study session:', error);
    },
  });
};

// Hook para obtener estadísticas de estudio
export const useStudyStats = (
  groupId?: string,
  period: 'day' | 'week' | 'month' = 'day',
  offset: number = 0,
  databaseId?: string
) => {
  return useQuery({
    queryKey: ['study-stats', groupId, period, offset, databaseId],
    queryFn: async (): Promise<StudyStats> => {
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      if (offset !== 0) params.append('offset', offset.toString());
      if (databaseId) params.append('databaseId', databaseId);

      const url = groupId 
        ? `/api/study-stats/${groupId}?${params}`
        : `/api/study-stats?${params}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    staleTime: 0, // Sin cache para que siempre refetch
  });
};

// Hook para obtener la última fecha de estudio de un grupo
export const useLastStudyDate = (groupId?: string) => {
  return useQuery({
    queryKey: ['last-study', groupId],
    queryFn: async (): Promise<Date | null> => {
      if (!groupId) return null;

      const response = await fetch(`/api/last-study/${groupId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.lastStudied ? new Date(data.lastStudied) : null;
    },
    enabled: !!groupId,
    staleTime: 0, // Sin cache para que siempre refetch
  });
};

// Hook para obtener estadísticas múltiples períodos (hoy, esta semana, este mes)
export const useMultiPeriodStats = (groupId?: string, databaseId?: string) => {
  const todayStats = useStudyStats(groupId, 'day', 0, databaseId);
  const weekStats = useStudyStats(groupId, 'week', 0, databaseId);
  const monthStats = useStudyStats(groupId, 'month', 0, databaseId);

  return {
    today: todayStats.data?.FlashcardsStudied || 0,
    thisWeek: weekStats.data?.FlashcardsStudied || 0,
    thisMonth: monthStats.data?.FlashcardsStudied || 0,
    isLoading: todayStats.isLoading || weekStats.isLoading || monthStats.isLoading,
    error: todayStats.error || weekStats.error || monthStats.error,
    refetch: async () => {
      await Promise.all([
        todayStats.refetch(),
        weekStats.refetch(),
        monthStats.refetch()
      ]);
    }
  };
};