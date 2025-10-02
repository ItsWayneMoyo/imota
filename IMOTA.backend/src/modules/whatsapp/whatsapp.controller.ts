import { Controller, Post, Body, Req } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly wa: WhatsAppService) {}

  @Post('webhook')
  async inbound(@Body() body: any, @Req() req: any) {
    // This is the incoming WhatsApp message payload from provider
    const from = body.from || body.contacts?.[0]?.wa_id;
    const text = body.text?.body || body.message?.text?.body;

    return this.wa.handleIncoming(from, text);
  }
}
