
import { Injectable } from '@nestjs/common';
import { redis } from '../../common/redis';
export type ConvState = { step: 'idle'|'pickup'|'dropoff'|'confirm'; pickup?: string; dropoff?: string; };
@Injectable() export class StateService {
  private r = redis();
  key(flow:string, userKey:string) { return `conv:${flow}:${userKey}`; }
  async get(flow:string, userKey:string): Promise<ConvState> { const raw = await this.r.get(this.key(flow,userKey)); if (!raw) return { step:'idle' }; try { return JSON.parse(raw); } catch { return { step:'idle' }; } }
  async set(flow:string, userKey:string, s:ConvState) { await this.r.set(this.key(flow,userKey), JSON.stringify(s), 'EX', 60*30); }
  async reset(flow:string, userKey:string) { await this.r.del(this.key(flow,userKey)); }
}
