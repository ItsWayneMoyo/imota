import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

type WaState = { step: 'welcome'|'pickup'|'dropoff'|'confirm'|'collect_phone', pickup?: string, dropoff?: string, phone?: string }

@Injectable()
export class WhatsAppService {
  constructor(private prisma: PrismaService) {}

  // Main entry – called by the controller on every inbound WhatsApp message
  async handleIncoming(msisdn: string, text: string) {
    // 1) Load or create a simple state row (use your own store if you have one)
    const sessionId = `wa:${msisdn}`;
    let sess = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!sess) {
      sess = await this.prisma.session.create({ data: { id: sessionId, data: { step: 'welcome' } } });
    }
    const s = (sess.data || { step: 'welcome' }) as WaState;

    // 2) Ensure a user exists (tie to msisdn). Adjust if your user model differs.
    let user = await this.prisma.user.findFirst({ where: { phone: msisdn } });
    if (!user) {
      user = await this.prisma.user.upsert({
        where: { email: `wa_${msisdn}@imota.app` },
        update: { phone: msisdn },
        create: { email: `wa_${msisdn}@imota.app`, name: 'WhatsApp User', phone: msisdn }
      });
    }


    // 3) Step router
    switch (s.step) {
      case 'welcome':
        await this.setState(msisdn, { step: 'pickup' });
        return this.sendWa(msisdn, 'Welcome to IMOTA 🚕\nSend your pickup location.');

      case 'pickup':
        await this.setState(msisdn, { ...s, step: 'dropoff', pickup: text });
        return this.sendWa(msisdn, '✅ Pickup saved. Now send your drop-off location.');

      case 'dropoff':
        await this.setState(msisdn, { ...s, step: 'confirm', dropoff: text });
        return this.sendWa(msisdn, `Confirm ride: "${s.pickup}" → "${text}"?\nReply YES or NO.`);

      case 'confirm': {
        if (!/^\s*yes\s*$/i.test(text)) {
          await this.setState(msisdn, { step: 'pickup' });
          return this.sendWa(msisdn, '❌ Cancelled. Send a new pickup location.');
        }
        // we need an EcoCash number on the user; if missing, jump to collect_phone
        if (!user.phone) {
          await this.setState(msisdn, { ...s, step: 'collect_phone' });
          return this.sendWa(msisdn, 'What EcoCash number should we use? e.g. +2637XXXXXXXX');
        }
        // otherwise proceed (create ride, etc.)
        // await this.createRideAndDispatch(user, s);
        await this.setState(msisdn, { step: 'pickup' });
        return this.sendWa(msisdn, '✅ Ride confirmed! Searching for a driver…');
      }

      // 👇👇 ADD YOUR COLLECT_PHONE HANDLER RIGHT HERE 👇👇
      case 'collect_phone': {
        const norm = this.normalizeZw(text);
        if (!norm) {
          return this.sendWa(msisdn, 'That doesn’t look right. Please use +2637XXXXXXXX');
        }
        await this.prisma.user.update({ where: { id: user.id }, data: { phone: norm } });
        await this.sendWa(msisdn, 'Got it ✅ We’ll use that EcoCash number for payments.');
        // optionally proceed to confirm or back to pickup; here we go back to confirm
        await this.setState(msisdn, { ...s, step: 'confirm', phone: norm });
        return;
      }
      // 👆👆 END collect_phone HANDLER 👆👆

      default:
        await this.setState(msisdn, { step: 'welcome' });
        return this.sendWa(msisdn, 'Let’s start over. Send your pickup location.');
    }
  }

  // --- helpers ---------------------------------------------------------------

  private async setState(msisdn: string, data: WaState) {
    await this.prisma.session.upsert({
      where: { id: `wa:${msisdn}` },
      update: { data },
      create: { id: `wa:${msisdn}`, data }
    });
  }

  private async sendWa(to: string, message: string) {
    // TODO: call your WhatsApp provider API here
    console.log(`[WA OUT] ${to}: ${message}`);
    return { ok: true };
  }

  // 👇👇 ADD THIS AS A PRIVATE METHOD ON THE CLASS 👇👇
  private normalizeZw(input: string) {
    // accepts: +2637XXXXXXXX, 2637XXXXXXXX, 07XXXXXXXX
    let s = (input || '').replace(/\s+/g, '');
    if (/^0[7]\d{8}$/.test(s)) return '+263' + s.slice(1);
    if (/^\+2637\d{8}$/.test(s)) return s;
    if (/^2637\d{8}$/.test(s)) return '+' + s;
    return null;
  }
  // 👆👆 END NORMALIZER 👆👆
}
