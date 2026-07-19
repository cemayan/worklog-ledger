/**
 * One-shot Paddle bootstrap: creates the product, the monthly price and the
 * webhook notification destination, then prints everything the rest of the
 * setup needs (price id, webhook secret).
 *
 * Usage:
 *   PADDLE_API_KEY=... PADDLE_API_BASE=https://sandbox-api.paddle.com \
 *   WORKER_URL=https://worklog-ledger-license.<acct>.workers.dev \
 *   node scripts/setup-paddle.mjs
 */

const API = process.env.PADDLE_API_BASE ?? 'https://sandbox-api.paddle.com';
const KEY = process.env.PADDLE_API_KEY;
const WORKER_URL = process.env.WORKER_URL;

if (!KEY || !WORKER_URL) {
  console.error('Set PADDLE_API_KEY and WORKER_URL env vars.');
  process.exit(1);
}

async function paddle(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`${path} -> ${res.status}: ${JSON.stringify(json.error ?? json)}`);
  }
  return json.data;
}

const product = await paddle('/products', {
  name: 'Worklog Ledger — Report plan',
  description:
    'Billing reports for Jira worklogs: client & rate mapping, grouped summaries, invoice-ready CSV export. Per reporting seat.',
  tax_category: 'saas',
});
console.log('product id :', product.id);

const price = await paddle('/prices', {
  product_id: product.id,
  description: 'Report plan — monthly',
  unit_price: { amount: '700', currency_code: 'USD' },
  billing_cycle: { interval: 'month', frequency: 1 },
  quantity: { minimum: 1, maximum: 1 },
});
console.log('price id   :', price.id);

const notification = await paddle('/notification-settings', {
  description: 'Worklog Ledger license worker',
  destination: `${WORKER_URL}/webhook`,
  type: 'url',
  subscribed_events: [
    'subscription.activated',
    'subscription.updated',
    'subscription.canceled',
    'transaction.completed',
  ],
});
console.log('webhook id :', notification.id);
console.log('\nNEXT STEPS');
console.log('1. Set the webhook secret on the worker:');
console.log(`   echo "${notification.endpoint_secret_key}" | npx wrangler secret put PADDLE_WEBHOOK_SECRET`);
console.log('2. Put the price id into the landing page checkout config:', price.id);
