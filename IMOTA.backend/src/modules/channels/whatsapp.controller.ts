
import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Post, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StateService } from './state.service';
import { GeocodeService } from '../geocode/geocode.service';
import { haversineKm } from '../../common/geo.util';
import { calcFareCents } from '../../common/pricing.util';

@Controller('webhooks/whatsapp')
export class WhatsAppController {
  constructor(private prisma: PrismaService, private state: StateService, private geocode: GeocodeService) {}

  @Get()
  verify(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string) {
    const expected = process.env.WHATSAPP_VERIFY_TOKEN || 'imota_verify';
    if (mode === 'subscribe' && token === expected) return challenge;
    throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
  }

  @Post()
  @HttpCode(200)
  async receive(@Body() body: any) {
    try {
      const changes = body?.entry?.[0]?.changes || [];
      for (const c of changes) {
        const v = c.value;
        const msg = v?.messages?.[0];
        if (!msg) continue;
        const from = msg.from;
        const text = (msg.text?.body || msg.button?.text || '').trim();
        if (!from || !text) continue;
        await this.handleText(from, text);
      }
      return { ok: true };
    } catch { return { ok: false }; }
  }

  async activePricing() {
    const pv = await this.prisma.pricingVersion.findFirst({ where: { active: true }, orderBy: { startAt: 'desc' } });
    if (!pv) return { base: 100, perKm: 80, perMin: 20, minimum: 300, surge: 1.0 };
    return pv as any;
  }

  private async handleText(phoneMsisdn: string, text: string) {
    const lower = text.toLowerCase();
    if (['cancel','stop','end','quit','reset'].includes(lower)) {
      await this.state.reset('whatsapp', phoneMsisdn);
      await this.sendWa(phoneMsisdn, 'Okay, cancelled. To request a ride, say "ride".');
      return;
    }

    let s:any = await this.state.get('whatsapp', phoneMsisdn);
    if (s.step === 'idle') {
      if (!['ride','hi','hello','start'].includes(lower)) { await this.sendWa(phoneMsisdn, 'Welcome to *IMOTA*. To request a ride, reply: "ride".'); return; }
      s = { step: 'pickup' }; await this.state.set('whatsapp', phoneMsisdn, s);
      await this.sendWa(phoneMsisdn, 'Great! 📍 Send your *pickup location* (e.g., "Samora Machel Ave & 2nd St, Harare").'); return;
    }

    if (s.step === 'pickup') {
      const g = await this.geocode.forward(text,'zw'); if (!g) { await this.sendWa(phoneMsisdn, 'Sorry, I could not find that pickup. Try another nearby landmark.'); return; }
      s.pickup = g.formatted; s.pickupGeo = g; s.step = 'dropoff'; await this.state.set('whatsapp', phoneMsisdn, s);
      await this.sendWa(phoneMsisdn, `📍 Pickup set to: *${g.formatted}*\nNow send your *drop-off location*.`); return;
    }

    if (s.step === 'dropoff') {
      const g = await this.geocode.forward(text,'zw'); if (!g) { await this.sendWa(phoneMsisdn, 'Could not find that drop-off. Try another nearby place.'); return; }
      s.dropoff = g.formatted; s.dropGeo = g; s.step = 'confirm';
      const d = haversineKm(s.pickupGeo.lat, s.pickupGeo.lng, g.lat, g.lng); const durationMin = (d/30)*60;
      const cfg = await this.activePricing(); const fare = Math.round(calcFareCents(cfg, d, durationMin));
      const lo = fare - Math.round(fare*0.1); const hi = fare + Math.round(fare*0.1);
      const gmaps = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(s.pickupGeo.lat+','+s.pickupGeo.lng)}&destination=${encodeURIComponent(g.lat+','+g.lng)}`;
      await this.state.set('whatsapp', phoneMsisdn, s);
      await this.sendWa(phoneMsisdn, `Route preview:\nFrom: *${s.pickup}*\nTo: *${s.dropoff}*\nDistance: *${d.toFixed(1)} km*\nETA: *${durationMin.toFixed(0)} min*\nEst. fare: *$${(fare/100).toFixed(2)}* (range $${(lo/100).toFixed(2)}–$${(hi/100).toFixed(2)})\nReply *YES* to confirm or *NO* to restart.\nMap: ${gmaps}`);
      return;
    }

    if (s.step === 'confirm') {
      if (['yes','y'].includes(lower)) {
        let user = await this.prisma.user.findFirst({ where: { phone: phoneMsisdn } }); if (!user) user = await this.prisma.user.create({ data: { email: `wa_${phoneMsisdn}@imota.app`, phone: phoneMsisdn, name: 'WhatsApp User', provider: 'whatsapp' } as any });
        const ride = await this.prisma.ride.create({ data: { riderId: user.id, pickupLat: s.pickupGeo.lat, pickupLng: s.pickupGeo.lng, dropoffLat: s.dropGeo.lat, dropoffLng: s.dropGeo.lng, status: 'REQUESTED' } as any });
        await this.prisma.rideEvent.create({ data: { rideId: ride.id, type: 'REQUESTED', payload: { channel:'WHATSAPP', pickupText: s.pickup, dropoffText: s.dropoff, pickup: s.pickupGeo, dropoff: s.dropGeo } } as any });
        await this.sendWa(phoneMsisdn, `🚗 Searching for drivers now! Your ride ID is *${ride.id.slice(0, 8)}*.`);
        await this.state.reset('whatsapp', phoneMsisdn); return;
      } else if (['no','n'].includes(lower)) { await this.state.set('whatsapp', phoneMsisdn, { step: 'pickup' } as any); await this.sendWa(phoneMsisdn, 'No problem. Please send your *pickup location* again.'); return; }
      else { await this.sendWa(phoneMsisdn, 'Please reply *YES* to confirm or *NO* to restart.'); return; }
    }
  }

  private async sendWa(msisdn:string, text:string) {
    const token = process.env.WHATSAPP_BEARER || ''; const phoneId = process.env.WHATSAPP_PHONE_ID || '';
    if (!token || !phoneId) return;
    await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify({ messaging_product:'whatsapp', to: msisdn, text:{ body: text } }) });
  }
}

