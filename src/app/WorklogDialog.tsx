import { useEffect, useRef, useState } from 'preact/hooks';
import { pickIssues, type PickedIssue } from '../lib/jira';
import { parseDuration } from '../lib/duration';
import { formatSeconds } from '../lib/week';

export interface WorklogValues {
  issueKey: string;
  summary: string;
  date: string; // yyyy-MM-dd
  time: string; // HH:mm
  seconds: number;
  comment: string;
}

interface Props {
  title: string;
  submitLabel: string;
  initial: Partial<WorklogValues> & { date: string };
  /** Edit mode for an existing Jira worklog — the issue can't be changed. */
  lockIssue?: boolean;
  onClose: () => void;
  /** May throw / reject — the dialog stays open and shows the error. */
  onSubmit: (values: WorklogValues) => void | Promise<void>;
}

export function WorklogDialog({ title, submitLabel, initial, lockIssue, onClose, onSubmit }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickedIssue[]>([]);
  const [chosen, setChosen] = useState<PickedIssue | undefined>(
    initial.issueKey ? { key: initial.issueKey, summaryText: initial.summary ?? '' } : undefined,
  );
  const [date, setDate] = useState(initial.date);
  const [duration, setDuration] = useState(initial.seconds ? formatSeconds(initial.seconds) : '');
  const [time, setTime] = useState(initial.time ?? '09:00');
  const [comment, setComment] = useState(initial.comment ?? '');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const queryRef = useRef<HTMLInputElement>(null);

  useEffect(() => queryRef.current?.focus(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (chosen || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      pickIssues(query.trim())
        .then(setResults)
        .catch((e: Error) => setError(e.message));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, chosen]);

  const submit = async () => {
    setError(undefined);
    if (!chosen) {
      setError('Pick an issue first.');
      return;
    }
    const seconds = parseDuration(duration);
    if (!seconds) {
      setError('Enter a duration like "1h 30m", "45m" or "2".');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        issueKey: chosen.key,
        summary: chosen.summaryText,
        date,
        time,
        seconds,
        comment,
      });
      onClose();
    } catch (e) {
      setSaving(false);
      setError((e as Error).message);
    }
  };

  return (
    <div class="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="dialog">
        <h2>{title}</h2>

        {chosen ? (
          <div class="chosen">
            <span class="key">{chosen.key}</span> {chosen.summaryText}
            {!lockIssue && (
              <button class="link" onClick={() => setChosen(undefined)}>change</button>
            )}
          </div>
        ) : (
          <>
            <input
              ref={queryRef}
              placeholder="Search issue (key or text)…"
              value={query}
              onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            />
            {results.length > 0 && (
              <div class="results">
                {results.map((issue) => (
                  <button key={issue.key} class="result" onClick={() => setChosen(issue)}>
                    <span class="key">{issue.key}</span> {issue.summaryText}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <div class="row">
          <label>
            Date
            <input
              type="date"
              value={date}
              onInput={(e) => setDate((e.target as HTMLInputElement).value)}
            />
          </label>
          <label>
            Start
            <input
              type="time"
              value={time}
              onInput={(e) => setTime((e.target as HTMLInputElement).value)}
            />
          </label>
          <label>
            Duration
            <input
              placeholder="1h 30m"
              value={duration}
              onInput={(e) => setDuration((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </label>
        </div>

        <label>
          Comment (optional)
          <input
            value={comment}
            onInput={(e) => setComment((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>

        {error && <div class="error">{error}</div>}

        <div class="row end">
          <button onClick={onClose} disabled={saving}>Cancel</button>
          <button class="primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
