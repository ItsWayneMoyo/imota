import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from '../../common/admin-key.guard';
import { PrismaService } from '../../prisma.service';
import { Roles, RolesGuard } from '../../common/roles';

class CreatePricingDto { name!:string; base!:number; perKm!:number; perMin!:number; minimum!:number; surge?:number; startAt?:string }
class UpdatePricingDto extends CreatePricingDto { active?: boolean }
class SurgeDto { surge!: number }

@UseGuards(AdminKeyGuard, RolesGuard)
@Controller('admin/pricing')
export class AdminPricingController {
  constructor(private prisma: PrismaService) {}

  @Get('versions') @Roles('superadmin')
  async versions() {
    return this.prisma.pricingVersion.findMany({ orderBy: { startAt: 'desc' } });
  }

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
        active: false
      } as any
    });
  }

  @Put('versions/:id') @Roles('superadmin')
  async update(@Param('id') id: string, @Body() dto: UpdatePricingDto) {
    return this.prisma.pricingVersion.update({
      where: { id },
      data: { ...dto, startAt: dto.startAt ? new Date(dto.startAt) : undefined } as any
    });
  }

  @Post('versions/:id/activate') @Roles('superadmin')
  async activate(@Param('id') id: string) {
    await this.prisma.pricingVersion.updateMany({ data: { active: false }, where: { active: true } });
    return this.prisma.pricingVersion.update({ where: { id }, data: { active: true } });
  }

  @Delete('versions/:id') @Roles('superadmin')
  async remove(@Param('id') id: string) {
    return this.prisma.pricingVersion.delete({ where: { id } });
  }

  // Surge quick switch (applies to the currently active version)
  @Post('surge') @Roles('superadmin')
  async setSurge(@Body() dto: SurgeDto) {
    const active = await this.prisma.pricingVersion.findFirst({ where: { active: true }, orderBy: { startAt: 'desc' } });
    if (!active) throw new Error('No active pricing version');
    return this.prisma.pricingVersion.update({ where: { id: active.id }, data: { surge: dto.surge } });
  }

  @Get('active') @Roles('superadmin')
  async active() {
    return this.prisma.pricingVersion.findFirst({ where: { active: true }, orderBy: { startAt: 'desc' } });
  }
}
