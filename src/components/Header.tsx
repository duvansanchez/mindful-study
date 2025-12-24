import { Settings, RefreshCw } from "lucide-react";
import { useDatabaseSync } from "@/hooks/useDatabaseSync";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const syncMutation = useDatabaseSync();

  const handleSync = () => {
    syncMutation.mutate();
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center">
          <img 
            src="/logo.svg" 
            alt="NotionStudy Logo" 
            className="w-8 h-8"
          />
        </div>
        <div>
          <h1 className="font-semibold text-foreground text-lg">
            <span className="text-foreground">Notion</span>
            <span className="text-muted-foreground font-normal">Study</span>
          </h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button 
          onClick={handleSync}
          disabled={syncMutation.isPending}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Sincronizar bases de datos"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {syncMutation.isPending ? 'Sincronizando...' : 'Sincronizar'}
          </span>
        </button>
        
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
