import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface FlashcardCoverageEntry {
  FlashcardId: string;
  examCount: number;
  lastCoveredAt: string;
}

export interface CoverageSummaryEntry {
  DatabaseId: string;
  coveredCount: number;
}

// ── Hooks ────────────────────────────────────────────────────────────────────

/** Cobertura individual: qué flashcards de una BD ya tienen examen en este grupo */
export const useFlashcardCoverage = (groupId: string, databaseId: string | null) =>
  useQuery<FlashcardCoverageEntry[]>({
    queryKey: ['flashcard-coverage', groupId, databaseId],
    queryFn: () =>
      fetch(`/api/groups/${groupId}/databases/${databaseId}/flashcard-coverage`)
        .then(r => r.json())
        .then(data => (Array.isArray(data) ? data : [])),
    enabled: !!groupId && !!databaseId,
    staleTime: 2 * 60 * 1000,
  });

/** Resumen de cobertura por BD para un grupo (para mostrar badges en el selector) */
export const useCoverageSummary = (groupId: string) =>
  useQuery<CoverageSummaryEntry[]>({
    queryKey: ['coverage-summary', groupId],
    queryFn: () =>
      fetch(`/api/groups/${groupId}/coverage-summary`)
        .then(r => r.json())
        .then(data => (Array.isArray(data) ? data : [])),
    enabled: !!groupId,
    staleTime: 2 * 60 * 1000,
  });

/** Vincula un conjunto de flashcards a un examen como "cubiertas" */
export const useLinkFlashcardCoverage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      examId,
      databaseId,
      flashcardIds,
    }: {
      examId: string;
      databaseId: string;
      flashcardIds: string[];
    }) =>
      fetch(`/api/exams/${examId}/flashcard-coverage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ databaseId, flashcardIds }),
      }).then(r => r.json()),
    onSuccess: (_data, variables) => {
      // Invalidar queries de cobertura para que se refresque la UI
      queryClient.invalidateQueries({ queryKey: ['flashcard-coverage'] });
      queryClient.invalidateQueries({ queryKey: ['coverage-summary'] });
    },
  });
};
