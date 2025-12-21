import { Database } from "@/types";
import { Database as DatabaseIcon, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface DatabaseCardProps {
  database: Database;
  onClick: () => void;
}

export function DatabaseCard({ database, onClick }: DatabaseCardProps) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left p-4 rounded-lg bg-card border border-border hover:border-muted-foreground/20 transition-all duration-200 animate-fade-in"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-xl">
            {database.icon || <DatabaseIcon className="w-5 h-5 text-muted-foreground" />}
          </div>
          <div>
            <h3 className="font-medium text-foreground group-hover:text-foreground/90">
              {database.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {database.cardCount} tarjetas
            </p>
          </div>
        </div>
        <button 
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-secondary transition-all"
          onClick={(e) => {
            e.stopPropagation();
            // Menu actions
          }}
        >
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        Sincronizado {formatDistanceToNow(database.lastSynced, { addSuffix: true, locale: es })}
      </div>
    </button>
  );
}
