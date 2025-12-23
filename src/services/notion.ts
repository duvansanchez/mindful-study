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
      return data.map((flashcard: Flashcard & { createdAt: string; lastReviewed: string | null }) => ({
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
  static async getFlashcardContent(flashcardId: string): Promise<{ blocks?: unknown[]; content: string }> {
    try {
      const response = await fetch(`${API_BASE}/flashcards/${flashcardId}/content`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: { blocks?: unknown[]; content?: string } = await response.json();
      return {
        blocks: data.blocks || undefined,
        content: data.content || 'Sin contenido disponible'
      };
    } catch (error) {
      console.error('Error fetching flashcard content:', error);
      return {
        blocks: undefined,
        content: 'Error al cargar contenido'
      };
    }
  }

  // Actualizar el estado de una flashcard en Notion
  static async updateFlashcardState(flashcardId: string, newState: KnowledgeState): Promise<{ success: boolean; lastReviewMessage?: string; updated?: string[] }> {
    try {
      console.log('🔄 NotionService: Enviando actualización de estado:', { flashcardId, newState });
      
      const response = await fetch(`${API_BASE}/flashcards/${flashcardId}/state`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state: newState }),
      });
      
      console.log('📡 NotionService: Respuesta recibida:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ NotionService: Resultado:', result);
      return result;
    } catch (error) {
      console.error('❌ NotionService: Error updating flashcard state:', error);
      return { success: false };
    }
  }

  // Actualizar la fecha de último repaso de una flashcard
  static async updateFlashcardReviewDate(flashcardId: string): Promise<{ success: boolean; lastReviewMessage?: string; updated?: string[] }> {
    try {
      console.log('📅 NotionService: Actualizando fecha de repaso para:', flashcardId);
      
      const response = await fetch(`${API_BASE}/flashcards/${flashcardId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 NotionService: Respuesta de fecha recibida:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ NotionService: Fecha actualizada:', result);
      return result;
    } catch (error) {
      console.error('❌ NotionService: Error updating review date:', error);
      return { success: false };
    }
  }

  // Actualización combinada optimizada (estado + fecha de repaso en una sola llamada)
  static async updateFlashcardCompleteReview(flashcardId: string, newState?: KnowledgeState): Promise<{ success: boolean; updated?: string[] }> {
    try {
      console.log('🚀 NotionService: Actualización combinada optimizada:', { flashcardId, newState });
      
      const response = await fetch(`${API_BASE}/flashcards/${flashcardId}/complete-review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state: newState }),
      });
      
      console.log('📡 NotionService: Respuesta combinada recibida:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ NotionService: Actualización combinada completada:', result);
      return result;
    } catch (error) {
      console.error('❌ NotionService: Error en actualización combinada:', error);
      return { success: false };
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