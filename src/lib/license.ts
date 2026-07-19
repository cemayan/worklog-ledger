/**
 * Licensing: ExtensionPay (Stripe checkout, no backend) with a 14-day
 * reverse trial. Everything is unlocked for the first TRIAL_DAYS after first
 * use; afterwards paid features (export, rates) lock until upgrade.
 *
 * Paid status is cached in chrome.storage.sync so a paying user is never
 * locked out when extensionpay.com is unreachable.
 */

/** Must match the extension id registered on extensionpay.com. */
export const EXTPAY_ID = 'worklog-ledger-for-jira';

export interface LicenseState {
  plan: 'trial' | 'free' | 'paid';
  trialDaysLeft: number;
}

const TRIAL_DAYS = 14;
const DAY_MS = 24 * 3600 * 1000;

/**
 * extpay is imported lazily: its webextension-polyfill dependency throws
 * outside a real extension context (tests, demo harnesses), and getUser()
 * can fail offline — both fall back to the cached flag + trial clock.
 */
async function fetchPaidStatus(): Promise<boolean | undefined> {
  try {
    const { default: ExtPay } = await import('extpay');
    const user = await ExtPay(EXTPAY_ID).getUser();
    return user.paid;
  } catch {
    return undefined;
  }
}

export async function getLicenseState(): Promise<LicenseState> {
  const { firstUse, paid } = await chrome.storage.sync.get(['firstUse', 'paid']);

  const remotePaid = await fetchPaidStatus();
  if (remotePaid !== undefined && remotePaid !== Boolean(paid)) {
    await chrome.storage.sync.set({ paid: remotePaid });
  }
  if (remotePaid ?? paid) return { plan: 'paid', trialDaysLeft: 0 };

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

/** Opens the ExtensionPay checkout (Stripe) in a new tab. */
export async function openUpgradePage(): Promise<void> {
  const { default: ExtPay } = await import('extpay');
  await ExtPay(EXTPAY_ID).openPaymentPage();
}
