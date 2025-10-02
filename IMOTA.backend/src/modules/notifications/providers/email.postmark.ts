
import postmark from 'postmark';
export class PostmarkEmailProvider {
  private client:any; private from:string;
  constructor(serverToken:string, from?:string) { this.client = new postmark.ServerClient(serverToken); this.from = from || process.env.POSTMARK_SENDER || 'no-reply@imota.app'; }
  async send(to:string, subject:string, text:string) { try { await this.client.sendEmail({ From:this.from, To:to, Subject:subject, TextBody:text }); return true; } catch { return false; } }
}
