import { useEffect, useState } from 'preact/hooks';
import {
  myself,
  searchMyWorklogIssues,
  issueWorklogs,
  addWorklog,
  JiraAuthError,
  type Myself,
  type Worklog,
  type IssueRef,
} from '../lib/jira';
import { getSettings, saveSettings, normalizeSiteUrl } from '../lib/settings';
import { getDrafts, setDrafts, toJiraStarted, type Draft } from '../lib/drafts';
import { startOfWeek, addDays, isoDate, formatSeconds } from '../lib/week';
import { AddWorklogDialog } from './AddWorklogDialog';

interface Entry {
  worklog: Worklog;
  issue: IssueRef;
}

type DayMap = Map<string, Entry[]>; // isoDate → entries

function Setup({ onDone }: { onDone: () => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();

  const save = async () => {
    try {
      const site = normalizeSiteUrl(value);
      await saveSettings({ site });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div class="setup">
      <h1>Connect your Jira site</h1>
      <p>Enter your Jira Cloud URL. Worklog Ledger uses your existing browser session — make sure you're logged in to Jira in another tab.</p>
      <input
        placeholder="https://your-site.atlassian.net"
        value={value}
        onInput={(e) => setValue((e.target as HTMLInputElement).value)}
      />
      {error && <div class="error">{error}</div>}
      <button class="primary" onClick={save}>Connect</button>
    </div>
  );
}

async function loadWeek(me: Myself, weekStart: Date): Promise<DayMap> {
  const weekEnd = addDays(weekStart, 7);
  const issues = await searchMyWorklogIssues(isoDate(weekStart), isoDate(addDays(weekEnd, -1)));

  const days: DayMap = new Map();
  for (let i = 0; i < 7; i++) days.set(isoDate(addDays(weekStart, i)), []);

  const results = await Promise.all(
    issues.map(async (issue) => ({
      issue,
      worklogs: await issueWorklogs(issue.key, weekStart.getTime(), weekEnd.getTime()),
    })),
  );

  for (const { issue, worklogs } of results) {
    for (const worklog of worklogs) {
      if (worklog.author.accountId !== me.accountId) continue;
      const day = isoDate(new Date(worklog.started));
      days.get(day)?.push({ worklog, issue });
    }
  }
  for (const entries of days.values()) {
    entries.sort((a, b) => a.worklog.started.localeCompare(b.worklog.started));
  }
  return days;
}

export function App() {
  const [ready, setReady] = useState<boolean>();
  const [me, setMe] = useState<Myself>();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [days, setDays] = useState<DayMap>();
  const [drafts, setDraftsState] = useState<Draft[]>([]);
  const [dialogDate, setDialogDate] = useState<string>();
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string>();
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    getSettings().then((s) => setReady(Boolean(s.site)));
    getDrafts().then(setDraftsState);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setError(undefined);
    setDays(undefined);
    (async () => {
      try {
        const user = me ?? (await myself());
        if (!me) setMe(user);
        setDays(await loadWeek(user, weekStart));
      } catch (e) {
        setError(e instanceof JiraAuthError ? e.message : (e as Error).message);
      }
    })();
  }, [ready, weekStart, reloadTick]);

  const updateDrafts = async (next: Draft[]) => {
    setDraftsState(next);
    await setDrafts(next);
  };

  const pushAll = async () => {
    setPushing(true);
    const remaining: Draft[] = [];
    let pushed = 0;
    for (const draft of drafts) {
      try {
        await addWorklog(draft.issueKey, toJiraStarted(draft.date, draft.time), draft.seconds, draft.comment);
        pushed++;
      } catch (e) {
        remaining.push({ ...draft, status: 'error', error: (e as Error).message });
      }
    }
    await updateDrafts(remaining);
    setPushing(false);
    if (pushed) setReloadTick((t) => t + 1);
  };

  if (ready === undefined) return null;
  if (!ready) return <Setup onDone={() => setReady(true)} />;

  const today = isoDate(new Date());
  const failed = drafts.filter((d) => d.status === 'error');
  const weekTotal = days
    ? [...days.values()].flat().reduce((sum, e) => sum + e.worklog.timeSpentSeconds, 0)
    : 0;

  return (
    <div class="app">
      <header>
        <h1>Worklog Ledger</h1>
        {me && <span>{me.displayName}</span>}
        <button onClick={() => setWeekStart(addDays(weekStart, -7))}>← Prev</button>
        <span class="week-range">
          {isoDate(weekStart)} — {isoDate(addDays(weekStart, 6))}
        </span>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))}>Next →</button>
        <button onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</button>
      </header>

      {error && <div class="error">{error}</div>}
      {!error && !days && <p>Loading worklogs…</p>}

      {days && (
        <>
          <div class="grid">
            {[...days.entries()].map(([date, entries]) => {
              const dayDrafts = drafts.filter((d) => d.date === date);
              const total =
                entries.reduce((sum, e) => sum + e.worklog.timeSpentSeconds, 0) +
                dayDrafts.reduce((sum, d) => sum + d.seconds, 0);
              return (
                <div class={`day${date === today ? ' today' : ''}`} key={date}>
                  <div class="day-head">
                    <span>{date.slice(5)}</span>
                    <span class="day-total">{total ? formatSeconds(total) : ''}</span>
                  </div>
                  {entries.map((e) => (
                    <div class="entry" key={e.worklog.id}>
                      <span class="time">{formatSeconds(e.worklog.timeSpentSeconds)}</span>
                      <span class="key">{e.issue.key}</span>
                      <div>{e.issue.summary}</div>
                    </div>
                  ))}
                  {dayDrafts.map((d) => (
                    <div class={`entry draft${d.status === 'error' ? ' failed' : ''}`} key={d.id}>
                      <button
                        class="remove"
                        title="Remove staged worklog"
                        onClick={() => updateDrafts(drafts.filter((x) => x.id !== d.id))}
                      >
                        ×
                      </button>
                      <span class="time">{formatSeconds(d.seconds)}</span>
                      <span class="key">{d.issueKey}</span>
                      <div>{d.summary}</div>
                      {d.error && <div class="entry-error">{d.error}</div>}
                    </div>
                  ))}
                  <button class="day-add" onClick={() => setDialogDate(date)}>+ Log work</button>
                </div>
              );
            })}
          </div>
          <div class="week-total">Week total: {formatSeconds(weekTotal)}</div>
        </>
      )}

      {drafts.length > 0 && (
        <div class="pushbar">
          <span>
            {drafts.length} staged worklog{drafts.length > 1 ? 's' : ''}
            {failed.length > 0 && ` — ${failed.length} failed, fix or remove and retry`}
          </span>
          <button class="primary" disabled={pushing} onClick={pushAll}>
            {pushing ? 'Pushing…' : 'Push to Jira'}
          </button>
        </div>
      )}

      {dialogDate && (
        <AddWorklogDialog
          date={dialogDate}
          onClose={() => setDialogDate(undefined)}
          onAdd={(draft) => updateDrafts([...drafts, draft])}
        />
      )}
    </div>
  );
}
