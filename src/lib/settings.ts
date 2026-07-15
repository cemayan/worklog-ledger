export type AuthConfig =
  | { mode: 'session' }
  | { mode: 'token'; email: string; token: string };

export interface Settings {
  site?: string;
  auth: AuthConfig;
}

const DEFAULTS: Settings = { auth: { mode: 'session' } };

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(['site', 'auth']);
  return { ...DEFAULTS, ...stored };
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
