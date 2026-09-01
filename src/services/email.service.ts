import { Resend } from "resend";
import { env } from "../config/env";
import { logger } from "../utils/logger";

/**
 * Email service.

 */

const resend = new Resend(env.RESEND_API_KEY);

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
const BRAND = {
  logoUrl: "https://ik.imagekit.io/3wb49c8qs/logo%20ymf.png",
  background: "#ffffff",
  foreground: "#000000",
  card: "#f8f8f8",
  muted: "#666666",
  mutedBorder: "#e5e5e5",
  accent: "#2563eb",
  accentDark: "#1d4ed8",
  accentLight: "#eff6ff", 
  accentForeground: "#ffffff",
  radius: "10px",
};

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

async function sendEmail({ to, subject, text, html }: SendEmailParams): Promise<void> {
  try {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      text,
      html: html ?? `<pre style="font-family: inherit; white-space: pre-wrap;">${escapeHtml(text)}</pre>`,
    });

    if (error) {
      logger.error({ err: error, subject }, "Email delivery failed");
      throw new Error("Email delivery failed");
    }
  } catch (err) {
    logger.error({ err, subject }, "Email service error");
    throw err;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---------------------------------------------------------------------------
// Shared HTML layout
// ---------------------------------------------------------------------------

function buildEmailShell(opts: { preheader: string; bodyHtml: string }): string {
  const { preheader, bodyHtml } = opts;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>Young Ministers' Forum</title>
  </head>
  <body style="margin:0; padding:0; background-color:${BRAND.card}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <!-- Preheader (hidden preview text) -->
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
      ${escapeHtml(preheader)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.card}; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color:${BRAND.background}; border-radius:${BRAND.radius}; overflow:hidden; border:1px solid ${BRAND.mutedBorder};">

            <!-- Accent stripe -->
            <tr>
              <td style="background-color:${BRAND.accent}; height:4px; line-height:4px; font-size:0;">&nbsp;</td>
            </tr>

            <!-- Header / Logo -->
            <tr>
              <td align="center" style="padding: 32px 32px 24px; background-color:${BRAND.background}; border-bottom:1px solid ${BRAND.mutedBorder};">
                <img src="${BRAND.logoUrl}" alt="Young Ministers' Forum" width="140" style="display:block; max-width:140px; height:auto; margin:0 auto;" />
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 40px 32px; color:${BRAND.foreground};">
                ${bodyHtml}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 24px 32px; background-color:${BRAND.card}; border-top:1px solid ${BRAND.mutedBorder};">
                <p style="margin:0; font-size:12px; line-height:1.6; color:${BRAND.muted}; text-align:center;">
                  Young Ministers' Forum · The Forge<br />
                  This is an automated message. Please do not reply directly to this email.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 24px; font-size:22px; line-height:1.3; font-weight:600; color:${BRAND.foreground}; letter-spacing:-0.01em;">${escapeHtml(text)}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px; font-size:15px; line-height:1.7; color:${BRAND.foreground};">${text}</p>`;
}

function mutedParagraph(text: string): string {
  return `<p style="margin:0 0 16px; font-size:13px; line-height:1.7; color:${BRAND.muted};">${text}</p>`;
}

/** A pill-style block on a tinted blue background for displaying a code, OTP, or password prominently. */
function codeBlock(value: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 8px 0 24px;">
      <tr>
        <td align="center" style="background-color:${BRAND.accentLight}; border:1px solid ${BRAND.accent}; border-radius:8px; padding: 20px;">
          <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size:28px; font-weight:700; letter-spacing:0.15em; color:${BRAND.accentDark};">
            ${escapeHtml(value)}
          </span>
        </td>
      </tr>
    </table>`;
}

/** A subtle notice callout, e.g. for security sensitive content. */
function noticeBlock(text: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color:${BRAND.accentLight}; border-radius:6px; padding: 14px 16px;">
          <p style="margin:0; font-size:13px; line-height:1.6; color:${BRAND.foreground};">${text}</p>
        </td>
      </tr>
    </table>`;
}

/** A solid blue banner used for a closing / celebratory line. */
function accentBanner(text: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0 0;">
      <tr>
        <td align="center" style="background-color:${BRAND.accent}; border-radius:8px; padding: 16px;">
          <span style="font-size:16px; font-weight:600; color:${BRAND.accentForeground};">${escapeHtml(text)}</span>
        </td>
      </tr>
    </table>`;
}

// ---------------------------------------------------------------------------
// Transactional emails
// ---------------------------------------------------------------------------

export async function sendInitialAdminPassword(to: string, temporaryPassword: string): Promise<void> {
  const subject = "Your YMF Administrator Account";

  const text = [
    "Young Ministers' Forum",
    "",
    "Administrator Account Created",
    "",
    "An administrator account has been created for you.",
    "",
    `Your initial password is: ${temporaryPassword}`,
    "",
    "This is your initial credential. Please log in and consider it",
    "sensitive. Do not share it with anyone.",
    "",
    "If you were not expecting this account, please contact the YMF team.",
  ].join("\n");

  const html = buildEmailShell({
    preheader: "An administrator account has been created for you.",
    bodyHtml: [
      h1("Administrator Account Created"),
      paragraph("An administrator account has been created for you on the Young Ministers&rsquo; Forum platform."),
      mutedParagraph("Your initial password"),
      codeBlock(temporaryPassword),
      noticeBlock(
        "This is your <strong>initial credential</strong>. Please log in and change it as soon as possible. Do not share it with anyone."
      ),
      paragraph("If you were not expecting this account, please contact the YMF team immediately."),
    ].join(""),
  });

  await sendEmail({ to, subject, text, html });
}

export async function sendAdminOTP(to: string, otp: string, expiresMinutes: number): Promise<void> {
  const subject = "YMF Admin Login Verification";

  const text = [
    "Young Ministers' Forum",
    "",
    "Admin Login Verification",
    "",
    "Your verification code is:",
    "",
    otp,
    "",
    `This code expires in ${expiresMinutes} minutes.`,
    "",
    "If you did not attempt to log in to the YMF",
    "administration portal, please ignore this email.",
  ].join("\n");

  const html = buildEmailShell({
    preheader: `Your verification code is ${otp}`,
    bodyHtml: [
      h1("Admin Login Verification"),
      paragraph("Use the code below to complete your sign-in to the YMF administration portal."),
      codeBlock(otp),
      mutedParagraph(`This code expires in <strong>${expiresMinutes} minutes</strong>.`),
      noticeBlock(
        "If you did not attempt to log in to the YMF administration portal, you can safely ignore this email."
      ),
    ].join(""),
  });

  await sendEmail({ to, subject, text, html });
}

export async function sendRegistrationConfirmation(to: string, fullName: string): Promise<void> {
  const firstName = fullName.trim().split(/\s+/)[0] || fullName;
  const subject = "YMF Membership Registration Received";

  const text = [
    `Dear ${firstName},`,
    "",
    "Your Young Ministers' Forum membership registration",
    "has been received.",
    "",
    "Our team will review your registration and be in touch",
    "as you take your next steps with the forum.",
    "",
    "Welcome to the Forge.",
  ].join("\n");

  const html = buildEmailShell({
    preheader: "Your YMF membership registration has been received.",
    bodyHtml: [
      h1("Registration Received"),
      paragraph(`Dear ${escapeHtml(firstName)},`),
      paragraph("Your Young Ministers&rsquo; Forum membership registration has been received."),
      paragraph("Our team will review your registration and be in touch as you take your next steps with the forum."),
      accentBanner("Welcome to the Forge"),
    ].join(""),
  });

  await sendEmail({ to, subject, text, html });
}