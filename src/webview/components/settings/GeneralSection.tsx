import React, { useEffect, useRef, useState } from 'react';
import type { AgentConfig, ThemeBehavior, StartupView } from '@shared/index';
import { postMessage as postToHost } from '../../vscodeApi';
import { Section, SettingRow, Toggle, Select, MaskedInput, Button, TextInput } from './ui';

export const GeneralSection: React.FC<{
  config: AgentConfig;
  t: (k: string) => string;
}> = ({ config, t }) => {
  const [draftApiKey, setDraftApiKey] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  // FIX: track the timeout so it can be cleared on unmount.
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const saveApiKey = () => {
    if (!draftApiKey.trim()) return;
    postToHost({ type: 'SAVE_API_KEY', apiKey: draftApiKey.trim() });
    setDraftApiKey('');
    setShowSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setShowSaved(false), 2000);
  };

  const set = (key: string, value: unknown) => {
    postToHost({ type: 'SET_CONFIG', key, value });
  };

  return (
    <div className="space-y-8">
      {/* API Key */}
      <Section title={t('settings.apiKey')}>
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <MaskedInput
              value={draftApiKey}
              onChange={setDraftApiKey}
              placeholder="fib-..."
            />
            <Button variant="primary" onClick={saveApiKey} disabled={!draftApiKey.trim()}>
              {t('settings.save')}
            </Button>
          </div>
          <div className="text-2xs">
            {config.apiKeySet ? (
              <span className="text-status-success inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-status-success rounded-full" />
                {t('settings.apiKey.set')}
              </span>
            ) : (
              <span className="text-status-warning">{t('settings.apiKey.unset')}</span>
            )}
            {showSaved && <span className="text-status-success ms-2">✓</span>}
          </div>
        </div>
      </Section>

      {/* UI Language */}
      <Section title={t('settings.appearance')}>
        <SettingRow label={t('settings.language')}>
          <Select
            value={config.language}
            onChange={(v) => set('language', v)}
            options={[
              { value: 'fa', label: 'فارسی' },
              { value: 'en', label: 'English' },
            ]}
          />
        </SettingRow>
        <SettingRow
          label={t('settings.themeBehavior')}
          description={t('settings.themeBehavior.desc')}
        >
          <Select
            value={config.themeBehavior ?? 'auto'}
            onChange={(v) => set('themeBehavior', v)}
            options={[
              { value: 'auto', label: t('settings.theme.auto') },
              { value: 'dark', label: t('settings.theme.dark') },
              { value: 'light', label: t('settings.theme.light') },
            ]}
          />
        </SettingRow>
        <SettingRow
          label={t('settings.uiStyle') || 'UI Style'}
          description={t('settings.uiStyle.desc') || 'Choose between default and neomorphism design'}
        >
          <Select
            value={config.uiStyle ?? 'default'}
            onChange={(v) => set('uiStyle', v)}
            options={[
              { value: 'default', label: t('settings.uiStyle.default') || 'Default' },
              { value: 'neomorphism', label: t('settings.uiStyle.neomorphism') || 'Neomorphism' },
            ]}
          />
        </SettingRow>
      </Section>

      {/* Behavior */}
      <Section title={t('settings.behavior')}>
        <SettingRow label={t('settings.showReasoning')}>
          <Toggle checked={config.showReasoning} onChange={(v) => set('showReasoning', v)} />
        </SettingRow>
      </Section>

      {/* Startup & Notifications */}
      <Section title={t('settings.startup')}>
        <SettingRow label={t('settings.startupView')}>
          <Select
            value={config.startupView ?? 'last-chat'}
            onChange={(v) => set('startupView', v)}
            options={[
              { value: 'last-chat', label: t('settings.startup.lastChat') },
              { value: 'home', label: t('settings.startup.home') },
            ]}
          />
        </SettingRow>
        <SettingRow label={t('settings.notifyOnTaskComplete')}>
          <Toggle checked={config.notifyOnTaskComplete ?? true} onChange={(v) => set('notifyOnTaskComplete', v)} />
        </SettingRow>
      </Section>

      {/* API Base URL */}
      <Section title={t('settings.baseURL')}>
        <TextInput value={config.baseURL} readOnly />
      </Section>

      <Button variant="secondary" onClick={() => postToHost({ type: 'OPEN_SETTINGS' })} className="w-full py-2">
        {t('settings.openVSCode')}
      </Button>
    </div>
  );
};
