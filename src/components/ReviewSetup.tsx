import { useState } from "react";
import { KnowledgeState, Statistics } from "@/types";
import { StateBadge } from "./StateBadge";
import { Play } from "lucide-react";

interface ReviewSetupProps {
  stats: Statistics;
  databaseName: string;
  onStart: (selectedStates: KnowledgeState[]) => void;
  onCancel: () => void;
}

export function ReviewSetup({ stats, databaseName, onStart, onCancel }: ReviewSetupProps) {
  const [selectedStates, setSelectedStates] = useState<KnowledgeState[]>(['tocado', 'verde']);

  const toggleState = (state: KnowledgeState) => {
    setSelectedStates(prev => 
      prev.includes(state) 
        ? prev.filter(s => s !== state)
        : [...prev, state]
    );
  };

  const totalSelected = selectedStates.reduce((acc, state) => acc + stats[state], 0);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md p-6 rounded-xl bg-card border border-border shadow-lg animate-slide-up">
        <h2 className="text-xl font-semibold text-foreground mb-1">
          Iniciar repaso
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {databaseName}
        </p>

        <div className="space-y-4 mb-6">
          <p className="text-sm text-muted-foreground">
            Selecciona qué estados repasar:
          </p>
          
          <div className="space-y-3">
            {(['tocado', 'verde', 'solido'] as KnowledgeState[]).map((state) => (
              <button
                key={state}
                onClick={() => toggleState(state)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                  selectedStates.includes(state)
                    ? 'border-foreground/20 bg-secondary'
                    : 'border-border hover:border-muted-foreground/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    selectedStates.includes(state)
                      ? 'border-foreground bg-foreground'
                      : 'border-muted-foreground'
                  }`}>
                    {selectedStates.includes(state) && (
                      <svg className="w-3 h-3 text-background" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                      </svg>
                    )}
                  </div>
                  <StateBadge state={state} size="sm" />
                </div>
                <span className="text-sm text-muted-foreground">
                  {stats[state]} tarjetas
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-sm text-muted-foreground mb-6">
          {totalSelected > 0 
            ? `${totalSelected} tarjetas seleccionadas (orden: menos visto primero)`
            : 'Selecciona al menos un estado'
          }
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onStart(selectedStates)}
            disabled={totalSelected === 0}
            className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Comenzar
          </button>
        </div>
      </div>
    </div>
  );
}
