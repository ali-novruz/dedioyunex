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
  /** Postgres connection string (Supabase: Project Settings → Database → Session pooler). */
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get databaseSsl(): "require" | "disable" {
    const v = process.env.DATABASE_SSL ?? "require";
    if (v !== "require" && v !== "disable") throw new Error(`DATABASE_SSL must be "require" or "disable", got "${v}"`);
    return v;
  },
  /** Connections per server instance. Serverless (Vercel) needs a small value: every instance holds its own pool against Supabase's limit. */
  get databasePoolMax() {
    const raw = process.env.DATABASE_POOL_MAX ?? "8";
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1) throw new Error(`DATABASE_POOL_MAX must be a positive integer, got "${raw}"`);
    return n;
  },
  get secret() {
    const s = required("SECRET");
    if (s.length < 32) throw new Error("SECRET must be at least 32 characters");
    return s;
  },
  get demoPartnerOrigins(): string[] {
    return (process.env.DEMO_PARTNER_ORIGIN ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  },
  /** Partner client ids that passed manual review (shown with a "verified" badge on the consent screen). */
  get verifiedClientIds(): string[] {
    return (process.env.VERIFIED_CLIENT_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  },
  get aiDailyLimit() {
    return Number(process.env.AI_DAILY_LIMIT ?? 60);
  },
  /** Show login codes on screen for ALL e-mails. Local development only — never on a public server. */
  get demoShowCodes() {
    return process.env.DEMO_SHOW_CODES === "true";
  },
  /** Public demo: show codes on screen only for e-mails of this domain (e.g. "demo.az" → ali@demo.az). */
  get demoEmailDomain(): string | null {
    return process.env.DEMO_EMAIL_DOMAIN?.trim().toLowerCase() || null;
  },
  get smtpUrl() {
    return process.env.SMTP_URL || null;
  },
  get mailFrom() {
    return process.env.MAIL_FROM || "Cizzy <no-reply@localhost>";
  },
  /** auto: the browser's recogniser when it has one (far better for Azerbaijani), otherwise Whisper on the server. */
  get sttMode(): "server" | "browser" | "auto" {
    const m = process.env.STT_MODE ?? "auto";
    if (m !== "server" && m !== "browser" && m !== "auto") throw new Error(`STT_MODE must be "server", "browser" or "auto", got "${m}"`);
    return m;
  },
  /** Azure neural voices; the only real Azerbaijani speech available. */
  get speech(): { key: string; region: string } | null {
    const key = process.env.AZURE_SPEECH_KEY, region = process.env.AZURE_SPEECH_REGION;
    return key && region ? { key, region } : null;
  },
  get ai() {
    return {
      baseUrl: (process.env.AI_BASE_URL ?? "").replace(/\/+$/, ""),
      apiKey: process.env.AI_API_KEY ?? "",
      chatModel: process.env.AI_CHAT_MODEL ?? "",
      /** Used when the main model is rate limited, overloaded or returns a broken answer. Every use is logged. */
      backupModel: process.env.AI_CHAT_MODEL_BACKUP ?? "",
      sttModel: process.env.AI_STT_MODEL ?? "",
    };
  },
  get secureCookies() {
    return this.appUrl.startsWith("https://");
  },
};
