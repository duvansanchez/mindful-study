import { Statistics, KnowledgeState } from "@/types";
import { StatsOverview } from "./StatsOverview";
import { ArrowLeft, Brain, BookOpen, Play, Eye, Loader2, Link } from "lucide-react";

interface ModeSelectionProps {
  stats: Statistics;
  databaseName: string;
  isLoadingFlashcards?: boolean;
  onStartActiveReview: (selectedStates: KnowledgeState[]) => void;
  onStartOverviewMode: () => void;
  onStartMatchingMode: () => void; // Nueva función para modo matching
  onCancel: () => void;
}

export function ModeSelection({ 
  stats, 
  databaseName, 
  isLoadingFlashcards = false,
  onStartActiveReview, 
  onStartOverviewMode,
  onStartMatchingMode, 
  onCancel 
}: ModeSelectionProps) {
  const handleActiveReview = () => {
    // Por defecto, incluir todas las tarjetas en el repaso activo
    // El usuario podrá filtrar después si lo desea
    const allStates: KnowledgeState[] = ['tocado', 'verde', 'solido'];
    onStartActiveReview(allStates);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{databaseName}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Elige cómo quieres estudiar este conjunto
            </p>
          </div>
          <button 
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Estadísticas */}
        <div className="p-6 border-b border-border">
          <StatsOverview stats={stats} isLoading={isLoadingFlashcards} />
        </div>

        {/* Opciones de modo */}
        <div className="p-6 space-y-4">
          <h3 className="font-medium text-foreground mb-4">Selecciona el modo de estudio</h3>
          
          {/* Mensaje de carga */}
          {isLoadingFlashcards && (
            <div className="flex flex-col items-center justify-center py-12 px-6 bg-muted/30 rounded-lg border border-border/50">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <h4 className="text-lg font-medium text-foreground mb-2">Cargando flashcards</h4>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Obteniendo todo el contenido desde Notion. Esto puede tomar unos momentos para bases de datos grandes.
              </p>
            </div>
          )}
          
          <div className={`space-y-6 ${isLoadingFlashcards ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Primera fila - Repaso Activo y Vista General */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Repaso Activo */}
              <button
                onClick={handleActiveReview}
                disabled={isLoadingFlashcards}
                className="group p-6 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Brain className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                      Repaso activo
                      <Play className="w-4 h-4 text-primary" />
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      Modo de estudio interactivo. Evalúa tu conocimiento, cambia estados de aprendizaje 
                      y registra tu progreso.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-primary">
                      <span>• Evaluación cognitiva</span>
                      <span>• Actualiza progreso</span>
                      <span>• Registra repasos</span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Vista General */}
              <button
                onClick={onStartOverviewMode}
                disabled={isLoadingFlashcards}
                className="group p-6 rounded-lg border border-border hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                    <BookOpen className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                      Vista general
                      <Eye className="w-4 h-4 text-blue-500" />
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      Modo de lectura controlada. Explora contenido sin presión, 
                      detecta huecos conceptuales y planifica futuros repasos.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-blue-500">
                      <span>• Solo lectura</span>
                      <span>• Sin evaluación</span>
                      <span>• Exploración libre</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Segunda fila - Modo Matching centrado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={onStartMatchingMode}
                disabled={isLoadingFlashcards}
                className="group p-6 rounded-lg border border-border hover:border-green-500/50 hover:bg-green-500/5 transition-all text-left disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors flex-shrink-0">
                    <Link className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                      Modo Matching
                      <Play className="w-4 h-4 text-green-500" />
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3 break-words">
                      Juego de emparejamiento. Conecta títulos con definiciones. 
                      Perfecto para memorizar conceptos.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-green-500 flex-wrap">
                      <span>• Emparejamiento</span>
                      <span>• Gamificado</span>
                      <span>• Memorización</span>
                    </div>
                  </div>
                </div>
              </button>
              <div></div> {/* Espacio vacío */}
            </div>
          </div>

          {/* Información adicional */}
          <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Consejo:</strong> Usa la vista general para familiarizarte 
              con el contenido antes de un repaso activo, o para revisar conceptos sin afectar tu progreso.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {isLoadingFlashcards 
                ? "Cargando contenido desde Notion..." 
                : "Puedes cambiar de modo en cualquier momento"
              }
            </span>
            <span>
              {isLoadingFlashcards 
                ? "Preparando tarjetas..." 
                : `${stats.total} tarjetas disponibles`
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}