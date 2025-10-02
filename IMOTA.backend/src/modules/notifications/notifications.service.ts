import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { pushQueue, smsQueue, emailQueue } from './queues';

type Channel = 'PUSH' | 'SMS' | 'EMAIL';
type Segment = 'ALL_USERS' | 'ALL_DRIVERS';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Broadcast a message to a segment over a channel.
   * Returns counts of enqueued jobs; never throws for empty segments or missing tokens.
   */
  async broadcast(channel: Channel, segment: Segment, title: string, message: string) {
    // Resolve target users to a unified shape
    let users: { id: string; email: string | null; phone: string | null }[] = [];

    if (segment === 'ALL_DRIVERS') {
      // Avoid relying on a relation field name; fetch userIds then load users
      const driverRefs = await this.prisma.driver.findMany({
        select: { userId: true },
      });
      const userIds = driverRefs.map((d) => d.userId).filter(Boolean) as string[];
      if (userIds.length) {
        users = await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, phone: true },
        });
      }
    } else {
      users = await this.prisma.user.findMany({
        select: { id: true, email: true, phone: true },
      });
    }

    const result = { enqueued: 0, details: { tokens: 0, phones: 0, emails: 0 } };

    if (!users.length) {
      this.logger.warn(`broadcast(${channel}, ${segment}) -> no users found`);
      return result;
    }

    if (channel === 'PUSH') {
      for (const u of users) {
        const tokens = await this.prisma.deviceToken.findMany({ where: { userId: u.id } });
        for (const t of tokens) {
          try {
            await pushQueue.add('push', {
              token: t.token,
              platform: t.platform,
              title,
              body: message,
            });
            result.enqueued += 1;
            result.details.tokens += 1;
          } catch (e: any) {
            this.logger.warn(`push enqueue failed for user ${u.id}: ${e?.message || e}`);
          }
        }
      }
      return result;
    }

    if (channel === 'SMS') {
      for (const u of users) {
        if (!u.phone) continue;
        try {
          await smsQueue.add('sms', { to: u.phone, body: message });
          result.enqueued += 1;
          result.details.phones += 1;
        } catch (e: any) {
          this.logger.warn(`sms enqueue failed for ${u.phone}: ${e?.message || e}`);
        }
      }
      return result;
    }

    if (channel === 'EMAIL') {
      for (const u of users) {
        if (!u.email) continue;
        try {
          await emailQueue.add('email', { to: u.email, subject: title, text: message });
          result.enqueued += 1;
          result.details.emails += 1;
        } catch (e: any) {
          this.logger.warn(`email enqueue failed for ${u.email}: ${e?.message || e}`);
        }
      }
      return result;
    }

    // Unknown channel — just return zeros
    this.logger.warn(`broadcast(): unknown channel ${channel}`);
    return result;
  }

  /**
   * Backward-compatible helper used by RideNotifierService.
   */
  async sendPush(userId: string, title: string, message: string) {
    return this.sendPushToUser(userId, title, message);
  }

  async sendPushToUser(userId: string, title: string, message: string) {
    const tokens = await this.prisma.deviceToken.findMany({ where: { userId } });
    for (const t of tokens) {
      try {
        await pushQueue.add('push', {
          token: t.token,
          platform: t.platform,
          title,
          body: message,
        });
      } catch (e: any) {
        this.logger.warn(
          `sendPushToUser enqueue failed for token ${t.token}: ${e?.message || e}`,
        );
      }
    }
  }
}

