'use server'
import { admin } from '../../lib/backend'

export async function listIntents(limit = 100) {
  return admin('/admin/payments/intents?limit=' + limit, { method: 'GET' })
}

export async function listRefunds(limit = 100) {
  return admin('/admin/payments/refunds?limit=' + limit, { method: 'GET' })
}

export async function listReconRuns(limit = 50) {
  return admin('/admin/payments/reconcile/runs?limit=' + limit, { method: 'GET' })
}

export async function listReconRows(runId: string) {
  return admin('/admin/payments/reconcile/rows?runId=' + encodeURIComponent(runId), { method: 'GET' })
}

export async function issueRefund(formData: FormData) {
  const intentId = String(formData.get('intentId') || '').trim()
  const amount = parseInt(String(formData.get('amount') || '0'), 10)
  const reason = String(formData.get('reason') || '')
  await admin('/admin/payments/refund', {
    method: 'POST',
    body: JSON.stringify({ intentId, amount, reason }),
  })
}

export async function voidIntent(formData: FormData) {
  const intentId = String(formData.get('intentId') || '').trim()
  await admin('/admin/payments/void', {
    method: 'POST',
    body: JSON.stringify({ intentId }),
  })
}

export async function reconcile(
  _prev: any,
  data: { provider: string; rows: Array<{ providerRef: string; amount: number; status: string; currency?: string }> }
) {
  await admin('/admin/payments/reconcile', { method: 'POST', body: JSON.stringify(data) })
  return { ok: true }
}
