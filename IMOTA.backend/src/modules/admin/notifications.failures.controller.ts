import { Controller, Get } from '@nestjs/common';

@Controller('admin/notifications/failures')
export class AdminNotificationsFailuresController {
  @Get()
  list() {
    // TODO: wire DLQ listing later
    return { items: [] };
  }
}
