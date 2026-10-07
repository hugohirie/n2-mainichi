import { useEffect, useState } from 'react';
import { AI_ERROR_MESSAGES } from '../ai/errors';
import { planToSteps, planVocabIds, type Step } from '../session/steps';
import { ensureWordDetails, getContinuePlan, getTodayPlan, resolveMode, sessionDate, type Ctx } from '../session/service';
import { WordCard } from './WordCard';
import { TriageCard } from './TriageCard';
import { GrammarExercise } from './GrammarExercise';
import { ReadingExercise } from './ReadingExercise';
import { SessionDone } from './SessionDone';

export interface SessionProps {
  ctx: Ctx;
  mode: 'minimum' | 'continue';
  onExit: () => void;
  onContinue: () => void;
}

export function SessionScreen({ ctx, mode: requestedMode, onExit, onContinue }: SessionProps) {
  const [date] = useState(() => sessionDate(ctx));
  const [mode, setMode] = useState(requestedMode);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [index, setIndex] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const resolved = await resolveMode(ctx, requestedMode);
      setMode(resolved);
      const plan = resolved === 'minimum' ? await getTodayPlan(ctx) : await getContinuePlan(ctx);
      const err = await ensureWordDetails(ctx, planVocabIds(plan));
      if (err) setWarning(AI_ERROR_MESSAGES[err]);
      setSteps(planToSteps(plan));
    })();
  }, [ctx, requestedMode]);

  if (!steps) return <div className="screen center">Preparando a sessão…</div>;
  if (index >= steps.length) return <SessionDone ctx={ctx} mode={mode} date={date} onExit={onExit} onContinue={onContinue} />;

  const next = (extra: Step[] = []) => {
    if (extra.length > 0) setSteps((s) => [...s!, ...extra]);
    setIndex((i) => i + 1);
  };
  const step = steps[index];

  return (
    <div className="screen">
      <div className="topbar">
        <button className="link" onClick={onExit}>Sair</button>
        <span>{index + 1} / {steps.length}</span>
      </div>
      {warning && <p className="bad">{warning}</p>}
      {step.kind === 'review' && <WordCard key={index} ctx={ctx} vocabId={step.itemId.slice('word:'.length)} introduce={false} onDone={() => next()} />}
      {step.kind === 'new' && <WordCard key={index} ctx={ctx} vocabId={step.vocabId} introduce onDone={() => next()} />}
      {step.kind === 'triage' && (
        <TriageCard key={index} ctx={ctx} vocabId={step.vocabId} onDone={(known) => next(known ? [] : [{ kind: 'review', itemId: `word:${step.vocabId}` }])} />
      )}
      {step.kind === 'grammar' && <GrammarExercise key={index} ctx={ctx} grammarId={step.grammarId} onDone={() => next()} />}
      {step.kind === 'reading' && <ReadingExercise key={index} ctx={ctx} onDone={() => next()} />}
    </div>
  );
}
