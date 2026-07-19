import { useEffect, useState } from 'preact/hooks';
import {
  getSettings,
  saveSettings,
  normalizeSiteUrl,
  type AuthConfig,
} from '../lib/settings';

interface Props {
  onClose: () => void;
  /** Fired after a successful save so the app can reload with the new config. */
  onSaved: () => void;
}

export function SettingsDialog({ onClose, onSaved }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [site, setSite] = useState('');
  const [mode, setMode] = useState<'session' | 'token'>('session');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [target, setTarget] = useState('8');
  const [error, setError] = useState<string>();

  useEffect(() => {
    getSettings().then((s) => {
      setSite(s.site ?? '');
      setMode(s.auth.mode);
      if (s.auth.mode === 'token') {
        setEmail(s.auth.email);
        setToken(s.auth.token);
      }
      setTarget(String(s.dailyTargetHours));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    setError(undefined);
    try {
      const normalized = normalizeSiteUrl(site);
      const hours = parseFloat(target.replace(',', '.'));
      if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
        throw new Error('Daily target must be between 0 and 24 hours.');
      }
      let auth: AuthConfig = { mode: 'session' };
      if (mode === 'token') {
        if (!email.trim() || !token.trim()) {
          throw new Error('Email and API token are both required for token auth.');
        }
        auth = { mode: 'token', email: email.trim(), token: token.trim() };
      }
      await saveSettings({ site: normalized, auth, dailyTargetHours: hours });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!loaded) return null;

  return (
    <div class="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="dialog">
        <h2>Settings</h2>

        <label>
          Jira site URL
          <input
            placeholder="https://your-site.atlassian.net"
            value={site}
            onInput={(e) => setSite((e.target as HTMLInputElement).value)}
          />
        </label>

        <div class="field-group">
          <span class="field-title">Authentication</span>
          <label class="radio">
            <input
              type="radio"
              name="auth-mode"
              checked={mode === 'session'}
              onChange={() => setMode('session')}
            />
            Browser session (you're logged in to Jira in this browser)
          </label>
          <label class="radio">
            <input
              type="radio"
              name="auth-mode"
              checked={mode === 'token'}
              onChange={() => setMode('token')}
            />
            API token (works without an open Jira session)
          </label>
        </div>

        {mode === 'token' && (
          <>
            <div class="row">
              <label>
                Atlassian email
                <input
                  type="email"
                  value={email}
                  onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                />
              </label>
              <label>
                API token
                <input
                  type="password"
                  value={token}
                  onInput={(e) => setToken((e.target as HTMLInputElement).value)}
                />
              </label>
            </div>
            <p class="hint">
              Create a token at{' '}
              <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer">
                id.atlassian.com › Security › API tokens
              </a>
              . If Jira starts rejecting it (expired or revoked), paste a new one here.
            </p>
          </>
        )}

        <label>
          Daily target (hours)
          <input
            type="number"
            min="1"
            max="24"
            step="0.5"
            value={target}
            onInput={(e) => setTarget((e.target as HTMLInputElement).value)}
          />
        </label>

        {error && <div class="error">{error}</div>}

        <div class="row end">
          <button onClick={onClose}>Cancel</button>
          <button class="primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
