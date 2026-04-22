import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { Question, QuizMode } from '../types/content';
import type { QuestionOutcome } from '../types/quiz';

type QuizSummaryProps = {
  mode: QuizMode;
  title: string;
  subtitle: string;
  questions: Question[];
  outcomes: QuestionOutcome[];
  score: number;
  maxScore: number;
  passingScore?: number;
  onRestart: () => void;
};

type ReviewFilter = 'all' | 'correct' | 'incorrect';

const BookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const CheckIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function formatCorrectAnswers(question: Question) {
  return question.options
    .filter((option) => option.isCorrect)
    .map((option) => `${option.label}. ${option.text}`)
    .join(' · ');
}

export function QuizSummary({
  mode,
  title,
  subtitle,
  questions,
  outcomes,
  score,
  maxScore,
  passingScore,
  onRestart,
}: QuizSummaryProps) {
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');

  const totalQuestions = questions.length;
  const percentage = maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);
  const passed = typeof passingScore === 'number' ? score >= passingScore : undefined;
  
  const accentColor = mode === 'exam' ? 'var(--color-public-exam)' : 'var(--color-public-practice)';

  const outcomesByQuestionId = useMemo(
    () => new Map(outcomes.map((outcome) => [outcome.questionId, outcome])),
    [outcomes],
  );

  const correctCount = outcomes.filter((outcome) => outcome.isCorrect).length;
  const incorrectCount = outcomes.filter((outcome) => !outcome.isCorrect).length;

  const categoryStats = useMemo(() => {
    const stats = new Map<string, { correct: number; total: number }>();

    questions.forEach((question) => {
      const outcome = outcomesByQuestionId.get(question.id);
      const category = question.chapterId || 'Sin categoría';

      if (!stats.has(category)) {
        stats.set(category, { correct: 0, total: 0 });
      }

      const stat = stats.get(category);
      if (!stat) return;

      stat.total += 1;
      if (outcome?.isCorrect) {
        stat.correct += 1;
      }
    });

    return Array.from(stats.entries()).map(([category, stat]) => ({
      category,
      correct: stat.correct,
      total: stat.total,
    }));
  }, [outcomesByQuestionId, questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((question) => {
      const outcome = outcomesByQuestionId.get(question.id);
      if (!outcome) return false;
      if (reviewFilter === 'correct') return outcome.isCorrect;
      if (reviewFilter === 'incorrect') return !outcome.isCorrect;
      return true;
    });
  }, [outcomesByQuestionId, questions, reviewFilter]);

  const ringCircumference = 251.2;
  const ringProgress = ringCircumference * (percentage / 100);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-6 md:px-6 md:pt-8">
        <motion.div
          className="max-w-3xl mx-auto flex flex-col items-center text-center py-4 pb-20"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        >
          {/* Top Graphic: Overall Score */}
          <div className="mb-6 w-full flex justify-center relative">
            <div className="relative w-48 h-48" style={{ color: passed === false ? 'var(--color-warning-500)' : 'var(--color-success-500)' }}>
               <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                 <circle cx="50" cy="50" r="40" stroke="var(--color-border)" strokeWidth="8" fill="none" />
                 <motion.circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="12" fill="none" strokeLinecap="round" initial={{ strokeDasharray: `0 ${ringCircumference}` }} animate={{ strokeDasharray: `${ringProgress} ${ringCircumference}` }} transition={{ duration: 1.5, ease: "easeOut" }} />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--color-text-primary)]">
                  <span className="text-5xl font-black">{percentage}%</span>
                  <span className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-widest border-t-2 border-[var(--color-border)] pt-1 mt-1">
                    {mode === 'exam' ? (passed ? 'Aprobado' : 'No aprobado') : 'Completado'}
                  </span>
               </div>
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-black text-[var(--color-text-primary)] tracking-tighter mb-2 uppercase">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 md:text-base text-[var(--color-text-secondary)] mb-8">{subtitle}</p>

          {/* Overview Stat Row */}
          <div className="flex justify-around bg-[var(--color-bg-secondary)] border-2 border-[var(--color-border)] rounded-2xl p-4 mb-8 shadow-sm w-full">
             <div className="text-center">
               <div className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">Total</div>
               <div className="text-2xl font-black text-[var(--color-text-primary)]">{totalQuestions}</div>
             </div>
             <div className="text-center">
               <div className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">Correctas</div>
               <div className="text-2xl font-black text-[var(--color-success-600)]">{correctCount}</div>
             </div>
             <div className="text-center">
               <div className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">Incorrectas</div>
               <div className="text-2xl font-black text-[var(--color-warning-600)]">{incorrectCount}</div>
             </div>
          </div>

          {/* Performance Breakdown */}
          <div className="w-full text-left bg-[var(--color-bg-secondary)] border-2 border-[var(--color-border)] rounded-2xl p-6 mb-12 shadow-sm">
            <h3 className="font-black text-sm uppercase tracking-widest text-[var(--color-text-secondary)] border-b-2 border-[var(--color-border)] pb-3 mb-4">Desempeño por Capítulo</h3>
            <div className="space-y-4">
               {categoryStats.map((stat, i) => (
                 <div key={i} className="flex justify-between items-center font-bold text-[var(--color-text-primary)] text-sm md:text-base">
                   <span className="truncate pr-4">{stat.category}</span>
                   <span className="shrink-0 px-3 py-1 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, ' + accentColor + ' 10%, transparent)', color: accentColor }}>
                     {stat.correct} / {stat.total}
                   </span>
                 </div>
               ))}
            </div>
          </div>

          {/* Detailed Question Revision */}
          <div className="w-full text-left space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h3 className="font-black text-xl text-[var(--color-text-primary)]">Revisión Detallada</h3>
              <div className="flex flex-wrap gap-2">
                {(['all', 'correct', 'incorrect'] as const).map((filter) => {
                  const active = reviewFilter === filter;
                  const label = filter === 'all' ? `Todas` : filter === 'correct' ? `Correctas` : `Incorrectas`;
                  return (
                    <button
                      key={filter} onClick={() => setReviewFilter(filter)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-widest transition-colors
                        ${active ? 'bg-slate-800 text-white border-slate-800' : 'bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-border)]'}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredQuestions.map((question, i) => {
               const outcome = outcomesByQuestionId.get(question.id);
               const correct = outcome?.isCorrect ?? false;
               
               return (
                 <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 5) * 0.1 }} key={question.id} className="p-5 md:p-6 bg-[var(--color-bg-secondary)] border-2 border-[var(--color-border)] rounded-3xl shadow-sm">
                    {/* Meta Row */}
                    <div className="flex justify-between items-center mb-4 border-b-2 border-[var(--color-border)] pb-3">
                       <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-widest flex items-center gap-2"><BookIcon /> Pág. {question.sourcePage}</span>
                       <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border-2 ${correct ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                         {correct ? `+${outcome?.pointsEarned || 1} punto(s)` : `0 de ${outcome?.pointsAvailable || 1}`}
                       </span>
                    </div>

                    {/* Prompt */}
                    <p className="font-bold text-lg mb-6 text-[var(--color-text-primary)] leading-snug">{question.prompt}</p>
                    
                    {/* Responses */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-1.5">Respuesta Correcta:</p>
                        <div className="text-sm font-bold text-emerald-800 bg-emerald-50 border-2 border-emerald-200 p-4 rounded-2xl flex items-start gap-3">
                           <div className="bg-emerald-200/50 rounded-lg p-1 shrink-0 mt-0.5"><CheckIcon size={16} /></div> 
                           <span className="leading-snug pt-0.5">{formatCorrectAnswers(question)}</span>
                        </div>
                      </div>

                      {!correct && outcome && (
                        <div className="mt-4">
                          <p className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-1.5">Tu Respuesta:</p>
                          <div className="text-sm font-bold text-rose-800 bg-rose-50 border-2 border-rose-200 p-4 rounded-2xl flex items-start gap-3">
                             <div className="bg-rose-200/50 rounded-lg p-1 shrink-0 mt-0.5"><XIcon size={16} /></div> 
                             <span className="leading-snug pt-0.5">
                               {question.options.filter(opt => outcome.selectedOptionIds.includes(opt.id)).map(opt => `${opt.label}. ${opt.text}`).join(' · ') || 'No respondida'}
                             </span>
                          </div>
                        </div>
                      )}
                    </div>
                 </motion.div>
               );
             })}
          </div>
        </motion.div>
      </div>

      {/* Action Button */}
      <div className="shrink-0 border-t border-[var(--color-border)] px-4 py-4 md:px-6 bg-[var(--color-bg-secondary)]">
        <div className="mx-auto max-w-3xl">
          <button
            className="w-full rounded-[1.6rem] border-2 border-b-4 px-6 py-4 text-base font-black uppercase tracking-[0.18em] text-white transition-all active:translate-y-[4px] active:border-b-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200"
            style={{ backgroundColor: accentColor, borderColor: accentColor }}
            type="button"
            onClick={onRestart}
          >
            {mode === 'exam' ? 'Intentar otra simulación' : 'Crear otra práctica'}
          </button>
        </div>
      </div>
    </div>
  );
}