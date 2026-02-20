import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, Play, Trash2, BarChart3, Loader2 } from 'lucide-react';
import { DatabaseGroup } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExamStatsView } from '@/components/ExamStatsView';

const API_BASE = 'http://localhost:3002';

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

export const ExamsView: React.FC<ExamsViewProps> = ({ group, onBack, onStartExam }) => {
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedExamForStats, setSelectedExamForStats] = useState<Exam | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

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

  const uploadMutation = useMutation({
    mutationFn: async (payload: { examName: string; description?: string; timeLimit: number; examData: any[] }) => {
      const response = await fetch(`${API_BASE}/groups/${group.id}/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Error cargando examen');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Examen cargado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['exams', group.id] });
      setShowUpload(false);
      setUploadingFile(false);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      toast.error('Por favor sube un archivo JSON');
      return;
    }
    try {
      setUploadingFile(true);
      const examData = JSON.parse(await file.text());
      if (!examData.examName || !Array.isArray(examData.questions)) {
        toast.error('Formato inválido. Necesita: examName, questions[]');
        setUploadingFile(false);
        return;
      }
      await uploadMutation.mutateAsync({
        examName: examData.examName,
        description: examData.description || '',
        timeLimit: examData.timeLimit || 0,
        examData: examData.questions,
      });
    } catch {
      toast.error('Error al procesar el archivo JSON');
      setUploadingFile(false);
    }
  };

  const getQuickStats = (examId: string) => {
    const examAttempts = attempts.filter(a => a.examDocumentId === examId);
    if (examAttempts.length === 0) return null;
    const avg = examAttempts.reduce((s, a) => s + a.score, 0) / examAttempts.length;
    const best = Math.max(...examAttempts.map(a => a.score));
    const passRate = Math.round((examAttempts.filter(a => a.score >= 70).length / examAttempts.length) * 100);
    return { count: examAttempts.length, avg, best, passRate };
  };

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

      {/* Botón subir */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowUpload(!showUpload)}
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
              disabled={uploadingFile}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Haz clic o arrastra un archivo JSON</p>
            <p className="text-xs text-muted-foreground mt-1">{uploadingFile ? 'Subiendo...' : 'Solo archivos .json'}</p>
          </div>
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
    </div>
  );
};
