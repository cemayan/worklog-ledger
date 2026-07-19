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
  if (res.status === 204) return undefined as T;

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

export interface ReportIssue {
  id: string;
  key: string;
  summary: string;
  projectKey: string;
  projectName: string;
  /** Parent issue key (epic in team-managed projects), if any. */
  parentKey?: string;
}

/** Issues where ANY user logged work within [from, to] — feeds the billing report. */
export async function searchWorklogIssuesInRange(from: string, to: string): Promise<ReportIssue[]> {
  const jql = `worklogDate >= "${from}" AND worklogDate <= "${to}"`;
  const issues: ReportIssue[] = [];
  let nextPageToken: string | undefined;

  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({ jql, fields: 'summary,project,parent', maxResults: '100' });
    if (nextPageToken) params.set('nextPageToken', nextPageToken);
    const data = await jiraFetch<{
      issues: {
        id: string;
        key: string;
        fields: {
          summary: string;
          project: { key: string; name: string };
          parent?: { key: string };
        };
      }[];
      nextPageToken?: string;
    }>(`/rest/api/3/search/jql?${params}`);
    issues.push(
      ...data.issues.map((i) => ({
        id: i.id,
        key: i.key,
        summary: i.fields.summary,
        projectKey: i.fields.project.key,
        projectName: i.fields.project.name,
        parentKey: i.fields.parent?.key,
      })),
    );
    nextPageToken = data.nextPageToken;
    if (!nextPageToken) break;
  }
  return issues;
}

export interface PickedIssue {
  key: string;
  summaryText: string;
}

/** Issue autocomplete backing the add-worklog dialog. */
export async function pickIssues(query: string): Promise<PickedIssue[]> {
  const params = new URLSearchParams({ query, showSubTasks: 'true' });
  const data = await jiraFetch<{ sections: { issues: PickedIssue[] }[] }>(
    `/rest/api/3/issue/picker?${params}`,
  );
  const seen = new Set<string>();
  const out: PickedIssue[] = [];
  for (const section of data.sections) {
    for (const issue of section.issues) {
      if (!seen.has(issue.key)) {
        seen.add(issue.key);
        out.push(issue);
      }
    }
  }
  return out.slice(0, 10);
}

function commentDoc(text: string) {
  return {
    type: 'doc',
    version: 1,
    content: text ? [{ type: 'paragraph', content: [{ type: 'text', text }] }] : [],
  };
}

/** Plain text of an ADF comment document (paragraphs joined with newlines). */
export function adfToText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as { type?: string; text?: string; content?: unknown[] };
  if (n.type === 'text') return n.text ?? '';
  const inner = (n.content ?? []).map(adfToText).join('');
  return n.type === 'paragraph' ? inner + '\n' : inner;
}

export async function addWorklog(
  issueKey: string,
  started: string,
  timeSpentSeconds: number,
  comment?: string,
): Promise<Worklog> {
  const body: Record<string, unknown> = { started, timeSpentSeconds };
  const text = comment?.trim();
  if (text) body.comment = commentDoc(text);
  return jiraFetch<Worklog>(`/rest/api/3/issue/${issueKey}/worklog`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateWorklog(
  issueKey: string,
  worklogId: string,
  started: string,
  timeSpentSeconds: number,
  comment?: string,
): Promise<Worklog> {
  // Comment is always sent so clearing the field in the edit dialog clears it in Jira.
  const body = { started, timeSpentSeconds, comment: commentDoc(comment?.trim() ?? '') };
  return jiraFetch<Worklog>(`/rest/api/3/issue/${issueKey}/worklog/${worklogId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteWorklog(issueKey: string, worklogId: string): Promise<void> {
  await jiraFetch<undefined>(`/rest/api/3/issue/${issueKey}/worklog/${worklogId}`, {
    method: 'DELETE',
  });
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
