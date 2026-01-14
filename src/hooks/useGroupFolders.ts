import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GroupFolder, CreateGroupFolderData } from '@/types';

const API_URL = 'http://localhost:3002';

// Obtener carpetas de una agrupación específica
export const useGroupFoldersByGroup = (groupId: string) => {
  return useQuery({
    queryKey: ['group-folders', groupId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/groups/${groupId}/group-folders`);
      if (!response.ok) {
        throw new Error('Error al obtener carpetas de agrupación');
      }
      const data = await response.json();
      return data.map((folder: any) => ({
        ...folder,
        createdAt: new Date(folder.createdAt),
        updatedAt: new Date(folder.updatedAt)
      })) as GroupFolder[];
    },
    enabled: !!groupId
  });
};

// Obtener todas las carpetas de agrupaciones (mantener para compatibilidad)
export const useGroupFolders = () => {
  return useQuery({
    queryKey: ['group-folders'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/group-folders`);
      if (!response.ok) {
        throw new Error('Error al obtener carpetas de agrupaciones');
      }
      const data = await response.json();
      return data.map((folder: any) => ({
        ...folder,
        createdAt: new Date(folder.createdAt),
        updatedAt: new Date(folder.updatedAt)
      })) as GroupFolder[];
    }
  });
};

// Crear carpeta de agrupaciones
export const useCreateGroupFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, data }: { groupId: string; data: CreateGroupFolderData }) => {
      const response = await fetch(`${API_URL}/groups/${groupId}/group-folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Error al crear carpeta de agrupación');
      }

      const folder = await response.json();
      return {
        ...folder,
        createdAt: new Date(folder.createdAt),
        updatedAt: new Date(folder.updatedAt)
      } as GroupFolder;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-folders', variables.groupId] });
    },
  });
};

// Actualizar carpeta de agrupaciones
export const useUpdateGroupFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, updates }: { folderId: string; updates: Partial<GroupFolder> }) => {
      const response = await fetch(`${API_URL}/group-folders/${folderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar carpeta de agrupaciones');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-folders'] });
    },
  });
};

// Eliminar carpeta de agrupaciones
export const useDeleteGroupFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      const response = await fetch(`${API_URL}/group-folders/${folderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar carpeta de agrupaciones');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-folders'] });
      queryClient.invalidateQueries({ queryKey: ['database-groups'] });
    },
  });
};

// Reordenar carpetas de agrupaciones
export const useReorderGroupFolders = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      groupId,
      folderOrders 
    }: { 
      groupId: string;
      folderOrders: { folderId: string; orderIndex: number }[] 
    }) => {
      const response = await fetch(`${API_URL}/groups/${groupId}/group-folders/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderOrders }),
      });

      if (!response.ok) {
        throw new Error('Error al reordenar carpetas de agrupaciones');
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-folders', variables.groupId] });
    },
  });
};
