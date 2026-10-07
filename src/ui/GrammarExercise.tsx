import { useCallback, useEffect, useState } from 'react';
import { grammarById } from '../data';
import type { GrammarSet } from '../ai/schemas';
import { answerGrammar, discardExercise, startGrammar, type Ctx } from '../session/service';
import { errorText } from './errorText';

interface Props {
  ctx: Ctx;
  grammarId: string;
  onDone: () => void;
}

type Phase =
  | { name: 'loading' }
  | { name: 'error'; message: string }
  | { name: 'answering'; exerciseId: number; set: GrammarSet; answers: number[] }
  | { name: 'result'; exerciseId: number; set: GrammarSet; answers: number[]; correct: number };

export function GrammarExercise({ ctx, grammarId, onDone }: Props) {
  const point = grammarById.get(grammarId)!;
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });
  const [showPt, setShowPt] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setPhase({ name: 'loading' });
    const r = await startGrammar(ctx, grammarId);
    setPhase(r.ok ? { name: 'answering', exerciseId: r.exerciseId, set: r.content, answers: [] } : { name: 'error', message: errorText(r.error) });
  }, [ctx, grammarId]);

  useEffect(() => {
    void load();
  }, [load]);

  const choose = async (option: number) => {
    if (phase.name !== 'answering' || busy) return;
    const answers = [...phase.answers, option];
    if (answers.length < phase.set.questions.length) {
      setPhase({ ...phase, answers });
      return;
    }
    setBusy(true);
    const { correct } = await answerGrammar(ctx, phase.exerciseId, answers);
    setBusy(false);
    setPhase({ name: 'result', exerciseId: phase.exerciseId, set: phase.set, answers, correct });
  };

  const report = async (exerciseId: number) => {
    await discardExercise(ctx, exerciseId);
    onDone();
  };

  const header = (
    <p className="muted">
      文法 {point.level}: <b>{point.pattern}</b>
    </p>
  );

  if (phase.name === 'loading') return <div className="card">{header}<p>Gerando exercício…</p></div>;
  if (phase.name === 'error')
    return (
      <div className="card">
        {header}
        <p className="bad">{phase.message}</p>
        <div className="row">
          <button onClick={() => void load()}>Tentar de novo</button>
          <button onClick={onDone}>Pular</button>
        </div>
      </div>
    );

  if (phase.name === 'answering') {
    const i = phase.answers.length;
    const q = phase.set.questions[i];
    return (
      <div className="card">
        {header}
        <p className="muted">Questão {i + 1}/{phase.set.questions.length} — {q.type === 'order' ? 'qual peça vai no ★?' : 'escolha a melhor opção'}</p>
        <p className="passage">{q.stem}</p>
        {q.options.map((o, k) => (
          <button key={k} className="option" disabled={busy} onClick={() => void choose(k)}>
            {k + 1}. {o}
          </button>
        ))}
        <button className="link" onClick={() => void report(phase.exerciseId)}>Questão com problema</button>
      </div>
    );
  }

  return (
    <div className="card">
      {header}
      <p className={phase.correct === phase.set.questions.length ? 'ok' : 'bad'}>
        Acertou {phase.correct} de {phase.set.questions.length}
      </p>
      <p>{phase.set.explanationJa}</p>
      {showPt ? <p className="muted">{phase.set.explanationPt}</p> : <button className="link" onClick={() => setShowPt(true)}>Ver em português</button>}
      {phase.set.questions.map((q, i) => (
        <div key={i} className="popover">
          <p className="passage">{q.stem}</p>
          {q.options.map((o, k) => (
            <div key={k}>
              <p className={k === q.answerIndex ? 'ok' : k === phase.answers[i] ? 'bad' : 'muted'}>
                {k === q.answerIndex ? '✓' : k === phase.answers[i] ? '✗' : '・'} {o}
              </p>
              <p className="muted">{q.explanationsJa[k]}</p>
            </div>
          ))}
          {showPt && <p className="muted">PT: {q.translationPt}</p>}
        </div>
      ))}
      <div className="row">
        <button onClick={() => void report(phase.exerciseId)}>Questão com problema</button>
        <button className="primary" onClick={onDone}>Próximo</button>
      </div>
    </div>
  );
}
