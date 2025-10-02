'use server'
import { admin } from '../../lib/backend'

export async function listVersions(){ return admin('/admin/pricing/versions',{ method:'GET' }) }
export async function createVersion(_:any, fd:FormData){
  const body = {
    name: String(fd.get('name')||''),
    base: Number(fd.get('base')||0),
    perKm: Number(fd.get('perKm')||0),
    perMin: Number(fd.get('perMin')||0),
    minimum: Number(fd.get('minimum')||0),
    surge: Number(fd.get('surge')||1.0),
    startAt: String(fd.get('startAt')||'')
  }
  return admin('/admin/pricing/versions',{ method:'POST', body: JSON.stringify(body) })
}
export async function updateVersion(_:any, fd:FormData){
  const id = String(fd.get('id')||'')
  const body = {
    name: String(fd.get('name')||''),
    base: Number(fd.get('base')||0),
    perKm: Number(fd.get('perKm')||0),
    perMin: Number(fd.get('perMin')||0),
    minimum: Number(fd.get('minimum')||0),
    surge: Number(fd.get('surge')||1.0),
    startAt: String(fd.get('startAt')||''),
    active: String(fd.get('active')||'false')==='true'
  }
  return admin('/admin/pricing/versions/'+id, { method:'PUT', body: JSON.stringify(body) })
}
export async function activateVersion(_:any, fd:FormData){
  const id = String(fd.get('id')||'')
  return admin('/admin/pricing/versions/'+id+'/activate', { method:'POST', body: '{}' })
}
export async function deleteVersion(_:any, fd:FormData){
  const id = String(fd.get('id')||'')
  return admin('/admin/pricing/versions/'+id, { method:'DELETE' })
}
export async function setSurge(_:any, fd:FormData){
  const surge = Number(fd.get('surge')||1.0)
  return admin('/admin/pricing/surge', { method:'POST', body: JSON.stringify({ surge }) })
}
export async function getActive(){ return admin('/admin/pricing/active',{ method:'GET' }) }
