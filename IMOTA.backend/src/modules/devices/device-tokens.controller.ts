import { Body, Controller, Post } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Controller('device-tokens')
export class DeviceTokensController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async save(@Body() body: { userId?:string; token:string; platform:'expo'|'ios'|'android' }) {
    if(!body?.token) throw new Error('token required');
    return this.prisma.deviceToken.upsert({
      where:{ token: body.token },
      update:{ platform: body.platform, userId: body.userId || undefined },
      create:{ token: body.token, platform: body.platform, userId: body.userId || undefined } as any
    });
  }
}
