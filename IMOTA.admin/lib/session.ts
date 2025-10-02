
'use server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
const COOKIE='imota_admin_session'
type Session={email:string,at:number}
function sign(val:string){const secret=process.env.APP_SECRET||'dev_secret';return crypto.createHmac('sha256',secret).update(val).digest('hex')}
export async function setSession(data:Session){const payload=JSON.stringify(data);const sig=sign(payload);cookies().set(COOKIE,Buffer.from(payload).toString('base64')+'.'+sig,{httpOnly:true,sameSite:'lax',secure:true,path:'/',maxAge:60*60*8})}
export async function clearSession(){cookies().set(COOKIE,'',{httpOnly:true,sameSite:'lax',secure:true,path:'/',maxAge:0})}
export async function getSession():Promise<Session|null>{const c=cookies().get(COOKIE);if(!c?.value)return null;const[b64,sig]=c.value.split('.',2);if(!b64||!sig)return null;const payload=Buffer.from(b64,'base64').toString('utf8');if(sign(payload)!==sig)return null;try{return JSON.parse(payload)}catch{return null}}
