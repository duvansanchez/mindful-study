import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GroupsService } from '@/services/groups';
import { DatabaseGroup } from '@/types';

// Hook para obtener todas las agrupaciones
export const useGroups = () => {
  return useQuery({
    queryKey: ['groups'],
    queryFn: GroupsService.getGroups,
    staleTime: 5 * 60 * 1000, // 5 minutos
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

// Hook para obtener bases de datos de una agrupación
export const useGroupDatabases = (groupId: string | null) => {
  return useQuery({
    queryKey: ['group-databases', groupId],
    queryFn: () => groupId ? GroupsService.getGroupDatabases(groupId) : Promise.resolve([]),
    enabled: !!groupId,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
};