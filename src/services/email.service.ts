interface SendPasswordResetEmailParams {
  email: string;
  name: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({
  email,
  name,
  resetUrl,
}: SendPasswordResetEmailParams) {
  console.log("========================================");

  console.log("PASSWORD RESET EMAIL");

  console.log(`To: ${email}`);
  console.log(`Name: ${name}`);
  console.log(`Reset URL: ${resetUrl}`);

  console.log("========================================");
}
