import { NextResponse } from "next/server";
import { CATEGORIES, DEFAULT_PREFERENCES, SCHEMA_VERSION, SETTINGS, settingHelp, settingLabel } from "@sdk/schema";
import { STANDARDS } from "@sdk/standards";

/** Public, open description of the preference schema (no auth). */
export function GET() {
  return NextResponse.json(
    {
      version: SCHEMA_VERSION,
      license: "CC BY 4.0",
      categories: CATEGORIES.map(({ id, label, help, en }) => ({ id, label, help, en })),
      defaults: DEFAULT_PREFERENCES,
      settings: SETTINGS.map((s) => ({
        key: s.key,
        kind: s.kind,
        categories: s.categories,
        label: s.label,
        help: s.help,
        en: { label: settingLabel(s, "en"), help: settingHelp(s, "en") },
        type: s.control === "toggle" ? "boolean" : s.control === "color" ? "color" : "enum",
        values: s.control === "toggle" ? [true, false] : s.control === "color" ? ["default", "#rrggbb"] : s.options.map((o) => o.value),
        standards: STANDARDS[s.key],
      })),
    },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" } },
  );
}
