import { Database, Settings } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Database className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      
      <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
        <Settings className="w-5 h-5 text-muted-foreground" />
      </button>
    </header>
  );
}
