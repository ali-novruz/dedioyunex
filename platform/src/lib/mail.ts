import "server-only";
import nodemailer from "nodemailer";
import { env } from "./env";
import { tr, type Lang } from "./lang";

export async function sendSafetyAlert(email: string, lang: Lang): Promise<void> {
  if (!env.smtpUrl) throw new Error("E-mail delivery is not configured: set SMTP_URL");
  const l = tr(lang);
  const text = l(
    "Yaxınınız Cizzy-də “Kimsə zəng edib kod və ya pul istəyir” düyməsini basdı. Zəhmət olmasa ona indi zəng edin.",
    "Someone close to you pressed “Someone is asking for a code or money” in Cizzy. Please call them now.",
  );
  await nodemailer.createTransport(env.smtpUrl).sendMail({ from: env.mailFrom, to: email, subject: l("Cizzy: təcili xəbərdarlıq", "Cizzy: urgent alert"), text });
}

export async function sendLoginCode(email: string, code: string, lang: Lang): Promise<void> {
  const l = tr(lang);
  if (!env.smtpUrl) {
    throw new Error("E-mail delivery is not configured: set SMTP_URL (or DEMO_SHOW_CODES=true for demos)");
  }
  const transport = nodemailer.createTransport(env.smtpUrl);
  await transport.sendMail({
    from: env.mailFrom,
    to: email,
    subject: `${l("Cizzy giriş kodu", "Cizzy sign-in code")}: ${code}`,
    text: `${l("Giriş kodunuz", "Your sign-in code")}: ${code}\n\n${l("Kod 10 dəqiqə etibarlıdır. Bu kodu siz istəməmisinizsə, bu məktubu nəzərə almayın.", "The code is valid for 10 minutes. If you did not ask for it, ignore this message.")}`,
    html: `<p style="font-size:18px">${l("Giriş kodunuz", "Your sign-in code")}:</p><p style="font-size:40px;font-weight:700;letter-spacing:8px">${code}</p><p>${l("Kod 10 dəqiqə etibarlıdır.", "The code is valid for 10 minutes.")}</p>`,
  });
}
