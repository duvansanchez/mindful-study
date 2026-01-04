import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlanningSession, CreatePlanningSessionData } from '@/types';

const API_BASE = '/api';

// Obtener sesiones de planificación de un grupo
export const usePlanningSessionsByGroup = (groupId: string | null) => {
  return useQuery({
    queryKey: ['planning-sessions', groupId],
    queryFn: async (): Promise<PlanningSession[]> => {
      if (!groupId) return [];
      
      const response = await fetch(`${API_BASE}/groups/${groupId}/planning-sessions`);
      if (!response.ok) {
        throw new Error('Error obteniendo sesiones de planificación');
      }
      
      const data = await response.json();
      return data.map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt)
      }));
    },
    enabled: !!groupId
  });
};

// Crear nueva sesión de planificación
export const useCreatePlanningSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ groupId, sessionData }: { groupId: string; sessionData: CreatePlanningSessionData }) => {
      const response = await fetch(`${API_BASE}/groups/${groupId}/planning-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error creando sesión de planificación');
      }
      
      return response.json();
    },
    onSuccess: (_, { groupId }) => {
      // Invalidar y refrescar las sesiones del grupo
      queryClient.invalidateQueries({ queryKey: ['planning-sessions', groupId] });
    },
  });
};

// Reordenar sesiones de planificación
export const useReorderPlanningSessions = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      groupId, 
      sessionOrders 
    }: { 
      groupId: string; 
      sessionOrders: { sessionId: string; orderIndex: number }[] 
    }) => {
      const response = await fetch(`${API_BASE}/groups/${groupId}/planning-sessions/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionOrders }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error reordenando sesiones');
      }
      
      return response.json();
    },
    onSuccess: (_, { groupId }) => {
      // Invalidar y refrescar las sesiones del grupo
      queryClient.invalidateQueries({ queryKey: ['planning-sessions', groupId] });
    },
  });
};

// Actualizar sesión de planificación
export const useUpdatePlanningSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sessionId, updates }: { sessionId: string; updates: Partial<PlanningSession> }) => {
      const response = await fetch(`${API_BASE}/planning-sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error actualizando sesión');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidar todas las sesiones de planificación
      queryClient.invalidateQueries({ queryKey: ['planning-sessions'] });
    },
  });
};

// Eliminar sesión de planificación
export const useDeletePlanningSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`${API_BASE}/planning-sessions/${sessionId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error eliminando sesión');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidar todas las sesiones de planificación
      queryClient.invalidateQueries({ queryKey: ['planning-sessions'] });
    },
  });
};