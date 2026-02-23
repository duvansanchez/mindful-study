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
  Trash2,
  Loader2,
  ClipboardList
} from 'lucide-react';

interface PlanningSessionCardProps {
  session: PlanningSession;
  databases?: Database[];
  sessionNumber: number;
  onEdit?: (session: PlanningSession) => void;
  onDelete?: (session: PlanningSession) => void;
  onStartSession?: (session: PlanningSession, mode?: string) => void;
  isStarting?: boolean;
}

const studyModeConfig: Record<string, { icon: React.FC<any>; label: string; shortLabel: string; color: string; bgColor: string; btnColor: string }> = {
  review: {
    icon: BookOpen,
    label: 'Modo Repaso Activo',
    shortLabel: 'Repaso',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    btnColor: 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:text-blue-400'
  },
  matching: {
    icon: Shuffle,
    label: 'Modo Matching',
    shortLabel: 'Matching',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    btnColor: 'bg-green-500/10 text-green-700 hover:bg-green-500/20 dark:text-green-400'
  },
  overview: {
    icon: Eye,
    label: 'Modo Vista General',
    shortLabel: 'Vista general',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    btnColor: 'bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 dark:text-purple-400'
  },
  exam: {
    icon: ClipboardList,
    label: 'Examen',
    shortLabel: 'Examen',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    btnColor: 'bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 dark:text-orange-400'
  }
};

export const PlanningSessionCard: React.FC<PlanningSessionCardProps> = ({
  session,
  databases = [],
  sessionNumber,
  onEdit,
  onDelete,
  onStartSession,
  isStarting = false
}) => {
  const sessionModes = (session.studyModes && session.studyModes.length > 0)
    ? session.studyModes
    : [session.studyMode as string];
  const primaryMode = studyModeConfig[sessionModes[0]] ?? studyModeConfig.review;

  // Obtener las bases de datos de la sesión
  const sessionDatabases = databases.filter(db => 
    session.databaseIds?.includes(db.id) || db.id === session.databaseId
  );

  return (
    <div className="w-full">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-lg mb-1">
            {session.sessionName}
          </h3>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {/* Bases de datos */}
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              {sessionDatabases.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {sessionDatabases.map((db, index) => (
                    <span key={db.id} className="flex items-center gap-1">
                      <span>{db.name}</span>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        {db.cardCount} tarjetas
                      </span>
                      {index < sessionDatabases.length - 1 && <span className="mx-1">•</span>}
                    </span>
                  ))}
                </div>
              ) : (
                <span>Base de datos no encontrada</span>
              )}
            </div>
            
            {/* Modos de estudio */}
            <div className="flex flex-wrap items-center gap-1">
              {sessionModes.map(m => {
                const cfg = studyModeConfig[m] ?? studyModeConfig.review;
                const Icon = cfg.icon;
                return (
                  <div key={m} className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${cfg.bgColor}`}>
                    <Icon className={`w-3 h-3 ${cfg.color}`} />
                    <span className={`text-xs ${cfg.color}`}>{cfg.shortLabel}</span>
                  </div>
                );
              })}
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
        
        {isStarting ? (
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-primary/20 text-primary text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Cargando...</span>
          </div>
        ) : sessionModes.length === 1 ? (
          <button
            onClick={() => onStartSession?.(session, sessionModes[0])}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs ${
              studyModeConfig[sessionModes[0]]?.btnColor ?? 'bg-primary/10 text-primary hover:bg-primary/20'
            }`}
            disabled={!onStartSession}
          >
            <BarChart3 className="w-3 h-3" />
            <span>Iniciar sesión</span>
          </button>
        ) : (
          <div className="flex flex-wrap gap-1">
            {sessionModes.map(m => {
              const cfg = studyModeConfig[m] ?? studyModeConfig.review;
              const Icon = cfg.icon;
              return (
                <button
                  key={m}
                  onClick={() => onStartSession?.(session, m)}
                  className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs ${cfg.btnColor}`}
                  disabled={!onStartSession}
                >
                  <Icon className="w-3 h-3" />
                  <span>{cfg.shortLabel}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};