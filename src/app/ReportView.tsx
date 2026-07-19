import { useEffect, useState } from 'preact/hooks';
import { fetchReportEntries, type ReportEntry } from '../lib/report';
import {
  getBillingConfig,
  saveBillingConfig,
  projectBilling,
  type BillingConfig,
  type ProjectBilling,
} from '../lib/billing';
import { canUsePaidFeatures, openUpgradePage, type LicenseState } from '../lib/license';
import { downloadCsv } from '../lib/csv';
import { isoDate } from '../lib/week';

type GroupBy = 'client' | 'project' | 'person';

interface BilledEntry extends ReportEntry {
  client: string;
  rate: number;
  billable: boolean;
  hours: number;
  amount: number;
}

function monthRange(offset: number): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const to =
    offset === 0 ? now : new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { from: isoDate(from), to: isoDate(to) };
}

const fmtHours = (h: number) => h.toFixed(2);
const fmtMoney = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ReportView({ license }: { license?: LicenseState }) {
  const [{ from, to }, setRange] = useState(() => monthRange(0));
  const [entries, setEntries] = useState<ReportEntry[]>();
  const [config, setConfig] = useState<BillingConfig>();
  const [groupBy, setGroupBy] = useState<GroupBy>('client');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    getBillingConfig().then(setConfig);
  }, []);

  const run = async (range = { from, to }) => {
    setLoading(true);
    setError(undefined);
    try {
      setEntries(await fetchReportEntries(range.from, range.to));
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  useEffect(() => {
    run();
  }, []);

  const paid = license ? canUsePaidFeatures(license) : true;

  const updateConfig = (next: BillingConfig) => {
    setConfig(next);
    saveBillingConfig(next);
  };

  const updateProject = (key: string, patch: Partial<ProjectBilling>) => {
    if (!config) return;
    const current = projectBilling(config, key);
    updateConfig({
      ...config,
      projects: { ...config.projects, [key]: { ...current, ...patch } },
    });
  };

  if (!config) return null;

  const rows: BilledEntry[] = (entries ?? []).map((e) => {
    const pb = config.projects[e.projectKey];
    const client = pb?.client?.trim() || e.projectName;
    const rate = pb?.rate ?? config.defaultRate;
    const billable = pb?.billable ?? true;
    const hours = e.seconds / 3600;
    return { ...e, client, rate, billable, hours, amount: billable ? hours * rate : 0 };
  });

  const projects = [...new Map(rows.map((r) => [r.projectKey, r.projectName]))];

  const groupKey = (r: BilledEntry) =>
    groupBy === 'client' ? r.client : groupBy === 'project' ? `${r.projectName} (${r.projectKey})` : r.authorName;
  const groups = new Map<string, { billable: number; nonBillable: number; amount: number }>();
  for (const r of rows) {
    const key = groupKey(r);
    const g = groups.get(key) ?? { billable: 0, nonBillable: 0, amount: 0 };
    if (r.billable) g.billable += r.hours;
    else g.nonBillable += r.hours;
    g.amount += r.amount;
    groups.set(key, g);
  }
  const totalHours = rows.reduce((s, r) => s + r.hours, 0);
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

  const exportCsv = () => {
    downloadCsv(`worklog-report-${from}-to-${to}.csv`, [
      ['Worklog report', `${from} to ${to}`],
      [],
      ['Date', 'Client', 'Project', 'Issue', 'Summary', 'Person', 'Comment', 'Hours', `Rate (${config.currency})`, `Amount (${config.currency})`, 'Billable'],
      ...rows.map((r) => [
        r.date,
        r.client,
        r.projectName,
        r.issueKey,
        r.issueSummary,
        r.authorName,
        r.comment,
        fmtHours(r.hours),
        r.billable ? r.rate : '',
        r.amount.toFixed(2),
        r.billable ? 'yes' : 'no',
      ]),
      [],
      ['Total', '', '', '', '', '', '', fmtHours(totalHours), '', totalAmount.toFixed(2), ''],
    ]);
  };

  return (
    <div class="report">
      <div class="report-toolbar">
        <label>
          From
          <input
            type="date"
            value={from}
            onInput={(e) => setRange({ from: (e.target as HTMLInputElement).value, to })}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={to}
            onInput={(e) => setRange({ from, to: (e.target as HTMLInputElement).value })}
          />
        </label>
        <button
          onClick={() => {
            const r = monthRange(0);
            setRange(r);
            run(r);
          }}
        >
          This month
        </button>
        <button
          onClick={() => {
            const r = monthRange(-1);
            setRange(r);
            run(r);
          }}
        >
          Last month
        </button>
        <button class="primary" disabled={loading} onClick={() => run()}>
          {loading ? 'Loading…' : 'Run report'}
        </button>
      </div>

      {error && <div class="error">{error}</div>}
      {loading && !entries && <p class="empty-hint">Collecting worklogs…</p>}
      {entries && entries.length === 0 && !loading && (
        <p class="empty-hint">No worklogs found between {from} and {to}.</p>
      )}

      {entries && entries.length > 0 && (
        <>
          <section class="report-section">
            <h3>Clients & rates</h3>
            <div class="report-defaults">
              <label>
                Default rate
                <input
                  type="number"
                  min="0"
                  step="1"
                  disabled={!paid}
                  value={config.defaultRate}
                  onInput={(e) =>
                    updateConfig({ ...config, defaultRate: Number((e.target as HTMLInputElement).value) || 0 })
                  }
                />
              </label>
              <label>
                Currency
                <input
                  disabled={!paid}
                  value={config.currency}
                  onInput={(e) => updateConfig({ ...config, currency: (e.target as HTMLInputElement).value })}
                />
              </label>
              {!paid && (
                <span class="hint">
                  Trial ended — rates and export are paid features.
                  <button class="link" onClick={() => openUpgradePage()}>Upgrade</button>
                </span>
              )}
            </div>
            <table class="report-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Client</th>
                  <th>Rate ({config.currency}/h)</th>
                  <th>Billable</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(([key, name]) => {
                  const pb = projectBilling(config, key);
                  return (
                    <tr key={key}>
                      <td>
                        <span class="key">{key}</span> {name}
                      </td>
                      <td>
                        <input
                          class="cell"
                          placeholder={name}
                          disabled={!paid}
                          value={pb.client}
                          onInput={(e) => updateProject(key, { client: (e.target as HTMLInputElement).value })}
                        />
                      </td>
                      <td>
                        <input
                          class="cell narrow"
                          type="number"
                          min="0"
                          step="1"
                          placeholder={String(config.defaultRate)}
                          disabled={!paid}
                          value={pb.rate ?? ''}
                          onInput={(e) => {
                            const raw = (e.target as HTMLInputElement).value;
                            updateProject(key, { rate: raw === '' ? undefined : Number(raw) });
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          disabled={!paid}
                          checked={pb.billable}
                          onChange={(e) => updateProject(key, { billable: (e.target as HTMLInputElement).checked })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section class="report-section">
            <div class="section-head">
              <h3>Summary</h3>
              <label class="inline">
                Group by
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy((e.target as HTMLSelectElement).value as GroupBy)}
                >
                  <option value="client">Client</option>
                  <option value="project">Project</option>
                  <option value="person">Person</option>
                </select>
              </label>
            </div>
            <table class="report-table">
              <thead>
                <tr>
                  <th>{groupBy === 'person' ? 'Person' : groupBy === 'project' ? 'Project' : 'Client'}</th>
                  <th class="num">Billable h</th>
                  <th class="num">Non-billable h</th>
                  <th class="num">Amount ({config.currency})</th>
                </tr>
              </thead>
              <tbody>
                {[...groups.entries()]
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .map(([name, g]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td class="num">{fmtHours(g.billable)}</td>
                      <td class="num">{g.nonBillable ? fmtHours(g.nonBillable) : '—'}</td>
                      <td class="num">{fmtMoney(g.amount)}</td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td class="num" colSpan={2}>
                    {fmtHours(totalHours)}
                  </td>
                  <td class="num">{fmtMoney(totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          <section class="report-section">
            <div class="section-head">
              <h3>Entries ({rows.length})</h3>
              <button class="primary" disabled={!paid} onClick={exportCsv} title={paid ? 'Invoice-ready CSV' : 'Paid feature'}>
                Export CSV
              </button>
            </div>
            <table class="report-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Person</th>
                  <th>Client</th>
                  <th>Issue</th>
                  <th>Comment</th>
                  <th class="num">Hours</th>
                  <th class="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} class={r.billable ? '' : 'muted-row'}>
                    <td>{r.date}</td>
                    <td>{r.authorName}</td>
                    <td>{r.client}</td>
                    <td>
                      <span class="key">{r.issueKey}</span> {r.issueSummary}
                    </td>
                    <td class="comment">{r.comment}</td>
                    <td class="num">{fmtHours(r.hours)}</td>
                    <td class="num">{r.billable ? fmtMoney(r.amount) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
