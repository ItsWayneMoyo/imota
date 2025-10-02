'use server';
import { admin } from '../../lib/backend';

export async function getMetrics() {
  return admin('/admin/notifications/metrics', { method: 'GET' });
}

export async function getLogs(params: { channel?: string; status?: string; limit?: number } = {}) {
  const q = new URLSearchParams();
  if (params.channel) q.set('channel', params.channel);
  if (params.status) q.set('status', params.status);
  if (params.limit) q.set('limit', String(params.limit));
  return admin('/admin/notifications/logs' + (q.toString() ? '?' + q.toString() : ''), { method: 'GET' });
}

export async function getDLQ(queue: 'push' | 'sms' | 'email', limit = 50) {
  const q = new URLSearchParams({ queue, limit: String(limit) });
  return admin('/admin/notifications/dlq?' + q.toString(), { method: 'GET' });
}

export async function retryDLQ(queue: 'push' | 'sms' | 'email', jobId: string) {
  return admin('/admin/notifications/dlq/retry', { method: 'POST', body: JSON.stringify({ queue, jobId }) });
}

export async function purgeDLQ(queue: 'push' | 'sms' | 'email', jobId?: string) {
  return admin('/admin/notifications/dlq/purge', { method: 'POST', body: JSON.stringify({ queue, jobId }) });
}

export async function metrics() {
  return admin('/admin/notifications/metrics', { method: 'GET' });
}

export async function failures(limit = 100) {
  const data = await admin('/admin/notifications/failures?limit=' + limit, { method: 'GET' });
  // Normalize to array regardless of backend shape
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as any)?.rows)) return (data as any).rows;
  if (Array.isArray((data as any)?.items)) return (data as any).items;
  return [];
}
