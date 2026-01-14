import React from 'react';
import { AlertTriangle, Target, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GoalsAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingCount: number;
  groupName: string;
  onViewGoals: () => void;
}

export const GoalsAlertDialog: React.FC<GoalsAlertDialogProps> = ({
  open,
  onOpenChange,
  pendingCount,
  groupName,
  onViewGoals
}) => {
  const handleViewGoals = () => {
    onOpenChange(false);
    onViewGoals();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-amber-500 border-2">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-75"></div>
              <div className="relative bg-amber-500 rounded-full p-4">
                <AlertTriangle className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>
          
          <DialogTitle className="text-center text-2xl font-bold text-foreground">
            ¡Atención!
          </DialogTitle>
          
          <DialogDescription className="text-center space-y-4 pt-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Target className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                <span className="text-xl font-semibold text-amber-900 dark:text-amber-100">
                  {pendingCount} meta{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''}
                </span>
              </div>
              
              <p className="text-base text-amber-800 dark:text-amber-200">
                Tienes <strong className="font-bold">{pendingCount}</strong> meta{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''} por completar en la agrupación <strong className="font-bold">"{groupName}"</strong>.
              </p>
            </div>
            
            <p className="text-sm text-muted-foreground">
              No olvides revisar tus objetivos para mantener tu progreso de estudio.
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <button
            onClick={handleViewGoals}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            <Target className="w-5 h-5" />
            Ver metas ahora
          </button>
          
          <button
            onClick={() => onOpenChange(false)}
            className="w-full px-6 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors"
          >
            Recordar más tarde
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
