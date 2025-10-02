// src/modules/admin/pricing.admin.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from '../../common/admin-key.guard';
import { PrismaService } from '../../prisma/prisma.service'; // ✅ correct path
import { Roles, RolesGuard } from '../../common/roles';
import { CreatePricingDto, UpdatePricingDto, SurgeDto } from './dto/pricing.dto';

@UseGuards(AdminKeyGuard, RolesGuard)
@Controller('admin/pricing')
export class AdminPricingController {
  constructor(private prisma: PrismaService) {}

  // Reads: allow viewer or superadmin
  @Get('versions') @Roles('viewer', 'superadmin')
  async versions() {
    return this.prisma.pricingVersion.findMany({ orderBy: { startAt: 'desc' } });
  }

  @Get('active') @Roles('viewer', 'superadmin')
  async active() {
    const v = await this.prisma.pricingVersion.findFirst({
      where: { active: true },
      orderBy: { startAt: 'desc' },
    });
    // Always return an object so the client can safely JSON.parse + unwrap
    return { active: v ?? null };
  }

  // Writes: superadmin only
  @Post('versions') @Roles('superadmin')
  async create(@Body() dto: CreatePricingDto) {
    return this.prisma.pricingVersion.create({
      data: {
        name: dto.name,
        base: dto.base,
        perKm: dto.perKm,
        perMin: dto.perMin,
        minimum: dto.minimum,
        surge: dto.surge ?? 1.0,
        startAt: dto.startAt ? new Date(dto.startAt) : new Date(),
        active: false,
      },
    });
  }

  @Put('versions/:id') @Roles('superadmin')
  async update(@Param('id') id: string, @Body() dto: UpdatePricingDto) {
    return this.prisma.pricingVersion.update({
      where: { id },
      data: {
        ...(dto.name != null ? { name: dto.name } : {}),
        ...(dto.base != null ? { base: dto.base } : {}),
        ...(dto.perKm != null ? { perKm: dto.perKm } : {}),
        ...(dto.perMin != null ? { perMin: dto.perMin } : {}),
        ...(dto.minimum != null ? { minimum: dto.minimum } : {}),
        ...(dto.surge != null ? { surge: dto.surge } : {}),
        ...(dto.startAt ? { startAt: new Date(dto.startAt) } : {}),
        ...(dto.active != null ? { active: dto.active } : {}),
      },
    });
  }

  @Post('versions/:id/activate') @Roles('superadmin')
  async activate(@Param('id') id: string) {
    await this.prisma.pricingVersion.updateMany({ data: { active: false }, where: { active: true } });
    return this.prisma.pricingVersion.update({ where: { id }, data: { active: true } });
  }

  @Delete('versions/:id') @Roles('superadmin')
  async remove(@Param('id') id: string) {
    const v = await this.prisma.pricingVersion.findUnique({ where: { id } });
    if (!v) return { ok: true };
    if (v.active) return { ok: false, error: 'Cannot delete the active version' };
    await this.prisma.pricingVersion.delete({ where: { id } });
    return { ok: true };
  }

  // Surge quick switch (applies to the active version)
  @Post('surge') @Roles('superadmin')
  async setSurge(@Body() dto: SurgeDto) {
    const active = await this.prisma.pricingVersion.findFirst({
      where: { active: true },
      orderBy: { startAt: 'desc' },
    });
    if (!active) return { ok: false, error: 'No active pricing version' };
    const v = await this.prisma.pricingVersion.update({
      where: { id: active.id },
      data: { surge: dto.surge },
    });
    return { ok: true, version: v };
  }
}
