import React, { useState, useEffect } from 'react';
import { Flashcard } from '@/types';
import { StateBadge } from './StateBadge';
import { X, BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface RelatedFlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  relationIds: string[];
  relationName: string;
  databaseId: string;
  onFlashcardClick?: (flashcard: Flashcard) => void;
}

export const RelatedFlashcardsModal: React.FC<RelatedFlashcardsModalProps> = ({
  isOpen,
  onClose,
  relationIds,
  relationName,
  databaseId,
  onFlashcardClick
}) => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && relationIds.length > 0) {
      fetchRelatedFlashcards();
    }
  }, [isOpen, relationIds]);

  const fetchRelatedFlashcards = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:3002/flashcards/by-ids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flashcardIds: relationIds,
          databaseId: databaseId
        }),
      });

      if (!response.ok) {
        throw new Error('Error al obtener flashcards relacionadas');
      }

      const data = await response.json();
      setFlashcards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching related flashcards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFlashcardClick = (flashcard: Flashcard) => {
    if (onFlashcardClick) {
      onFlashcardClick(flashcard);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {relationName}
              </h2>
              <p className="text-sm text-muted-foreground">
                {relationIds.length} flashcard{relationIds.length !== 1 ? 's' : ''} relacionada{relationIds.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-3 text-sm text-muted-foreground">
                Cargando flashcards relacionadas...
              </span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 mb-2">❌</div>
              <p className="text-sm text-muted-foreground">{error}</p>
              <button
                onClick={fetchRelatedFlashcards}
                className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : flashcards.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                No se encontraron flashcards relacionadas
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {flashcards.map((flashcard) => (
                <div
                  key={flashcard.id}
                  onClick={() => handleFlashcardClick(flashcard)}
                  className="bg-card border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {flashcard.title}
                        </h3>
                        <StateBadge state={flashcard.state} size="sm" />
                      </div>
                      
                      {flashcard.notes && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {flashcard.notes}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          Creada {formatDistanceToNow(flashcard.createdAt, { addSuffix: true, locale: es })}
                        </span>
                        {Object.keys(flashcard.auxiliaryInfo || {}).length > 0 && (
                          <span>
                            {Object.keys(flashcard.auxiliaryInfo).length} propiedad{Object.keys(flashcard.auxiliaryInfo).length !== 1 ? 'es' : ''} adicional{Object.keys(flashcard.auxiliaryInfo).length !== 1 ? 'es' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors ml-4" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-muted/30">
          <div className="text-sm text-muted-foreground">
            Flashcards relacionadas • Solo lectura
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};