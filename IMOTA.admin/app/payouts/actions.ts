'use server'
import { admin } from '../../lib/backend'

export async function listPayouts(status?:string, limit=200){
  const qs = new URLSearchParams()
  if(status) qs.set('status', status)
  qs.set('limit', String(limit))
  return admin('/admin/payouts?'+qs.toString(), { method:'GET' })
}
export async function approvePayout(_:any, fd:FormData){
  const id = String(fd.get('id')||'').trim()
  return admin(`/admin/payouts/${id}/approve`, { method:'POST', body: JSON.stringify({}) })
}
export async function rejectPayout(_:any, fd:FormData){
  const id = String(fd.get('id')||'').trim()
  const reason = String(fd.get('reason')||'')
  return admin(`/admin/payouts/${id}/reject`, { method:'POST', body: JSON.stringify({ reason }) })
}
export async function settlePayout(_:any, fd:FormData){
  const id = String(fd.get('id')||'').trim()
  const providerRef = String(fd.get('providerRef')||'').trim()
  return admin(`/admin/payouts/${id}/settle`, { method:'POST', body: JSON.stringify({ providerRef }) })
}
