import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Home, BarChart3, Folder, Settings, Brain } from 'lucide-react';

interface HeaderMenuProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const HeaderMenu: React.FC<HeaderMenuProps> = ({ currentView, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'groups', label: 'Agrupaciones', icon: Folder },
    { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
    { id: 'smart-review', label: 'Repaso Inteligente', icon: Brain },
    { id: 'settings', label: 'Configuración', icon: Settings }
  ];

  const getCurrentLabel = () => {
    if (currentView === 'groups-general-info') {
      return 'Agrupaciones';
    }

    const current = menuItems.find(item => item.id === currentView);
    return current?.label || 'Inicio';
  };

  const handleItemClick = (itemId: string) => {
    onNavigate(itemId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
      >
        <span className="text-sm font-medium text-foreground">{getCurrentLabel()}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 min-w-[160px]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === currentView;
            
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-secondary transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  isActive ? 'bg-secondary text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};