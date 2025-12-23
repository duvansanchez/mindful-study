import { Database, Flashcard, KnowledgeState } from '@/types';

// URL base de la API local
const API_BASE = '/api/notion';

// Servicio principal de Notion (usando API local)
export class NotionService {
  // Obtener todas las bases de datos accesibles
  static async getDatabases(): Promise<Database[]> {
    try {
      const response = await fetch(`${API_BASE}/databases`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching databases:', error);
      return [];
    }
  }

  // Obtener flashcards de una base de datos específica
  static async getFlashcardsFromDatabase(databaseId: string): Promise<Flashcard[]> {
    try {
      const response = await fetch(`${API_BASE}/databases/${databaseId}/flashcards`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Convertir fechas de string a Date objects
      return data.map((flashcard: any) => ({
        ...flashcard,
        createdAt: new Date(flashcard.createdAt),
        lastReviewed: flashcard.lastReviewed ? new Date(flashcard.lastReviewed) : null,
      }));
    } catch (error) {
      console.error('Error fetching flashcards:', error);
      return [];
    }
  }

  // Obtener contenido detallado de una flashcard específica (lazy loading)
  static async getFlashcardContent(flashcardId: string): Promise<{ blocks?: any[]; content: string }> {
    try {
      const response = await fetch(`${API_BASE}/flashcards/${flashcardId}/content`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return {
        blocks: data.blocks || null,
        content: data.content || 'Sin contenido disponible'
      };
    } catch (error) {
      console.error('Error fetching flashcard content:', error);
      return {
        blocks: null,
        content: 'Error al cargar contenido'
      };
    }
  }

  // Actualizar el estado de una flashcard en Notion
  static async updateFlashcardState(flashcardId: string, newState: KnowledgeState): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/flashcards/${flashcardId}/state`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newState }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error updating flashcard state:', error);
      return false;
    }
  }

  // Verificar conexión con Notion
  static async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/test`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error testing connection:', error);
      return false;
    }
  }
}