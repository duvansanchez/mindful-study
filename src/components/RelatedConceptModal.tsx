import React from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NotionRenderer } from './NotionRenderer';
import type { NotionBlock } from './NotionRenderer';
import { useFlashcardContent } from '@/hooks/useNotion';

interface RelatedConceptModalProps {
  relation: { id: string; title: string } | null;
  onClose: () => void;
}

export const RelatedConceptModal: React.FC<RelatedConceptModalProps> = ({ relation, onClose }) => {
  const { data: contentData, isLoading } = useFlashcardContent(relation?.id ?? null);

  return (
    <Dialog open={!!relation} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Volver"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <DialogTitle className="text-base">{relation?.title ?? ''}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : contentData?.blocks ? (
            <NotionRenderer blocks={contentData.blocks as NotionBlock[]} />
          ) : (
            <p className="text-sm text-muted-foreground py-4">Sin contenido disponible</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
