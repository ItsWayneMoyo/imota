// src/app.module.ts
import { Module } from '@nestjs/common';

import { AuthModule } from './modules/auth/auth.module';
import { RidesModule } from './modules/rides/rides.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { GeocodeModule } from './modules/geocode/geocode.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DevicesModule } from './modules/devices/devices.module';

// ✅ add these if you have the files
//import { ExportsModule } from './modules/exports/exports.module';
//import { KycModule } from './modules/kyc/kyc.module';
//import { PayoutsModule } from './modules/payouts/payouts.module';

import { PricingModule } from './modules/pricing/pricing.module';

@Module({
  imports: [
    AuthModule,
    RidesModule,
    DispatchModule,
    ChannelsModule,
    GeocodeModule,
    RealtimeModule,
    NotificationsModule,
    AdminModule,
    PaymentsModule,
    DevicesModule,
    PricingModule,
    //ExportsModule,   // ✅
    //KycModule,       // ✅
    //PayoutsModule,   // ✅
  ],
})
export class AppModule {}
