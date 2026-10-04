// Vercel serverless function: forwards storefront events to Meta's Conversions API.
//
// The browser (src/lib/pixel.ts) posts each event here with the same event ID
// it gave the Pixel, and Meta merges the two copies into one.
//
// Environment variables (Vercel -> Settings -> Environment Variables):
//   META_CAPI_ACCESS_TOKEN  required. Events Manager -> dataset -> Settings ->
//                           Conversions API -> Generate access token.
//   META_PIXEL_ID           optional, defaults to the nors. dataset.
//   META_TEST_EVENT_CODE    optional. Set only while testing: events then show
//                           up under "Test events" and do not count for ads.
//   META_GRAPH_VERSION      optional, defaults to v23.0.

import { createHash } from 'node:crypto';

const PIXEL_ID = process.env.META_PIXEL_ID || '4640251216246898';
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0';
const CURRENCY = 'PKR';

const ALLOWED_EVENTS = new Set(['ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase']);
const ALLOWED_ORIGIN =
  /^https:\/\/(www\.)?nors\.com\.pk$|^https:\/\/[a-z0-9-]+\.vercel\.app$|^http:\/\/localhost(:\d+)?$/;

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const clean = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

// Meta wants phone numbers as digits with the country code and no leading 0.
// Pakistani numbers: 03001234567 or +923001234567 -> 923001234567.
function normalizePhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = '92' + digits.slice(1);
  return digits.length >= 10 ? digits : '';
}

function buildUserData(user, req, fbp, fbc) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const out = {
    client_ip_address: forwarded || req.socket?.remoteAddress || undefined,
    client_user_agent: req.headers['user-agent'] || undefined,
  };

  const email = clean(user.email);
  if (email) out.em = [sha256(email)];

  const phone = normalizePhone(user.phone);
  if (phone) out.ph = [sha256(phone)];

  const firstName = clean(user.first_name);
  if (firstName) out.fn = [sha256(firstName)];

  const lastName = clean(user.last_name);
  if (lastName) out.ln = [sha256(lastName)];

  const city = clean(user.city).replace(/[^a-z]/g, '');
  if (city) out.ct = [sha256(city)];

  const state = clean(user.state).replace(/[^a-z]/g, '');
  if (state) out.st = [sha256(state)];

  const country = clean(user.country);
  if (country) out.country = [sha256(country)];

  // fbp / fbc are sent as-is (not hashed), but only if they look right.
  if (typeof fbp === 'string' && /^fb\.\d\.\d+\.[\w-]+$/.test(fbp)) out.fbp = fbp;
  if (typeof fbc === 'string' && /^fb\.\d\.\d+\.[\w-]+$/.test(fbc)) out.fbc = fbc;

  return out;
}

function buildCustomData(custom) {
  const out = { currency: CURRENCY, content_type: 'product' };

  const value = Number(custom.value);
  if (Number.isFinite(value) && value >= 0 && value < 10_000_000) out.value = value;

  if (Array.isArray(custom.content_ids)) {
    out.content_ids = custom.content_ids.slice(0, 50).map((id) => String(id).slice(0, 64));
  }
  if (typeof custom.content_name === 'string') out.content_name = custom.content_name.slice(0, 200);

  const numItems = Number(custom.num_items);
  if (Number.isInteger(numItems) && numItems > 0 && numItems < 1000) out.num_items = numItems;

  if (Array.isArray(custom.contents)) {
    out.contents = custom.contents.slice(0, 50).map((line) => ({
      id: String(line?.id ?? '').slice(0, 64),
      quantity: Math.max(1, Math.min(999, parseInt(line?.quantity, 10) || 1)),
      item_price: Number(line?.item_price) || 0,
    }));
  }
  if (custom.order_id) out.order_id = String(custom.order_id).slice(0, 64);

  return out;
}

export default async function handler(req, res) {
  // CORS: the storefront on nors.com.pk (Hostinger) calls this function cross-origin.
  const reqOrigin = req.headers.origin;
  if (reqOrigin && ALLOWED_ORIGIN.test(reqOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGIN.test(origin)) {
    return res.status(403).json({ error: 'forbidden_origin' });
  }

  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!token) {
    // Not configured yet. Succeed quietly so the storefront never sees an error.
    console.warn('META_CAPI_ACCESS_TOKEN is not set; skipping server event.');
    return res.status(200).json({ skipped: true });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'invalid_json' });
    }
  }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'invalid_body' });

  if (!ALLOWED_EVENTS.has(body.event_name)) return res.status(400).json({ error: 'unsupported_event' });
  if (typeof body.event_id !== 'string' || !body.event_id || body.event_id.length > 100) {
    return res.status(400).json({ error: 'invalid_event_id' });
  }

  // Meta rejects events older than 7 days; fall back to "now" for bad clocks.
  const now = Math.floor(Date.now() / 1000);
  const eventTime =
    Number.isInteger(body.event_time) && body.event_time > now - 7 * 86400 && body.event_time <= now + 60
      ? body.event_time
      : now;

  const event = {
    event_name: body.event_name,
    event_time: eventTime,
    event_id: body.event_id,
    action_source: 'website',
    event_source_url:
      typeof body.event_source_url === 'string' && /^https?:\/\//.test(body.event_source_url)
        ? body.event_source_url.slice(0, 500)
        : undefined,
    user_data: buildUserData(body.user_data || {}, req, body.fbp, body.fbc),
    custom_data: buildCustomData(body.custom_data || {}),
  };

  const payload = { data: [event], access_token: token };
  if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;

  try {
    const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error('Meta CAPI rejected the event:', response.status, (await response.text()).slice(0, 500));
      return res.status(502).json({ error: 'meta_rejected' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Meta CAPI request failed:', err instanceof Error ? err.message : err);
    return res.status(502).json({ error: 'upstream_unreachable' });
  }
}
