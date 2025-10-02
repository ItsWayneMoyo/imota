// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
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
    // Load .env into process.env everywhere
    ConfigModule.forRoot({ isGlobal: true }),

    // JWT available app-wide (used by AdminGuard + others)
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'change-me',
    }),

    // One PrismaService for the whole app
    PrismaModule,

    // Feature modules
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

    // (Uncomment when you add them)
    // ExportsModule,
    // KycModule,
    // PayoutsModule,
  ],
  providers: [
    // Global guard; your implementation should early-return unless path starts with /admin
    { provide: APP_GUARD, useClass: AdminGuard },
  ],
})
export class AppModule {}
