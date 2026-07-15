import { getSettings } from './settings';

export class JiraError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/** 401/403 or a login redirect — the UI should offer reconnect / token entry. */
export class JiraAuthError extends JiraError {}

export interface Myself {
  accountId: string;
  displayName: string;
  emailAddress?: string;
}

export interface Worklog {
  id: string;
  issueId: string;
  author: { accountId: string; displayName: string };
  started: string; // ISO datetime
  timeSpentSeconds: number;
  comment?: unknown; // ADF document
}

export interface IssueRef {
  id: string;
  key: string;
  summary: string;
}

async function jiraFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { site, auth } = await getSettings();
  if (!site) throw new JiraError('Jira site is not configured');

  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body) headers.set('Content-Type', 'application/json');

  let credentials: RequestCredentials = 'include';
  if (auth.mode === 'token') {
    headers.set('Authorization', 'Basic ' + btoa(`${auth.email}:${auth.token}`));
    credentials = 'omit';
  }

  let res: Response;
  try {
    res = await fetch(site + path, { ...init, headers, credentials });
  } catch (e) {
    throw new JiraError(`Network error reaching ${site}: ${(e as Error).message}`);
  }

  if (res.status === 401 || res.status === 403) {
    throw new JiraAuthError(
      auth.mode === 'session'
        ? 'Not authenticated. Open your Jira site in a tab and log in, then retry.'
        : 'API token rejected. It may have expired — create a new one and update it in settings.',
      res.status,
    );
  }
  if (!res.ok) {
    throw new JiraError(`Jira returned HTTP ${res.status} for ${path}`, res.status);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new JiraAuthError('Got a non-JSON response (likely a login redirect). Log in to Jira and retry.');
  }
  return res.json() as Promise<T>;
}

export function myself(): Promise<Myself> {
  return jiraFetch<Myself>('/rest/api/3/myself');
}

/** Issues the current user logged work on within [from, to] (yyyy-MM-dd). */
export async function searchMyWorklogIssues(from: string, to: string): Promise<IssueRef[]> {
  const jql = `worklogAuthor = currentUser() AND worklogDate >= "${from}" AND worklogDate <= "${to}"`;
  const issues: IssueRef[] = [];
  let nextPageToken: string | undefined;

  // Page cap keeps a pathological week from hammering the API.
  for (let page = 0; page < 5; page++) {
    const params = new URLSearchParams({ jql, fields: 'summary', maxResults: '100' });
    if (nextPageToken) params.set('nextPageToken', nextPageToken);
    const data = await jiraFetch<{
      issues: { id: string; key: string; fields: { summary: string } }[];
      nextPageToken?: string;
    }>(`/rest/api/3/search/jql?${params}`);
    issues.push(...data.issues.map((i) => ({ id: i.id, key: i.key, summary: i.fields.summary })));
    nextPageToken = data.nextPageToken;
    if (!nextPageToken) break;
  }
  return issues;
}

/** All worklogs on an issue started within [afterMs, beforeMs). */
export async function issueWorklogs(issueKey: string, afterMs: number, beforeMs: number): Promise<Worklog[]> {
  const params = new URLSearchParams({
    startedAfter: String(afterMs),
    startedBefore: String(beforeMs),
    maxResults: '1000',
  });
  const data = await jiraFetch<{ worklogs: (Worklog & { issueId?: string })[] }>(
    `/rest/api/3/issue/${issueKey}/worklog?${params}`,
  );
  return data.worklogs;
}
