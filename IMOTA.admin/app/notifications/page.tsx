'use client'
import React from 'react'
import { metrics, failures } from './actions'

export default function NotificationsPage(){
  const [m,setM]=React.useState<any>({})
  const [rows,setRows]=React.useState<any[]>([])
  React.useEffect(()=>{(async()=>{
    setM(await metrics()); setRows(await failures(100))
  })()},[])
  return <div className="grid gap-4">
    <div className="card p-4">
      <h2>Queue Metrics</h2>
      <pre className="text-sm">{JSON.stringify(m,null,2)}</pre>
    </div>
    <div className="card p-4">
      <h2>Recent Failures</h2>
      <table className="table">
        <thead><tr><th>When</th><th>Channel</th><th>Target</th><th>Status</th><th>Error</th><th>Attempts</th><th>Queue</th><th>Job</th></tr></thead>
        <tbody>{rows.map((r:any)=>(
          <tr key={r.id}>
            <td>{new Date(r.createdAt).toLocaleString()}</td>
            <td>{r.channel}</td>
            <td style={{maxWidth:240,overflow:'hidden',textOverflow:'ellipsis'}}>{r.target}</td>
            <td>{r.status}</td>
            <td style={{maxWidth:320,overflow:'hidden',textOverflow:'ellipsis'}} title={r.error}>{r.error}</td>
            <td>{r.attempts}</td>
            <td>{r.queue}</td>
            <td>{r.jobId}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </div>
}
