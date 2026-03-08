// ============================================================
// notifications.js — Shared helper for sending email notifications
// ============================================================

const { sendVerificationEmail } = require('./email');
const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

function buildEmailTemplate(bodyContent) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;"><tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <tr><td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Real<span style="opacity:.85;">Vista</span></h1>
    <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:12px;">Property Platform</p></td></tr>
    <tr><td style="padding:32px 36px;">${bodyContent}</td></tr>
    <tr><td style="background:#f9fafb;padding:16px 36px;border-top:1px solid #f3f4f6;">
    <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">© ${new Date().getFullYear()} RealVista. All rights reserved.</p>
    </td></tr></table></td></tr></table></body></html>`;
}

// Send property approval notification to agent
async function sendPropertyApprovedEmail(agentEmail, agentName, propertyTitle) {
  try {
    const body = `
      <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">Great news, ${agentName}! 🎉</p>
      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">
        Your property listing <strong>"${propertyTitle}"</strong> has been approved and is now live on RealVista.
      </p>
      <div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;padding:16px;text-align:center;margin:20px 0;">
        <p style="margin:0;font-size:16px;color:#15803d;font-weight:600;">✅ Listing is now LIVE</p>
      </div>
      <p style="margin:0;font-size:12px;color:#9ca3af;">Buyers can now find and contact you about this property.</p>`;
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"RealVista" <${process.env.EMAIL_USER}>`,
      to: agentEmail,
      subject: `Your listing "${propertyTitle}" is now live!`,
      html: buildEmailTemplate(body),
    });
  } catch (err) {
    console.log('Approval email failed:', err.message);
  }
}

// Send property rejection notification to agent
async function sendPropertyRejectedEmail(agentEmail, agentName, propertyTitle) {
  try {
    const body = `
      <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">Hi ${agentName},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">
        Your property listing <strong>"${propertyTitle}"</strong> has been unpublished by an admin.
        Please review your listing for compliance with our guidelines and resubmit.
      </p>
      <div style="background:#fef2f2;border:2px solid #fecaca;border-radius:12px;padding:16px;text-align:center;margin:20px 0;">
        <p style="margin:0;font-size:16px;color:#dc2626;font-weight:600;">⚠ Listing Unpublished</p>
      </div>
      <p style="margin:0;font-size:12px;color:#9ca3af;">Log in to your dashboard to edit and resubmit the listing.</p>`;
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"RealVista" <${process.env.EMAIL_USER}>`,
      to: agentEmail,
      subject: `Action required: "${propertyTitle}" was unpublished`,
      html: buildEmailTemplate(body),
    });
  } catch (err) {
    console.log('Rejection email failed:', err.message);
  }
}

module.exports = { sendPropertyApprovedEmail, sendPropertyRejectedEmail };
