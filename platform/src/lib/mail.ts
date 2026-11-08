import "server-only";
import nodemailer from "nodemailer";
import { env } from "./env";
import { tr, type Lang } from "./lang";

export async function sendLoginCode(email: string, code: string, lang: Lang): Promise<void> {
  const l = tr(lang);
  if (!env.smtpUrl) {
    throw new Error("E-mail delivery is not configured: set SMTP_URL (or DEMO_SHOW_CODES=true for demos)");
  }
  const transport = nodemailer.createTransport(env.smtpUrl);
  await transport.sendMail({
    from: env.mailFrom,
    to: email,
    subject: `${l("MƏNƏ UYĞUN giriş kodu", "MƏNƏ UYĞUN sign-in code")}: ${code}`,
    text: `${l("Giriş kodunuz", "Your sign-in code")}: ${code}\n\n${l("Kod 10 dəqiqə etibarlıdır. Bu kodu siz istəməmisinizsə, bu məktubu nəzərə almayın.", "The code is valid for 10 minutes. If you did not ask for it, ignore this message.")}`,
    html: `<p style="font-size:18px">${l("Giriş kodunuz", "Your sign-in code")}:</p><p style="font-size:40px;font-weight:700;letter-spacing:8px">${code}</p><p>${l("Kod 10 dəqiqə etibarlıdır.", "The code is valid for 10 minutes.")}</p>`,
  });
}
