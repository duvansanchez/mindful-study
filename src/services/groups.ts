import { DatabaseGroup, Database } from '@/types';

// URL base de la API local
const API_BASE = '/api';

// Servicio para manejar agrupaciones de bases de datos
export class GroupsService {
  // Obtener todas las agrupaciones
  static async getGroups(): Promise<DatabaseGroup[]> {
    try {
      const response = await fetch(`${API_BASE}/groups`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching groups:', error);
      return [];
    }
  }

  // Buscar bases de datos por nombre
  static async searchDatabases(query: string, limit: number = 10): Promise<Database[]> {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }
      
      const response = await fetch(`${API_BASE}/databases/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error searching databases:', error);
      return [];
    }
  }

  // Crear nueva agrupación
  static async createGroup(name: string, color: string = '#3B82F6', databaseIds: string[] = []): Promise<DatabaseGroup> {
    try {
      const response = await fetch(`${API_BASE}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          color,
          databaseIds
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  // Actualizar agrupación
  static async updateGroup(groupId: string, updates: Partial<DatabaseGroup>): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  }

  // Eliminar agrupación
  static async deleteGroup(groupId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/groups/${groupId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  }

  // Obtener estadísticas rápidas de un grupo
  static async getGroupStats(groupId: string): Promise<{ tocado: number; verde: number; solido: number; total: number }> {
    try {
      const response = await fetch(`${API_BASE}/groups/${groupId}/stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching group stats:', error);
      return { tocado: 0, verde: 0, solido: 0, total: 0 };
    }
  }

  // Obtener bases de datos de una agrupación
  static async getGroupDatabases(groupId: string): Promise<Database[]> {
    try {
      const response = await fetch(`${API_BASE}/groups/${groupId}/databases`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching group databases:', error);
      return [];
    }
  }
}