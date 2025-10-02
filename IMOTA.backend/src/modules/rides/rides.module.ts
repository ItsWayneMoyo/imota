import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { RidesController } from './rides.controller';
import { RideNotifierService } from './ride-notifier.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { RouteModule } from '../route/route.module';

@Module({
  imports: [
    NotificationsModule, // for push/email/SMS notifications
    RouteModule          // for real routing (distance/duration/polyline)
  ],
  controllers: [RidesController],
  providers: [
    PrismaService,
    RideNotifierService
  ],
  exports: [
    RideNotifierService
  ]
})
export class RidesModule {}
