import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [PricingController],
  providers: [PrismaService],
})
export class PricingModule {}
