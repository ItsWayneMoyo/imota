'use server'
import { admin } from '../../lib/backend'

export async function getSummary(){ return admin('/admin/dashboard/summary', { method:'GET' }) }
export async function getHeatmap(days=7){ return admin('/admin/dashboard/heatmap?days='+days, { method:'GET' }) }
export async function getLive(){ return admin('/admin/dashboard/live', { method:'GET' }) }
