const nodemailer = require('nodemailer');

const createTransporter = () => {
  const port = parseInt(process.env.EMAIL_PORT) || 465;
  const secure = port === 465; // true for SSL

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false, // avoids SSL certificate issues on Render
    },
  });
};

const sendVerificationEmail = async (email, name, code) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"RealVista" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify your RealVista account',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                      Real<span style="opacity:0.85;">Vista</span>
                    </h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Property Platform</p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:36px 40px;">
                    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Hey ${name} 👋</p>
                    <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                      Thanks for joining RealVista! Use the code below to verify your email address. It expires in <strong>15 minutes</strong>.
                    </p>

                    <!-- Code box -->
                    <div style="background:#f0f4ff;border:2px dashed #c7d2fe;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                      <p style="margin:0 0 6px;font-size:12px;color:#6366f1;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Verification Code</p>
                      <p style="margin:0;font-size:40px;font-weight:800;color:#1e40af;letter-spacing:10px;">${code}</p>
                    </div>

                    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                      If you didn't create a RealVista account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #f3f4f6;">
                    <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">
                      © ${new Date().getFullYear()} RealVista. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
};

module.exports = { sendVerificationEmail };
