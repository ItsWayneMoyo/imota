'use server';

import { setSessionCookie } from '../../lib/cookies';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const r = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`Login failed (${r.status})`);
  const data = await r.json();
  if (!data?.ok || !data?.token) throw new Error(data?.error || 'Invalid credentials');

  await setSessionCookie(data.token);
  redirect('/');
}
