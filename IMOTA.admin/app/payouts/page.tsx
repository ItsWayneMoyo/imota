'use client'
import React from 'react'
import { listPayouts, approvePayout, rejectPayout, settlePayout } from './actions'
import { useRole } from '../hooks/useRole'

export default function PayoutsPage(){
  const [status,setStatus]=React.useState<string>('REQUESTED')
  const [rows,setRows]=React.useState<any[]>([])
  const [msg,setMsg]=React.useState<string>('')

  const role = useRole()
  const canEdit = role === 'superadmin'

  React.useEffect(()=>{(async()=>{
    setRows(await listPayouts(status, 200))
  })()},[status])

  async function refresh(){ setRows(await listPayouts(status,200)) }

  return <div className="grid gap-4">
    <div className="card p-4">
      <h2>Payouts</h2>
      <div className="flex gap-2 items-center">
        <select className="input" value={status} onChange={e=>setStatus(e.target.value)}>
          <option>REQUESTED</option>
          <option>APPROVED</option>
          <option>SETTLED</option>
          <option>REJECTED</option>
        </select>
        <button className="btn" onClick={refresh}>Refresh</button>
        <span>{msg}</span>
      </div>
      <table className="table mt-3">
        <thead><tr><th>Date</th><th>ID</th><th>Driver</th><th>Amount</th><th>Status</th><th>ProviderRef</th><th>Actions</th></tr></thead>
        <tbody>
        {rows.map((r:any)=>(
          <tr key={r.id}>
            <td>{new Date(r.initiatedAt).toLocaleString()}</td>
            <td>{r.id.slice(0,8)}</td>
            <td>{r.driverId?.slice?.(0,8)}</td>
            <td>{r.amount} {r.currency}</td>
            <td>{r.status}</td>
            <td>{r.providerRef||''}</td>
            <td className="flex gap-2">
              {r.status==='REQUESTED' && <>
                <form action={async (fd:FormData)=>{fd.set('id', r.id); await approvePayout({},fd); setMsg('Approved'); refresh()}}>
                  <input type="hidden" name="id" defaultValue={r.id} />
                  <button className="btn" type="submit" disabled={!canEdit}>Approve</button>
                </form>
                <form action={async (fd:FormData)=>{fd.set('id', r.id); await rejectPayout({},fd); setMsg('Rejected'); refresh()}}>
                  <input type="hidden" name="id" defaultValue={r.id} />
                  <input className="input" name="reason" placeholder="Reason" />
                  <button className="btn" type="submit" disabled={!canEdit}>Reject</button>
                </form>
              </>}
              {r.status==='APPROVED' && <>
                <form action={async (fd:FormData)=>{fd.set('id', r.id); await settlePayout({},fd); setMsg('Settled'); refresh()}}>
                  <input type="hidden" name="id" defaultValue={r.id} />
                  <input className="input" name="providerRef" placeholder="Provider Ref" />
                  <button className="btn" type="submit" disabled={!canEdit}>Mark settled</button>
                </form>
              </>}
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  </div>
}
