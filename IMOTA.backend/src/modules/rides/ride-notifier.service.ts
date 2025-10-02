import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RideNotifierService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) {}

  async onAssigned(rideId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (ride?.riderId) {
      await this.notifications.sendPush(
        ride.riderId,
        'Driver assigned',
        'Your driver is on the way.'
      );
    }
  }

  async onArriving(rideId: string) {
    const ride = await this.prisma.ride.findUnique({ where:{ id: rideId } });
    if (ride?.riderId) {
      await this.notifications.sendPush(
        ride.riderId,
        'Your driver is arriving',
        'Please meet the driver at your pickup location'
      );
    }
  }

  async onArrived(rideId: string) {
    const ride = await this.prisma.ride.findUnique({ where:{ id: rideId } });
    if (ride?.riderId) {
      await this.notifications.sendPush(
        ride.riderId,
        'Driver has arrived',
        'Your driver is waiting at the pickup point'
      );
    }
  }

  async onInProgress(rideId: string) {
    const ride = await this.prisma.ride.findUnique({ where:{ id: rideId } });
    if (ride?.riderId) {
      await this.notifications.sendPush(
        ride.riderId,
        'Journey started',
        'Sit back and enjoy your ride!'
      );
    }
  }

  async onCompleted(rideId: string, amount: number) {
    const ride = await this.prisma.ride.findUnique({ where:{ id: rideId } });
    if (ride?.riderId) {
      await this.notifications.sendPush(
        ride.riderId,
        'Trip completed',
        `Your fare was $${(amount/100).toFixed(2)}. Thank you for riding with IMOTA.`
      );
    }
  }
}
