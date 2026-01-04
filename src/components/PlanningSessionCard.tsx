import React from 'react';
import { PlanningSession, Database } from '@/types';
import { 
  BookOpen, 
  Eye, 
  Shuffle, 
  BarChart3,
  StickyNote,
  Calendar,
  Edit3,
  Trash2
} from 'lucide-react';

interface PlanningSessionCardProps {
  session: PlanningSession;
  database?: Database;
  sessionNumber: number;
  onEdit?: (session: PlanningSession) => void;
  onDelete?: (session: PlanningSession) => void;
}

const studyModeConfig = {
  review: {
    icon: BookOpen,
    label: 'Repaso Activo',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  matching: {
    icon: Shuffle,
    label: 'Modo Matching',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30'
  },
  overview: {
    icon: Eye,
    label: 'Vista General',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30'
  }
};

export const PlanningSessionCard: React.FC<PlanningSessionCardProps> = ({
  session,
  database,
  sessionNumber,
  onEdit,
  onDelete
}) => {
  const modeConfig = studyModeConfig[session.studyMode];
  const ModeIcon = modeConfig.icon;

  return (
    <div className="w-full">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-lg mb-1">
            {session.sessionName}
          </h3>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {/* Base de datos */}
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>{database?.name || 'Base de datos no encontrada'}</span>
              {database && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded">
                  {database.cardCount} tarjetas
                </span>
              )}
            </div>
            
            {/* Modo de estudio */}
            <div className="flex items-center gap-1">
              <div className={`p-1 rounded ${modeConfig.bgColor}`}>
                <ModeIcon className={`w-3 h-3 ${modeConfig.color}`} />
              </div>
              <span className={modeConfig.color}>{modeConfig.label}</span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1 ml-4">
          {onEdit && (
            <button 
              onClick={() => onEdit(session)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              title="Editar sesión"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button 
              onClick={() => onDelete(session)}
              className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Eliminar sesión"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Nota de la sesión */}
      {session.sessionNote && session.sessionNote.trim() && (
        <div className="bg-muted/50 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <StickyNote className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {session.sessionNote}
            </p>
          </div>
        </div>
      )}

      {/* Información adicional */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>
            Creada {new Date(session.createdAt).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </span>
        </div>
        
        <button className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors">
          <BarChart3 className="w-3 h-3" />
          <span>Iniciar sesión</span>
        </button>
      </div>
    </div>
  );
};