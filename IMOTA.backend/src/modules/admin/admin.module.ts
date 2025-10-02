import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';         // ✅ use the unified Prisma module

import { AdminBroadcastsController } from './broadcast.admin.controller';
import { AdminNotificationsMetricsController } from './notifications.metrics.controller';
import { AdminNotificationsController } from './notifications.admin.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminPaymentsController } from './payments.admin.controller';
import { PaymentsModule } from '../payments/payments.module';
import { AdminPricingController } from './pricing.admin.controller';
import { AdminPayoutsController } from './payouts.admin.controller';
import { AdminNotificationsFailuresController } from './notifications.failures.controller';
import { AdminWhoAmIController } from './whoami.admin.controller';
import { AdminDashboardController } from './dashboard.admin.controller';

// If these guards are not global APP_GUARDs, list them here:
import { AdminKeyGuard } from '../../common/admin-key.guard';
import { RolesGuard } from '../../common/roles';

@Module({
  imports: [
    NotificationsModule,
    PaymentsModule,
    PrismaModule,                                           // ✅ gives access to PrismaService
  ],
  controllers: [
    AdminBroadcastsController,
    AdminNotificationsFailuresController,
    AdminNotificationsMetricsController,
    AdminNotificationsController,
    AdminPricingController,
    AdminPayoutsController,
    AdminWhoAmIController,
    AdminPaymentsController,
    AdminDashboardController,
  ],
  providers: [
    AdminKeyGuard,
    RolesGuard,
    // ❌ DO NOT provide PrismaService directly here; it’s exported by PrismaModule
  ],
})
export class AdminModule {}
