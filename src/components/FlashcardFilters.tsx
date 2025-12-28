import React, { useState, useEffect } from 'react';
import { Flashcard, KnowledgeState } from '@/types';
import { Filter, X, ChevronDown, MessageSquare } from 'lucide-react';
import { StateBadge } from './StateBadge';
import { useNotesCountByDatabase } from '@/hooks/useStudyTracking';

interface FilterOption {
  column: string;
  value: string;
  count: number;
}

interface ActiveFilter {
  column: string;
  value: string;
  label: string;
}

interface FlashcardFiltersProps {
  flashcards: Flashcard[];
  onFilterChange: (filteredCards: Flashcard[]) => void;
  databaseId?: string; // Agregar databaseId para obtener conteos de notas
  className?: string;
}

export const FlashcardFilters: React.FC<FlashcardFiltersProps> = ({
  flashcards,
  onFilterChange,
  databaseId,
  className = ""
}) => {
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [availableFilters, setAvailableFilters] = useState<Record<string, FilterOption[]>>({});

  // Obtener conteos de notas de repaso
  const { data: notesCounts = {} } = useNotesCountByDatabase(databaseId);

  // Analizar las flashcards para extraer opciones de filtro disponibles
  useEffect(() => {
    const filterOptions: Record<string, Map<string, number>> = {};

    flashcards.forEach(card => {
      // Agregar filtro por estado de dominio
      if (!filterOptions['Dominio']) {
        filterOptions['Dominio'] = new Map();
      }
      const currentCount = filterOptions['Dominio'].get(card.state) || 0;
      filterOptions['Dominio'].set(card.state, currentCount + 1);

      // Agregar filtros por información auxiliar
      if (card.auxiliaryInfo) {
        Object.entries(card.auxiliaryInfo).forEach(([column, data]) => {
          if (!filterOptions[column]) {
            filterOptions[column] = new Map();
          }
          const currentCount = filterOptions[column].get(data.value) || 0;
          filterOptions[column].set(data.value, currentCount + 1);
        });
      }
    });

    // Agregar filtro por notas de repaso
    if (Object.keys(notesCounts).length > 0) {
      filterOptions['Notas de repaso'] = new Map();
      let withNotes = 0;
      let withoutNotes = 0;

      flashcards.forEach(card => {
        const hasNotes = notesCounts[card.id] > 0;
        if (hasNotes) {
          withNotes++;
        } else {
          withoutNotes++;
        }
      });

      if (withNotes > 0) {
        filterOptions['Notas de repaso'].set('Con notas', withNotes);
      }
      if (withoutNotes > 0) {
        filterOptions['Notas de repaso'].set('Sin notas', withoutNotes);
      }
    }

    // Convertir a formato de opciones
    const formattedFilters: Record<string, FilterOption[]> = {};
    Object.entries(filterOptions).forEach(([column, valueMap]) => {
      formattedFilters[column] = Array.from(valueMap.entries())
        .map(([value, count]) => ({ column, value, count }))
        .sort((a, b) => b.count - a.count); // Ordenar por frecuencia
    });

    setAvailableFilters(formattedFilters);
  }, [flashcards, notesCounts]);

  // Aplicar filtros cuando cambien
  useEffect(() => {
    if (activeFilters.length === 0) {
      onFilterChange(flashcards);
      return;
    }

    const filtered = flashcards.filter(card => {
      return activeFilters.every(filter => {
        if (filter.column === 'Dominio') {
          return card.state === filter.value;
        }
        
        if (filter.column === 'Notas de repaso') {
          const hasNotes = notesCounts[card.id] > 0;
          if (filter.value === 'Con notas') {
            return hasNotes;
          } else if (filter.value === 'Sin notas') {
            return !hasNotes;
          }
          return false;
        }
        
        if (card.auxiliaryInfo && card.auxiliaryInfo[filter.column]) {
          return card.auxiliaryInfo[filter.column].value === filter.value;
        }
        
        return false;
      });
    });

    onFilterChange(filtered);
  }, [activeFilters, flashcards, notesCounts, onFilterChange]);

  const addFilter = (column: string, value: string) => {
    // Evitar duplicados
    const exists = activeFilters.some(f => f.column === column && f.value === value);
    if (exists) return;

    const label = column === 'Dominio' ? 
      `${column}: ${value}` : 
      column === 'Notas de repaso' ?
      `${value}` :
      `${column}: ${value}`;

    setActiveFilters(prev => [...prev, { column, value, label }]);
  };

  const removeFilter = (index: number) => {
    setActiveFilters(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
  };

  const getStateLabel = (state: KnowledgeState) => {
    const labels = {
      'tocado': 'Tocado',
      'verde': 'Verde', 
      'solido': 'Sólido'
    };
    return labels[state];
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Botón para mostrar/ocultar filtros */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filtros avanzados
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
        
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {activeFilters.length} filtro{activeFilters.length !== 1 ? 's' : ''} activo{activeFilters.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={clearAllFilters}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      {/* Filtros activos */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter, index) => (
            <div
              key={`${filter.column}-${filter.value}`}
              className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
            >
              {filter.column === 'Dominio' ? (
                <StateBadge state={filter.value as KnowledgeState} size="xs" />
              ) : filter.column === 'Notas de repaso' ? (
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  <span>{filter.label}</span>
                </div>
              ) : (
                <span>{filter.label}</span>
              )}
              <button
                onClick={() => removeFilter(index)}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Panel de filtros */}
      {showFilters && (
        <div className="p-4 bg-card border border-border rounded-lg space-y-4">
          {Object.entries(availableFilters).map(([column, options]) => (
            <div key={column} className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">{column}</h4>
              <div className="flex flex-wrap gap-2">
                {options.map(option => (
                  <button
                    key={`${column}-${option.value}`}
                    onClick={() => addFilter(column, option.value)}
                    className="flex items-center gap-2 px-3 py-1 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                    disabled={activeFilters.some(f => f.column === column && f.value === option.value)}
                  >
                    {column === 'Dominio' ? (
                      <>
                        <StateBadge state={option.value as KnowledgeState} size="xs" />
                        <span>{getStateLabel(option.value as KnowledgeState)}</span>
                      </>
                    ) : column === 'Notas de repaso' ? (
                      <>
                        <MessageSquare className="w-4 h-4" />
                        <span>{option.value}</span>
                      </>
                    ) : (
                      <span>{option.value}</span>
                    )}
                    <span className="text-xs text-muted-foreground">({option.count})</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlashcardFilters;