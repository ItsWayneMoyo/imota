import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PaymentsService } from './payments.service';

@Module({
  providers: [PrismaService, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
