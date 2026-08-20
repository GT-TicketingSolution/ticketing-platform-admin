import { Resend } from "resend";

import { passwordResetEmail } from "@/lib/email-templates/password-reset";

interface SendPasswordResetEmailParams {
  email: string;
  name: string;
  resetUrl: string;
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail({
  email,
  name,
  resetUrl,
}: SendPasswordResetEmailParams) {
  const html = passwordResetEmail({
    resetUrl,
    name,
  });

  const fromEmail =
    process.env.RESEND_AUTH_FROM_EMAIL ?? "onboarding@resend.dev";

  const fromName = process.env.RESEND_AUTH_FROM_NAME ?? "Ticketing Solution";

  const subject = process.env.RESEND_AUTH_SUBJECT ?? "Reset Your Password";

  const { data, error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: [email],
    subject,
    html,
  });

  if (error) {
    console.error("Password reset email failed:", error);

    throw new Error("EMAIL_SEND_FAILED");
  }

  console.log(`Password reset email sent successfully to ${email}`);

  return data;
}
