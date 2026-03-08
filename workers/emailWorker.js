// ============================================================
// emailWorker.js — Background worker that processes email jobs
//
// Run this as a SEPARATE process: node workers/emailWorker.js
// It reads jobs from the Redis queue and sends emails.
// This keeps the API server free for HTTP requests.
//
// In production: use PM2 to keep this running alongside server
//   pm2 start workers/emailWorker.js --name email-worker
// ============================================================

require('dotenv').config({ path: '../.env' });
const { emailQueue } = require('../config/emailQueue');
const { sendVerificationEmail } = require('../utils/email');
const { sendPropertyApprovedEmail, sendPropertyRejectedEmail } = require('../utils/notifications');

console.log('📧 Email worker started, waiting for jobs...');

// Process verification emails
emailQueue.process('verification', async (job) => {
  const { email, name, code } = job.data;
  console.log(`📧 Sending verification email to ${email}`);
  await sendVerificationEmail(email, name, code);
  console.log(`✅ Verification email sent to ${email}`);
});

// Process approval notifications
emailQueue.process('propertyApproved', async (job) => {
  const { agentEmail, agentName, propertyTitle } = job.data;
  console.log(`📧 Sending approval email to ${agentEmail}`);
  await sendPropertyApprovedEmail(agentEmail, agentName, propertyTitle);
});

// Process rejection notifications
emailQueue.process('propertyRejected', async (job) => {
  const { agentEmail, agentName, propertyTitle } = job.data;
  console.log(`📧 Sending rejection email to ${agentEmail}`);
  await sendPropertyRejectedEmail(agentEmail, agentName, propertyTitle);
});

// Log failures
emailQueue.on('failed', (job, err) => {
  console.error(`❌ Email job ${job.id} (${job.name}) failed after ${job.attemptsMade} attempts:`, err.message);
});

emailQueue.on('completed', (job) => {
  console.log(`✅ Email job ${job.id} (${job.name}) completed`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await emailQueue.close();
  process.exit(0);
});
