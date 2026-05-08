// ─────────────────────────────────────────────────────────────
// lib/email.ts — sends notification emails using Nodemailer.
// If EMAIL_HOST is not set in .env (e.g. local dev without
// email configured), I fall back to just logging to the console.
// This way the app doesn't crash just because email isn't set up.
// ─────────────────────────────────────────────────────────────

import nodemailer, { Transporter } from 'nodemailer';
import type { EmailArgs } from '../types';

// I only create the transporter if email is configured.
// Returning null lets me check for it before trying to send.
function createTransporter(): Transporter | null {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) return null;

  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   Number(process.env.EMAIL_PORT ?? 587),
    secure: false, // true for port 465, false for others (uses STARTTLS)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// Sends an email notification to the admin when a new request comes in.
// Also called on approval/rejection if I want to notify the user.
export async function sendSubdomainRequest(args: EmailArgs): Promise<void> {
  const { name, email, fqdn, useCase, message } = args;

  const html = `
    <div style="font-family:monospace; max-width:600px; margin:0 auto; color:#1E1E1E;">
      <h2 style="color:#1A5CFF;">New subdomain request</h2>
      <table style="width:100%; border-collapse:collapse;">
        <tr><td style="padding:8px; color:#707070; font-weight:bold;">Name</td>     <td style="padding:8px;">${name}</td></tr>
        <tr><td style="padding:8px; color:#707070; font-weight:bold;">Email</td>    <td style="padding:8px;">${email}</td></tr>
        <tr><td style="padding:8px; color:#707070; font-weight:bold;">Subdomain</td><td style="padding:8px; font-size:16px;">${fqdn}</td></tr>
        <tr><td style="padding:8px; color:#707070; font-weight:bold;">Use case</td> <td style="padding:8px;">${useCase}</td></tr>
        <tr><td style="padding:8px; color:#707070; font-weight:bold;">Message</td>  <td style="padding:8px;">${message ?? '—'}</td></tr>
      </table>
      <p style="margin-top:20px; color:#707070; font-size:12px;">Review in admin panel: ${process.env.FRONTEND_URL}/admin</p>
    </div>
  `;

  const transporter = createTransporter();

  if (!transporter) {
    // No email config — I just log it so I can still see requests locally
    console.log('\n=== NEW SUBDOMAIN REQUEST ===');
    console.log(`Name:      ${name}`);
    console.log(`Email:     ${email}`);
    console.log(`Subdomain: ${fqdn}`);
    console.log(`Use case:  ${useCase}`);
    console.log(`Message:   ${message ?? '—'}`);
    console.log('=============================\n');
    return;
  }

  await transporter.sendMail({
    from:    `"SubMarket" <${process.env.EMAIL_USER}>`,
    to:      process.env.EMAIL_TO ?? process.env.EMAIL_USER,
    subject: `[SubMarket] New request: ${fqdn}`,
    html,
  });
}