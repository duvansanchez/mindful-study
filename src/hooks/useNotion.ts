import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NotionService } from '@/services/notion';
import { Database, Flashcard, KnowledgeState, Statistics } from '@/types';

// Hook para obtener bases de datos
export const useNotionDatabases = () => {
  return useQuery({
    queryKey: ['notion-databases'],
    queryFn: NotionService.getDatabases,
    staleTime: 0, // Sin cache para debugging
    retry: 2,
  });
};

// Hook para obtener flashcards de una base de datos
export const useNotionFlashcards = (databaseId: string | null) => {
  return useQuery({
    queryKey: ['notion-flashcards', databaseId],
    queryFn: () => databaseId ? NotionService.getFlashcardsFromDatabase(databaseId) : Promise.resolve([]),
    enabled: !!databaseId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    retry: 2,
  });
};

// Hook para obtener contenido detallado de una flashcard (lazy loading)
export const useFlashcardContent = (flashcardId: string | null) => {
  return useQuery({
    queryKey: ['flashcard-content', flashcardId],
    queryFn: () => flashcardId ? NotionService.getFlashcardContent(flashcardId) : Promise.resolve({ blocks: null, content: '' }),
    enabled: !!flashcardId,
    staleTime: 10 * 60 * 1000, // 10 minutos (el contenido no cambia frecuentemente)
    retry: 2,
  });
};

// Hook para actualizar estado de flashcard
export const useUpdateFlashcardState = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ flashcardId, newState }: { flashcardId: string; newState: KnowledgeState }) =>
      NotionService.updateFlashcardState(flashcardId, newState),
    onSuccess: (_, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['notion-flashcards'] });
    },
  });
};

// Hook para verificar conexión
export const useNotionConnection = () => {
  return useQuery({
    queryKey: ['notion-connection'],
    queryFn: NotionService.testConnection,
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

// Hook personalizado para estadísticas calculadas
export const useNotionStats = (flashcards: Flashcard[]): Statistics => {
  return {
    tocado: flashcards.filter(c => c.state === 'tocado').length,
    verde: flashcards.filter(c => c.state === 'verde').length,
    solido: flashcards.filter(c => c.state === 'solido').length,
    total: flashcards.length,
  };
};

// Hook para manejar múltiples bases de datos
export const useMultipleNotionFlashcards = (databaseIds: string[]) => {
  const [allFlashcards, setAllFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAllFlashcards = async () => {
      if (databaseIds.length === 0) {
        setAllFlashcards([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const promises = databaseIds.map(id => NotionService.getFlashcardsFromDatabase(id));
        const results = await Promise.all(promises);
        const combined = results.flat();
        setAllFlashcards(combined);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllFlashcards();
  }, [databaseIds]);

  return { flashcards: allFlashcards, isLoading, error };
};

// Hook para filtrar flashcards por estado
export const useFilteredFlashcards = (flashcards: Flashcard[], states: KnowledgeState[]) => {
  return flashcards
    .filter(card => states.includes(card.state))
    .sort((a, b) => {
      // Ordenar por "menos visto primero"
      if (a.viewCount !== b.viewCount) {
        return a.viewCount - b.viewCount;
      }
      // Si tienen el mismo viewCount, ordenar por última revisión (más antiguo primero)
      if (!a.lastReviewed && !b.lastReviewed) return 0;
      if (!a.lastReviewed) return -1;
      if (!b.lastReviewed) return 1;
      return a.lastReviewed.getTime() - b.lastReviewed.getTime();
    });
};