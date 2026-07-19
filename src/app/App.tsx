import { useEffect, useState } from 'preact/hooks';
import {
  myself,
  searchMyWorklogIssues,
  issueWorklogs,
  addWorklog,
  updateWorklog,
  deleteWorklog,
  adfToText,
  JiraAuthError,
  type Myself,
  type Worklog,
  type IssueRef,
} from '../lib/jira';
import { getSettings, saveSettings, normalizeSiteUrl, applyTheme, type Theme } from '../lib/settings';
import { getDrafts, setDrafts, toJiraStarted, type Draft } from '../lib/drafts';
import { startOfWeek, addDays, isoDate, formatSeconds, timeOfDay } from '../lib/week';
import { getLicenseState, openUpgradePage, type LicenseState } from '../lib/license';
import { WorklogDialog, type WorklogValues } from './WorklogDialog';
import { SettingsDialog } from './SettingsDialog';
import { ReportView } from './ReportView';

interface Entry {
  worklog: Worklog;
  issue: IssueRef;
}

type DayMap = Map<string, Entry[]>; // isoDate → entries

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Dialog =
  | { kind: 'add'; date: string }
  | { kind: 'duplicate'; values: WorklogValues }
  | { kind: 'edit-draft'; draft: Draft }
  | { kind: 'edit'; entry: Entry };

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

function entryValues(e: Entry): WorklogValues {
  return {
    issueKey: e.issue.key,
    summary: e.issue.summary,
    date: isoDate(new Date(e.worklog.started)),
    time: timeOfDay(e.worklog.started),
    seconds: e.worklog.timeSpentSeconds,
    comment: adfToText(e.worklog.comment).trim(),
  };
}

