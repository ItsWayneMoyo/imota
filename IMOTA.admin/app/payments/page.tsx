'use client'
import React from 'react'
import Papa from 'papaparse'
import { listIntents, listRefunds, listReconRuns, listReconRows, issueRefund, voidIntent, reconcile } from './actions'

export default function PaymentsPage(){
  const [intents,setIntents]=React.useState<any[]>([])
  const [refunds,setRefunds]=React.useState<any[]>([])
  const [runs,setRuns]=React.useState<any[]>([])
  const [rows,setRows]=React.useState<any[]>([])
  const [selectedRun,setSelectedRun]=React.useState<string>('')
  const [csvPreview,setCsvPreview]=React.useState<any[]>([])
  const [csvProvider,setCsvProvider]=React.useState<string>('CARD')
  const [status,setStatus]=React.useState<string>('')

  React.useEffect(()=>{(async()=>{
    setIntents(await listIntents(100))
    setRefunds(await listRefunds(100))
    setRuns(await listReconRuns(50))
  })()},[])

  async function onSelectRun(id:string){
    setSelectedRun(id)
    if(id){ setRows(await listReconRows(id)) } else { setRows([]) }
  }

  function parseCsv(file: File){
    Papa.parse(file, { header:true, skipEmptyLines:true, complete:(res)=>{
      const out = (res.data as any[]).map((r:any)=>({
        providerRef: r.providerRef || r.reference || r.txn || r.txnRef || '',
        amount: parseInt(String(r.amount||r.Amount||0),10),
        status: String(r.status||r.Status||'').toUpperCase(),
        currency: r.currency || r.Currency || undefined
      }))
      setCsvPreview(out)
    }})
  }

  async function submitRecon(){
    setStatus('Uploading reconciliation...')
    try {
      await reconcile({}, { provider: csvProvider, rows: csvPreview })
      setStatus('Reconciliation uploaded ✅')
      setRuns(await listReconRuns(50))
      setCsvPreview([])
    } catch(e:any){ setStatus('Failed: '+e.message) }
  }

  return <div style={{display:'grid', gap:16}}>
    <div className="card">
      <h2>Refunds & Voids</h2>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        <form action={issueRefund} className="card" style={{padding:12}}>
          <h3>Issue Refund (supports partial)</h3>
          <input name="intentId" className="input" placeholder="PaymentIntent ID" required />
          <input name="amount" type="number" className="input" placeholder="Amount (cents)" required />
          <input name="reason" className="input" placeholder="Reason (optional)" />
          <button className="btn" type="submit">Refund</button>
        </form>
        <form action={voidIntent} className="card" style={{padding:12}}>
          <h3>Void Authorisation (Card, pre-capture)</h3>
          <input name="intentId" className="input" placeholder="PaymentIntent ID" required />
          <button className="btn" type="submit">Void</button>
        </form>
      </div>
    </div>

    <div className="card">
      <h2>Reconciliation Upload</h2>
      <div style={{display:'flex', gap:12, alignItems:'center'}}>
        <select value={csvProvider} onChange={e=>setCsvProvider(e.target.value)} className="input" style={{maxWidth:220}}>
          <option value="CARD">CARD</option>
          <option value="ECOCASH">ECOCASH</option>
        </select>
        <input type="file" accept=".csv" onChange={e=>{const f=e.target.files?.[0]; if(f) parseCsv(f!)}} />
        <button className="btn" onClick={submitRecon} disabled={!csvPreview.length}>Upload CSV</button>
        <span>{status}</span>
      </div>
      {csvPreview.length? <div style={{marginTop:12}}>
        <b>Preview ({csvPreview.length} rows)</b>
        <pre style={{maxHeight:200,overflow:'auto'}}>{JSON.stringify(csvPreview.slice(0,50),null,2)}</pre>
      </div> : null}
    </div>

    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
      <div className="card">
        <h2>Recent PaymentIntents</h2>
        <table className="table"><thead><tr><th>Created</th><th>ID</th><th>Ride</th><th>Method</th><th>Amt</th><th>Status</th><th>ProviderRef</th></tr></thead>
          <tbody>{intents.map((i:any)=>(<tr key={i.id}>
            <td>{new Date(i.createdAt).toLocaleString()}</td>
            <td>{i.id.slice(0,8)}</td>
            <td>{i.rideId.slice(0,8)}</td>
            <td>{i.method}</td>
            <td>{i.amount}</td>
            <td>{i.status}</td>
            <td style={{fontSize:12}}>{i.providerRef}</td>
          </tr>))}</tbody>
        </table>
      </div>
      <div className="card">
        <h2>Recent Refunds</h2>
        <table className="table"><thead><tr><th>Created</th><th>ID</th><th>Intent</th><th>Amt</th><th>Status</th><th>Provider</th></tr></thead>
          <tbody>{refunds.map((r:any)=>(<tr key={r.id}>
            <td>{new Date(r.createdAt).toLocaleString()}</td>
            <td>{r.id.slice(0,8)}</td>
            <td>{r.intentId.slice(0,8)}</td>
            <td>{r.amount}</td>
            <td>{r.status}</td>
            <td>{r.provider}</td>
          </tr>))}</tbody>
        </table>
      </div>
    </div>

    <div className="card">
      <h2>Reconciliation Runs</h2>
      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        <select className="input" style={{maxWidth:360}} value={selectedRun} onChange={e=>onSelectRun(e.target.value)}>
          <option value="">-- Select run --</option>
          {runs.map((r:any)=>(<option key={r.id} value={r.id}>{new Date(r.createdAt).toLocaleString()} — {r.provider} — {r.id.slice(0,8)}</option>))}
        </select>
      </div>
      {rows.length? <div style={{marginTop:12}}>
        <table className="table"><thead><tr><th>Ref</th><th>Amt</th><th>Status</th><th>Matched</th><th>Ride</th><th>Intent</th><th>Note</th></tr></thead>
          <tbody>{rows.map((r:any)=>(<tr key={r.id}>
            <td>{r.providerRef}</td><td>{r.amount}</td><td>{r.status}</td>
            <td>{String(r.matched)}</td>
            <td>{r.rideId?.slice?.(0,8)||''}</td>
            <td>{r.intentId?.slice?.(0,8)||''}</td>
            <td>{r.note}</td>
          </tr>))}</tbody>
        </table>
      </div> : null}
    </div>
  </div>
}
