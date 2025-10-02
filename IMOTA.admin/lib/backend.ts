
'use server'
const API=process.env.IMOTA_API_URL||'http://localhost:3000'
const ADMIN_KEY=process.env.ADMIN_API_KEY||'supersecret'
export async function admin(path: string, init?: RequestInit){const res=await fetch(API+path,{...init,headers:{'Content-Type':'application/json','x-admin-key':ADMIN_KEY,...(init?.headers||{})},cache:'no-store'}); if(!res.ok) throw new Error(`${res.status} ${res.statusText}`); return res.json()}
export async function api(path: string, init?: RequestInit){const res=await fetch(API+path,{...init,headers:{'Content-Type':'application/json',...(init?.headers||{})},cache:'no-store'}); if(!res.ok) throw new Error(`${res.status} ${res.statusText}`); return res.json()}
