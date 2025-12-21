export type KnowledgeState = 'tocado' | 'verde' | 'solido';

export interface Flashcard {
  id: string;
  title: string;
  content: string;
  state: KnowledgeState;
  lastReviewed: Date | null;
  notes: string;
  relatedConcepts: string[];
  databaseId: string;
  createdAt: Date;
  viewCount: number;
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
