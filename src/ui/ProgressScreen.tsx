import { useEffect, useState } from 'react';
import { getProgress, type Ctx, type Progress } from '../session/service';
import { monthUsage } from '../ai/usage';

type UsageRows = Awaited<ReturnType<typeof monthUsage>>;

const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

export function ProgressScreen({ ctx, onBack }: { ctx: Ctx; onBack: () => void }) {
  const [p, setP] = useState<Progress | null>(null);
  const [usage, setUsage] = useState<UsageRows>([]);

  useEffect(() => {
    void (async () => {
      setP(await getProgress(ctx));
      setUsage(await monthUsage(ctx.db, ctx.now()));
    })();
  }, [ctx]);

  if (!p) return <div className="screen center">読み込み中…</div>;
  const total = usage.reduce((s, r) => s + r.costUsd, 0);

  return (
    <div className="screen">
      <div className="topbar">
        <button className="link" onClick={onBack}>← Voltar</button>
        <span>Progresso</span>
      </div>
      <p className="streak">🔥 {p.streak} dias seguidos</p>
      <div className="card">
        <h2>Vocabulário</h2>
        <p>Triagem N3: {p.n3Triaged}/{p.n3Total} ({pct(p.n3Triaged, p.n3Total)}%) — já sabia {p.n3Known}</p>
        <p>N2 introduzidas: {p.n2Introduced}/{p.n2Total} ({pct(p.n2Introduced, p.n2Total)}%)</p>
        <p>Palavras bem fixadas (intervalo ≥ 21 dias): {p.matureWords}</p>
      </div>
      <div className="card">
        <h2>Gramática</h2>
        <p>Pontos estudados: {p.grammarIntroduced}/{p.grammarTotal} ({pct(p.grammarIntroduced, p.grammarTotal)}%)</p>
      </div>
      <div className="card">
        <h2>Uso da API neste mês</h2>
        {usage.length === 0 && <p className="muted">Nenhum uso ainda.</p>}
        {usage.map((r) => (
          <p key={r.model} className="muted">
            {r.model}: {r.inputTokens.toLocaleString('pt-BR')} entrada / {r.outputTokens.toLocaleString('pt-BR')} saída ≈ US$ {r.costUsd.toFixed(2)}
          </p>
        ))}
        <p>Total aproximado: US$ {total.toFixed(2)}</p>
      </div>
    </div>
  );
}
