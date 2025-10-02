import { Body, Controller, Get, Param, Post, Req, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { calcFareCents } from '../../common/pricing.util';
import { RideNotifierService } from './ride-notifier.service';
import { RouteService } from '../route/route.service';
import { IsIn, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class RequestRideDto {
  @Type(() => Number) @IsNumber() pickupLat!: number;
  @Type(() => Number) @IsNumber() pickupLng!: number;
  @Type(() => Number) @IsNumber() dropoffLat!: number;
  @Type(() => Number) @IsNumber() dropoffLng!: number;
}
class EstimateDto extends RequestRideDto {}

class StatusDto {
  @IsIn(['DRIVER_ARRIVING','ARRIVED','IN_PROGRESS','COMPLETED'])
  status!: 'DRIVER_ARRIVING'|'ARRIVED'|'IN_PROGRESS'|'COMPLETED';

  @IsOptional() @Type(() => Number) @IsNumber()
  distanceKm?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  durationMin?: number;
}

class RateDto {
  @Type(() => Number) @IsNumber()
  stars!: number;

  @IsOptional()
  comment?: string;
}

@Controller('rides')
export class RidesController {
  constructor(
    private prisma: PrismaService,
    private notifier: RideNotifierService,
    private routeService: RouteService
  ) {}

  async activePricing() {
    const pv = await this.prisma.pricingVersion.findFirst({
      where:{ active:true },
      orderBy:{ startAt:'desc' }
    });
    return pv || { base:100, perKm:80, perMin:20, minimum:300, surge:1.0 } as any;
  }

  @Post('estimate')
  async estimate(@Body() dto: EstimateDto) {
    // use real routing service instead of haversine
    const route = await this.routeService.route(
      { lat:dto.pickupLat, lng:dto.pickupLng },
      { lat:dto.dropoffLat, lng:dto.dropoffLng }
    );

    const cfg = await this.activePricing();
    const fare = calcFareCents(cfg, route.distanceKm, route.durationMin);

    return {
      distanceKm: +route.distanceKm.toFixed(2),
      durationMin: +route.durationMin.toFixed(1),
      polyline: route.polyline,
      estimateCents: fare,
      currency:'USD'
    };
  }

  @Post('request')
  async request(@Req() req: any, @Body() dto: RequestRideDto) {
    const riderId = req.user?.userId || (await this.prisma.user.create({
      data: { email: `guest_${Date.now()}@imota.app` }
    })).id;

    const ride = await this.prisma.ride.create({
      data: {
        riderId,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        dropoffLat: dto.dropoffLat,
        dropoffLng: dto.dropoffLng,
        status: 'REQUESTED'
      } as any
    });

    await this.prisma.rideEvent.create({
      data: { rideId: ride.id, type:'REQUESTED', payload:{} } as any
    });

    return ride;
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id },
      include: { events: true, payment: true, RideRating: true }
    } as any);
    return ride;
  }

  @Post(':id/status')
  async setStatus(@Req() req:any, @Param('id') id:string, @Body() dto: StatusDto) {
    const ride = await this.prisma.ride.findUnique({ where: { id } });
    if (!ride) throw new BadRequestException('Ride not found');

    const allowed = ['DRIVER_ARRIVING','ARRIVED','IN_PROGRESS','COMPLETED'];
    if (!allowed.includes(dto.status)) throw new BadRequestException('Invalid status');

    let data:any = { status: dto.status as any };
    if (dto.status === 'IN_PROGRESS') data.startedAt = new Date();

    if (dto.status === 'COMPLETED') {
      const distanceKm = dto.distanceKm ?? 0;
      const durationMin = dto.durationMin ?? 0;
      const cfg = await this.activePricing();
      const amount = Math.round(calcFareCents(cfg, distanceKm, durationMin));

      data = { ...data, completedAt:new Date(), distanceKm, durationMin };

      await this.prisma.payment.upsert({
        where:{ rideId: id },
        update:{ amount, status:'PAID' },
        create:{ rideId:id, provider:'CASH', amount, status:'PAID', currency:'USD' }
      });
    }

    const updated = await this.prisma.ride.update({ where: { id }, data });

    await this.prisma.rideEvent.create({
      data: { rideId:id, type: dto.status, payload: { distanceKm: dto.distanceKm, durationMin: dto.durationMin } } as any
    });

    if (dto.status === 'DRIVER_ARRIVING') await this.notifier.onArriving(id);
    if (dto.status === 'ARRIVED') await this.notifier.onArrived(id);
    if (dto.status === 'IN_PROGRESS') await this.notifier.onInProgress(id);
    if (dto.status === 'COMPLETED') {
      const payment = await this.prisma.payment.findUnique({ where: { rideId: id } });
      await this.notifier.onCompleted(id, payment?.amount || 0);
    }

    return updated;
  }

  @Post(':id/rate')
  async rate(@Param('id') id:string, @Body() dto: RateDto) {
    const ride = await this.prisma.ride.findUnique({ where: { id } });
    if (!ride || ride.status !== 'COMPLETED')
      throw new BadRequestException('Ride not completed');

    await this.prisma.rideRating.upsert({
      where: { rideId: id },
      update: { stars: dto.stars, comment: dto.comment },
      create: { rideId: id, stars: dto.stars, comment: dto.comment }
    } as any);

    await this.prisma.rideEvent.create({
      data: { rideId: id, type:'RATED', payload:{ stars: dto.stars } } as any
    });

    return { ok: true };
  }   // closes rate method
  }     // closes RidesController class
