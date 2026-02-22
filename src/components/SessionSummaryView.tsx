import React from 'react';
import { ArrowLeft, Brain, TrendingUp, Minus, TrendingDown, Clock, BookOpen, Zap } from 'lucide-react';
import { KnowledgeState } from '@/types';
import { StateBadge } from './StateBadge';

const STATE_ORDER: Record<KnowledgeState, number> = { tocado: 0, verde: 1, solido: 2 };

export interface SessionEntry {
  id: string;
  title: string;
  originalState: KnowledgeState;
  finalState: KnowledgeState;
  groupName?: string;
}

export interface SessionSummaryData {
  entries: SessionEntry[];
  totalDurationSeconds: number;
  groupName?: string;
}

interface SessionSummaryViewProps {
  data: SessionSummaryData;
  onGoHome: () => void;
  onGoSmartReview: () => void;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export const SessionSummaryView: React.FC<SessionSummaryViewProps> = ({
  data,
  onGoHome,
  onGoSmartReview,
}) => {
  const { entries, totalDurationSeconds } = data;

  const improved = entries.filter(e => STATE_ORDER[e.finalState] > STATE_ORDER[e.originalState]);
  const degraded = entries.filter(e => STATE_ORDER[e.finalState] < STATE_ORDER[e.originalState]);
  const maintained = entries.filter(e => STATE_ORDER[e.finalState] === STATE_ORDER[e.originalState]);

  const finalByState = {
    tocado: entries.filter(e => e.finalState === 'tocado').length,
    verde: entries.filter(e => e.finalState === 'verde').length,
    solido: entries.filter(e => e.finalState === 'solido').length,
  };

  const total = entries.length;
  const avgSeconds = total > 0 ? Math.round(totalDurationSeconds / total) : 0;

  const heroEmoji =
    improved.length > degraded.length * 2 ? '🌟'
    : degraded.length === 0 ? '✅'
    : improved.length > 0 ? '📈'
    : '💪';

  const heroMessage =
    improved.length > degraded.length * 2 ? '¡Excelente sesión!'
    : degraded.length === 0 ? '¡Sesión completada!'
    : improved.length > 0 ? '¡Buen trabajo!'
    : '¡Sesión completada!';

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center">
        <button
          onClick={onGoHome}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Volver al inicio</span>
        </button>
      </div>

      {/* Hero */}
      <div className="text-center py-3 space-y-1">
        <p className="text-5xl">{heroEmoji}</p>
        <h1 className="text-2xl font-bold mt-2">{heroMessage}</h1>
        {data.groupName && (
          <p className="text-sm text-muted-foreground">{data.groupName}</p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-border rounded-xl p-3 text-center space-y-1">
          <BookOpen className="w-4 h-4 text-muted-foreground mx-auto" />
          <p className="text-2xl font-bold">{total}</p>
          <p className="text-xs text-muted-foreground">tarjetas</p>
        </div>
        <div className="border border-border rounded-xl p-3 text-center space-y-1">
          <Clock className="w-4 h-4 text-muted-foreground mx-auto" />
          <p className="text-xl font-bold">{formatDuration(totalDurationSeconds)}</p>
          <p className="text-xs text-muted-foreground">duración</p>
        </div>
        <div className="border border-border rounded-xl p-3 text-center space-y-1">
          <Zap className="w-4 h-4 text-muted-foreground mx-auto" />
          <p className="text-xl font-bold">{formatDuration(avgSeconds)}</p>
          <p className="text-xs text-muted-foreground">por tarjeta</p>
        </div>
      </div>

      {/* State changes */}
      <div className="border border-border rounded-xl p-4 space-y-3">
        <p className="font-medium text-sm">Cambios de estado</p>
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 w-28 shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-emerald-600 dark:text-emerald-400">Mejoraron</span>
            </div>
            <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: total > 0 ? `${(improved.length / total) * 100}%` : '0%' }}
              />
            </div>
            <span className="text-sm font-bold w-8 text-right">{improved.length}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 w-28 shrink-0">
              <Minus className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Sin cambio</span>
            </div>
            <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-muted-foreground/40 rounded-full transition-all"
                style={{ width: total > 0 ? `${(maintained.length / total) * 100}%` : '0%' }}
              />
            </div>
            <span className="text-sm font-bold w-8 text-right">{maintained.length}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 w-28 shrink-0">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-500">Bajaron</span>
            </div>
            <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all"
                style={{ width: total > 0 ? `${(degraded.length / total) * 100}%` : '0%' }}
              />
            </div>
            <span className="text-sm font-bold w-8 text-right">{degraded.length}</span>
          </div>
        </div>
      </div>

      {/* Final state distribution */}
      <div className="border border-border rounded-xl p-4 space-y-3">
        <p className="font-medium text-sm">Estado final</p>
        <div className="flex gap-3">
          <div className="flex-1 text-center space-y-1.5">
            <p className="text-2xl font-bold">{finalByState.tocado}</p>
            <StateBadge state="tocado" size="xs" />
          </div>
          <div className="flex-1 text-center space-y-1.5">
            <p className="text-2xl font-bold">{finalByState.verde}</p>
            <StateBadge state="verde" size="xs" />
          </div>
          <div className="flex-1 text-center space-y-1.5">
            <p className="text-2xl font-bold">{finalByState.solido}</p>
            <StateBadge state="solido" size="xs" />
          </div>
        </div>
      </div>

      {/* Cards that degraded */}
      {degraded.length > 0 && (
        <div className="border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-2">
          <p className="font-medium text-sm text-red-600 dark:text-red-400">
            Bajaron de estado — necesitan atención ({degraded.length})
          </p>
          <div className="space-y-0.5 max-h-44 overflow-y-auto">
            {degraded.map(e => (
              <div
                key={e.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <span className="text-sm text-foreground truncate flex-1">{e.title}</span>
                {e.groupName && (
                  <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full shrink-0 max-w-[90px] truncate">
                    {e.groupName}
                  </span>
                )}
                <StateBadge state={e.originalState} size="xs" />
                <span className="text-xs text-muted-foreground shrink-0">→</span>
                <StateBadge state={e.finalState} size="xs" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cards that improved — optional, collapsed info */}
      {improved.length > 0 && (
        <div className="border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2">
          <p className="font-medium text-sm text-emerald-600 dark:text-emerald-400">
            Mejoraron de estado ({improved.length})
          </p>
          <div className="space-y-0.5 max-h-44 overflow-y-auto">
            {improved.map(e => (
              <div
                key={e.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <span className="text-sm text-foreground truncate flex-1">{e.title}</span>
                {e.groupName && (
                  <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full shrink-0 max-w-[90px] truncate">
                    {e.groupName}
                  </span>
                )}
                <StateBadge state={e.originalState} size="xs" />
                <span className="text-xs text-muted-foreground shrink-0">→</span>
                <StateBadge state={e.finalState} size="xs" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pb-4">
        <button
          onClick={onGoHome}
          className="flex-1 py-2.5 rounded-xl border border-border hover:bg-secondary transition-colors text-sm font-medium"
        >
          Inicio
        </button>
        <button
          onClick={onGoSmartReview}
          className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium flex items-center justify-center gap-2"
        >
          <Brain className="w-4 h-4" />
          Repaso Inteligente
        </button>
      </div>
    </div>
  );
};
