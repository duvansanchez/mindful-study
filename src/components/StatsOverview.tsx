import { Statistics } from "@/types";
import { StateBadge } from "./StateBadge";

interface StatsOverviewProps {
  stats: Statistics;
  title?: string;
}

export function StatsOverview({ stats, title }: StatsOverviewProps) {
  const percentage = (value: number) => 
    stats.total > 0 ? Math.round((value / stats.total) * 100) : 0;

  return (
    <div className="p-5 rounded-xl bg-card border border-border animate-fade-in">
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground mb-4">{title}</h3>
      )}
      
      <div className="space-y-4">
        {/* Progress bar */}
        <div className="h-2 rounded-full bg-secondary overflow-hidden flex">
          <div 
            className="h-full bg-state-tocado transition-all duration-500"
            style={{ width: `${percentage(stats.tocado)}%` }}
          />
          <div 
            className="h-full bg-state-verde transition-all duration-500"
            style={{ width: `${percentage(stats.verde)}%` }}
          />
          <div 
            className="h-full bg-state-solido transition-all duration-500"
            style={{ width: `${percentage(stats.solido)}%` }}
          />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <StateBadge state="tocado" size="sm" />
            </div>
            <p className="text-2xl font-semibold text-foreground">{stats.tocado}</p>
            <p className="text-xs text-muted-foreground">{percentage(stats.tocado)}%</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <StateBadge state="verde" size="sm" />
            </div>
            <p className="text-2xl font-semibold text-foreground">{stats.verde}</p>
            <p className="text-xs text-muted-foreground">{percentage(stats.verde)}%</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <StateBadge state="solido" size="sm" />
            </div>
            <p className="text-2xl font-semibold text-foreground">{stats.solido}</p>
            <p className="text-xs text-muted-foreground">{percentage(stats.solido)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
