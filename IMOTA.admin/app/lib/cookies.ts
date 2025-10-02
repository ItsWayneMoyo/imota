'use server';
import { cookies } from 'next/headers';

export async function admin(path: string, init: RequestInit = {}) {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL!;
  const token = cookies().get('imota_admin_session')?.value;

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
      // Forward the admin session to the backend (if the backend checks it)
      ...(token ? { Cookie: `imota_admin_session=${token}` } : {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Admin API ${res.status} ${res.statusText}: ${text}`);
  }
  // Always return JSON
  return res.json().catch(() => ({}));
}
