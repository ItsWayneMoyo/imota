
import { Module } from '@nestjs/common';
import { RidesModule } from './modules/rides/rides.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { GeocodeModule } from './modules/geocode/geocode.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DevicesModule } from './modules/devices/devices.module';
@Module({ imports:[RidesModule, DispatchModule, ChannelsModule, DevicesModule, GeocodeModule, RealtimeModule, NotificationsModule, PaymentsModule, AdminModule] })
export class AppModule {}
