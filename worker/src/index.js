/**
 * License backend for Worklog Ledger — a single Cloudflare Worker.
 *
 * Paddle (merchant of record) sends webhooks here; we keep a tiny
 * email → subscription-status map in KV. The extension asks
 * GET /license?email=... and caches the answer.
 *
 * Secrets (set with `wrangler secret put`):
 *   PADDLE_WEBHOOK_SECRET — from Paddle > Developer tools > Notifications
 *   PADDLE_API_KEY        — from Paddle > Developer tools > Authentication
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === '/webhook' && request.method === 'POST') {
      return handleWebhook(request, env);
    }
    if (url.pathname === '/license' && request.method === 'GET') {
      return handleLicense(url, env);
    }
    return json({ error: 'not found' }, 404);
  },
};

async function handleLicense(url, env) {
  const email = (url.searchParams.get('email') ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) return json({ error: 'invalid email' }, 400);
  const record = await env.LICENSES.get(email, 'json');
  return json({ active: Boolean(record?.active) });
}

async function handleWebhook(request, env) {
  const body = await request.text();
  if (!(await verifyPaddleSignature(request, body, env.PADDLE_WEBHOOK_SECRET))) {
    return json({ error: 'bad signature' }, 401);
  }

  const event = JSON.parse(body);
  const type = event.event_type ?? '';
  const data = event.data ?? {};

  // Subscription lifecycle drives paid status; transaction.completed also
  // handled in case we ever sell one-time licenses.
  let active;
  if (type.startsWith('subscription.')) {
    active = data.status === 'active' || data.status === 'trialing';
  } else if (type === 'transaction.completed') {
    active = true;
  } else {
    return json({ ignored: type });
  }

  const email = await customerEmail(data.customer_id, env);
  if (!email) return json({ error: 'no customer email' }, 202);

  await env.LICENSES.put(
    email,
    JSON.stringify({
      active,
      status: data.status ?? type,
      subscriptionId: data.id,
      updatedAt: event.occurred_at,
    }),
  );
  return json({ ok: true });
}

async function customerEmail(customerId, env) {
  if (!customerId) return undefined;
  const res = await fetch(`${env.PADDLE_API_BASE}/customers/${customerId}`, {
    headers: { Authorization: `Bearer ${env.PADDLE_API_KEY}` },
  });
  if (!res.ok) return undefined;
  const { data } = await res.json();
  return data?.email?.trim().toLowerCase();
}

/** Paddle-Signature: ts=<unix>;h1=<hmac-sha256 hex of "<ts>:<body>">. */
async function verifyPaddleSignature(request, body, secret) {
  if (!secret) return false;
  const header = request.headers.get('Paddle-Signature') ?? '';
  const parts = Object.fromEntries(header.split(';').map((p) => p.split('=')));
  if (!parts.ts || !parts.h1) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${parts.ts}:${body}`),
  );
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return timingSafeEqual(hex, parts.h1);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
