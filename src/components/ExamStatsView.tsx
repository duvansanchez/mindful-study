import React, { useEffect } from 'react';
import { ArrowLeft, Clock, Trophy, Target, TrendingUp, TrendingDown, Minus, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell, LineChart, Line, Legend
} from 'recharts';

const API_BASE = 'http://localhost:3002';

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

interface ExamStatsViewProps {
  examId: string;
  examName: string;
  totalQuestions: number;
  timeLimit: number;
  onBack: () => void;
}

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const getScoreColor = (score: number) => {
  if (score >= 90) return '#16a34a';
  if (score >= 70) return '#2563eb';
  if (score >= 50) return '#ca8a04';
  return '#dc2626';
};

const getScoreClass = (score: number) => {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-blue-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
};

export const ExamStatsView: React.FC<ExamStatsViewProps> = ({
  examId,
  examName,
  totalQuestions,
  timeLimit,
  onBack,
}) => {
  const { data: attempts = [], isLoading, isError } = useQuery({
    queryKey: ['exam-attempts-detail', examId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/exams/${examId}/attempts`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json() as Promise<ExamAttempt[]>;
    },
  });

  useEffect(() => {
    if (isError) {
      toast.error('No se pudieron cargar las estadísticas del examen');
    }
  }, [isError]);

  const sorted = [...attempts].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const totalAttempts = sorted.length;
  const passed = sorted.filter(a => a.score >= 70).length;
  const failed = totalAttempts - passed;
  const avgScore = totalAttempts > 0
    ? sorted.reduce((sum, a) => sum + a.score, 0) / totalAttempts
    : 0;
  const bestScore = totalAttempts > 0 ? Math.max(...sorted.map(a => a.score)) : 0;
  const worstScore = totalAttempts > 0 ? Math.min(...sorted.map(a => a.score)) : 0;
  const passRate = totalAttempts > 0 ? Math.round((passed / totalAttempts) * 100) : 0;
  const trend = sorted.length >= 2
    ? sorted[sorted.length - 1].score - sorted[0].score
    : 0;
  const avgDuration = totalAttempts > 0
    ? sorted.reduce((sum, a) => sum + a.duration, 0) / totalAttempts
    : 0;

  const chartData = sorted.map((a, idx) => ({
    label: `#${idx + 1}`,
    score: parseFloat(a.score.toFixed(1)),
    promedio: parseFloat(avgScore.toFixed(1)),
    date: new Date(a.createdAt).toLocaleDateString(),
    fill: getScoreColor(a.score),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a exámenes
        </button>
      </div>

      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground">{examName}</h1>
        <p className="text-sm text-muted-foreground">
          {totalQuestions} preguntas
          {timeLimit > 0 && ` · Límite: ${Math.floor(timeLimit / 60)} min`}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-8 text-center">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
          <p className="font-medium text-destructive">Error al cargar las estadísticas</p>
          <p className="text-sm text-muted-foreground mt-1">Verifica que el servidor esté activo e intenta de nuevo.</p>
        </div>
      ) : totalAttempts === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center text-muted-foreground">
          <BarChart className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">Aún no hay intentos registrados para este examen.</p>
          <p className="text-sm mt-1">Completa el examen para ver tus estadísticas aquí.</p>
        </div>
      ) : (
        <>
          {/* Métricas principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Intentos totales</p>
              <p className="text-3xl font-bold text-foreground">{totalAttempts}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Tasa de éxito</p>
              <p className={`text-3xl font-bold ${passRate >= 70 ? 'text-green-600' : passRate >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                {passRate}%
              </p>
              <p className="text-xs text-muted-foreground">{passed} aprobados · {failed} reprobados</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Promedio</p>
              <p className={`text-3xl font-bold ${getScoreClass(avgScore)}`}>{avgScore.toFixed(1)}%</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Tendencia</p>
              <div className="flex items-center gap-2">
                {trend > 5 ? (
                  <TrendingUp className="w-7 h-7 text-green-600" />
                ) : trend < -5 ? (
                  <TrendingDown className="w-7 h-7 text-red-600" />
                ) : (
                  <Minus className="w-7 h-7 text-muted-foreground" />
                )}
                <span className={`text-3xl font-bold ${trend > 5 ? 'text-green-600' : trend < -5 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">primer vs. último intento</p>
            </div>
          </div>

          {/* Métricas secundarias */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <Trophy className="w-8 h-8 text-green-600 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Mejor puntaje</p>
                <p className="text-xl font-bold text-green-600">{bestScore.toFixed(1)}%</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <Target className="w-8 h-8 text-red-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Peor puntaje</p>
                <p className="text-xl font-bold text-red-500">{worstScore.toFixed(1)}%</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <Clock className="w-8 h-8 text-blue-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Tiempo promedio</p>
                <p className="text-xl font-bold text-blue-500">{formatDuration(Math.round(avgDuration))}</p>
              </div>
            </div>
          </div>

          {/* Gráfico de barras - progresión */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Progresión de puntajes</h2>
              <p className="text-sm text-muted-foreground">Puntaje obtenido en cada intento</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 13 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 13 }} tickFormatter={v => `${v}%`} width={48} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Puntaje']}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload;
                    return item ? `Intento ${label} — ${item.date}` : label;
                  }}
                />
                <ReferenceLine
                  y={70}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  label={{ value: 'Aprobado 70%', position: 'insideTopRight', fontSize: 12, fill: '#f59e0b' }}
                />
                <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de línea - tendencia con promedio */}
          {totalAttempts >= 3 && (
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Tendencia vs. promedio</h2>
                <p className="text-sm text-muted-foreground">Evolución del puntaje comparado con tu promedio global</p>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 13 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 13 }} tickFormatter={v => `${v}%`} width={48} />
                  <Tooltip formatter={(value: number) => [`${value}%`]} />
                  <Legend />
                  <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="score" name="Puntaje" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="promedio" name="Promedio" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Historial detallado */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Historial de intentos</h2>
            <div className="space-y-2">
              {sorted.map((attempt, idx) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between rounded-lg px-4 py-3 bg-muted/30 text-sm"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span className="font-semibold text-foreground w-8 shrink-0">#{idx + 1}</span>
                    <span className="text-muted-foreground truncate">{new Date(attempt.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-5 shrink-0">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Target className="w-3.5 h-3.5" />
                      {attempt.correctAnswers}/{attempt.totalQuestions}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDuration(attempt.duration)}
                    </span>
                    <span className={`font-bold text-base w-16 text-right ${getScoreClass(attempt.score)}`}>
                      {attempt.score.toFixed(1)}%
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      attempt.score >= 70
                        ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                    }`}>
                      {attempt.score >= 70 ? 'Aprobado' : 'Reprobado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
