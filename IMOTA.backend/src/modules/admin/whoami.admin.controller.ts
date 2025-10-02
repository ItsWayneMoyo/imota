import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from '../../common/admin-key.guard';

@UseGuards(AdminKeyGuard)
@Controller('admin')
export class AdminWhoAmIController {
  @Get('whoami')
  whoami(@Req() req: any) {
    return { role: req.adminRole || 'superadmin' };
  }
}
