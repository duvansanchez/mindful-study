// URL base de la API local
const API_BASE = '/api';

export interface ReviewNote {
  id: string;
  content: string;
  createdAt: Date;
  sessionId?: string;
}

// Servicio para manejar notas de repaso
export class ReviewNotesService {
  // Obtener notas de repaso de una flashcard
  static async getReviewNotes(flashcardId: string): Promise<ReviewNote[]> {
    try {
      const response = await fetch(`${API_BASE}/flashcards/${flashcardId}/notes`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const notes = await response.json();
      
      // Convertir fechas de string a Date objects
      return notes.map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt)
      }));
    } catch (error) {
      console.error('Error fetching review notes:', error);
      return [];
    }
  }

  // Agregar nueva nota de repaso
  static async addReviewNote(flashcardId: string, content: string, databaseId: string): Promise<ReviewNote> {
    try {
      const response = await fetch(`${API_BASE}/flashcards/${flashcardId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          databaseId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const note = await response.json();
      return {
        ...note,
        createdAt: new Date(note.createdAt)
      };
    } catch (error) {
      console.error('Error adding review note:', error);
      throw error;
    }
  }

  // Eliminar nota de repaso
  static async deleteReviewNote(noteId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error deleting review note:', error);
      throw error;
    }
  }

  // Actualizar nota de repaso
  static async updateReviewNote(noteId: string, content: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error updating review note:', error);
      throw error;
    }
  }
}