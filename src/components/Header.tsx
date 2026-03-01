import { Settings, RefreshCw, Bell, CalendarClock } from "lucide-react";
import { useDatabaseSync } from "@/hooks/useDatabaseSync";
import { usePlanningSessionsDueToday } from "@/hooks/usePlanning";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HeaderMenu } from "@/components/HeaderMenu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface HeaderProps {
  title: string;
  subtitle?: string;
  currentView?: string;
  onNavigate?: (view: string) => void;
}

export function Header({ title, subtitle, currentView = 'home', onNavigate }: HeaderProps) {
  const syncMutation = useDatabaseSync();
  const { data: dueSessions = [] } = usePlanningSessionsDueToday();

  const handleSync = () => {
    syncMutation.mutate();
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center gap-2 sm:gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center">
            <img
              src="/logo.svg"
              alt="NotionStudy Logo"
              className="w-8 h-8"
            />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-semibold text-foreground text-lg">
              <span className="text-foreground">Notion</span>
              <span className="text-muted-foreground font-normal">Study</span>
            </h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        
        {/* Menú de navegación */}
        {onNavigate && (
          <HeaderMenu currentView={currentView} onNavigate={onNavigate} />
        )}
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
        
        <ThemeToggle />

        {/* Campana de notificaciones de repaso */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors" title="Sesiones de estudio de hoy">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {dueSessions.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {dueSessions.length > 9 ? '9+' : dueSessions.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-orange-500" />
                <h3 className="font-semibold text-sm">Notificaciones de estudio</h3>
              </div>
            </div>
            {dueSessions.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No tienes sesiones programadas para hoy
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                <div className="px-3 py-2 bg-orange-50 dark:bg-orange-950/30">
                  <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                    Hoy tienes {dueSessions.length} sesión{dueSessions.length !== 1 ? 'es' : ''} programada{dueSessions.length !== 1 ? 's' : ''} para estudiar
                  </p>
                </div>
                {dueSessions.map((s) => (
                  <div key={s.id} className="px-3 py-2.5 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-start gap-2">
                      <Bell className="w-3.5 h-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.sessionName}</p>
                        {s.groupName && (
                          <p className="text-xs text-muted-foreground truncate">{s.groupName}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>

        <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
