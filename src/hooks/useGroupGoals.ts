import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = 'http://localhost:3002';

export interface GroupGoal {
  id: string;
  groupId: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGroupGoalData {
  title: string;
  description?: string;
  dueDate?: string;
}

// Obtener metas de una agrupación
export const useGroupGoals = (groupId: string) => {
  return useQuery({
    queryKey: ['group-goals', groupId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/groups/${groupId}/goals`);
      if (!response.ok) {
        throw new Error('Error al obtener metas de agrupación');
      }
      const data = await response.json();
      return data.map((goal: any) => ({
        ...goal,
        createdAt: new Date(goal.createdAt),
        updatedAt: new Date(goal.updatedAt)
      })) as GroupGoal[];
    },
    enabled: !!groupId
  });
};

// Obtener conteo de metas pendientes
export const usePendingGoalsCount = (groupId: string) => {
  return useQuery({
    queryKey: ['pending-goals-count', groupId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/groups/${groupId}/goals/pending-count`);
      if (!response.ok) {
        throw new Error('Error al obtener conteo de metas pendientes');
      }
      const data = await response.json();
      return data.pendingCount as number;
    },
    enabled: !!groupId
  });
};

// Crear meta de agrupación
export const useCreateGroupGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, data }: { groupId: string; data: CreateGroupGoalData }) => {
      const response = await fetch(`${API_URL}/groups/${groupId}/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Error al crear meta');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-goals', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['pending-goals-count', variables.groupId] });
    },
  });
};

// Actualizar meta de agrupación
export const useUpdateGroupGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ goalId, groupId, updates }: { 
      goalId: string; 
      groupId: string;
      updates: Partial<GroupGoal> 
    }) => {
      const response = await fetch(`${API_URL}/goals/${goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar meta');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-goals', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['pending-goals-count', variables.groupId] });
    },
  });
};

// Eliminar meta de agrupación
export const useDeleteGroupGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ goalId, groupId }: { goalId: string; groupId: string }) => {
      const response = await fetch(`${API_URL}/goals/${goalId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar meta');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-goals', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['pending-goals-count', variables.groupId] });
    },
  });
};
