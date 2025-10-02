
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export class FcmPushProvider {
  constructor(serviceAccountJson: string) {
    const data = JSON.parse(serviceAccountJson);
    if (getApps().length === 0) initializeApp({ credential: cert(data) });
  }
  async send(token: string, notification: { title: string, body: string }) {
    try { await getMessaging().send({ token, notification }); return true; } catch { return false; }
  }
}
