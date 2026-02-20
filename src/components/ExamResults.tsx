import React from 'react';
import { ArrowLeft, Award, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { ExamAttempt, ExamQuestion } from '@/types';

interface ExamResultsProps {
  attempt: ExamAttempt;
  questions: ExamQuestion[];
  onBack: () => void;
}

export const ExamResults: React.FC<ExamResultsProps> = ({
  attempt,
  questions,
  onBack
}) => {
  const getGradeColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeLabel = (score: number) => {
    if (score >= 90) return 'Excelente';
    if (score >= 70) return 'Bien';
    if (score >= 50) return 'Regular';
    return 'Necesita mejorar';
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 rounded border border-border hover:bg-secondary transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        {/* Resultado General */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-lg p-8 text-center space-y-4">
          <div className="flex justify-center">
            <Award className="w-16 h-16 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Examen Completado</h1>
          <p className="text-lg text-muted-foreground">{attempt.examName}</p>

          <div className="grid grid-cols-3 gap-4 mt-6">
            {/* Puntuación */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className={`text-4xl font-bold ${getGradeColor(attempt.score)}`}>
                {attempt.score.toFixed(1)}%
              </div>
              <p className={`font-semibold ${getGradeColor(attempt.score)}`}>
                {getGradeLabel(attempt.score)}
              </p>
            </div>

            {/* Respuestas */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="text-3xl font-bold text-green-600">
                {attempt.correctAnswers}/{attempt.totalQuestions}
              </div>
              <p className="text-muted-foreground font-medium">Respuestas correctas</p>
            </div>

            {/* Tiempo */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="text-3xl font-bold text-blue-600">
                {formatDuration(attempt.duration)}
              </div>
              <p className="text-muted-foreground font-medium">Tiempo total</p>
            </div>
          </div>
        </div>

        {/* Detalle por pregunta */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">Revisión de preguntas</h2>
          
          {questions.map((question, idx) => {
            const isCorrect = attempt.answers[question.id] === question.correctAnswer;
            
            return (
              <div
                key={question.id}
                className={`border rounded-lg p-4 space-y-3 ${
                  isCorrect
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        Pregunta {idx + 1}: {question.question}
                      </span>
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      )}
                    </div>

                    {/* Respuesta del usuario */}
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Tu respuesta:</p>
                      <p className={`font-medium ${
                        isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                      }`}>
                        {attempt.answers[question.id] || '(Sin respuesta)'}
                      </p>
                    </div>

                    {/* Respuesta correcta si fue incorrecta */}
                    {!isCorrect && (
                      <div className="space-y-1 pt-2 border-t border-current/30">
                        <p className="text-sm text-muted-foreground">Respuesta correcta:</p>
                        <p className="font-medium text-foreground">
                          {question.correctAnswer}
                        </p>
                      </div>
                    )}

                    {/* Explicación si existe */}
                    {question.explanation && (
                      <div className="space-y-1 pt-2 border-t border-current/30">
                        <p className="text-sm text-muted-foreground">Explicación:</p>
                        <p className="text-sm text-foreground">{question.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Botón continuar */}
        <div className="flex justify-center">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Volver a Exámenes
          </button>
        </div>
      </div>
    </div>
  );
};
