/** Per-project billing settings, keyed by Jira project key. */
export interface ProjectBilling {
  /** Client the project bills to; empty falls back to the project name. */
  client: string;
  /** Hourly rate; unset falls back to the config default. */
  rate?: number;
  billable: boolean;
}

export interface BillingConfig {
  projects: Record<string, ProjectBilling>;
  defaultRate: number;
  currency: string;
}

const DEFAULTS: BillingConfig = { projects: {}, defaultRate: 0, currency: 'USD' };

export async function getBillingConfig(): Promise<BillingConfig> {
  const { billing } = await chrome.storage.sync.get('billing');
  const stored = (billing ?? {}) as Partial<BillingConfig>;
  return { ...DEFAULTS, ...stored, projects: { ...stored.projects } };
}

export async function saveBillingConfig(config: BillingConfig): Promise<void> {
  await chrome.storage.sync.set({ billing: config });
}

export function projectBilling(config: BillingConfig, projectKey: string): ProjectBilling {
  return config.projects[projectKey] ?? { client: '', billable: true };
}
