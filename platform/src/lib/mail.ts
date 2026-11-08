import "server-only";
import nodemailer from "nodemailer";
import { env } from "./env";

export async function sendLoginCode(email: string, code: string): Promise<void> {
  if (!env.smtpUrl) {
    throw new Error("E-mail delivery is not configured: set SMTP_URL (or DEMO_SHOW_CODES=true for demos)");
  }
  const transport = nodemailer.createTransport(env.smtpUrl);
  await transport.sendMail({
    from: env.mailFrom,
    to: email,
    subject: `MƏNƏ UYĞUN giriş kodu: ${code}`,
    text: `Giriş kodunuz: ${code}\n\nKod 10 dəqiqə etibarlıdır. Bu kodu siz istəməmisinizsə, bu məktubu nəzərə almayın.`,
    html: `<p style="font-size:18px">Giriş kodunuz:</p><p style="font-size:40px;font-weight:700;letter-spacing:8px">${code}</p><p>Kod 10 dəqiqə etibarlıdır.</p>`,
  });
}
