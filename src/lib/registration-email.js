import nodemailer from "nodemailer";

export function getMissingRegistrationMailSettings() {
  const host = process.env.SMTP_HOST;
  const rawPort = process.env.SMTP_PORT;
  const port = Number(rawPort);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  const missing = [];

  if (!host) {
    missing.push("SMTP_HOST");
  }

  if (
    !rawPort ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    missing.push("SMTP_PORT");
  }

  if (!user) {
    missing.push("SMTP_USER");
  }

  if (!password) {
    missing.push("SMTP_PASS");
  }

  if (!from) {
    missing.push("SMTP_FROM");
  }

  return missing;
}

export async function sendRegistrationOtp(email, otp) {
  const missingSettings = getMissingRegistrationMailSettings();

  if (missingSettings.length > 0) {
    throw new Error(
      `Missing SMTP configuration: ${missingSettings.join(", ")}.`
    );
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  await transporter.sendMail({
    from,
    to: email,
    subject: "Your Technosky CRM verification code",
    text: `Your verification code is ${otp}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
    html: `<p>Your Technosky CRM verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px">${otp}</p><p>It expires in 10 minutes. If you did not request this code, you can ignore this email.</p>`,
  });
}
