// Talks to the custom nors/v1 auth endpoints (see nors-auth.php mu-plugin
// on the /enterprise WordPress install) - registration, login, Google
// sign-in, profile, and order history for the headless account system.
// Mirrors the same VITE_WC_BASE_URL pattern woocommerce.ts uses, so this
// automatically points at the right backend whether the app is served from
// / or /enterprise.
const WC_BASE = import.meta.env.VITE_WC_BASE_URL ?? '/enterprise/index.php?rest_route=/wc/store/v1';
const NORS_BASE = WC_BASE.replace('/wc/store/v1', '/nors/v1');

export interface AuthUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  points: number;
  token: string;
}

export interface OrderItemSummary {
  name: string;
  quantity: number;
  total: string;
  image: string | null;
}

export interface OrderSummary {
  id: number;
  number: string;
  status: string;
  date: string | null;
  total: string;
  currency: string;
  payment_method: string;
  items: OrderItemSummary[];
}

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong. Please try again.');
  }
  return data;
}

export async function register(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<AuthUser> {
  const res = await fetch(`${NORS_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName }),
  });
  return handle<AuthUser>(res);
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${NORS_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handle<AuthUser>(res);
}

export async function googleLogin(idToken: string): Promise<AuthUser> {
  const res = await fetch(`${NORS_BASE}/google-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  });
  return handle<AuthUser>(res);
}

export async function getMe(token: string): Promise<AuthUser> {
  const res = await fetch(`${NORS_BASE}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle<AuthUser>(res);
}

export async function updateMe(token: string, fields: Record<string, string>): Promise<AuthUser> {
  const res = await fetch(`${NORS_BASE}/me`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(fields),
  });
  return handle<AuthUser>(res);
}

export async function getOrders(token: string): Promise<OrderSummary[]> {
  const res = await fetch(`${NORS_BASE}/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle<OrderSummary[]>(res);
}
