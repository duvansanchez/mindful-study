import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ReviewNotesService, ReviewNote } from '@/services/reviewNotes';

// Hook para obtener notas de repaso de una flashcard
export const useReviewNotes = (flashcardId: string | null) => {
  return useQuery({
    queryKey: ['review-notes', flashcardId],
    queryFn: () => flashcardId ? ReviewNotesService.getReviewNotes(flashcardId) : Promise.resolve([]),
    enabled: !!flashcardId,
    staleTime: 30 * 1000, // 30 segundos (las notas pueden cambiar frecuentemente)
    retry: 2,
  });
};

// Hook para agregar nueva nota de repaso
export const useAddReviewNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ flashcardId, content, databaseId }: { 
      flashcardId: string; 
      content: string; 
      databaseId: string;
    }) => ReviewNotesService.addReviewNote(flashcardId, content, databaseId),
    onSuccess: (newNote, variables) => {
      // Actualizar la cache de notas para esta flashcard
      queryClient.setQueryData(
        ['review-notes', variables.flashcardId], 
        (oldNotes: ReviewNote[] = []) => [newNote, ...oldNotes]
      );
    },
  });
};

// Hook para eliminar nota de repaso
export const useDeleteReviewNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (noteId: string) => ReviewNotesService.deleteReviewNote(noteId),
    onSuccess: (_, noteId) => {
      // Actualizar todas las caches de notas para remover la nota eliminada
      queryClient.setQueriesData(
        { queryKey: ['review-notes'] },
        (oldNotes: ReviewNote[] = []) => oldNotes.filter(note => note.id !== noteId)
      );
    },
  });
};

// Hook para actualizar nota de repaso
export const useUpdateReviewNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) => 
      ReviewNotesService.updateReviewNote(noteId, content),
    onSuccess: (_, variables) => {
      // Actualizar todas las caches de notas para reflejar el cambio
      queryClient.setQueriesData(
        { queryKey: ['review-notes'] },
        (oldNotes: ReviewNote[] = []) => 
          oldNotes.map(note => 
            note.id === variables.noteId 
              ? { ...note, content: variables.content }
              : note
          )
      );
    },
  });
};