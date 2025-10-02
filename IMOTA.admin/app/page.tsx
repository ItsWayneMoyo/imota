import React from 'react'
import { getSummary, getHeatmap } from './(dashboard)/actions'
import LiveTripsClient from './(dashboard)/live-trips.client'

function k(num: number){ return new Intl.NumberFormat().format(num) }
function money(cents:number){ return '$'+(cents/100).toFixed(2) }

function Sparkline({ points, height=40 }:{ points: Array<{ d: string|Date, v: number }>, height?:number }){
  if(!points?.length) return <div style={{height}} />
  const xs = points.map((_,i)=>i)
  const ys = points.map(p=>p.v)
  const min = Math.min(...ys, 0), max = Math.max(...ys, 1)
  const range = max - min || 1
  const w = Math.max(120, points.length*6)
  const coords = points.map((p,i)=>{
    const x = (i/(points.length-1))*w
    const y = height - ((p.v - min)/range)*height
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={height}>
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={coords} />
    </svg>
  )
}

export default async function DashboardPage(){
  const [summary, heat] = await Promise.all([getSummary(), getHeatmap(7)])

  const tripsSeries = (summary.trends.tripsByDay as Array<{ d:string; trips:number|bigint }>).map(r=>({ d: r.d, v: Number(r.trips) }))
  const revenueSeries = (summary.trends.revenueByDay as Array<{ d:string; cents:number|bigint }>).map(r=>({ d: r.d, v: Number(r.cents)/100 }))

  return (
    <div className="grid gap-4">
      {/* KPIs */}
      <div className="grid gap-3" style={{gridTemplateColumns:'repeat(6,minmax(0,1fr))'}}>
        <Kpi title="Users" value={k(summary.totals.users)} />
        <Kpi title="Drivers" value={k(summary.totals.drivers)} />
        <Kpi title="Trips (completed)" value={k(summary.totals.completedTrips)} sub={`Today: ${k(summary.totals.completedToday)}`} />
        <Kpi title="Revenue" value={money(summary.totals.revenueCents)} sub={`Refunds: ${money(summary.totals.refundsCents)}`} />
        <Kpi title="Payouts (settled)" value={money(summary.totals.payoutsCents)} />
        <Kpi title="Live" value={`${k(summary.totals.liveTrips)} trips`} sub={`${k(summary.totals.activeDrivers)} active drivers`} />
      </div>

      {/* Trends */}
      <div className="grid gap-4" style={{gridTemplateColumns:'1fr 1fr'}}>
        <div className="card p-4">
          <h2 className="mb-2">Trips — last 30 days</h2>
          <Sparkline points={tripsSeries} />
        </div>
        <div className="card p-4">
          <h2 className="mb-2">Revenue — last 30 days</h2>
          <Sparkline points={revenueSeries} />
        </div>
      </div>

      {/* Heat “bins” */}
      <div className="card p-4">
        <h2 className="mb-2">Pickup heat (bins, 7 days)</h2>
        <div className="grid gap-2" style={{gridTemplateColumns:'repeat(2,minmax(0,1fr))'}}>
          {heat.bins.slice(0, 20).map((b:any, idx:number)=>(
            <div key={idx} className="flex items-center gap-3">
              <div className="text-xs w-40">{b.lat.toFixed(2)},{b.lng.toFixed(2)}</div>
              <div className="flex-1 bg-gray-200 h-2 rounded">
                <div className="bg-gray-800 h-2 rounded" style={{width: `${Math.min(100, (b.count / Math.max(1, heat.bins[0].count)) * 100)}%`}} />
              </div>
              <div className="w-10 text-right text-xs">{b.count}</div>
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-2">Tip: swap this for Mapbox/MapLibre heatmap when you’re ready.</div>
      </div>

      {/* Live trips (client, polls every 10s) */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <h2>Live trips</h2>
          <span className="text-xs text-gray-500">auto-refreshing</span>
        </div>
        <LiveTripsClient />
      </div>
    </div>
  )
}

function Kpi({ title, value, sub }:{ title:string; value:string; sub?:string }){
  return (
    <div className="card p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub ? <div className="text-xs text-gray-500 mt-1">{sub}</div> : null}
    </div>
  )
}
