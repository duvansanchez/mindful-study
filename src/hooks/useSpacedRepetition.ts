import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Flashcard, DatabaseGroup } from '@/types';
import { NotionService } from '@/services/notion';
import { useFlashcardSessionsSummary } from './useStudyTracking';

const INTERVALS_DAYS: Record<string, number> = {
  tocado: 1,
  verde: 7,
  solido: 21,
};

// Umbral para "en riesgo": sin repasar en más de 2x el intervalo normal
const RISK_MULTIPLIER = 2;

// Umbral para "problemática": muchas sesiones pero sigue en tocado
const PROBLEMATIC_SESSION_THRESHOLD = 3;

export interface SpacedRepetitionData {
  dueToday: Flashcard[];
  dueThisWeek: Flashcard[];
  neverReviewed: Flashcard[];
  atRisk: Flashcard[];
  problematic: Flashcard[];
  isLoading: boolean;
  totalFlashcards: number;
}

export function useSpacedRepetition(
  groups: DatabaseGroup[],
  selectedGroupId?: string
): SpacedRepetitionData {
  const groupsToUse = selectedGroupId
    ? groups.filter(g => g.id === selectedGroupId)
    : groups;

  const allDatabaseIds = useMemo(() => {
    const ids = new Set<string>();
    groupsToUse.forEach(g => g.databaseIds.forEach(id => ids.add(id)));
    return Array.from(ids);
  }, [groupsToUse]);

  // Cargar flashcards de cada base de datos usando caché de TanStack Query
  const flashcardQueries = useQueries({
    queries: allDatabaseIds.map(dbId => ({
      queryKey: ['notion-flashcards', dbId],
      queryFn: () => NotionService.getFlashcardsFromDatabase(dbId),
      staleTime: 5 * 60 * 1000,
    })),
  });

  // Resumen de sesiones SQL (batch — una sola llamada)
  const { data: sessionsSummary = [], isLoading: sessionsLoading } =
    useFlashcardSessionsSummary(selectedGroupId);

  const isLoading =
    sessionsLoading || flashcardQueries.some(q => q.isLoading);

  const result = useMemo(() => {
    if (isLoading) {
      return {
        dueToday: [],
        dueThisWeek: [],
        neverReviewed: [],
        atRisk: [],
        problematic: [],
        isLoading: true,
        totalFlashcards: 0,
      };
    }

    // Combinar todas las flashcards cargadas
    const allFlashcards: Flashcard[] = flashcardQueries
      .flatMap(q => q.data ?? []);

    // Mapa de sesiones por flashcardId para O(1) lookup
    const sessionsMap = new Map(
      sessionsSummary.map(s => [s.FlashcardId, s])
    );

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(startOfToday.getDate() + 7);

    const dueToday: Flashcard[] = [];
    const dueThisWeek: Flashcard[] = [];
    const neverReviewed: Flashcard[] = [];
    const atRisk: Flashcard[] = [];
    const problematic: Flashcard[] = [];

    for (const card of allFlashcards) {
      const session = sessionsMap.get(card.id);
      const interval = INTERVALS_DAYS[card.state] ?? 1;

      // Tarjeta nunca repasada (sin sesiones en SQL)
      if (!session) {
        neverReviewed.push(card);
        dueToday.push(card);
        continue;
      }

      const sessionCount = session.sessionCount ?? 0;
      const lastStudied = session.lastStudiedAt ? new Date(session.lastStudiedAt) : null;

      // Tarjeta problemática: muchas sesiones, sigue en tocado
      if (sessionCount > PROBLEMATIC_SESSION_THRESHOLD && card.state === 'tocado') {
        problematic.push(card);
      }

      if (!lastStudied) {
        neverReviewed.push(card);
        dueToday.push(card);
        continue;
      }

      const daysSinceLast = (now.getTime() - lastStudied.getTime()) / 86400000;
      const nextReview = new Date(lastStudied.getTime() + interval * 86400000);

      // Vence hoy
      if (nextReview <= startOfToday || daysSinceLast >= interval) {
        dueToday.push(card);
      }
      // Vence esta semana
      else if (nextReview <= endOfWeek) {
        dueThisWeek.push(card);
      }

      // En riesgo: verde/sólido y sin repasar en más de 2x el intervalo
      if (
        (card.state === 'verde' || card.state === 'solido') &&
        daysSinceLast > interval * RISK_MULTIPLIER
      ) {
        atRisk.push(card);
      }
    }

    return {
      dueToday,
      dueThisWeek,
      neverReviewed,
      atRisk,
      problematic,
      isLoading: false,
      totalFlashcards: allFlashcards.length,
    };
  }, [isLoading, flashcardQueries, sessionsSummary]);

  return result;
}
