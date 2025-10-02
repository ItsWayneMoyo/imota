'use server'
import { admin } from './backend'

export async function getAdminRole(): Promise<'superadmin'|'viewer'> {
  try {
    const res = await admin('/admin/whoami', { method:'GET' })
    return (res?.role === 'viewer') ? 'viewer' : 'superadmin'
  } catch {
    return 'superadmin' // fallback if your key is legacy single-key
  }
}
