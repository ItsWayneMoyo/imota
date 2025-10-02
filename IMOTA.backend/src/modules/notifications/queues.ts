
import { Queue, Worker, QueueEvents, JobsOptions, MetricsTime, ConnectionOptions, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { FcmPushProvider } from './providers/push.fcm';
import { ApnsPushProvider } from './providers/push.apns';
import { TwilioSmsProvider } from './providers/sms.twilio';
import { SesEmailProvider } from './providers/email.ses';
import { PostmarkEmailProvider } from './providers/email.postmark';

const prisma = new PrismaClient();
const connection: ConnectionOptions = { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379',10) };

// Use prefix for namespacing instead of ":" in queue names
const qOpts = { connection, prefix: process.env.BULL_PREFIX || 'imota' };

function baseOpts(): JobsOptions { return { attempts: parseInt(process.env.NOTIF_ATTEMPTS||'5',10), backoff: { type:'exponential', delay: parseInt(process.env.NOTIF_BACKOFF_MS||'5000',10) }, removeOnComplete:1000, removeOnFail:1000 }; }

export const pushQueue  = new Queue('notifications-push', { ...qOpts, defaultJobOptions: baseOpts() });
export const smsQueue   = new Queue('notifications-sms',  { ...qOpts, defaultJobOptions: baseOpts() });
export const emailQueue = new Queue('notifications-email',{ ...qOpts, defaultJobOptions: baseOpts() });

export const pushDLQ  = new Queue('notifications-push-dlq', qOpts);
export const smsDLQ   = new Queue('notifications-sms-dlq',  qOpts);
export const emailDLQ = new Queue('notifications-email-dlq',qOpts);

const fcmKey = process.env.FCM_SERVICE_ACCOUNT_JSON || '';
const apnsKey = process.env.APNS_KEY_ID; const apnsTeam = process.env.APNS_TEAM_ID; const apnsP8 = process.env.APNS_P8?.replace(/\n/g,'\n');
const fcm = fcmKey ? new FcmPushProvider(fcmKey) : null;
const apns = (apnsKey && apnsTeam && apnsP8) ? new ApnsPushProvider({ keyId: apnsKey, teamId: apnsTeam, p8: apnsP8 }) : null;

const twilioSid = process.env.TWILIO_SID; const twilioAuth = process.env.TWILIO_AUTH; const twilioFrom = process.env.TWILIO_FROM;
const smsProvider = (twilioSid && twilioAuth && twilioFrom) ? new TwilioSmsProvider({ sid: twilioSid, auth: twilioAuth, from: twilioFrom }) : null;

const postmarkToken = process.env.POSTMARK_TOKEN;
const postmarkProvider = postmarkToken ? new PostmarkEmailProvider(postmarkToken) : null;
const sesRegion = process.env.AWS_REGION; const sesSender = process.env.SES_SENDER;
const sesProvider = (sesRegion && sesSender) ? new SesEmailProvider({ region: sesRegion, sender: sesSender }) : null;

async function log(channel: string, target: string, status: string, provider?: string, error?: any, queue?: string, job?: Job) {
  try {
    await prisma.notificationLog.create({ data: { channel, target, status, provider, error: error ? (typeof error==='string'?error : (error?.message||JSON.stringify(error))).slice(0,1000) : null, queue: queue || job?.queueName || '', jobId: job?.id?.toString(), attempts: job?.attemptsMade || 0, payload: job?.data as any } });
  } catch {}
}

export function initNotificationWorkers() {
  const pushWorker = new Worker('notifications-push', async (job:Job) => {
    const d:any = job.data;
    if ((d.platform === 'ANDROID' || d.platform === 'WEB') && fcm) { const ok = await fcm.send(d.token, { title:d.title, body:d.body }); if (!ok) throw new Error('FCM send failed'); await log('PUSH', d.token, 'SUCCESS', 'FCM', null, job.queueName, job); return true; }
    if (d.platform === 'IOS' && apns) { const ok = await apns.send(d.token, { title:d.title, body:d.body }); if (!ok) throw new Error('APNS send failed'); await log('PUSH', d.token, 'SUCCESS', 'APNS', null, job.queueName, job); return true; }
    throw new Error('No push provider configured');
  }, { connection, concurrency: parseInt(process.env.NOTIF_PUSH_CONCURRENCY||'20',10) });
  pushWorker.on('failed', async (job, err)=>{ await log('PUSH', job?.data?.token || '', 'FAILED', job?.data?.platform==='IOS'?'APNS':'FCM', err, job?.queueName, job||undefined); if (job && job.attemptsMade >= (job.opts.attempts||1)) await pushDLQ.add('push-dlq', { ...job.data, originalJobId: job.id }); });

  const smsWorker = new Worker('notifications-sms', async (job:Job)=>{
    if (!smsProvider) throw new Error('No SMS provider configured'); const d:any = job.data;
    const ok = await smsProvider.send(d.to, d.body); if (!ok) throw new Error('SMS send failed'); await log('SMS', d.to, 'SUCCESS', 'TWILIO', null, job.queueName, job); return true;
  }, { connection, concurrency: parseInt(process.env.NOTIF_SMS_CONCURRENCY||'10',10) });
  smsWorker.on('failed', async (job, err)=>{ await log('SMS', job?.data?.to || '', 'FAILED', 'TWILIO', err, job?.queueName, job||undefined); if (job && job.attemptsMade >= (job.opts.attempts||1)) await smsDLQ.add('sms-dlq', { ...job.data, originalJobId: job.id }); });

  const emailWorker = new Worker('notifications-email', async (job:Job)=>{
    const d:any = job.data;
    if (postmarkProvider) { const ok = await postmarkProvider.send(d.to, d.subject, d.text); if (!ok) throw new Error('Postmark send failed'); await log('EMAIL', d.to, 'SUCCESS', 'POSTMARK', null, job.queueName, job); return true; }
    if (sesProvider) { const ok = await sesProvider.send(d.to, d.subject, d.text); if (!ok) throw new Error('SES send failed'); await log('EMAIL', d.to, 'SUCCESS', 'SES', null, job.queueName, job); return true; }
    throw new Error('No email provider configured');
  }, { connection, concurrency: parseInt(process.env.NOTIF_EMAIL_CONCURRENCY||'10',10) });
  emailWorker.on('failed', async (job, err)=>{ await log('EMAIL', job?.data?.to || '', 'FAILED', postmarkProvider?'POSTMARK':'SES', err, job?.queueName, job||undefined); if (job && job.attemptsMade >= (job.opts.attempts||1)) await emailDLQ.add('email-dlq', { ...job.data, originalJobId: job.id }); });

  //pushQueue.setMetrics('completed', MetricsTime.ONE_WEEK);
  //smsQueue.setMetrics('completed', MetricsTime.ONE_WEEK);
  //emailQueue.setMetrics('completed', MetricsTime.ONE_WEEK);
}

export async function queueStats() {
  const [p,s,e] = await Promise.all([pushQueue.getJobCounts('waiting','active','delayed','completed','failed'), smsQueue.getJobCounts('waiting','active','delayed','completed','failed'), emailQueue.getJobCounts('waiting','active','delayed','completed','failed')]);
  return { push:p, sms:s, email:e };
}
export async function listDLQ(queue:'push'|'sms'|'email', limit=50) {
  const q = queue==='push'?pushDLQ:queue==='sms'?smsDLQ:emailDLQ;
  const jobs = await q.getJobs(['waiting','active','delayed','failed','completed'], 0, limit-1);
  return jobs.map(j=>({ id:j.id, name:j.name, data:j.data, attemptsMade:j.attemptsMade, failedReason:(j as any).failedReason || null }));
}
export async function retryDLQ(queue:'push'|'sms'|'email', jobId:string) {
  const q = queue==='push'?pushDLQ:queue==='sms'?smsDLQ:emailDLQ;
  const job = await q.getJob(jobId); if (!job) return { ok:false, message:'job not found' };
  if (queue==='push') await pushQueue.add('push', job.data);
  if (queue==='sms') await smsQueue.add('sms', job.data);
  if (queue==='email') await emailQueue.add('email', job.data);
  await job.remove(); return { ok:true };
}
export async function purgeDLQ(queue:'push'|'sms'|'email', jobId?:string) {
  const q = queue==='push'?pushDLQ:queue==='sms'?smsDLQ:emailDLQ;
  if (jobId) { const job = await q.getJob(jobId); if (job) await job.remove(); } else { await q.drain(true); }
  return { ok:true };
}
