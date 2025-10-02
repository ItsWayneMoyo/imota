
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
export class SesEmailProvider {
  private client: SESClient; private sender: string;
  constructor(cfg:{region:string; sender:string}) { this.client = new SESClient({ region: cfg.region }); this.sender = cfg.sender; }
  async send(to:string, subject:string, body:string) {
    try { await this.client.send(new SendEmailCommand({ Source: this.sender, Destination:{ ToAddresses:[to] }, Message:{ Subject:{ Data: subject }, Body:{ Text:{ Data: body } } } })); return true; } catch { return false; }
  }
}
