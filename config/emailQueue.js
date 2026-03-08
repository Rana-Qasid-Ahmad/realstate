// ============================================================
// emailQueue.js — Bull job queue for async email sending
//
// WHY: Sending emails inline with await blocks the HTTP response
// for 1-5 seconds while SMTP connects. Under load this starves
// the request workers.
//
// With a queue:
//   1. API responds immediately (< 10ms)
//   2. Email job is pushed to Redis queue
//   3. Worker process picks it up and sends it in background
//   4. If it fails, Bull auto-retries up to 3 times
// ============================================================

const Bull = require('bull');

const isUpstash = process.env.REDIS_HOST && process.env.REDIS_HOST.includes('upstash.io');

// Bull redis config — Upstash needs TLS
const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: isUpstash ? { rejectUnauthorized: false } : undefined,
};

// Create the email queue
const emailQueue = new Bull('email', { redis: redisConfig });

// -------------------------------------------------------
// IMPORTANT: Register inline processors here so emails are
// processed in the same process as the server.
// This means you do NOT need to run a separate worker process.
// The queue still gives you retries and non-blocking sends.
// -------------------------------------------------------
const { sendVerificationEmail } = require('../utils/email');
const { sendPropertyApprovedEmail, sendPropertyRejectedEmail } = require('../utils/notifications');

emailQueue.process('verification', async (job) => {
  const { email, name, code } = job.data;
  console.log(`📧 Sending verification email to ${email}...`);
  await sendVerificationEmail(email, name, code);
  console.log(`✅ Verification email sent to ${email}`);
});

emailQueue.process('propertyApproved', async (job) => {
  await sendPropertyApprovedEmail(job.data.agentEmail, job.data.agentName, job.data.propertyTitle);
});

emailQueue.process('propertyRejected', async (job) => {
  await sendPropertyRejectedEmail(job.data.agentEmail, job.data.agentName, job.data.propertyTitle);
});

emailQueue.on('failed', (job, err) => {
  console.error(`❌ Email job "${job.name}" failed (attempt ${job.attemptsMade}):`, err.message);
});


// -------------------------------------------------------
// Queue a verification email (non-blocking)
// -------------------------------------------------------
async function queueVerificationEmail(email, name, code) {
  await emailQueue.add(
    'verification',
    { email, name, code },
    {
      attempts: 3,           // retry up to 3 times on failure
      backoff: { type: 'exponential', delay: 2000 }, // 2s, 4s, 8s delays
      removeOnComplete: 100, // keep last 100 completed jobs for debugging
      removeOnFail: 50,
    }
  );
}

// -------------------------------------------------------
// Queue a property approved notification
// -------------------------------------------------------
async function queueApprovalEmail(agentEmail, agentName, propertyTitle) {
  await emailQueue.add(
    'propertyApproved',
    { agentEmail, agentName, propertyTitle },
    { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 50 }
  );
}

// -------------------------------------------------------
// Queue a property rejected notification
// -------------------------------------------------------
async function queueRejectionEmail(agentEmail, agentName, propertyTitle) {
  await emailQueue.add(
    'propertyRejected',
    { agentEmail, agentName, propertyTitle },
    { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 50 }
  );
}

module.exports = { emailQueue, queueVerificationEmail, queueApprovalEmail, queueRejectionEmail };