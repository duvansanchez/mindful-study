import React, { useState } from 'react';
import { Flashcard } from '@/types';
import { StateBadge } from './StateBadge';
import { NotionRenderer } from './NotionRenderer';
import { MarkdownRenderer } from './MarkdownRenderer';
import { 
  X, 
  StickyNote, 
  MessageSquare, 
  Bookmark, 
  Eye, 
  EyeOff, 
  Calendar,
  Clock,
  BookOpen
} from 'lucide-react';
import { useFlashcardContent } from '@/hooks/useNotion';
import { useReviewNotes } from '@/hooks/useReviewNotes';
import { useReferencePoints } from '@/hooks/useReferencePoints';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface FlashcardExpandedModalProps {
  card: Flashcard;
  isOpen: boolean;
  onClose: () => void;
}

export const FlashcardExpandedModal: React.FC<FlashcardExpandedModalProps> = ({
  card,
  isOpen,
  onClose
}) => {
  const [showContent, setShowContent] = useState(false);
  const [showReferencePoints, setShowReferencePoints] = useState(false);
  
  const { data: detailedContent, isLoading: contentLoading } = useFlashcardContent(card.id);
  const { data: reviewNotes = [], isLoading: notesLoading } = useReviewNotes(card.id);
  const { data: referencePoints = [], isLoading: referencePointsLoading } = useReferencePoints(card.id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header del modal */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <BookOpen className="w-6 h-6 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground truncate" title={card.title}>
                {card.title}
              </h2>
              <div className="flex items-center gap-4 mt-1">
                <StateBadge state={card.state} size="sm" showLabel={true} />
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Creada {formatDistanceToNow(card.createdAt, { addSuffix: true, locale: es })}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido del modal */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Nota propia de la tarjeta */}
          {card.notes && (
            <div className="bg-muted/50 border border-border/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <StickyNote className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-medium text-foreground">Nota propia</h3>
              </div>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {card.notes}
              </p>
            </div>
          )}

          {/* Contenido principal */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-medium text-foreground">Contenido principal</h3>
              </div>
              <button
                onClick={() => setShowContent(!showContent)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
              >
                {showContent ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Mostrar
                  </>
                )}
              </button>
            </div>

            {showContent && (
              <div className="bg-muted/30 border border-border/50 rounded-lg p-4">
                {contentLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-3 text-sm text-muted-foreground">Cargando contenido...</span>
                  </div>
                ) : (
                  <div className="text-sm text-foreground">
                    {detailedContent?.blocks ? (
                      <div className="notion-content">
                        <NotionRenderer blocks={detailedContent.blocks as never} />
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        {(detailedContent?.content || card.content || 'Sin contenido disponible')
                          .split('\n')
                          .map((paragraph, i) => (
                            <p key={i} className="mb-3 last:mb-0 text-sm leading-relaxed">
                              {paragraph}
                            </p>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notas de repaso */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-medium text-foreground">
                Notas de repaso ({reviewNotes.length})
              </h3>
            </div>

            {notesLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-muted-foreground">Cargando notas...</span>
              </div>
            ) : reviewNotes.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {reviewNotes.map((note) => (
                  <div key={note.id} className="bg-card border border-border rounded-lg p-4">
                    <div className="text-sm text-foreground leading-relaxed mb-3">
                      <MarkdownRenderer content={note.content} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>
                        {formatDistanceToNow(note.createdAt, { addSuffix: true, locale: es })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay notas de repaso registradas</p>
                <p className="text-xs mt-1">Las notas se crean durante las sesiones de repaso activo</p>
              </div>
            )}
          </div>

          {/* Puntos de referencia */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-medium text-foreground">
                  Puntos de referencia ({referencePoints.length})
                </h3>
              </div>
              <button
                onClick={() => setShowReferencePoints(!showReferencePoints)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
              >
                {showReferencePoints ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Mostrar
                  </>
                )}
              </button>
            </div>

            {showReferencePoints && (
              <>
                {referencePointsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    <span className="ml-2 text-sm text-muted-foreground">Cargando puntos de referencia...</span>
                  </div>
                ) : referencePoints.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {referencePoints.map((point) => (
                      <div key={point.id} className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: point.color }}
                          />
                          <h4 className="font-medium text-foreground">{point.referenceName}</h4>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {point.category}
                          </span>
                        </div>
                        <div className="bg-muted/50 border border-border/30 rounded p-3 mb-3">
                          <p className="text-sm text-foreground leading-relaxed">
                            "{point.selectedText}"
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>
                            Creado {formatDistanceToNow(point.createdAt, { addSuffix: true, locale: es })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay puntos de referencia creados</p>
                    <p className="text-xs mt-1">Los puntos de referencia se crean seleccionando texto en el contenido</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Información adicional */}
          {card.auxiliaryInfo && Object.keys(card.auxiliaryInfo).length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Información adicional</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(card.auxiliaryInfo).map(([key, info]) => (
                  <div key={key} className="bg-muted/30 border border-border/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground font-medium mb-1">{key}</p>
                    <p className="text-sm text-foreground">{info.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer del modal */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-muted/30">
          <div className="text-sm text-muted-foreground">
            Vista ampliada • Solo lectura
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