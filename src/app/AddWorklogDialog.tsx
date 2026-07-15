import { useEffect, useRef, useState } from 'preact/hooks';
import { pickIssues, type PickedIssue } from '../lib/jira';
import { parseDuration } from '../lib/duration';
import type { Draft } from '../lib/drafts';

interface Props {
  date: string;
  onClose: () => void;
  onAdd: (draft: Draft) => void;
}

export function AddWorklogDialog({ date, onClose, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickedIssue[]>([]);
  const [chosen, setChosen] = useState<PickedIssue>();
  const [duration, setDuration] = useState('');
  const [time, setTime] = useState('09:00');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string>();
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

  const submit = () => {
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
    onAdd({
      id: crypto.randomUUID(),
      issueKey: chosen.key,
      summary: chosen.summaryText,
      date,
      time,
      seconds,
      comment,
      status: 'staged',
    });
    onClose();
  };

  return (
    <div class="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="dialog">
        <h2>Log work — {date}</h2>

        {chosen ? (
          <div class="chosen">
            <span class="key">{chosen.key}</span> {chosen.summaryText}
            <button class="link" onClick={() => setChosen(undefined)}>change</button>
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
            Duration
            <input
              placeholder="1h 30m"
              value={duration}
              onInput={(e) => setDuration((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
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
          <button onClick={onClose}>Cancel</button>
          <button class="primary" onClick={submit}>Stage worklog</button>
        </div>
      </div>
    </div>
  );
}
