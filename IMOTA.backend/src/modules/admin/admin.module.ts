
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
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

@Module({ imports:[
  NotificationsModule,
  PaymentsModule
],
  controllers:[
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
  providers:[PrismaService] })
export class AdminModule {}
