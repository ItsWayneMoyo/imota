import { Body, Controller, Post, Req } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

class RegisterDeviceDto {
  token!: string;
  platform!: string;
}

@Controller('devices')
export class DevicesController {
  constructor(private prisma: PrismaService) {}

  @Post('register')
  async register(@Req() req: any, @Body() dto: RegisterDeviceDto) {
    const userId = req.user?.userId || null;

    // Upsert ensures no duplicate tokens; if token already exists, re-link it to userId
    return this.prisma.deviceToken.upsert({
      where: { token: dto.token },
      update: { userId, platform: dto.platform },
      create: { token: dto.token, userId, platform: dto.platform },
    });
  }
}

