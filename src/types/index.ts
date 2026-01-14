export type KnowledgeState = 'tocado' | 'verde' | 'solido';

export interface ReviewNote {
  id: string;
  content: string;
  createdAt: Date;
}

export interface Flashcard {
  id: string;
  title: string;
  content: string;
  state: KnowledgeState;
  lastReviewed: Date | null;
  notes: string;
  relatedConcepts: string[];
  auxiliaryInfo?: Record<string, { type: string; value: string }>; // Nueva propiedad
  databaseId: string;
  createdAt: Date;
  viewCount: number;
  reviewNotes: ReviewNote[];
}

export interface Database {
  id: string;
  name: string;
  icon: string;
  cardCount: number;
  lastSynced: Date;
  source: 'notion' | 'airtable' | 'custom';
  folderId?: string | null;
}

export interface DatabaseGroup {
  id: string;
  name: string;
  databaseIds: string[];
  color: string;
  folderId?: string | null;
}

export interface GroupFolder {
  id: string;
  groupId?: string;
  folderName: string;
  color?: string;
  icon?: string;
  orderIndex: number;
  isExpanded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGroupFolderData {
  folderName: string;
  color?: string;
  icon?: string;
  orderIndex?: number;
}

export interface Statistics {
  tocado: number;
  verde: number;
  solido: number;
  total: number;
}

export interface PlanningSession {
  id: string;
  groupId: string;
  sessionName: string;
  databaseId: string; // Mantener para compatibilidad hacia atrás
  databaseIds?: string[]; // Nueva propiedad para múltiples bases de datos
  sessionNote: string;
  studyMode: 'review' | 'matching' | 'overview';
  orderIndex: number;
  selectedFlashcards?: string[]; // IDs de las flashcards seleccionadas
  folderId?: string | null; // ID de la carpeta (opcional)
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionFolder {
  id: string;
  groupId: string;
  folderName: string;
  color?: string;
  icon?: string;
  orderIndex: number;
  isExpanded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionFolderData {
  folderName: string;
  color?: string;
  icon?: string;
  orderIndex?: number;
}

export interface CreatePlanningSessionData {
  sessionName: string;
  databaseId?: string; // Opcional para compatibilidad hacia atrás
  databaseIds?: string[]; // Nueva propiedad para múltiples bases de datos
  sessionNote: string;
  studyMode: 'review' | 'matching' | 'overview';
  selectedFlashcards?: string[];
  orderIndex?: number;
  folderId?: string | null; // ID de la carpeta (opcional)
}

// Nuevo tipo para flashcards con información de base de datos
export interface FlashcardWithDatabase extends Flashcard {
  databaseId: string;
  databaseName: string;
  databaseIcon?: string;
}
