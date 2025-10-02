'use server';
import { cookies } from 'next/headers';

export async function admin(path: string, init: RequestInit = {}) {
  const base = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
  const token = cookies().get('imota_admin_session')?.value;
  const adminKey = process.env.ADMIN_API_KEY || '';

  const res = await fetch(base + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
      // ✅ Send admin key for /admin/* guards (covers common header names)
      ...(adminKey ? { 'x-admin-key': adminKey, 'x-api-key': adminKey, 'authorization': `Bearer ${adminKey}` } : {}),
      // Also forward our login JWT cookie if the backend looks for it
      ...(token ? { Cookie: `imota_admin_session=${token}` } : {}),
    },
    cache: 'no-store',
  });

  const ct = res.headers.get('content-type') || '';
  const text = await res.text().catch(() => '');

  if (!res.ok) {
    throw new Error(`Admin API ${res.status} ${res.statusText}: ${text}`);
  }

  if (!text) return null;
  if (ct.includes('application/json')) {
    try { return JSON.parse(text); } catch { /* fall through */ }
  }
  return text; // allow CSV/text responses
}
