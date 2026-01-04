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
}

export interface DatabaseGroup {
  id: string;
  name: string;
  databaseIds: string[];
  color: string;
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
  databaseId: string;
  sessionNote: string;
  studyMode: 'review' | 'matching' | 'overview';
  orderIndex: number;
  selectedFlashcards?: string[]; // IDs de las flashcards seleccionadas
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlanningSessionData {
  sessionName: string;
  databaseId: string;
  sessionNote: string;
  studyMode: 'review' | 'matching' | 'overview';
  selectedFlashcards?: string[];
  orderIndex?: number;
}
