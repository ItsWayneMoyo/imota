import { Body, Controller, Get, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { AdminKeyGuard } from '../../common/admin-key.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { listDLQ, retryDLQ, purgeDLQ, queueStats } from '../notifications/queues';

type QueueName = 'push' | 'sms' | 'email';

@UseGuards(AdminKeyGuard)
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private prisma: PrismaService) {}

  /**
   * Queue metrics (counts etc.)
   * GET /admin/notifications/metrics
   */
  @Get('metrics')
  async metrics() {
    return queueStats();
  }

  /**
   * Logs with filters + lightweight pagination
   * GET /admin/notifications/logs?channel=&status=&search=&since=&until=&limit=100
   * - search matches target OR error (case-insensitive)
   * - since/until are ISO datetimes
   */
  @Get('logs')
  async logs(
    @Query('channel') channel?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('since') since?: string,
    @Query('until') until?: string,
    @Query('limit') limit = '100'
  ) {
    const where: any = {};
    if (channel) where.channel = channel;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { target: { contains: search, mode: 'insensitive' } },
        { error:  { contains: search, mode: 'insensitive' } },
      ];
    }
    if (since || until) {
      where.createdAt = {
        ...(since ? { gte: new Date(since) } : {}),
        ...(until ? { lte: new Date(until) } : {}),
      };
    }

    const take = Math.min(parseInt(String(limit) || '100', 10), 500);
    return this.prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  /**
   * Failures (convenience alias for logs?status=FAILED)
   * GET /admin/notifications/failures?limit=100&channel=
   */
  @Get('failures')
  async failures(
    @Query('limit') limit = '100',
    @Query('channel') channel?: string
  ) {
    const where: any = { status: 'FAILED' };
    if (channel) where.channel = channel;

    const take = Math.min(parseInt(String(limit) || '100', 10), 500);
    return this.prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  /**
   * DLQ list / retry / purge (per channel queue)
   * GET    /admin/notifications/dlq?queue=push&limit=50
   * POST   /admin/notifications/dlq/retry { queue, jobId }   // require jobId
   * POST   /admin/notifications/dlq/purge { queue, jobId }   // require jobId
   */
  @Get('dlq')
  async dlqList(
    @Query('queue') queue: QueueName = 'push',
    @Query('limit') limit = '50'
  ) {
    return listDLQ(queue, parseInt(String(limit), 10));
  }

  @Post('dlq/retry')
  async dlqRetry(@Body() body: any) {
    const { queue, jobId } = body as { queue: QueueName; jobId?: string };
    if (!jobId) {
      throw new BadRequestException('jobId is required to retry a DLQ job');
    }
    return retryDLQ(queue, jobId);
  }

  @Post('dlq/purge')
  async dlqPurge(@Body() body: any) {
    const { queue, jobId } = body as { queue: QueueName; jobId?: string };
    if (!jobId) {
      throw new BadRequestException('jobId is required to purge a DLQ job');
    }
    return purgeDLQ(queue, jobId);
  }
}

