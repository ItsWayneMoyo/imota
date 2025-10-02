import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  // add stub methods the admin controller expects, for now no-ops:
  async listIntents(opts?: any) { return []; }
  async listPayments(opts?: any) { return []; }
  async refund(paymentId: string, amountCents?: number) { return { ok: true }; }
  async void(paymentId: string) { return { ok: true }; }
  async exportCSV(range?: any) { return 'id,amount,status\n'; }
  async reconcile() { return { ok: true }; }
}

