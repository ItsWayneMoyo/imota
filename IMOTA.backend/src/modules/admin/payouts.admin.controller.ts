import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from '../../common/admin-key.guard';
import { PrismaService } from '../../prisma.service';
import { Roles, RolesGuard } from '../../common/roles';

class ApproveDto { note?: string }
class RejectDto { reason?: string }
class SettleDto { providerRef?: string }

@UseGuards(AdminKeyGuard, RolesGuard)
@Controller('admin/payouts')
export class AdminPayoutsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('limit') limit = '200'
  ) {
    const take = Math.min(parseInt(String(limit)||'200',10), 500);
    return this.prisma.payout.findMany({
      where: status ? { status } as any : undefined,
      orderBy: { initiatedAt: 'desc' },
      take
    });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.payout.findUnique({ where: { id } });
  }

  @Post(':id/approve') @Roles('superadmin')
  async approve(@Param('id') id: string, @Body() dto: ApproveDto) {
    // flip to APPROVED; provider integration job can pick this up (out of scope here)
    return this.prisma.payout.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date(), providerRef: undefined }
    });
  }

  @Post(':id/reject') @Roles('superadmin')
  async reject(@Param('id') id: string, @Body() dto: RejectDto) {
    return this.prisma.payout.update({
      where: { id },
      data: { status: 'REJECTED', note: dto.reason?.slice(0, 500) }
    } as any);
  }

  @Post(':id/settle') @Roles('superadmin')
  async settle(@Param('id') id: string, @Body() dto: SettleDto) {
    return this.prisma.payout.update({
      where: { id },
      data: { status: 'SETTLED', settledAt: new Date(), providerRef: dto.providerRef }
    });
  }
}
