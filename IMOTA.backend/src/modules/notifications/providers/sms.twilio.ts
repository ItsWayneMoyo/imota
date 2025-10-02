
import twilio from 'twilio';
export class TwilioSmsProvider {
  private client:any; private from:string;
  constructor(cfg:{sid:string;auth:string;from:string}) { this.client = twilio(cfg.sid, cfg.auth); this.from = cfg.from; }
  async send(to:string, body:string) { try { await this.client.messages.create({ to, from:this.from, body }); return true; } catch { return false; } }
}
