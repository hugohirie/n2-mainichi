import { useRef, useState } from 'react';
import { MODELS, saveSettings, type ModelId, type Settings } from '../storage/settings';
import { BackupError, exportBackup, importBackup, parseBackup } from '../storage/backup';
import { localDateKey } from '../lib/dates';
import type { Ctx } from '../session/service';
import { shareOrDownload } from './file';

interface Props {
  ctx: Ctx;
  settings: Settings;
  onSaved: () => Promise<void>;
  onBack: () => void;
}

const MODEL_LABEL: Record<ModelId, string> = {
  'claude-opus-5-5': 'Opus 5.5 (melhor qualidade)',
  'claude-sonnet-5-5': 'Sonnet 5.5 (equilíbrio)',
  'claude-haiku-4-5': 'Haiku 4.5 (mais barato)',
};

const clampInt = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));

export function SettingsScreen({ ctx, settings, onSaved, onBack }: Props) {
  const [form, setForm] = useState(settings);
  const [msg, setMsg] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const { apiKey, wordModel, examModel, newWordsPerDay, newGrammarPerDay, triagePerSession } = form;
    await saveSettings(ctx.db, { apiKey, wordModel, examModel, newWordsPerDay, newGrammarPerDay, triagePerSession });
    await onSaved();
    setMsg('Configurações salvas.');
  };

  const doExport = async () => {
    const backup = await exportBackup(ctx.db, ctx.now());
    const saved = await shareOrDownload(`n2-backup-${localDateKey(ctx.now())}.json`, JSON.stringify(backup));
    if (!saved) return;
    await saveSettings(ctx.db, { lastBackupAt: ctx.now() });
    await onSaved();
    setMsg('Backup exportado.');
  };

  const doImport = async (file: File) => {
    try {
      const backup = parseBackup(await file.text());
      if (!confirm('Substituir TODO o progresso atual por este backup?')) return;
      await importBackup(ctx.db, backup);
      await onSaved();
      setMsg('Backup restaurado.');
    } catch (e) {
      setMsg(e instanceof BackupError ? e.message : 'Falha ao importar o backup.');
    }
  };

  const modelSelect = (key: 'wordModel' | 'examModel') => (
    <select value={form[key]} onChange={(e) => set(key, e.target.value as ModelId)}>
      {MODELS.map((m) => (
        <option key={m} value={m}>{MODEL_LABEL[m]}</option>
      ))}
    </select>
  );

  return (
    <div className="screen">
      <div className="topbar">
        <button className="link" onClick={onBack}>← Voltar</button>
        <span>Configurações</span>
      </div>
      {msg && <p className="ok">{msg}</p>}
      <div className="card">
        <h2>API do Claude</h2>
        <label>
          Chave da API
          <input value={form.apiKey} onChange={(e) => set('apiKey', e.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        </label>
        <label>Modelo para definições de palavras{modelSelect('wordModel')}</label>
        <label>Modelo para gramática e leitura{modelSelect('examModel')}</label>
      </div>
      <div className="card">
        <h2>Ritmo</h2>
        <label>
          Palavras novas por dia
          <input type="number" inputMode="numeric" value={form.newWordsPerDay} onChange={(e) => set('newWordsPerDay', clampInt(e.target.value, 0, 50))} />
        </label>
        <label>
          Pontos de gramática novos por dia
          <input type="number" inputMode="numeric" value={form.newGrammarPerDay} onChange={(e) => set('newGrammarPerDay', clampInt(e.target.value, 0, 5))} />
        </label>
        <label>
          Palavras do N3 por sessão de triagem
          <input type="number" inputMode="numeric" value={form.triagePerSession} onChange={(e) => set('triagePerSession', clampInt(e.target.value, 0, 100))} />
        </label>
      </div>
      <button className="primary" onClick={save}>Salvar</button>
      <div className="card">
        <h2>Backup</h2>
        <p className="muted">
          Último backup: {settings.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleString('pt-BR') : 'nunca'}. A chave da API não vai no arquivo.
        </p>
        <button onClick={doExport}>Exportar backup</button>
        <button onClick={() => fileInput.current?.click()}>Restaurar backup…</button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void doImport(f);
          }}
        />
      </div>
      <div className="card">
        <h2>Créditos</h2>
        <p className="muted">
          Vocabulário: listas JLPT do tanos.co.uk, via jamsinclair/open-anki-jlpt-decks (MIT). Kanji: KANJIDIC2 (EDRDG, CC-BY-SA 4.0), via
          davidluzgouveia/kanji-data. Conteúdo gerado pela API do Claude (Anthropic).
        </p>
      </div>
    </div>
  );
}
