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

// Hook para buscar bases de datos
export const useSearchDatabases = (query: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['search-databases', query],
    queryFn: () => GroupsService.searchDatabases(query, 10),
    enabled: enabled && query.trim().length > 0,
    staleTime: 30 * 1000, // 30 segundos
    retry: 1,
  });
};
// Hook para obtener estadísticas rápidas de un grupo
export const useGroupStats = (groupId: string | null) => {
  return useQuery({
    queryKey: ['group-stats-fast', groupId],
    queryFn: () => groupId ? GroupsService.getGroupStats(groupId) : Promise.resolve({ tocado: 0, verde: 0, solido: 0, total: 0 }),
    enabled: !!groupId,
    staleTime: 0, // Sin cache para que siempre refetch cuando se solicite
    cacheTime: 0, // No mantener en cache
    retry: 1,
  });
};

// Hook para mover base de datos a carpeta
export const useMoveDatabaseToFolder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      groupId, 
      databaseId, 
      folderId 
    }: { 
      groupId: string; 
      databaseId: string; 
      folderId: string | null 
    }) => {
      const response = await fetch(`http://localhost:3002/groups/${groupId}/databases/${databaseId}/move-to-folder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderId }),
      });

      if (!response.ok) {
        throw new Error('Error al mover base de datos a carpeta');
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidar las queries relacionadas con el grupo específico
      queryClient.invalidateQueries({ queryKey: ['group-databases', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

// Hook para obtener bases de datos de un grupo con información de carpeta
export const useGroupDatabases = (groupId: string) => {
  return useQuery({
    queryKey: ['group-databases', groupId],
    queryFn: async () => {
      const response = await fetch(`http://localhost:3002/groups/${groupId}/databases`);
      if (!response.ok) {
        throw new Error('Error al obtener bases de datos del grupo');
      }
      return await response.json();
    },
    enabled: !!groupId,
    staleTime: 0,
  });
};
