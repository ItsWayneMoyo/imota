'use client'
import React from 'react'
import { getLive } from './actions'

export default function LiveTripsClient(){
  const [rows,setRows]=React.useState<any[]>([])
  const [when,setWhen]=React.useState<string>('')

  async function refresh(){
    const data = await getLive()
    setRows(data.rides||[])
    setWhen(new Date().toLocaleTimeString())
  }

  React.useEffect(()=>{
    refresh()
    const t = setInterval(refresh, 10_000)
    return ()=>clearInterval(t)
  },[])

  if(!rows.length) return <div className="text-sm text-gray-500">No live trips at the moment.</div>

  return <>
    <div className="text-xs text-gray-500 mb-2">Last update: {when}</div>
    <div className="overflow-auto">
      <table className="table">
        <thead><tr>
          <th>Created</th><th>Ride</th><th>Status</th><th>Rider</th><th>Driver</th>
          <th>Pickup</th><th>Dropoff</th><th>Driver Loc</th>
        </tr></thead>
        <tbody>
          {rows.map((r:any)=>(
            <tr key={r.id}>
              <td>{new Date(r.createdAt).toLocaleTimeString()}</td>
              <td>{r.id.slice(0,8)}</td>
              <td>{r.status}</td>
              <td>{r.riderId.slice(0,8)}</td>
              <td>{r.driverId?.slice?.(0,8)||''}</td>
              <td>{r.pickup.lat.toFixed(3)},{r.pickup.lng.toFixed(3)}</td>
              <td>{r.dropoff.lat.toFixed(3)},{r.dropoff.lng.toFixed(3)}</td>
              <td>{r.driverLoc ? `${r.driverLoc.lat.toFixed(3)},${r.driverLoc.lng.toFixed(3)} (${r.driverLoc.speedKph||0}kph)` : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
}
