import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  BadRequestException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { AdminKeyGuard } from '../../common/admin-key.guard';
import { PrismaService } from '../../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Roles, RolesGuard } from '../../common/roles';

type Channel = 'EMAIL' | 'SMS' | 'PUSH';

class BroadcastDto {
  @IsIn(['EMAIL', 'SMS', 'PUSH'])
  channel!: Channel;

  @IsString()
  segment!: string; // e.g. 'ALL_USERS' | 'ALL_DRIVERS'

  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsOptional()
  dryRun?: boolean;
}

@UseGuards(AdminKeyGuard, RolesGuard)
@Controller('admin/broadcasts')
export class AdminBroadcastsController {
  constructor(
    private prisma: PrismaService,
    private notif: NotificationsService,
  ) {}

  @Get()
  async list(@Query('limit') limit = '100') {
    const take = Math.min(parseInt(String(limit) || '100', 10), 500);
    return this.prisma.broadcast.findMany({
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  @Roles('superadmin')
  // Route-level pipe to ensure the JSON body is NOT stripped even if decorators were missed,
  // and to coerce types. You can delete this if your global pipe already has transform+whitelist and
  // you want stripping on all routes.
  @UsePipes(new ValidationPipe({ transform: true, whitelist: false }))
  async create(@Body() dto: BroadcastDto) {
    if (!dto.title || !dto.message) {
      throw new BadRequestException('title and message are required');
    }

    const saved = await this.prisma.broadcast.create({
      data: {
        channel: dto.channel,
        segment: dto.segment,
        title: dto.title,
        message: dto.message,
      } as any,
    });

    let result: any = { enqueued: 0, details: {} };
    if (!dto.dryRun) {
      try {
        result = await this.notif.broadcast(
          dto.channel,
          dto.segment as any,
          dto.title,
          dto.message,
        );
      } catch (err: any) {
        await this.prisma.broadcast.update({
          where: { id: saved.id },
          data: { error: (err?.message || String(err)).slice(0, 500) } as any,
        });
        return { saved, ok: false, error: err?.message || String(err) };
      }
    }

    return { saved, ok: true, result };
  }
}
