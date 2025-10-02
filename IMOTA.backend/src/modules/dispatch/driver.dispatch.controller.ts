
import { Body, Controller, Post, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { RideNotifierService } from '../rides/ride-notifier.service';

class ActDto { offerId!: string }

@Controller('drivers/dispatch')
export class DriverDispatchController {
  constructor(private prisma: PrismaService, private notifier: RideNotifierService) {}
  async ensureDriver(req:any) { const userId = req.user?.userId as string; const driver = await this.prisma.driver.findFirst({ where: { userId } }); if (!driver) throw new BadRequestException('Not a driver'); return driver; }

  @Post('accept')
  async accept(@Req() req:any, @Body() dto: ActDto) {
    const driver = await this.ensureDriver(req);
    const offer = await this.prisma.rideOffer.findUnique({ where: { id: dto.offerId } });
    if (!offer || offer.driverId !== driver.id) throw new BadRequestException('Invalid offer');
    if (offer.status !== 'PENDING') throw new BadRequestException('Offer not pending');
    if (offer.expiresAt < new Date()) throw new BadRequestException('Offer expired');
    const ride = await this.prisma.ride.findUnique({ where: { id: offer.rideId } }); if (!ride) throw new BadRequestException('Ride missing');
    if (ride.driverId) throw new BadRequestException('Ride already assigned');
    await this.prisma.$transaction([
      this.prisma.ride.update({ where: { id: ride.id }, data: { driverId: driver.id, status: 'DRIVER_ASSIGNED' } } as any),
      this.prisma.rideOffer.update({ where: { id: offer.id }, data: { status: 'ACCEPTED' } } as any),
      this.prisma.rideOffer.updateMany({ where: { rideId: ride.id, status: 'PENDING', id: { not: offer.id } }, data: { status: 'CANCELLED' } } as any),
      this.prisma.rideEvent.create({ data: { rideId: ride.id, type: 'DRIVER_ASSIGNED', payload: { driverId: driver.id } } } as any),
    ]);
    await this.notifier.onAssigned(ride.id);
    return { ok: true };
  }

  @Post('decline')
  async decline(@Req() req:any, @Body() dto: ActDto) {
    const driver = await this.ensureDriver(req);
    const offer = await this.prisma.rideOffer.findUnique({ where: { id: dto.offerId } });
    if (!offer || offer.driverId !== driver.id) throw new BadRequestException('Invalid offer');
    if (offer.status !== 'PENDING') throw new BadRequestException('Offer not pending');
    await this.prisma.rideOffer.update({ where: { id: offer.id }, data: { status: 'DECLINED' } } as any);
    return { ok: true };
  }
}
