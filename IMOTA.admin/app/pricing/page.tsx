'use client'
import React from 'react'
import { useRole } from '../hooks/useRole'

import { listVersions, createVersion, updateVersion, activateVersion, deleteVersion, setSurge, getActive } from './actions'

export default function PricingPage(){
  const [versions,setVersions]=React.useState<any[]>([])
  const [active,setActive]=React.useState<any|null>(null)
  const [surge,setSurgeState]=React.useState<number>(1)

  const role = useRole()
  const canEdit = role === 'superadmin'

  async function refresh(){
    setVersions(await listVersions())
    const a = await getActive()
    setActive(a||null)
    setSurgeState(a?.surge ?? 1)
  }
  React.useEffect(()=>{ refresh() },[])

  return <div className="grid gap-4">
    <div className="card p-4">
      <h2>Active Pricing & Surge</h2>
      <div className="flex items-center gap-3">
        <div>Active: <b>{active? active.name : '—'}</b></div>
        <div>Surge: <input className="input" type="number" step="0.1" value={surge} onChange={e=>setSurgeState(parseFloat(e.target.value||'1'))} />
          <form action={async(fd:FormData)=>{fd.set('surge', String(surge)); await setSurge({},fd); await refresh()}} className="inline ml-2">
            <button className="btn" type="submit" disabled={!canEdit}>Update surge</button>
          </form>
        </div>
      </div>
    </div>

    <div className="card p-4">
      <h2>Create Version</h2>
      <form action={async(fd:FormData)=>{await createVersion({},fd); await refresh()}} className="grid grid-cols-7 gap-2">
        <input name="name" className="input col-span-2" placeholder="Name" required />
        <input name="base" className="input" type="number" placeholder="Base (cents)" required />
        <input name="perKm" className="input" type="number" placeholder="PerKm (cents)" required />
        <input name="perMin" className="input" type="number" placeholder="PerMin (cents)" required />
        <input name="minimum" className="input" type="number" placeholder="Minimum (cents)" required />
        <input name="surge" className="input" type="number" step="0.1" placeholder="Surge (default 1.0)" />
        <input name="startAt" className="input col-span-2" placeholder="StartAt (ISO optional)" />
        <button className="btn col-span-1" type="submit" disabled={!canEdit}>Create</button>
      </form>
    </div>

    <div className="card p-4">
      <h2>Versions</h2>
      <table className="table">
        <thead><tr><th>Start</th><th>Name</th><th>Base</th><th>perKm</th><th>perMin</th><th>Min</th><th>Surge</th><th>Active</th><th>Actions</th></tr></thead>
        <tbody>
          {versions.map(v=>(
            <tr key={v.id}>
              <td>{new Date(v.startAt).toLocaleString()}</td>
              <td>{v.name}</td>
              <td>{v.base}</td>
              <td>{v.perKm}</td>
              <td>{v.perMin}</td>
              <td>{v.minimum}</td>
              <td>{v.surge}</td>
              <td>{String(v.active)}</td>
              <td className="flex gap-2">
                <form action={async(fd:FormData)=>{fd.set('id', v.id); await activateVersion({},fd); await refresh()}}>
                  <input type="hidden" name="id" defaultValue={v.id} />
                  <button className="btn" type="submit" disabled={!canEdit ||v.active}>Activate</button>
                </form>
                <form action={async(fd:FormData)=>{fd.set('id', v.id); fd.set('name', v.name); fd.set('base', v.base); fd.set('perKm', v.perKm); fd.set('perMin', v.perMin); fd.set('minimum', v.minimum); fd.set('surge', v.surge); fd.set('startAt', v.startAt); await updateVersion({},fd); await refresh()}}>
                  <button className="btn" type="submit" disabled={!canEdit}>Save</button>
                </form>
                <form action={async(fd:FormData)=>{fd.set('id', v.id); await deleteVersion({},fd); await refresh()}}>
                  <button className="btn" type="submit" disabled={!canEdit ||v.active}>Delete</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
}
