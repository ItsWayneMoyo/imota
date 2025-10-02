'use server'
import { admin } from '../../lib/backend'
export async function listBroadcasts(limit=200){ return admin('/admin/broadcasts?limit='+limit, { method:'GET' }) }
export async function createBroadcast(_:any, fd:FormData){
  const channel = String(fd.get('channel')||'EMAIL').toUpperCase() as 'EMAIL'|'SMS'|'PUSH'
  const segment = String(fd.get('segment')||'ALL_USERS')
  const title = String(fd.get('title')||'')
  const message = String(fd.get('message')||'')
  return admin('/admin/broadcasts', { method:'POST', body: JSON.stringify({ channel, segment, title, message }) })
}
