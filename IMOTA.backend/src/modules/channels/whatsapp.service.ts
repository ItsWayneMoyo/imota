
import { Injectable } from '@nestjs/common';
@Injectable() export class WhatsAppService {
  async send(msisdn:string, text:string) {
    const token = process.env.WHATSAPP_BEARER || ''; const phoneId = process.env.WHATSAPP_PHONE_ID || '';
    if (!token || !phoneId) return false;
    await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, { method:'POST', headers:{ 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify({ messaging_product:'whatsapp', to: msisdn, text:{ body: text } }) });
    return true;
  }
}
