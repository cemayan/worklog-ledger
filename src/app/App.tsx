import { useEffect, useState } from 'preact/hooks';
import { myself, searchMyWorklogIssues, issueWorklogs, JiraAuthError, type Myself, type Worklog, type IssueRef } from '../lib/jira';
import { getSettings, saveSettings, normalizeSiteUrl } from '../lib/settings';
import { startOfWeek, addDays, isoDate, formatSeconds } from '../lib/week';

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
  const [error, setError] = useState<string>();

  useEffect(() => {
    getSettings().then((s) => setReady(Boolean(s.site)));
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
  }, [ready, weekStart]);

  if (ready === undefined) return null;
  if (!ready) return <Setup onDone={() => setReady(true)} />;

  const today = isoDate(new Date());
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
              const total = entries.reduce((sum, e) => sum + e.worklog.timeSpentSeconds, 0);
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
                </div>
              );
            })}
          </div>
          <div class="week-total">Week total: {formatSeconds(weekTotal)}</div>
        </>
      )}
    </div>
  );
}
