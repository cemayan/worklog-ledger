/**
 * Licensing: Paddle (merchant of record) + a tiny Cloudflare Worker that maps
 * purchase email → subscription status (see worker/). 14-day reverse trial:
 * everything is unlocked for the first TRIAL_DAYS after first use; afterwards
 * paid features (export, rates) lock until a license is activated.
 *
 * The check sends ONLY the purchase email — never any Jira data. Paid status
 * is cached in chrome.storage.sync so a paying user is never locked out when
 * the license server is unreachable.
 */

/** TODO: set to the deployed worker URL (see worker/README.md). */
const LICENSE_API = 'https://worklog-ledger-license.cemayan.workers.dev';

const UPGRADE_URL = 'https://cemayan.com/worklog-ledger/#pricing';

export interface LicenseState {
  plan: 'trial' | 'free' | 'paid';
  trialDaysLeft: number;
}

export interface LicenseInfo {
  email?: string;
  paid: boolean;
  checkedAt: number;
}

const TRIAL_DAYS = 14;
const DAY_MS = 24 * 3600 * 1000;
const RECHECK_MS = 7 * DAY_MS;

async function remoteCheck(email: string): Promise<boolean | undefined> {
  try {
    const res = await fetch(`${LICENSE_API}/license?email=${encodeURIComponent(email)}`);
    if (!res.ok) return undefined;
    const { active } = (await res.json()) as { active: boolean };
    return active;
  } catch {
    return undefined;
  }
}

export async function getLicenseInfo(): Promise<LicenseInfo | undefined> {
  const { license } = await chrome.storage.sync.get('license');
  return license as LicenseInfo | undefined;
}

/** Validates the purchase email against the license server and stores the result. */
export async function activateLicense(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const active = await remoteCheck(normalized);
  if (active === undefined) {
    throw new Error('Could not reach the license server. Check your connection and retry.');
  }
  await chrome.storage.sync.set({
    license: { email: normalized, paid: active, checkedAt: Date.now() } satisfies LicenseInfo,
  });
  return active;
}

export async function clearLicense(): Promise<void> {
  await chrome.storage.sync.remove('license');
}

export async function getLicenseState(): Promise<LicenseState> {
  const { firstUse, license } = await chrome.storage.sync.get(['firstUse', 'license']);
  const info = license as LicenseInfo | undefined;

  if (info?.email) {
    const stale = Date.now() - info.checkedAt > RECHECK_MS;
    if (info.paid && !stale) return { plan: 'paid', trialDaysLeft: 0 };
    const active = await remoteCheck(info.email);
    if (active !== undefined) {
      await chrome.storage.sync.set({
        license: { ...info, paid: active, checkedAt: Date.now() },
      });
      if (active) return { plan: 'paid', trialDaysLeft: 0 };
    } else if (info.paid) {
      // Server unreachable: honor the stale paid flag rather than lock out.
      return { plan: 'paid', trialDaysLeft: 0 };
    }
  }

  let start = firstUse as number | undefined;
  if (!start) {
    start = Date.now();
    await chrome.storage.sync.set({ firstUse: start });
  }
  const daysLeft = TRIAL_DAYS - Math.floor((Date.now() - start) / DAY_MS);
  if (daysLeft > 0) return { plan: 'trial', trialDaysLeft: daysLeft };
  return { plan: 'free', trialDaysLeft: 0 };
}

/** Export + rate editing are the paid surface; report preview stays free. */
export function canUsePaidFeatures(license: LicenseState): boolean {
  return license.plan !== 'free';
}

/** Opens the landing page's pricing section (Paddle checkout). */
export function openUpgradePage(): void {
  window.open(UPGRADE_URL, '_blank', 'noopener');
}