export function App() {
  const [ready, setReady] = useState<boolean>();
  const [me, setMe] = useState<Myself>();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [days, setDays] = useState<DayMap>();
  const [drafts, setDraftsState] = useState<Draft[]>([]);
  const [dialog, setDialog] = useState<Dialog>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dailyTarget, setDailyTarget] = useState(8);
  const [themePref, setThemePref] = useState<Theme>('system');
  const [view, setView] = useState<'calendar' | 'report'>(() =>
    location.hash === '#report' ? 'report' : 'calendar',
  );
  const [license, setLicense] = useState<LicenseState>();
  const [focusedDay, setFocusedDay] = useState(() => (new Date().getDay() + 6) % 7);
  const [pushing, setPushing] = useState(false);
  const [copying, setCopying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [errorIsAuth, setErrorIsAuth] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    getSettings().then((s) => {
      setReady(Boolean(s.site));
      setDailyTarget(s.dailyTargetHours);
      setThemePref(s.theme);
      applyTheme(s.theme);
    });
    getDrafts().then(setDraftsState);
    getLicenseState().then(setLicense);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setError(undefined);
    setErrorIsAuth(false);
    setDays(undefined);
    (async () => {
      try {
        const user = me ?? (await myself());
        if (!me) setMe(user);
        setDays(await loadWeek(user, weekStart));
      } catch (e) {
        setError((e as Error).message);
        setErrorIsAuth(e instanceof JiraAuthError);
      }
    })();
  }, [ready, weekStart, reloadTick]);

  // Keyboard navigation: ←/→ move between days (wrapping into the adjacent
  // week), Enter opens the log dialog on the focused day.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (view !== 'calendar' || dialog || settingsOpen || !days) return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const next = focusedDay + (e.key === 'ArrowLeft' ? -1 : 1);
        if (next < 0) {
          setWeekStart(addDays(weekStart, -7));
          setFocusedDay(6);
        } else if (next > 6) {
          setWeekStart(addDays(weekStart, 7));
          setFocusedDay(0);
        } else {
          setFocusedDay(next);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        setDialog({ kind: 'add', date: isoDate(addDays(weekStart, focusedDay)) });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [view, dialog, settingsOpen, days, weekStart, focusedDay]);

  const updateDrafts = async (next: Draft[]) => {
    setDraftsState(next);
    await setDrafts(next);
  };

  const showError = (e: unknown) => {
    setError((e as Error).message);
    setErrorIsAuth(e instanceof JiraAuthError);
  };

  const stageDraft = (v: WorklogValues) =>
    updateDrafts([
      ...drafts,
      {
        id: crypto.randomUUID(),
        issueKey: v.issueKey,
        summary: v.summary,
        date: v.date,
        time: v.time,
        seconds: v.seconds,
        comment: v.comment,
        status: 'staged',
      },
    ]);

  const replaceDraft = (id: string, v: WorklogValues) =>
    updateDrafts(
      drafts.map((d) =>
        d.id === id
          ? {
              ...d,
              issueKey: v.issueKey,
              summary: v.summary,
              date: v.date,
              time: v.time,
              seconds: v.seconds,
              comment: v.comment,
              status: 'staged' as const,
              error: undefined,
            }
          : d,
      ),
    );

  const saveEdit = async (entry: Entry, v: WorklogValues) => {
    await updateWorklog(
      entry.issue.key,
      entry.worklog.id,
      toJiraStarted(v.date, v.time),
      v.seconds,
      v.comment,
    );
    setReloadTick((t) => t + 1);
  };

  const deleteEntry = async (e: Entry) => {
    const label = `${formatSeconds(e.worklog.timeSpentSeconds)} on ${e.issue.key}`;
    if (!confirm(`Delete worklog (${label})? This removes it from Jira.`)) return;
    setBusy(true);
    try {
      await deleteWorklog(e.issue.key, e.worklog.id);
      setReloadTick((t) => t + 1);
    } catch (err) {
      showError(err);
    }
    setBusy(false);
  };

  const copyLastWeek = async () => {
    if (!me) return;
    setCopying(true);
    setError(undefined);
    try {
      const prev = await loadWeek(me, addDays(weekStart, -7));
      const copies: Draft[] = [];
      for (const entries of prev.values()) {
        for (const e of entries) {
          const v = entryValues(e);
          copies.push({
            id: crypto.randomUUID(),
            issueKey: v.issueKey,
            summary: v.summary,
            date: isoDate(addDays(new Date(v.date), 7)),
            time: v.time,
            seconds: v.seconds,
            comment: v.comment,
            status: 'staged',
          });
        }
      }
      if (copies.length === 0) {
        setError('Nothing to copy — last week has no worklogs of yours.');
      } else {
        await updateDrafts([...drafts, ...copies]);
      }
    } catch (e) {
      showError(e);
    }
    setCopying(false);
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
        if (e instanceof JiraAuthError) showError(e);
      }
    }
    await updateDrafts(remaining);
    setPushing(false);
    if (pushed) setReloadTick((t) => t + 1);
  };

  const resolvedTheme =
    themePref === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : themePref;

  const toggleTheme = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setThemePref(next);
    applyTheme(next);
    saveSettings({ theme: next });
  };

  if (ready === undefined) return null;
  if (!ready) return <Setup onDone={() => setReady(true)} />;

  const today = isoDate(new Date());
  const failed = drafts.filter((d) => d.status === 'error');
  const weekTotal = days
    ? [...days.values()].flat().reduce((sum, e) => sum + e.worklog.timeSpentSeconds, 0)
    : 0;
  const weekDates = new Set(days?.keys() ?? []);
  const weekIsEmpty =
    days && weekTotal === 0 && !drafts.some((d) => weekDates.has(d.date));
  const targetSeconds = dailyTarget * 3600;

  return (
    <div class="app">
      <header>
        <h1>Worklog Ledger</h1>
        <nav class="tabs">
          <button class={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>
            Calendar
          </button>
          <button class={view === 'report' ? 'active' : ''} onClick={() => setView('report')}>
            Report
          </button>
        </nav>
        {license?.plan === 'trial' && (
          <span class="chip" title="All paid features unlocked during the trial">
            Trial · {license.trialDaysLeft}d left
          </span>
        )}
        {license?.plan === 'free' && (
          <button class="chip chip-btn" title="Unlock export and rates" onClick={() => openUpgradePage()}>
            Free · Upgrade
          </button>
        )}
        {me && <span>{me.displayName}</span>}
        {view === 'calendar' && (
          <>
            <button onClick={copyLastWeek} disabled={copying || !days} title="Stage a copy of last week's worklogs onto this week">
              {copying ? 'Copying…' : 'Copy last week'}
            </button>
            <button onClick={() => setWeekStart(addDays(weekStart, -7))}>← Prev</button>
            <span class="week-range">
              {isoDate(weekStart)} — {isoDate(addDays(weekStart, 6))}
            </span>
            <button onClick={() => setWeekStart(addDays(weekStart, 7))}>Next →</button>
            <button onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</button>
          </>
        )}
        <button onClick={toggleTheme} title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}>
          {resolvedTheme === 'dark' ? '☀' : '☾'}
        </button>
        <button onClick={() => setSettingsOpen(true)} title="Settings">⚙</button>
      </header>

      {view === 'report' && <ReportView license={license} />}

      {view === 'calendar' && error && (
        <div class="error">
          {error}
          {errorIsAuth && (
            <button class="link" onClick={() => setSettingsOpen(true)}>
              Open settings
            </button>
          )}
        </div>
      )}

      {view === 'calendar' && !error && !days && (
        <div class="grid">
          {Array.from({ length: 7 }, (_, i) => (
            <div class="day skeleton" key={i} />
          ))}
        </div>
      )}

      {view === 'calendar' && days && (
        <>
          <div class="grid">
            {[...days.entries()].map(([date, entries], idx) => {
              const dayDrafts = drafts.filter((d) => d.date === date);
              const total =
                entries.reduce((sum, e) => sum + e.worklog.timeSpentSeconds, 0) +
                dayDrafts.reduce((sum, d) => sum + d.seconds, 0);
              const isWeekday = idx < 5;
              const classes = [
                'day',
                date === today ? 'today' : '',
                idx === focusedDay ? 'focused' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <div class={classes} key={date} onClick={() => setFocusedDay(idx)}>
                  <div class="day-head">
                    <span class="day-name">
                      {WEEKDAYS[idx]} <span class="day-num">{Number(date.slice(8))}</span>
                    </span>
                    <span class="day-total">{total ? formatSeconds(total) : ''}</span>
                  </div>
                  {isWeekday && (
                    <div class="target-bar" title={`Target ${dailyTarget}h`}>
                      <div
                        class={`target-fill${total >= targetSeconds ? ' met' : ''}`}
                        style={{ width: `${Math.min(100, (total / targetSeconds) * 100)}%` }}
                      />
                    </div>
                  )}
                  {entries.map((e) => (
                    <div class="entry" key={e.worklog.id}>
                      <span class="actions">
                        <button
                          title="Edit worklog"
                          disabled={busy}
                          onClick={() => setDialog({ kind: 'edit', entry: e })}
                        >
                          ✎
                        </button>
                        <button
                          title="Duplicate onto another day"
                          disabled={busy}
                          onClick={() => setDialog({ kind: 'duplicate', values: entryValues(e) })}
                        >
                          ⧉
                        </button>
                        <button
                          class="danger"
                          title="Delete worklog"
                          disabled={busy}
                          onClick={() => deleteEntry(e)}
                        >
                          ×
                        </button>
                      </span>
                      <span class="time">{formatSeconds(e.worklog.timeSpentSeconds)}</span>
                      <span class="key">{e.issue.key}</span>
                      <div>{e.issue.summary}</div>
                    </div>
                  ))}
                  {dayDrafts.map((d) => (
                    <div class={`entry draft${d.status === 'error' ? ' failed' : ''}`} key={d.id}>
                      <span class="actions">
                        <button
                          title="Edit staged worklog"
                          onClick={() => setDialog({ kind: 'edit-draft', draft: d })}
                        >
                          ✎
                        </button>
                        <button
                          class="danger"
                          title="Remove staged worklog"
                          onClick={() => updateDrafts(drafts.filter((x) => x.id !== d.id))}
                        >
                          ×
                        </button>
                      </span>
                      <span class="time">{formatSeconds(d.seconds)}</span>
                      <span class="key">{d.issueKey}</span>
                      <div>{d.summary}</div>
                      {d.error && <div class="entry-error">{d.error}</div>}
                    </div>
                  ))}
                  <button class="day-add" onClick={() => setDialog({ kind: 'add', date })}>
                    + Log work
                  </button>
                </div>
              );
            })}
          </div>
          <div class="week-total">Week total: {formatSeconds(weekTotal)}</div>
          {weekIsEmpty && (
            <p class="empty-hint">
              No work logged this week yet. Click <strong>+ Log work</strong> on a day (or press
              Enter — use ←/→ to move between days), or use <strong>Copy last week</strong>.
            </p>
          )}
        </>
      )}

      {view === 'calendar' && drafts.length > 0 && (
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

      {dialog?.kind === 'add' && (
        <WorklogDialog
          title={`Log work — ${dialog.date}`}
          submitLabel="Stage worklog"
          initial={{ date: dialog.date }}
          onClose={() => setDialog(undefined)}
          onSubmit={stageDraft}
        />
      )}
      {dialog?.kind === 'duplicate' && (
        <WorklogDialog
          title="Duplicate worklog"
          submitLabel="Stage copy"
          initial={dialog.values}
          onClose={() => setDialog(undefined)}
          onSubmit={stageDraft}
        />
      )}
      {dialog?.kind === 'edit-draft' && (
        <WorklogDialog
          title="Edit staged worklog"
          submitLabel="Update draft"
          initial={dialog.draft}
          onClose={() => setDialog(undefined)}
          onSubmit={(v) => replaceDraft(dialog.draft.id, v)}
        />
      )}
      {dialog?.kind === 'edit' && (
        <WorklogDialog
          title={`Edit worklog — ${dialog.entry.issue.key}`}
          submitLabel="Save to Jira"
          lockIssue
          initial={entryValues(dialog.entry)}
          onClose={() => setDialog(undefined)}
          onSubmit={(v) => saveEdit(dialog.entry, v)}
        />
      )}

      {settingsOpen && (
        <SettingsDialog
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            getSettings().then((s) => {
              setDailyTarget(s.dailyTargetHours);
              setReady(Boolean(s.site));
            });
            setMe(undefined);
            setReloadTick((t) => t + 1);
          }}
        />
      )}
    </div>
  );
}
