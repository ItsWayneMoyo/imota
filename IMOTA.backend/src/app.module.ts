// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';          // ← you don’t need Reflector here
import { JwtModule } from '@nestjs/jwt';
import { AdminGuard } from './guards/admin.guard';

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
import { PricingModule } from './modules/pricing/pricing.module';

@Module({
  imports: [
    // Make JwtService available to the guard
    JwtModule.register({ global: true, secret: process.env.JWT_SECRET || 'change-me' }),

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

    // (Uncomment later when those modules exist)
    // ExportsModule,
    // KycModule,
    // PayoutsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AdminGuard },   // Guard only enforces on /admin/* paths
  ],
})
export class AppModule {}
