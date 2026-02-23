import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, ChevronRight, Save, GripVertical } from 'lucide-react';
import { ExamQuestion, ExamQuestionType } from '@/types';

interface Exam {
  id: string;
  examName: string;
  examData: ExamQuestion[];
  timeLimit: number;
}

interface ExamEditorViewProps {
  exam: Exam;
  onSave: (examId: string, examName: string, examData: ExamQuestion[], timeLimit: number) => Promise<void>;
  onCancel: () => void;
}

const TYPE_LABELS: Record<ExamQuestionType, string> = {
  multiple: 'Opción múltiple',
  'true-false': 'Verdadero / Falso',
  essay: 'Respuesta libre',
};

function newQuestion(index: number): ExamQuestion {
  return {
    id: Date.now() + index,
    question: '',
    type: 'multiple',
    options: ['', '', '', ''],
    correctAnswer: '',
    explanation: '',
  };
}

export const ExamEditorView: React.FC<ExamEditorViewProps> = ({ exam, onSave, onCancel }) => {
  const [examName, setExamName] = useState(exam.examName);
  const [timeLimit, setTimeLimit] = useState(exam.timeLimit);
  const [questions, setQuestions] = useState<ExamQuestion[]>(
    exam.examData.map(q => ({ ...q, options: q.options ? [...q.options] : [] }))
  );
  const [expandedId, setExpandedId] = useState<string | number | null>(
    exam.examData.length > 0 ? exam.examData[0].id : null
  );
  const [isSaving, setIsSaving] = useState(false);

  const updateQuestion = (id: string | number, patch: Partial<ExamQuestion>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q));
  };

  const changeType = (id: string | number, type: ExamQuestionType) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== id) return q;
      const base = { ...q, type, correctAnswer: '', explanation: q.explanation };
      if (type === 'multiple') return { ...base, options: q.options?.length ? q.options : ['', '', '', ''] };
      if (type === 'true-false') return { ...base, options: ['Verdadero', 'Falso'] };
      return { ...base, options: undefined };
    }));
  };

  const addOption = (id: string | number) => {
    setQuestions(prev => prev.map(q =>
      q.id === id ? { ...q, options: [...(q.options ?? []), ''] } : q
    ));
  };

  const updateOption = (id: string | number, idx: number, value: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== id) return q;
      const opts = [...(q.options ?? [])];
      opts[idx] = value;
      // If the correct answer was the old text, update it too
      const ca = q.correctAnswer === (q.options ?? [])[idx] ? value : q.correctAnswer;
      return { ...q, options: opts, correctAnswer: ca };
    }));
  };

  const removeOption = (id: string | number, idx: number) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== id) return q;
      const opts = (q.options ?? []).filter((_, i) => i !== idx);
      const ca = q.correctAnswer === (q.options ?? [])[idx] ? '' : q.correctAnswer;
      return { ...q, options: opts, correctAnswer: ca };
    }));
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= questions.length) return;
    setQuestions(prev => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const deleteQuestion = (id: string | number) => {
    setQuestions(prev => {
      const next = prev.filter(q => q.id !== id);
      if (expandedId === id) setExpandedId(next[0]?.id ?? null);
      return next;
    });
  };

  const addQuestion = () => {
    const q = newQuestion(questions.length);
    setQuestions(prev => [...prev, q]);
    setExpandedId(q.id);
  };

  const handleSave = async () => {
    if (!examName.trim()) return;
    if (questions.length === 0) return;
    setIsSaving(true);
    try {
      await onSave(exam.id, examName.trim(), questions, timeLimit);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-3 py-2 rounded border border-border hover:bg-secondary transition-colors text-sm flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !examName.trim() || questions.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {/* Metadata */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Nombre del examen</label>
          <input
            value={examName}
            onChange={e => setExamName(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Límite de tiempo (minutos, 0 = sin límite)</label>
          <input
            type="number"
            min={0}
            value={Math.round(timeLimit / 60)}
            onChange={e => setTimeLimit(Math.max(0, parseInt(e.target.value) || 0) * 60)}
            className="w-32 px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Preguntas <span className="text-muted-foreground font-normal">({questions.length})</span>
          </h3>
          <button
            onClick={addQuestion}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Agregar pregunta
          </button>
        </div>

        <div className="space-y-2">
          {questions.map((q, idx) => {
            const isExpanded = expandedId === q.id;
            return (
              <div key={q.id} className={`border rounded-lg overflow-hidden transition-colors ${isExpanded ? 'border-primary/50' : 'border-border'}`}>
                {/* Question header row */}
                <div className="flex items-center gap-2 px-3 py-2.5 bg-card">
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                    className="flex-1 text-left text-sm text-foreground truncate"
                  >
                    {q.question || <span className="text-muted-foreground italic">Sin texto</span>}
                  </button>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{TYPE_LABELS[q.type]}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => moveQuestion(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveQuestion(idx, 1)}
                      disabled={idx === questions.length - 1}
                      className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/30 text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      className="p-1 rounded hover:bg-muted transition-colors"
                    >
                      <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Edit form */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/10 p-4 space-y-4">
                    {/* Question text */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Pregunta</label>
                      <textarea
                        rows={2}
                        value={q.question}
                        onChange={e => updateQuestion(q.id, { question: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>

                    {/* Type */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                      <select
                        value={q.type}
                        onChange={e => changeType(q.id, e.target.value as ExamQuestionType)}
                        className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="multiple">Opción múltiple</option>
                        <option value="true-false">Verdadero / Falso</option>
                        <option value="essay">Respuesta libre</option>
                      </select>
                    </div>

                    {/* Options (multiple) */}
                    {q.type === 'multiple' && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Opciones</label>
                        {(q.options ?? []).map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${q.id}`}
                              checked={q.correctAnswer === opt && opt !== ''}
                              onChange={() => opt && updateQuestion(q.id, { correctAnswer: opt })}
                              className="flex-shrink-0 accent-primary"
                              title="Marcar como correcta"
                            />
                            <input
                              value={opt}
                              onChange={e => updateOption(q.id, oi, e.target.value)}
                              placeholder={`Opción ${oi + 1}`}
                              className="flex-1 px-3 py-1.5 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <button
                              onClick={() => removeOption(q.id, oi)}
                              disabled={(q.options?.length ?? 0) <= 2}
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/30 text-red-400 disabled:opacity-30 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground">Selecciona el radio de la opción correcta</p>
                        <button
                          onClick={() => addOption(q.id)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Plus className="w-3 h-3" />
                          Agregar opción
                        </button>
                      </div>
                    )}

                    {/* Correct answer (true-false) */}
                    {q.type === 'true-false' && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Respuesta correcta</label>
                        <div className="flex gap-3">
                          {['Verdadero', 'Falso'].map(opt => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                              <input
                                type="radio"
                                name={`correct-${q.id}`}
                                checked={q.correctAnswer === opt}
                                onChange={() => updateQuestion(q.id, { correctAnswer: opt })}
                                className="accent-primary"
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Correct answer (essay) */}
                    {q.type === 'essay' && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Respuesta modelo</label>
                        <textarea
                          rows={3}
                          value={typeof q.correctAnswer === 'string' ? q.correctAnswer : ''}
                          onChange={e => updateQuestion(q.id, { correctAnswer: e.target.value })}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                          placeholder="Respuesta de referencia..."
                        />
                      </div>
                    )}

                    {/* Explanation */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Explicación (opcional)</label>
                      <textarea
                        rows={2}
                        value={q.explanation ?? ''}
                        onChange={e => updateQuestion(q.id, { explanation: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        placeholder="Explicación de la respuesta correcta..."
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {questions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No hay preguntas. Agrega una para comenzar.
          </p>
        )}
      </div>
    </div>
  );
};
