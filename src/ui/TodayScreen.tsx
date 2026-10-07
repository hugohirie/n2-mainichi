import { useEffect, useState } from 'react';
import type { Settings } from '../storage/settings';
import type { DailyPlan } from '../session/plan';
import { getStreak, getTodayPlan, isMinimumDoneToday, type Ctx } from '../session/service';

const WEEK = 7 * 86_400_000;

interface Props {
  ctx: Ctx;
  settings: Settings;
  onStart: (mode: 'minimum' | 'continue') => void;
  onNav: (screen: 'progress' | 'settings') => void;
}

export function TodayScreen({ ctx, settings, onStart, onNav }: Props) {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [streak, setStreak] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void (async () => {
      setPlan(await getTodayPlan(ctx));
      setStreak(await getStreak(ctx));
      setDone(await isMinimumDoneToday(ctx));
    })();
  }, [ctx]);

  if (!plan) return <div className="screen center">読み込み中…</div>;
  const backupDue = settings.lastBackupAt === null || ctx.now() - settings.lastBackupAt > WEEK;

  return (
    <div className="screen">
      <h1>今日の勉強</h1>
      <p className="streak">🔥 {streak} {streak === 1 ? 'dia seguido' : 'dias seguidos'}</p>
      {done ? (
        <p className="ok">Sessão mínima de hoje concluída!</p>
      ) : (
        <ul className="summary">
          <li>{plan.reviews.length} revisões</li>
          {plan.triage.length > 0 && <li>{plan.triage.length} palavras do N3 para triagem</li>}
          <li>{plan.newWords.length} palavras novas</li>
          <li>{plan.grammar.length} pontos de gramática</li>
        </ul>
      )}
      <button className="primary" onClick={() => onStart(done ? 'continue' : 'minimum')}>
        {done ? 'Continuar estudando' : 'Começar'}
      </button>
      {backupDue && (
        <button className="warn" onClick={() => onNav('settings')}>
          Faz mais de 7 dias sem backup — fazer agora
        </button>
      )}
      <nav className="row">
        <button onClick={() => onNav('progress')}>Progresso</button>
        <button onClick={() => onNav('settings')}>Configurações</button>
      </nav>
    </div>
  );
}
