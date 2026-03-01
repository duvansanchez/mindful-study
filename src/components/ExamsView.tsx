import React, { useState, useRef, useMemo } from 'react';
import { ArrowLeft, Upload, Play, Trash2, BarChart3, Loader2, Sparkles, CheckSquare, Square, Pencil } from 'lucide-react';
import { DatabaseGroup, Flashcard, ExamQuestion } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExamStatsView } from '@/components/ExamStatsView';
import { ExamGeneratorView } from '@/components/ExamGeneratorView';
import { ExamEditorView } from '@/components/ExamEditorView';
import { FlashcardFilters } from '@/components/FlashcardFilters';
import { useNotionDatabases, useNotionFlashcards } from '@/hooks/useNotion';
import { useLinkFlashcardCoverage } from '@/hooks/useExams';

const API_BASE = '/api';

interface ExamsViewProps {
  group: DatabaseGroup;
  onBack: () => void;
  onStartExam: (examId: string, examName: string, questions: any[], timeLimit: number) => void;
}

interface Exam {
  id: string;
  groupId: string;
  examName: string;
  examData: any[];
  timeLimit: number;
  totalQuestions: number;
  createdAt: string;
  updatedAt: string;
}

interface ExamAttempt {
  id: string;
  examDocumentId: string;
  examName: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  duration: number;
  createdAt: string;
}

interface PendingExamData {
  examName: string;
  description: string;
  timeLimit: number;
  questions: any[];
}

