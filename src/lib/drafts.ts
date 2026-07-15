/** A worklog staged locally, not yet pushed to Jira. */
export interface Draft {
  id: string;
  issueKey: string;
  summary: string;
  date: string; // yyyy-MM-dd
  time: string; // HH:mm
  seconds: number;
  comment: string;
  status: 'staged' | 'error';
  error?: string;
}

export async function getDrafts(): Promise<Draft[]> {
  const { drafts } = await chrome.storage.local.get('drafts');
  return (drafts as Draft[] | undefined) ?? [];
}

export async function setDrafts(drafts: Draft[]): Promise<void> {
  await chrome.storage.local.set({ drafts });
}

/** Jira's worklog `started` format: 2026-07-16T09:00:00.000+0300 (local offset). */
export function toJiraStarted(date: string, time: string): string {
  const d = new Date(`${date}T${time}:00`);
  const offMin = -d.getTimezoneOffset();
  const sign = offMin >= 0 ? '+' : '-';
  const abs = Math.abs(offMin);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date}T${time}:00.000${sign}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`;
}
