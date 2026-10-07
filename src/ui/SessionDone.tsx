import { useEffect } from 'react';
import { markMinimumDone, type Ctx } from '../session/service';

interface Props {
  ctx: Ctx;
  mode: 'minimum' | 'continue';
  onExit: () => void;
  onContinue: () => void;
}

export function SessionDone({ ctx, mode, onExit, onContinue }: Props) {
  useEffect(() => {
    if (mode === 'minimum') void markMinimumDone(ctx);
  }, [ctx, mode]);

  return (
    <div className="screen center">
      <h1>お疲れさま！</h1>
      <p>{mode === 'minimum' ? 'Sessão mínima concluída — o dia está contado. 🔥' : 'Bloco extra concluído.'}</p>
      <button className="primary" onClick={onContinue}>Continuar estudando</button>
      <button onClick={onExit}>Voltar ao início</button>
    </div>
  );
}
