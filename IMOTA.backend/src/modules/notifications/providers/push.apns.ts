
import apn from 'apn';
export class ApnsPushProvider {
  private provider: apn.Provider;
  constructor(cfg: { keyId:string; teamId:string; p8:string }) {
    this.provider = new apn.Provider({ token: { key: Buffer.from(cfg.p8), keyId: cfg.keyId, teamId: cfg.teamId }, production: process.env.APNS_PRODUCTION === 'true' } as any);
  }
  async send(token:string, notification:{title:string, body:string}) {
    const note = new apn.Notification(); note.alert = { title: notification.title, body: notification.body };
    note.topic = process.env.APNS_BUNDLE_ID || 'com.imota.app';
    try { await this.provider.send(note, token); return true; } catch { return false; }
  }
}
