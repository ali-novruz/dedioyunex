import "server-only";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable ${name}`);
  return v;
}

export const env = {
  get appUrl() {
    return required("APP_URL").replace(/\/+$/, "");
  },
  get dataDir() {
    return required("DATA_DIR");
  },
  get secret() {
    const s = required("SECRET");
    if (s.length < 32) throw new Error("SECRET must be at least 32 characters");
    return s;
  },
  get demoPartnerOrigins(): string[] {
    return (process.env.DEMO_PARTNER_ORIGIN ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  },
  get demoShowCodes() {
    return process.env.DEMO_SHOW_CODES === "true";
  },
  get smtpUrl() {
    return process.env.SMTP_URL || null;
  },
  get mailFrom() {
    return process.env.MAIL_FROM || "MƏNƏ UYĞUN <no-reply@localhost>";
  },
  get sttMode(): "server" | "browser" {
    const m = process.env.STT_MODE ?? "browser";
    if (m !== "server" && m !== "browser") throw new Error(`STT_MODE must be "server" or "browser", got "${m}"`);
    return m;
  },
  get ai() {
    return {
      baseUrl: (process.env.AI_BASE_URL ?? "").replace(/\/+$/, ""),
      apiKey: process.env.AI_API_KEY ?? "",
      chatModel: process.env.AI_CHAT_MODEL ?? "",
      sttModel: process.env.AI_STT_MODEL ?? "",
    };
  },
  get secureCookies() {
    return this.appUrl.startsWith("https://");
  },
};
