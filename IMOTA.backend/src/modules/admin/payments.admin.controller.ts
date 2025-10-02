import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from '../../common/admin-key.guard';
import { PrismaService } from '../../prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { Roles, RolesGuard } from '../../common/roles';

class RefundDto { intentId!:string; amount!:number; reason?:string }
class VoidDto { intentId!:string }
class ReconcileDto { provider!:string; rows!: Array<{ providerRef:string; amount:number; status:string; currency?:string }> }

@UseGuards(AdminKeyGuard, RolesGuard)
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private prisma: PrismaService, private payments: PaymentsService) {}

  @Get('intents')
  async intents(@Query('limit') limit='100') {
    const take = Math.min(parseInt(String(limit)||'100',10), 500);
    return this.prisma.paymentIntent.findMany({ orderBy:{ createdAt:'desc' }, take });
  }

  @Get('refunds')
  async refunds(@Query('limit') limit='100') {
    const take = Math.min(parseInt(String(limit)||'100',10), 500);
    return this.prisma.refund.findMany({ orderBy:{ createdAt:'desc' }, take });
  }

  @Get('reconcile/runs')
  async runs(@Query('limit') limit='50') {
    const take = Math.min(parseInt(String(limit)||'50',10), 200);
    return this.prisma.reconciliationRun.findMany({ orderBy:{ createdAt:'desc' }, take });
  }

  @Get('reconcile/rows')
  async rows(@Query('runId') runId: string) {
    if (!runId) return [];
    return this.prisma.reconciliationRow.findMany({ where:{ runId }, orderBy:{ id:'asc' } });
  }

  @Post('refund')
  @Roles('superadmin')
  async refund(@Body() dto: RefundDto) {
    // Most services use refund(intentId, amount?)
    return (this.payments as any).refund?.(dto.intentId, dto.amount) ?? { ok: false, error: 'Refund not implemented' };
  }

  @Post('void')
  @Roles('superadmin')
  async voidAuth(@Body() dto: VoidDto) {
    const svc: any = this.payments as any;
    if (typeof svc.voidIntent === 'function') return svc.voidIntent(dto.intentId);
    if (typeof svc.cancel === 'function') return svc.cancel(dto.intentId);
    return { ok: false, error: 'Void not implemented' };
  }

  @Post('reconcile')
  @Roles('superadmin')
  async reconcile(@Body() dto: ReconcileDto) {
    // Some implementations take 0 args; others (provider, rows)
    return (this.payments as any).reconcile?.(dto.provider, dto.rows) ?? { ok: false, error: 'Reconcile not implemented' };
  }

}
