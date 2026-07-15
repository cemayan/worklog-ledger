const siteInput = document.getElementById('site');
const result = document.getElementById('result');

chrome.storage.sync.get('site', ({ site }) => {
  if (site) siteInput.value = site;
});

function normalizeSite() {
  const site = siteInput.value.trim().replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9-]+\.atlassian\.net$/i.test(site)) {
    throw new Error('URL must look like https://<site>.atlassian.net');
  }
  chrome.storage.sync.set({ site });
  return site;
}

async function jiraGet(path) {
  const site = normalizeSite();
  const res = await fetch(site + path, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error(`Expected JSON, got '${ct}' (likely a login redirect = no session)`);
  }
  return res.json();
}

function show(ok, text) {
  result.className = ok ? 'ok' : 'err';
  result.textContent = text;
}

document.getElementById('test').addEventListener('click', async () => {
  show(true, '...');
  try {
    const me = await jiraGet('/rest/api/3/myself');
    show(true, `SESSION REUSE WORKS ✔\n${me.displayName}\n${me.accountId}\n${me.emailAddress || ''}`);
  } catch (e) {
    show(false, `FAILED ✘\n${e.message}`);
  }
});

document.getElementById('worklog').addEventListener('click', async () => {
  show(true, '...');
  try {
    // Worklog ids updated in the last 7 days — the endpoint the report engine will use.
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const data = await jiraGet(`/rest/api/3/worklog/updated?since=${since}`);
    const count = (data.values || []).length;
    show(true, `WORKLOG API WORKS ✔\nWorklogs updated in last 7 days: ${count}${data.lastPage ? '' : ' (more pages)'}`);
  } catch (e) {
    show(false, `FAILED ✘\n${e.message}`);
  }
});
