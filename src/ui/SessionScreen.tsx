import type { Ctx } from '../session/service';

export interface SessionProps {
  ctx: Ctx;
  mode: 'minimum' | 'continue';
  onExit: () => void;
  onContinue: () => void;
}

export function SessionScreen({ onExit }: SessionProps) {
  return (
    <div className="screen center">
      <p>Sessão em construção.</p>
      <button onClick={onExit}>Voltar</button>
    </div>
  );
}
