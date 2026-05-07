const nodemailer = require('nodemailer');

function createTransporter() {
  // If no email config, use a test console logger
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
    return null;
  }
  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function sendSubdomainRequest({ name, email, subdomain, domain, fqdn, useCase, message }) {
  const transporter = createTransporter();

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #C84B2F;">New Subdomain Request</h2>
      <table style="width:100%; border-collapse: collapse;">
        <tr><td style="padding:8px; font-weight:bold; color:#555;">Name</td><td style="padding:8px;">${name}</td></tr>
        <tr><td style="padding:8px; font-weight:bold; color:#555;">Email</td><td style="padding:8px;">${email}</td></tr>
        <tr><td style="padding:8px; font-weight:bold; color:#555;">Subdomain</td><td style="padding:8px; font-family:monospace; font-size:16px;">${fqdn}</td></tr>
        <tr><td style="padding:8px; font-weight:bold; color:#555;">Use Case</td><td style="padding:8px;">${useCase}</td></tr>
        <tr><td style="padding:8px; font-weight:bold; color:#555;">Message</td><td style="padding:8px;">${message || '—'}</td></tr>
      </table>
      <p style="margin-top:24px; color:#888; font-size:12px;">Review and approve this request manually in your admin panel.</p>
    </div>
  `;

  if (!transporter) {
    // Fallback: just log to console (useful for local testing without email setup)
    console.log('\n📧 ========= NEW SUBDOMAIN REQUEST =========');
    console.log(`   Name:      ${name}`);
    console.log(`   Email:     ${email}`);
    console.log(`   Subdomain: ${fqdn}`);
    console.log(`   Use Case:  ${useCase}`);
    console.log(`   Message:   ${message || '—'}`);
    console.log('==========================================\n');
    return;
  }

  await transporter.sendMail({
    from:    `"SubMarket" <${process.env.EMAIL_USER}>`,
    to:      process.env.EMAIL_TO || process.env.EMAIL_USER,
    subject: `[SubMarket] New request: ${fqdn}`,
    html,
  });
}

module.exports = { sendSubdomainRequest };
