import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, CheckCircle2, XCircle, SkipForward } from 'lucide-react';
import { ExamQuestion } from '@/types';

interface ExamModeProps {
  examName: string;
  questions: ExamQuestion[];
  timeLimit: number; // segundos, 0 = sin límite
  onSubmit: (answers: Record<string | number, string>, duration: number) => void;
  onBack: () => void;
}

export const ExamMode: React.FC<ExamModeProps> = ({
  examName,
  questions,
  timeLimit,
  onSubmit,
  onBack
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string | number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [startTime] = useState(Date.now());
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  // Timer
  useEffect(() => {
    if (timeLimit === 0) return; // Sin límite de tiempo
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLimit]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onSubmit(answers, duration);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">¡Examen enviado!</h2>
          <p className="text-muted-foreground">Tus respuestas han sido guardadas. Viendo resultados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 rounded border border-border hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
            <h1 className="text-2xl font-bold text-foreground">{examName}</h1>
          </div>

          {timeLimit > 0 && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${
              timeRemaining < 300 ? 'bg-red-500/20 text-red-600' : 'bg-blue-500/20 text-blue-600'
            }`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeRemaining)}
            </div>
          )}
        </div>

        {/* Progreso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              Pregunta {currentQuestionIndex + 1} de {questions.length}
            </span>
            <span className="text-muted-foreground">
              {Object.keys(answers).length} respondidas
            </span>
          </div>
          <div className="w-full bg-border rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Pregunta */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{currentQuestion.question}</h2>

          {currentQuestion.type === 'multiple' && currentQuestion.options && (
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(option)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    answers[currentQuestion.id] === option
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-foreground/30'
                  }`}
                >
                  <span className="font-medium text-foreground">{option}</span>
                </button>
              ))}
            </div>
          )}

          {currentQuestion.type === 'true-false' && (
            <div className="grid grid-cols-2 gap-3">
              {['Verdadero', 'Falso'].map((option) => (
                <button
                  key={option}
                  onClick={() => handleAnswerSelect(option)}
                  className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                    answers[currentQuestion.id] === option
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-foreground/30 text-foreground'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {currentQuestion.type === 'essay' && (
            <textarea
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerSelect(e.target.value)}
              placeholder="Escribe tu respuesta aquí..."
              className="w-full h-32 p-4 rounded-lg border border-border bg-muted/50 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          )}

          {/* Indicador de respuesta guardada */}
          {answers[currentQuestion.id] && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              Respuesta guardada
            </div>
          )}
        </div>

        {/* Botones de navegación */}
        <div className="flex gap-3 justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2 rounded border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Anterior
          </button>

          <div className="flex gap-2">
            {currentQuestionIndex < questions.length - 1? (
              <button
                onClick={handleNext}
                className="px-4 py-2 rounded border border-border hover:bg-secondary transition-colors flex items-center gap-2"
              >
                Siguiente →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors"
              >
                Enviar Examen
              </button>
            )}
          </div>
        </div>

        {/* Vistazo rápido de respuestas */}
        <div className="grid grid-cols-6 gap-2 p-4 bg-muted/30 rounded-lg">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestionIndex(idx)}
              className={`w-full aspect-square rounded font-semibold text-sm transition-all ${
                answers[q.id]
                  ? 'bg-green-500/80 text-white'
                  : 'bg-muted border border-border text-muted-foreground'
              } ${currentQuestionIndex === idx ? 'ring-2 ring-primary' : ''}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
