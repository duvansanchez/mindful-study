import { useMutation, useQueryClient } from '@tanstack/react-query';

interface SyncResponse {
  success: boolean;
  message: string;
  count: number;
  databases: any[];
}

export const useDatabaseSync = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<SyncResponse> => {
      const response = await fetch('/api/notion/databases/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidar el cache de bases de datos para forzar recarga
      queryClient.invalidateQueries({ queryKey: ['notion', 'databases'] });
      
      console.log('✅ Sincronización completada:', data.message);
    },
    onError: (error) => {
      console.error('❌ Error en sincronización:', error);
    },
  });
};