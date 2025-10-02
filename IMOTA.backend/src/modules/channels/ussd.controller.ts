import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StateService } from './state.service';
import { GeocodeService } from '../geocode/geocode.service';
import { haversineKm } from '../../common/geo.util';
import { calcFareCents } from '../../common/pricing.util';

@Controller('webhooks/ussd')
export class UssdController {
  constructor(
    private prisma: PrismaService,
    private state: StateService,
    private geocode: GeocodeService
  ) {}

  @Post()
  @HttpCode(200)
  async handle(@Body() body: any) {
    const { sessionId, phoneNumber, text } = body;
    const userKey = phoneNumber + ':' + sessionId;
    let s: any = await this.state.get('ussd', userKey);
    const parts = (text || '').split('*').filter(Boolean);

    if (parts.length === 0 || s?.step === 'idle' || !s?.step) {
      await this.state.set('ussd', userKey, { step: 'pickup' });
      return 'CON IMOTA\nEnter pickup (e.g., Samora & 2nd)';
    }

    if (s.step === 'pickup') {
      const query = parts[parts.length - 1];
      const g = await this.geocode.forward(query, 'zw');
      if (!g) return 'CON Could not find that pickup. Try again';
      s.pickup = g.formatted;
      s.pickupGeo = g;
      s.step = 'dropoff';
      await this.state.set('ussd', userKey, s);
      return 'CON Enter drop-off';
    }

    if (s.step === 'dropoff') {
      const query = parts[parts.length - 1];
      const g = await this.geocode.forward(query, 'zw');
      if (!g) return 'CON Could not find that drop-off. Try again';

      s.dropoff = g.formatted;
      s.dropGeo = g;
      s.step = 'confirm';

      const d = haversineKm(s.pickupGeo.lat, s.pickupGeo.lng, g.lat, g.lng);
      const durationMin = (d / 30) * 60;

      const pv = await this.prisma.pricingVersion.findFirst({
        where: { active: true },
        orderBy: { startAt: 'desc' }
      });
      const cfg = pv || ({ base: 100, perKm: 80, perMin: 20, minimum: 300, surge: 1.0 } as any);
      const fare = Math.round(calcFareCents(cfg, d, durationMin));

      await this.state.set('ussd', userKey, s);
      return `CON From: ${s.pickup}\nTo: ${s.dropoff}\n~${d.toFixed(1)}km ${durationMin.toFixed(0)}min  $${(fare / 100).toFixed(2)}\n1.Yes  2.No`;
    }

    if (s.step === 'confirm') {
      const last = parts[parts.length - 1];
      if (last === '1') {
        // Ensure we have a rider
        const rider = await this.ensureGuest(phoneNumber);

        const ride = await this.prisma.ride.create({
          data: {
            riderId: rider.id,
            pickupLat: s.pickupGeo.lat,
            pickupLng: s.pickupGeo.lng,
            dropoffLat: s.dropGeo.lat,
            dropoffLng: s.dropGeo.lng,
            status: 'REQUESTED'
          } as any
        });

        await this.prisma.rideEvent.create({
          data: {
            rideId: ride.id,
            type: 'REQUESTED',
            payload: {
              channel: 'USSD',
              pickupText: s.pickup,
              dropoffText: s.dropoff,
              pickup: s.pickupGeo,
              dropoff: s.dropGeo
            }
          } as any
        });

        await this.state.reset('ussd', userKey);
        return `END Request received. Ride ID: ${ride.id.slice(0, 8)}. We'll match you with a driver.` as any;
      } else {
        await this.state.set('ussd', userKey, { step: 'pickup' } as any);
        return 'CON Restarted. Enter pickup';
      }
    }
  }

  // 👇 helper: create or return a guest user
  private async ensureGuest(msisdn: string) {
    const email = `guest_${msisdn}@imota.app`;
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { email, phone: msisdn } as any,
      });
    }
    return user;
  }
}

