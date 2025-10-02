import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin/pricing')
export class PricingController {
  constructor(private prisma: PrismaService) {}

  // List all versions (newest first)
  @Get('versions')
  async listVersions() {
    return this.prisma.pricingVersion.findMany({
      orderBy: [{ startAt: 'desc' }, { id: 'desc' }],
    });
  }

  // Create version
  @Post('versions')
  async createVersion(
    @Body()
    body: {
      name: string;
      base: number;
      perKm: number;
      perMin: number;
      minimum: number;
      surge?: number;
      startAt?: string;
    },
  ) {
    const startAt = body.startAt ? new Date(body.startAt) : new Date();
    return this.prisma.pricingVersion.create({
      data: {
        name: body.name,
        base: Number(body.base),
        perKm: Number(body.perKm),
        perMin: Number(body.perMin),
        minimum: Number(body.minimum),
        surge: Number(body.surge ?? 1.0),
        startAt,
        active: false,
      },
    });
  }

  // Update version
  @Put('versions/:id')
  async updateVersion(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      base: number;
      perKm: number;
      perMin: number;
      minimum: number;
      surge: number;
      startAt: string;
      active: boolean;
    }>,
  ) {
    const data: any = { ...body };
    if (data.base != null) data.base = Number(data.base);
    if (data.perKm != null) data.perKm = Number(data.perKm);
    if (data.perMin != null) data.perMin = Number(data.perMin);
    if (data.minimum != null) data.minimum = Number(data.minimum);
    if (data.surge != null) data.surge = Number(data.surge);
    if (data.startAt) data.startAt = new Date(data.startAt);
    return this.prisma.pricingVersion.update({ where: { id }, data });
  }

  // Delete version (block deleting active)
  @Delete('versions/:id')
  async deleteVersion(@Param('id') id: string) {
    const v = await this.prisma.pricingVersion.findUnique({ where: { id } });
    if (!v) return { ok: true }; // already gone
    if (v.active) {
      return { ok: false, error: 'Cannot delete the active version' };
    }
    await this.prisma.pricingVersion.delete({ where: { id } });
    return { ok: true };
  }

  // Activate a version
  @Post('versions/:id/activate')
  async activate(@Param('id') id: string) {
    await this.prisma.pricingVersion.updateMany({ data: { active: false }, where: { active: true } });
    const v = await this.prisma.pricingVersion.update({ where: { id }, data: { active: true } });
    return { ok: true, version: v };
  }

  // Get active
  @Get('active')
  async active() {
    const v = await this.prisma.pricingVersion.findFirst({
      where: { active: true },
      orderBy: { startAt: 'desc' },
    });
    // ✅ Always send JSON, even when nothing is active
    return { active: v };
  }

  // Update surge (on active version)
  @Post('surge')
  async setSurge(@Body() body: { surge: number }) {
    const active = await this.prisma.pricingVersion.findFirst({ where: { active: true } });
    if (!active) return { ok: false, error: 'No active pricing version' };
    const v = await this.prisma.pricingVersion.update({
      where: { id: active.id },
      data: { surge: Number(body.surge ?? 1.0) },
    });
    return { ok: true, version: v };
  }
}
