import React, { useState, useMemo } from 'react';
import { DatabaseGroup, Flashcard } from '@/types';
import { useNotionFlashcards, useNotionDatabases } from '@/hooks/useNotion';
import { NotionService } from '@/services/notion';
import { useFlashcardCoverage, useCoverageSummary } from '@/hooks/useExams';
import { FlashcardFilters } from './FlashcardFilters';
import { Loader2, CheckSquare, Square, Download, Copy, Check, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

interface ExamGeneratorViewProps {
  group: DatabaseGroup;
}

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  tocado:  { label: 'Tocado',  color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  verde:   { label: 'Verde',   color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  solido:  { label: 'Sólido',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

const PROMPT_TEXT = `Eres un experto en evaluación educativa. Analiza las flashcards del JSON adjunto (campo "flashcards") y genera un examen en el formato EXACTO indicado en "expectedOutputFormat".

Reglas:
- Crea al menos 1 pregunta por flashcard
- Solo usa los tipos: multiple y true-false (NO uses essay ni respuestas de texto libre)
- Para "multiple": proporciona siempre 4 opciones en "options" y el texto exacto de la correcta en "correctAnswer"
- Para "true-false": options debe ser ["Verdadero", "Falso"] y "correctAnswer" debe ser "Verdadero" o "Falso"
- Agrega "explanation" a cada pregunta
- El "id" de cada pregunta debe ser un número correlativo empezando en 1

Responde ÚNICAMENTE con el JSON, sin texto adicional ni bloques de código.`;

export const ExamGeneratorView: React.FC<ExamGeneratorViewProps> = ({ group }) => {
  const [selectedDbId, setSelectedDbId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [filteredFlashcards, setFilteredFlashcards] = useState<Flashcard[]>([]);

  const { data: allDatabases = [] } = useNotionDatabases();
  const { data: flashcards = [], isLoading: flashcardsLoading } = useNotionFlashcards(selectedDbId);
  const { data: coverage = [] } = useFlashcardCoverage(group.id, selectedDbId);
  const { data: coverageSummary = [] } = useCoverageSummary(group.id);

  // Bases de datos que pertenecen al grupo
  const groupDatabases = useMemo(
    () => allDatabases.filter(db => group.databaseIds.includes(db.id)),
    [allDatabases, group.databaseIds]
  );

  // Mapa flashcardId → tiene cobertura
  const coveredIds = useMemo(
    () => new Set(coverage.map(c => c.FlashcardId)),
    [coverage]
  );

  // Cuando cambia la BD, resetear selección y lista filtrada
  const handleDbChange = (dbId: string) => {
    setSelectedDbId(dbId);
    setSelectedIds(new Set());
    setFilteredFlashcards([]);
  };

  // Flashcards sin cobertura dentro de la vista filtrada
  const uncoveredFlashcards = useMemo(
    () => filteredFlashcards.filter(f => !coveredIds.has(f.id)),
    [filteredFlashcards, coveredIds]
  );

  const handleSelectUncovered = () => {
    setSelectedIds(new Set(uncoveredFlashcards.map(f => f.id)));
  };

  const handleToggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedFlashcards = useMemo(
    () => flashcards.filter(f => selectedIds.has(f.id)),
    [flashcards, selectedIds]
  );

  const selectedDbName = useMemo(
    () => groupDatabases.find(db => db.id === selectedDbId)?.name ?? '',
    [groupDatabases, selectedDbId]
  );

  const handleExport = async () => {
    if (selectedFlashcards.length === 0) {
      toast.warning('Selecciona al menos una flashcard para exportar');
      return;
    }

    setIsExporting(true);
    try {
      // Cargar contenido completo de cada flashcard desde Notion
      const flashcardsWithContent = await Promise.all(
        selectedFlashcards.map(async f => {
          const { content } = await NotionService.getFlashcardContent(f.id);
          return { title: f.title, content: content || f.title };
        })
      );

      const exportData = {
        metadata: {
          groupName: group.name,
          databaseName: selectedDbName,
          exportDate: new Date().toISOString(),
          flashcardCount: selectedFlashcards.length,
        },
        flashcards: flashcardsWithContent,
        expectedOutputFormat: {
          examName: 'string — nombre descriptivo del examen',
          description: 'string — descripción breve',
          timeLimit: 'número en segundos (0 = sin límite)',
          questions: [
            {
              id: 1,
              question: 'texto de la pregunta',
              type: 'multiple | true-false',
              options: ['solo para multiple y true-false'],
              correctAnswer: 'string',
              explanation: 'string',
            },
          ],
        },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flashcards-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${selectedFlashcards.length} flashcards exportadas correctamente`);
    } catch {
      toast.error('Error al cargar el contenido de las flashcards');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(PROMPT_TEXT);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
      toast.success('Prompt copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar al portapapeles');
    }
  };

  const summaryForDb = (dbId: string) =>
    coverageSummary.find(s => s.DatabaseId === dbId)?.coveredCount ?? 0;

  return (
    <div className="space-y-5">

      {/* Paso 1: Seleccionar base de datos */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
          Selecciona una base de datos
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {groupDatabases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay bases de datos en este grupo.</p>
          ) : (
            groupDatabases.map(db => {
              const covered = summaryForDb(db.id);
              return (
                <button
                  key={db.id}
                  onClick={() => handleDbChange(db.id)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    selectedDbId === db.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40 hover:bg-muted/30'
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span>{db.icon || '📚'}</span>
                    {db.name}
                  </span>
                  {covered > 0 && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {covered} cubiertas
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Paso 2: Lista de flashcards */}
      {selectedDbId && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
            Selecciona las flashcards a incluir
          </h3>

          {flashcardsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Cargando flashcards...</span>
            </div>
          ) : flashcards.length === 0 ? (
            <p className="text-sm text-muted-foreground">No se encontraron flashcards en esta base de datos.</p>
          ) : (
            <>
              {/* Filtros avanzados */}
              <FlashcardFilters
                key={selectedDbId}
                flashcards={flashcards}
                onFilterChange={setFilteredFlashcards}
                databaseId={selectedDbId ?? undefined}
              />

              {/* Controles de selección */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                <span>
                  <span className="font-medium text-foreground">{selectedIds.size}</span> seleccionadas
                  {coveredIds.size > 0 && (
                    <span className="ml-2 text-green-600 dark:text-green-400">
                      · {coveredIds.size} ya cubiertas
                    </span>
                  )}
                  <span className="ml-2">· {filteredFlashcards.length} de {flashcards.length} visibles</span>
                </span>
                <button
                  onClick={handleSelectUncovered}
                  className="text-primary hover:underline font-medium"
                >
                  Seleccionar sin examen ({uncoveredFlashcards.length})
                </button>
              </div>

              {/* Lista */}
              <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                {filteredFlashcards.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Ninguna flashcard coincide con los filtros activos.
                  </p>
                ) : null}
                {filteredFlashcards.map(card => {
                  const isCovered = coveredIds.has(card.id);
                  const isSelected = selectedIds.has(card.id);
                  const stateInfo = STATE_LABELS[card.state] ?? STATE_LABELS.tocado;
                  return (
                    <label
                      key={card.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border hover:bg-muted/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isSelected}
                        onChange={() => handleToggle(card.id)}
                      />
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-primary flex-shrink-0" />
                        : <Square className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      }
                      <span className="flex-1 text-sm text-foreground line-clamp-1">{card.title}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${stateInfo.color}`}>
                        {stateInfo.label}
                      </span>
                      {isCovered && (
                        <span className="text-[10px] text-green-600 dark:text-green-400 flex-shrink-0" title="Ya tiene examen">
                          ✅
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Paso 3: Exportar */}
      {selectedDbId && flashcards.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
            Exportar para IA
          </h3>

          <button
            onClick={handleExport}
            disabled={selectedIds.size === 0 || isExporting}
            className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando contenido...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Exportar JSON ({selectedIds.size} flashcards)
              </>
            )}
          </button>

          {/* Prompt recomendado */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setShowPrompt(p => !p)}
              className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                Prompt recomendado para la IA
              </span>
              {showPrompt ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showPrompt && (
              <div className="border-t border-border bg-muted/20 p-3 space-y-2">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                  {PROMPT_TEXT}
                </pre>
                <button
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                >
                  {promptCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {promptCopied ? 'Copiado' : 'Copiar prompt'}
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Pega el JSON exportado junto con este prompt en la IA. El JSON resultante lo puedes subir desde la pestaña <strong>"Mis Exámenes"</strong>.
          </p>
        </div>
      )}
    </div>
  );
};
