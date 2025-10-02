
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from '../../common/admin-key.guard';
import { queueStats } from '../notifications/queues';

@UseGuards(AdminKeyGuard)
@Controller('admin/notifications')
export class AdminNotificationsMetricsController {
  @Get('metrics') async metrics() { return queueStats(); }
}
