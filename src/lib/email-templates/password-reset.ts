interface PasswordResetEmailProps {
  resetUrl: string;
  name: string;
}

export function passwordResetEmail({
  resetUrl,
  name,
}: PasswordResetEmailProps) {
  const appName = process.env.TICKETING_SOLUTION_NAME ?? "Ticketing Solution";

  const subject = process.env.RESEND_AUTH_SUBJECT ?? "Reset Your Password";

  const authSignature = process.env.RESEND_AUTH_SIGNATURE ?? appName;

  const resetExpiry = process.env.RESEND_AUTH_RESET_EXPIRY ?? "30 minutes";

  const accountType = process.env.RESEND_AUTH_ACCOUNT_TYPE ?? "Super Admin";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <title>${subject}</title>
      </head>

      <body
        style="
          margin: 0;
          padding: 0;
          background-color: #f4f7fa;
          font-family: Arial, Helvetica, sans-serif;
        "
      >
        <div
          style="
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
          "
        >
          <div
            style="
              background: #173f63;
              padding: 28px;
              text-align: center;
            "
          >
            <h1
              style="
                margin: 0;
                color: #ffffff;
                font-size: 24px;
              "
            >
              ${appName}
            </h1>
          </div>

          <div style="padding: 36px 32px;">

            <h2
              style="
                margin: 0 0 16px;
                color: #111827;
                font-size: 22px;
              "
            >
              ${subject}
            </h2>

            <p
              style="
                margin: 0 0 16px;
                color: #111827;
                font-size: 15px;
              "
            >
              Hello ${name},
            </p>

            <p
              style="
                margin: 0 0 16px;
                color: #4b5563;
                font-size: 15px;
                line-height: 1.6;
              "
            >
              We received a request to reset the password
              for your ${accountType} account.
            </p>

            <p
              style="
                margin: 0 0 28px;
                color: #4b5563;
                font-size: 15px;
                line-height: 1.6;
              "
            >
              Click the button below to create a new password.
              This link will expire in ${resetExpiry}.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a
                href="${resetUrl}"
                style="
                  display: inline-block;
                  padding: 13px 28px;
                  background-color: #f4bc43;
                  color: #173f63;
                  text-decoration: none;
                  font-weight: 700;
                  border-radius: 8px;
                  font-size: 15px;
                "
              >
                Reset Password
              </a>
            </div>

            <p
              style="
                margin: 28px 0 0;
                color: #6b7280;
                font-size: 13px;
                line-height: 1.6;
              "
            >
              If you did not request a password reset,
              you can safely ignore this email.
            </p>

            <p
              style="
                margin: 18px 0 0;
                color: #9ca3af;
                font-size: 12px;
                line-height: 1.5;
              "
            >
              For security reasons, this link can only be
              used once.
            </p>

          </div>

          <div
            style="
              padding: 20px 32px;
              background: #f8fafc;
              text-align: center;
            "
          >
            <p
              style="
                margin: 0;
                color: #94a3b8;
                font-size: 12px;
              "
            >
              © ${new Date().getFullYear()} ${authSignature}.
              All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}
