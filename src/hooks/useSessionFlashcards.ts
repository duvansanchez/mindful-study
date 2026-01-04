import { useQuery } from '@tanstack/react-query';
import { Flashcard, PlanningSession } from '@/types';
import { useNotionFlashcards } from './useNotion';

// Hook para obtener las flashcards de una sesión de planificación
export const useSessionFlashcards = (session: PlanningSession | null) => {
  // Obtener todas las flashcards de la base de datos
  const { data: allFlashcards = [], isLoading, error } = useNotionFlashcards(
    session?.databaseId || null
  );

  return useQuery({
    queryKey: ['session-flashcards', session?.id, session?.selectedFlashcards],
    queryFn: (): Flashcard[] => {
      if (!session || !allFlashcards.length) return [];

      // Si no hay flashcards seleccionadas específicamente, devolver todas
      if (!session.selectedFlashcards || session.selectedFlashcards.length === 0) {
        return allFlashcards;
      }

      // Filtrar solo las flashcards seleccionadas
      const selectedIds = new Set(session.selectedFlashcards);
      return allFlashcards.filter(flashcard => selectedIds.has(flashcard.id));
    },
    enabled: !!session && !!allFlashcards.length && !isLoading,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};