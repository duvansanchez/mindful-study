import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SessionFolder, CreateSessionFolderData } from '@/types';

const API_URL = '/api';

// Obtener carpetas de un grupo
export const useSessionFoldersByGroup = (groupId: string) => {
  return useQuery({
    queryKey: ['session-folders', groupId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/groups/${groupId}/session-folders`);
      if (!response.ok) {
        throw new Error('Error al obtener carpetas');
      }
      const data = await response.json();
      return data.map((folder: any) => ({
        ...folder,
        createdAt: new Date(folder.createdAt),
        updatedAt: new Date(folder.updatedAt)
      })) as SessionFolder[];
    },
    enabled: !!groupId
  });
};

// Crear carpeta
export const useCreateSessionFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, data }: { groupId: string; data: CreateSessionFolderData }) => {
      const response = await fetch(`${API_URL}/groups/${groupId}/session-folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Error al crear carpeta');
      }

      const folder = await response.json();
      return {
        ...folder,
        createdAt: new Date(folder.createdAt),
        updatedAt: new Date(folder.updatedAt)
      } as SessionFolder;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['session-folders', variables.groupId] });
    },
  });
};

// Actualizar carpeta
export const useUpdateSessionFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, updates }: { folderId: string; updates: Partial<SessionFolder> }) => {
      const response = await fetch(`${API_URL}/session-folders/${folderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar carpeta');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-folders'] });
    },
  });
};

// Eliminar carpeta
export const useDeleteSessionFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      const response = await fetch(`${API_URL}/session-folders/${folderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar carpeta');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-folders'] });
      queryClient.invalidateQueries({ queryKey: ['planning-sessions'] });
    },
  });
};

// Reordenar carpetas
export const useReorderSessionFolders = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      groupId, 
      folderOrders 
    }: { 
      groupId: string; 
      folderOrders: { folderId: string; orderIndex: number }[] 
    }) => {
      const response = await fetch(`${API_URL}/groups/${groupId}/session-folders/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderOrders }),
      });

      if (!response.ok) {
        throw new Error('Error al reordenar carpetas');
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['session-folders', variables.groupId] });
    },
  });
};
