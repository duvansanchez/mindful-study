import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle } from 'lucide-react';
import { ReferencePoint } from '@/hooks/useReferencePoints';

interface DeleteReferenceDialogProps {
  referencePoint: ReferencePoint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const DeleteReferenceDialog: React.FC<DeleteReferenceDialogProps> = ({
  referencePoint,
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
}) => {
  if (!referencePoint) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle className="text-left">
                Eliminar punto de referencia
              </AlertDialogTitle>
            </div>
          </div>
          
          <AlertDialogDescription className="text-left mt-4">
            ¿Estás seguro de que quieres eliminar el punto de referencia{' '}
            <span className="font-medium text-foreground">
              "{referencePoint.referenceName}"
            </span>?
            
            <div className="mt-3 p-3 rounded-lg bg-muted/50 border-l-2 border-destructive/50">
              <p className="text-xs text-muted-foreground mb-1">Texto referenciado:</p>
              <p className="text-sm text-foreground line-clamp-2">
                "{referencePoint.selectedText}"
              </p>
            </div>
            
            <p className="mt-3 text-sm text-muted-foreground">
              Esta acción no se puede deshacer.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel 
            disabled={isDeleting}
            className="flex-1"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Eliminando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Eliminar
              </div>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};