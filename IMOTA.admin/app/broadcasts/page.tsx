'use client'
import React from 'react'
import { useRole } from '../hooks/useRole'   // <-- add this
import { createBroadcast, listBroadcasts } from './actions'

export default function BroadcastsPage(){
  const [rows,setRows]=React.useState<any[]>([])
  const role = useRole();
  const canEdit = role === 'superadmin';


  React.useEffect(()=>{(async()=>setRows(await listBroadcasts(200)))()},[])
  async function refresh(){ setRows(await listBroadcasts(200)) }
  return <div className="grid gap-4">
    <div className="card p-4">
      <h2>Create Broadcast</h2>
      <form action={async(fd:FormData)=>{await createBroadcast({},fd); await refresh()}} className="grid gap-2 grid-cols-6">
        <select name="channel" className="input">
          <option>EMAIL</option><option>SMS</option><option>PUSH</option>
        </select>
        <input name="segment" className="input" defaultValue="ALL_USERS" />
        <input name="title" className="input col-span-2" placeholder="Title" />
        <input name="message" className="input col-span-3" placeholder="Message" />
        <button className="btn col-span-1" type="submit" disabled={!canEdit}>Send</button>
      </form>
    </div>
    <div className="card p-4">
      <h2>Recent Broadcasts</h2>
      <table className="table"><thead><tr><th>Date</th><th>Channel</th><th>Segment</th><th>Title</th><th>Message</th></tr></thead>
        <tbody>{rows.map((r:any)=>(
          <tr key={r.id}>
            <td>{new Date(r.createdAt).toLocaleString()}</td>
            <td>{r.channel}</td>
            <td>{r.segment}</td>
            <td>{r.title}</td>
            <td>{r.message}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </div>
}
