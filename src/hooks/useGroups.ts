import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GroupsService } from '@/services/groups';
import { NotionService } from '@/services/notion';
import { DatabaseGroup } from '@/types';

// Hook para obtener todas las agrupaciones
export const useGroups = () => {
  return useQuery({
    queryKey: ['groups'],
    queryFn: GroupsService.getGroups,
    staleTime: 0, // Sin cache para debugging
    retry: 2,
  });
};

// Hook para crear nueva agrupación
export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ name, color, databaseIds }: { 
      name: string; 
      color?: string; 
      databaseIds?: string[] 
    }) => GroupsService.createGroup(name, color, databaseIds),
    onSuccess: () => {
      // Invalidar y refrescar la lista de agrupaciones
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

// Hook para actualizar agrupación
export const useUpdateGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ groupId, updates }: { 
      groupId: string; 
      updates: Partial<DatabaseGroup> 
    }) => GroupsService.updateGroup(groupId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

// Hook para eliminar agrupación
export const useDeleteGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (groupId: string) => GroupsService.deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

// Hook para obtener estadísticas de múltiples bases de datos (para grupos)
export const useGroupStats = (databaseIds: string[]) => {
  return useQuery({
    queryKey: ['group-stats', databaseIds],
    queryFn: async () => {
      if (!databaseIds || databaseIds.length === 0) {
        return { tocado: 0, verde: 0, solido: 0, total: 0 };
      }

      // Obtener flashcards de todas las bases de datos del grupo
      const allFlashcards = [];
      for (const dbId of databaseIds) {
        try {
          const flashcards = await NotionService.getFlashcardsFromDatabase(dbId);
          allFlashcards.push(...flashcards);
        } catch (error) {
          console.error(`Error fetching flashcards for database ${dbId}:`, error);
        }
      }

      // Calcular estadísticas combinadas
      const stats = { tocado: 0, verde: 0, solido: 0, total: allFlashcards.length };
      
      allFlashcards.forEach(card => {
        switch (card.state) {
          case 'Tocado':
            stats.tocado++;
            break;
          case 'Verde':
            stats.verde++;
            break;
          case 'Sólido':
            stats.solido++;
            break;
        }
      });

      return stats;
    },
    enabled: databaseIds && databaseIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutos
    retry: 1,
  });
};