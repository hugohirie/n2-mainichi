import { useState } from 'react';
import { db } from '../storage/db';
import { saveSettings } from '../storage/settings';

export function SetupScreen({ onSaved }: { onSaved: () => Promise<void> }) {
  const [key, setKey] = useState('');
  const save = async () => {
    await saveSettings(db, { apiKey: key });
    await onSaved();
  };
  return (
    <div className="screen">
      <h1>N2 毎日 — configuração</h1>
      <p>O app usa a API do Claude para gerar definições, exercícios e textos. A API é cobrada à parte do seu plano Claude.</p>
      <ol className="summary">
        <li>Entre em <b>console.anthropic.com</b> e crie uma conta.</li>
        <li>Em <b>Billing</b>, compre créditos (ex.: US$5) e defina um <b>limite de gasto mensal</b>.</li>
        <li>Em <b>API Keys</b>, crie uma chave e copie.</li>
        <li>Cole aqui. A chave fica só neste iPhone.</li>
      </ol>
      <label>
        Chave da API
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-..." autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      </label>
      <button className="primary" disabled={key.trim() === ''} onClick={save}>Salvar e começar</button>
    </div>
  );
}
