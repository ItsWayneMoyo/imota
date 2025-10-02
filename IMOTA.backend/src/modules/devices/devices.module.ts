import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [DevicesController],
  providers: [PrismaService],
})
export class DevicesModule {}
