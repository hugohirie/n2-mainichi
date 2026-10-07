import { useCallback, useEffect, useMemo, useState } from 'react';
import { db } from '../storage/db';
import { getSettings, type Settings } from '../storage/settings';
import { createLlm } from '../ai/client';
import { recordUsage } from '../ai/usage';
import type { Ctx } from '../session/service';
import { SetupScreen } from './SetupScreen';
import { TodayScreen } from './TodayScreen';
import { SessionScreen } from './SessionScreen';
import { ProgressScreen } from './ProgressScreen';
import { SettingsScreen } from './SettingsScreen';

type Screen = { name: 'today' } | { name: 'session'; mode: 'minimum' | 'continue'; key: number } | { name: 'progress' } | { name: 'settings' };

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'today' });

  const reload = useCallback(async () => setSettings(await getSettings(db)), []);
  useEffect(() => {
    void reload();
  }, [reload]);

  const ctx = useMemo<Ctx | null>(() => {
    if (!settings) return null;
    const ai = settings.apiKey
      ? {
          llm: createLlm(settings.apiKey),
          wordModel: settings.wordModel,
          examModel: settings.examModel,
          onUsage: (model: string, inputTokens: number, outputTokens: number) => recordUsage(db, Date.now(), model, inputTokens, outputTokens),
        }
      : null;
    return { db, ai, now: () => Date.now() };
  }, [settings]);

  if (!settings || !ctx) return <div className="screen center">読み込み中…</div>;
  if (!settings.apiKey) return <SetupScreen onSaved={reload} />;

  const goToday = () => setScreen({ name: 'today' });
  const startSession = (mode: 'minimum' | 'continue') => setScreen({ name: 'session', mode, key: Date.now() });

  switch (screen.name) {
    case 'session':
      return <SessionScreen key={screen.key} ctx={ctx} mode={screen.mode} onExit={goToday} onContinue={() => startSession('continue')} />;
    case 'progress':
      return <ProgressScreen ctx={ctx} onBack={goToday} />;
    case 'settings':
      return <SettingsScreen ctx={ctx} settings={settings} onSaved={reload} onBack={goToday} />;
    default:
      return <TodayScreen ctx={ctx} settings={settings} onStart={startSession} onNav={(name) => setScreen(name === 'progress' ? { name: 'progress' } : { name: 'settings' })} />;
  }
}
