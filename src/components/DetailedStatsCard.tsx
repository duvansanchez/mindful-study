import { Statistics } from "@/types";
import { StateBadge } from "./StateBadge";
import { Calendar, TrendingUp } from "lucide-react";

interface DetailedStatsCardProps {
  title: string;
  subtitle?: string;
  stats: Statistics;
  lastReviewed?: Date | null;
  reviewedThisWeek?: number;
}

export function DetailedStatsCard({ 
  title, 
  subtitle = "Estadísticas de conocimiento",
  stats, 
  lastReviewed,
  reviewedThisWeek = 0 
}: DetailedStatsCardProps) {
  const percentage = (value: number) => 
    stats.total > 0 ? Math.round((value / stats.total) * 100) : 0;

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "Sin revisar";
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'long' 
    });
  };

  const stateDescriptions = {
    tocado: "Requiere repaso frecuente",
    verde: "Requiere repaso ocasional",
    solido: "No requiere repaso activo"
  };

  return (
    <div className="rounded-xl bg-card border border-border animate-fade-in">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>

      {/* Meta info cards */}
      <div className="p-6 grid grid-cols-2 gap-4 border-b border-border">
        <div className="p-4 rounded-lg bg-secondary/50 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Calendar className="w-4 h-4" />
            <span>Última revisión</span>
          </div>
          <p className="font-medium text-foreground">{formatDate(lastReviewed)}</p>
        </div>
        <div className="p-4 rounded-lg bg-secondary/50 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Revisadas esta semana</span>
          </div>
          <p className="font-medium text-foreground">{reviewedThisWeek} tarjetas</p>
        </div>
      </div>

      {/* Distribution section */}
      <div className="p-6 border-b border-border">
        <h3 className="text-base font-medium text-foreground mb-6">Distribución de estados</h3>
        
        <div className="space-y-6">
          {/* Tocado */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StateBadge state="tocado" size="sm" showLabel />
                <span className="text-sm font-medium text-foreground">{stats.tocado}</span>
              </div>
              <span className="text-sm text-muted-foreground">{percentage(stats.tocado)}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div 
                className="h-full bg-state-tocado transition-all duration-500 rounded-full"
                style={{ width: `${percentage(stats.tocado)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{stateDescriptions.tocado}</p>
          </div>

          {/* Verde */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StateBadge state="verde" size="sm" showLabel />
                <span className="text-sm font-medium text-foreground">{stats.verde}</span>
              </div>
              <span className="text-sm text-muted-foreground">{percentage(stats.verde)}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div 
                className="h-full bg-state-verde transition-all duration-500 rounded-full"
                style={{ width: `${percentage(stats.verde)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{stateDescriptions.verde}</p>
          </div>

          {/* Sólido */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StateBadge state="solido" size="sm" showLabel />
                <span className="text-sm font-medium text-foreground">{stats.solido}</span>
              </div>
              <span className="text-sm text-muted-foreground">{percentage(stats.solido)}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div 
                className="h-full bg-state-solido transition-all duration-500 rounded-full"
                style={{ width: `${percentage(stats.solido)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{stateDescriptions.solido}</p>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="p-6 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Total de tarjetas</span>
        <span className="text-xl font-semibold text-foreground">{stats.total}</span>
      </div>
    </div>
  );
}
