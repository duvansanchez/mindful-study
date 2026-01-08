import { useQuery } from '@tanstack/react-query';
import { Flashcard, PlanningSession } from '@/types';
import { useMultipleNotionFlashcards } from './useNotion';

// Hook para obtener las flashcards de una sesión de planificación
export const useSessionFlashcards = (session: PlanningSession | null) => {
  // Determinar qué bases de datos usar - solo si hay sesión
  const databaseIds = session?.databaseIds || (session?.databaseId ? [session.databaseId] : []);
  
  // Solo cargar flashcards si hay sesión y bases de datos
  const shouldLoadFlashcards = !!session && databaseIds.length > 0;
  
  // SIEMPRE usar useMultipleNotionFlashcards (funciona para 1 o múltiples DBs)
  const { flashcards: allFlashcards, isLoading } = useMultipleNotionFlashcards(
    shouldLoadFlashcards ? databaseIds : []
  );

  return useQuery({
    queryKey: ['session-flashcards', session?.id, session?.selectedFlashcards, databaseIds],
    queryFn: (): Flashcard[] => {
      if (!session || !shouldLoadFlashcards) return [];

      // Si no hay flashcards seleccionadas específicamente, devolver todas las de las bases de datos
      if (!session.selectedFlashcards || session.selectedFlashcards.length === 0) {
        return allFlashcards;
      }

      // Filtrar solo las flashcards seleccionadas
      const selectedIds = new Set(session.selectedFlashcards);
      return allFlashcards.filter(flashcard => selectedIds.has(flashcard.id));
    },
    enabled: shouldLoadFlashcards && !isLoading,
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
  });
};