export const ExamsView: React.FC<ExamsViewProps> = ({ group, onBack, onStartExam }) => {
  const [activeTab, setActiveTab] = useState<'exams' | 'generate'>('exams');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedExamForStats, setSelectedExamForStats] = useState<Exam | null>(null);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  // Estado para el flujo de upload con vinculación de cobertura
  const [pendingExamData, setPendingExamData] = useState<PendingExamData | null>(null);
  const [coverageDbId, setCoverageDbId] = useState<string | null>(null);
  const [coverageSelectedIds, setCoverageSelectedIds] = useState<Set<string>>(new Set());
  const [filteredCoverageFlashcards, setFilteredCoverageFlashcards] = useState<Flashcard[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Hooks de datos
  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ['exams', group.id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/groups/${group.id}/exams`);
      if (!response.ok) return [];
      return response.json() as Promise<Exam[]>;
    },
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['exam-attempts', group.id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/groups/${group.id}/exam-attempts`);
      if (!response.ok) return [];
      return response.json() as Promise<ExamAttempt[]>;
    },
  });

  const { data: allDatabases = [] } = useNotionDatabases();
  const { data: coverageFlashcards = [], isLoading: coverageFlashcardsLoading } = useNotionFlashcards(coverageDbId);
  const linkCoverage = useLinkFlashcardCoverage();

  const groupDatabases = useMemo(
    () => allDatabases.filter(db => group.databaseIds.includes(db.id)),
    [allDatabases, group.databaseIds]
  );

  const uploadMutation = useMutation({
    mutationFn: async (payload: { examName: string; description?: string; timeLimit: number; examData: any[] }) => {
      const response = await fetch(`${API_BASE}/groups/${group.id}/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Error cargando examen');
      return response.json() as Promise<Exam>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', group.id] });
    },
    onError: () => {
      toast.error('Error al cargar el examen');
      setUploadingFile(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (examId: string) => {
      const response = await fetch(`${API_BASE}/exams/${examId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error eliminando examen');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Examen eliminado');
      queryClient.invalidateQueries({ queryKey: ['exams', group.id] });
    },
    onError: () => toast.error('Error al eliminar el examen'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ examId, examName, examData, timeLimit }: { examId: string; examName: string; examData: ExamQuestion[]; timeLimit: number }) => {
      const response = await fetch(`${API_BASE}/exams/${examId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examName, examData, timeLimit }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Error actualizando examen');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Examen actualizado');
      queryClient.invalidateQueries({ queryKey: ['exams', group.id] });
      setEditingExam(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Error al actualizar el examen'),
  });

  const handleSaveExam = async (examId: string, examName: string, examData: ExamQuestion[], timeLimit: number) => {
    await updateMutation.mutateAsync({ examId, examName, examData, timeLimit });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      toast.error('Por favor sube un archivo JSON');
      return;
    }
    try {
      const examData = JSON.parse(await file.text());
      if (!examData.examName || !Array.isArray(examData.questions)) {
        toast.error('Formato inválido. Necesita: examName, questions[]');
        return;
      }
      setPendingExamData({
        examName: examData.examName,
        description: examData.description || '',
        timeLimit: examData.timeLimit || 0,
        questions: examData.questions,
      });
      // Limpiar el input para que se pueda volver a seleccionar el mismo archivo
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      toast.error('Error al procesar el archivo JSON');
    }
  };

  const handleConfirmUpload = async () => {
    if (!pendingExamData) return;
    try {
      setUploadingFile(true);
      const created = await uploadMutation.mutateAsync({
        examName: pendingExamData.examName,
        description: pendingExamData.description,
        timeLimit: pendingExamData.timeLimit,
        examData: pendingExamData.questions,
      });

      // Vincular cobertura si se seleccionaron flashcards
      if (coverageDbId && coverageSelectedIds.size > 0 && created?.id) {
        await linkCoverage.mutateAsync({
          examId: created.id,
          databaseId: coverageDbId,
          flashcardIds: Array.from(coverageSelectedIds),
        });
        toast.success(`Examen subido y ${coverageSelectedIds.size} flashcard${coverageSelectedIds.size !== 1 ? 's' : ''} vinculada${coverageSelectedIds.size !== 1 ? 's' : ''}`);
      } else {
        toast.success('Examen cargado exitosamente');
      }

      // Limpiar estado
      setPendingExamData(null);
      setCoverageDbId(null);
      setCoverageSelectedIds(new Set());
      setShowUpload(false);
      setUploadingFile(false);
    } catch {
      setUploadingFile(false);
    }
  };

  const handleCancelUpload = () => {
    setPendingExamData(null);
    setCoverageDbId(null);
    setCoverageSelectedIds(new Set());
    setShowUpload(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleToggleCoverageFlashcard = (id: string) => {
    setCoverageSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getQuickStats = (examId: string) => {
    const examAttempts = attempts.filter(a => a.examDocumentId === examId);
    if (examAttempts.length === 0) return null;
    const avg = examAttempts.reduce((s, a) => s + a.score, 0) / examAttempts.length;
    const best = Math.max(...examAttempts.map(a => a.score));
    const passRate = Math.round((examAttempts.filter(a => a.score >= 70).length / examAttempts.length) * 100);
    return { count: examAttempts.length, avg, best, passRate };
  };

  // Editor de examen
  if (editingExam) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Editar examen</h1>
        </div>
        <ExamEditorView
          exam={editingExam}
          onSave={handleSaveExam}
          onCancel={() => setEditingExam(null)}
        />
      </div>
    );
  }

  // Si hay un examen seleccionado para ver sus stats, mostrar la vista de estadísticas
  if (selectedExamForStats) {
    return (
      <ExamStatsView
        examId={selectedExamForStats.id}
        examName={selectedExamForStats.examName}
        totalQuestions={selectedExamForStats.totalQuestions}
        timeLimit={selectedExamForStats.timeLimit}
        onBack={() => setSelectedExamForStats(null)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <h1 className="text-3xl font-bold text-foreground">Exámenes — {group.name}</h1>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('exams')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'exams'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Mis Exámenes
        </button>
        <button
          onClick={() => setActiveTab('generate')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'generate'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Generar con IA
        </button>
      </div>

      {/* Tab: Mis Exámenes */}
      {activeTab === 'exams' && (
        <>
          {/* Botón subir */}
          <div className="flex justify-end">
            <button
              onClick={() => { setShowUpload(!showUpload); if (showUpload) handleCancelUpload(); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <Upload className="w-5 h-5" />
              Subir Examen (JSON)
            </button>
          </div>

          {/* Formulario de upload */}
          {showUpload && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Subir nuevo examen</h2>

              {!pendingExamData ? (
                <>
                  <pre className="bg-muted/50 p-3 rounded text-xs overflow-auto max-h-40">
{`{
  "examName": "Título del Examen",
  "description": "Descripción opcional",
  "timeLimit": 3600,
  "questions": [
    {
      "id": 1,
      "question": "¿Pregunta?",
      "type": "multiple",
      "options": ["A", "B", "C"],
      "correctAnswer": "A",
      "explanation": "Explicación"
    }
  ]
}`}
                  </pre>
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">Haz clic o arrastra un archivo JSON</p>
                    <p className="text-xs text-muted-foreground mt-1">Solo archivos .json</p>
                  </div>
                </>
              ) : (
                /* Paso 2: Confirmar + vincular cobertura */
                <div className="space-y-4">
                  {/* Preview del examen */}
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 dark:text-green-400 text-sm font-bold">✓</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{pendingExamData.examName}</p>
                      <p className="text-xs text-muted-foreground">
                        {pendingExamData.questions.length} preguntas
                        {pendingExamData.timeLimit > 0 && ` · ${Math.floor(pendingExamData.timeLimit / 60)} min`}
                      </p>
                    </div>
                  </div>

                  {/* Vinculación de flashcards (opcional) */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Vincular flashcards cubiertas{' '}
                      <span className="text-muted-foreground font-normal">(opcional)</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Selecciona qué flashcards cubre este examen para actualizar el indicador de cobertura en "Generar con IA".
                    </p>

                    {/* Selector de base de datos */}
                    <div className="grid grid-cols-1 gap-1.5">
                      {groupDatabases.map(db => (
                        <button
                          key={db.id}
                          onClick={() => {
                            setCoverageDbId(prev => prev === db.id ? null : db.id);
                            setCoverageSelectedIds(new Set());
                            setFilteredCoverageFlashcards([]);
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                            coverageDbId === db.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/40 hover:bg-muted/30'
                          }`}
                        >
                          <span>{db.icon || '📚'}</span>
                          <span className="font-medium">{db.name}</span>
                        </button>
                      ))}
                    </div>

                    {/* Lista de flashcards de la BD seleccionada */}
                    {coverageDbId && (
                      <div className="space-y-1.5 mt-2">
                        {coverageFlashcardsLoading ? (
                          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Cargando flashcards...
                          </div>
                        ) : coverageFlashcards.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">No se encontraron flashcards.</p>
                        ) : (
                          <>
                            <FlashcardFilters
                              key={coverageDbId}
                              flashcards={coverageFlashcards}
                              onFilterChange={setFilteredCoverageFlashcards}
                              databaseId={coverageDbId ?? undefined}
                            />
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>
                                <span className="font-medium text-foreground">{coverageSelectedIds.size}</span> seleccionadas
                                <span className="ml-2">· {filteredCoverageFlashcards.length} de {coverageFlashcards.length} visibles</span>
                              </span>
                              <button
                                onClick={() => {
                                  const allVisibleSelected = filteredCoverageFlashcards.every(f => coverageSelectedIds.has(f.id));
                                  if (allVisibleSelected) {
                                    setCoverageSelectedIds(prev => {
                                      const next = new Set(prev);
                                      filteredCoverageFlashcards.forEach(f => next.delete(f.id));
                                      return next;
                                    });
                                  } else {
                                    setCoverageSelectedIds(prev => {
                                      const next = new Set(prev);
                                      filteredCoverageFlashcards.forEach(f => next.add(f.id));
                                      return next;
                                    });
                                  }
                                }}
                                className="text-primary hover:underline font-medium"
                              >
                                {filteredCoverageFlashcards.every(f => coverageSelectedIds.has(f.id)) && filteredCoverageFlashcards.length > 0
                                  ? 'Deseleccionar visibles'
                                  : 'Seleccionar visibles'}
                              </button>
                            </div>
                            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                              {filteredCoverageFlashcards.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-3">
                                  Ninguna flashcard coincide con los filtros activos.
                                </p>
                              ) : null}
                              {filteredCoverageFlashcards.map(card => {
                                const isSelected = coverageSelectedIds.has(card.id);
                                return (
                                  <label
                                    key={card.id}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'border-primary/50 bg-primary/5'
                                        : 'border-border hover:bg-muted/30'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="sr-only"
                                      checked={isSelected}
                                      onChange={() => handleToggleCoverageFlashcard(card.id)}
                                    />
                                    {isSelected
                                      ? <CheckSquare className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                      : <Square className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                    }
                                    <span className="text-sm text-foreground line-clamp-1">{card.title}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleCancelUpload}
                      disabled={uploadingFile}
                      className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/30 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirmUpload}
                      disabled={uploadingFile}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {uploadingFile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Confirmar y subir
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lista de exámenes */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">Exámenes disponibles</h2>

            {examsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : exams.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
                No hay exámenes. Sube uno para empezar.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {exams.map(exam => {
                  const qs = getQuickStats(exam.id);
                  return (
                    <div key={exam.id} className="bg-card border border-border rounded-lg p-6 space-y-4 hover:shadow-md transition-shadow">
                      {/* Info del examen */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <h3 className="text-lg font-semibold text-foreground">{exam.examName}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{exam.totalQuestions} preguntas</span>
                            {exam.timeLimit > 0 && <span>Límite: {Math.floor(exam.timeLimit / 60)} min</span>}
                            {qs && <span>{qs.count} intento{qs.count !== 1 ? 's' : ''}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => onStartExam(exam.id, exam.examName, exam.examData, exam.timeLimit)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Empezar
                        </button>
                      </div>

                      {/* Resumen rápido si hay intentos */}
                      {qs && (
                        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
                          <div>
                            <p className="text-xs text-muted-foreground">Promedio</p>
                            <p className="text-lg font-semibold text-blue-600">{qs.avg.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Mejor puntaje</p>
                            <p className="text-lg font-semibold text-green-600">{qs.best.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Tasa de éxito</p>
                            <p className={`text-lg font-semibold ${qs.passRate >= 70 ? 'text-green-600' : qs.passRate >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {qs.passRate}%
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Acciones */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedExamForStats(exam)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-border rounded hover:bg-secondary transition-colors text-sm"
                        >
                          <BarChart3 className="w-4 h-4" />
                          Ver estadísticas
                        </button>
                        <button
                          onClick={() => setEditingExam(exam)}
                          className="flex items-center justify-center gap-2 px-3 py-2 border border-border rounded hover:bg-secondary transition-colors text-sm"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { if (confirm('¿Eliminar este examen?')) deleteMutation.mutate(exam.id); }}
                          disabled={deleteMutation.isPending}
                          className="flex items-center justify-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-sm disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab: Generar con IA */}
      {activeTab === 'generate' && (
        <div className="bg-card border border-border rounded-lg p-5">
          <ExamGeneratorView group={group} />
        </div>
      )}
    </div>
  );
};
