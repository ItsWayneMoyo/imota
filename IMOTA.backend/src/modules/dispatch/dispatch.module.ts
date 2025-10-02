
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DriverDispatchController } from './driver.dispatch.controller';
import { RideNotifierService } from '../rides/ride-notifier.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { WhatsAppService } from '../channels/whatsapp.service';

@Module({ imports:[NotificationsModule, RealtimeModule], controllers:[DriverDispatchController], providers:[PrismaService, RideNotifierService, WhatsAppService] })
export class DispatchModule {}
