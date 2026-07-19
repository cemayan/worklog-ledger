import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { myself, JiraAuthError } from '../lib/jira';
import { getSettings, applyTheme } from '../lib/settings';
import '../styles.css';

function Popup() {
  const [status, setStatus] = useState<string>('Checking connection…');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    (async () => {
      const { site, theme } = await getSettings();
      applyTheme(theme);
      if (!site) {
        setStatus('Not set up yet — open the app to connect your Jira site.');
        return;
      }
      try {
        const me = await myself();
        setConnected(true);
        setStatus(`Connected as ${me.displayName}`);
      } catch (e) {
        setStatus(e instanceof JiraAuthError ? e.message : `Connection failed: ${(e as Error).message}`);
      }
    })();
  }, []);

  const openApp = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('app.html') });
  };

  return (
    <div class="popup">
      <h1>Worklog Ledger</h1>
      <div class="status">{connected ? '🟢' : '⚪️'} {status}</div>
      <button class="primary" onClick={openApp}>
        Open worklog calendar
      </button>
    </div>
  );
}

render(<Popup />, document.getElementById('root')!);
