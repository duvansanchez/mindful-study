import React from 'react';
import { PlanningSession } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from 'lucide-react';

interface DeleteSessionDialogProps {
  session: PlanningSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const DeleteSessionDialog: React.FC<DeleteSessionDialogProps> = ({
  session,
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false
}) => {
  if (!session) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <AlertDialogTitle>Eliminar sesión de estudio</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="py-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-1">
              {session.sessionName}
            </h4>
            <p className="text-sm text-muted-foreground">
              Modo: {session.studyMode === 'review' ? 'Repaso Activo' : 
                     session.studyMode === 'matching' ? 'Modo Matching' : 'Vista General'}
            </p>
            {session.sessionNote && (
              <p className="text-sm text-muted-foreground mt-2">
                "{session.sessionNote}"
              </p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar sesión
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};