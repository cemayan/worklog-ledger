export type AuthConfig =
  | { mode: 'session' }
  | { mode: 'token'; email: string; token: string };

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  site?: string;
  auth: AuthConfig;
  /** Expected hours per weekday, drives the day progress bar. */
  dailyTargetHours: number;
  theme: Theme;
}

const DEFAULTS: Settings = { auth: { mode: 'session' }, dailyTargetHours: 8, theme: 'system' };

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(['site', 'auth', 'dailyTargetHours', 'theme']);
  return { ...DEFAULTS, ...stored };
}

/** 'system' defers to prefers-color-scheme; explicit themes pin data-theme on <html>. */
export function applyTheme(theme: Theme): void {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.sync.set(patch);
}

export function normalizeSiteUrl(input: string): string {
  const site = input.trim().replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9-]+\.atlassian\.net$/i.test(site)) {
    throw new Error('Site URL must look like https://<your-site>.atlassian.net');
  }
  return site;
}
