import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS || '',
      }
    : undefined,
});

const FROM = process.env.SMTP_FROM || 'Tipovacka <noreply@tipovacka.app>';
const APP_URL = process.env.APP_URL || 'http://localhost:3001';

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Tipovacka — Password Reset',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>You requested a password reset for your Tipovacka account.</p>
        <p>Click the link below to set a new password. This link expires in 1 hour.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}"
             style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Reset Password
          </a>
        </p>
        <p style="color: #888; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendMatchReminderEmail(
  email: string,
  username: string,
  matches: { homeTeam: string; awayTeam: string; kickoff: string }[]
): Promise<void> {
  const matchList = matches
    .map((m) => {
      const time = new Date(m.kickoff).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Zurich',
      });
      return `<li><strong>${m.homeTeam} vs ${m.awayTeam}</strong> — ${time}</li>`;
    })
    .join('');

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Tipovacka — Don't forget to tip!`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reminder: Submit Your Tips!</h2>
        <p>Hey ${username}, you haven't submitted tips for the following match${matches.length > 1 ? 'es' : ''} starting soon:</p>
        <ul>${matchList}</ul>
        <p style="margin: 24px 0;">
          <a href="${APP_URL}/tournaments"
             style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Submit Tips Now
          </a>
        </p>
        <p style="color: #888; font-size: 13px;">You can turn off these notifications in your profile settings.</p>
      </div>
    `,
  });
}
