import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Archivo, Libre_Baskerville } from "next/font/google";
import "./globals.css";
import { currentUser } from "@/lib/session";
import { pageLang } from "@/lib/lang-server";
import { tr } from "@/lib/lang";
import { PrefsProvider } from "@/components/PrefsProvider";
import { HeaderActions } from "@/components/HeaderActions";
import { MainNav } from "@/components/MainNav";

// Every face must contain Ə/ə (U+018F, U+0259). Many popular fonts, Rubik among them, do not.
const sans = Archivo({ subsets: ["latin", "latin-ext"], variable: "--font-sans", display: "swap" });
const serif = Libre_Baskerville({ subsets: ["latin", "latin-ext"], weight: "400", style: "italic", variable: "--font-serif", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const l = tr(await pageLang());
  return {
    title: "Cizzy",
    description: l("Bir dəfə qur, hər xidmətdə özünə uyğun istifadə et.", "Set it up once. Use every service your way."),
    manifest: "/manifest.webmanifest",
    icons: { icon: "/icon.svg" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5bc4a",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const lang = await pageLang();
  const l = tr(lang);
  return (
    <html lang={lang} className={`${sans.variable} ${serif.variable}`}>
      <body>
        <PrefsProvider initial={user?.prefs ?? null} lang={lang}>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 btn btn-primary">
            {l("Əsas məzmuna keç", "Skip to main content")}
          </a>
          <header>
            <div className="topbar shell">
              <Link href={user ? "/ev" : "/"} className="brand">
                <img src="/logo-mark.svg" alt="" width={40} height={40} className="brand-mark" />
                cizzy
              </Link>
              <HeaderActions signedIn={!!user} />
            </div>
            {user && <MainNav />}
          </header>
          <main id="main" className="page">
            {children}
          </main>
        </PrefsProvider>
      </body>
    </html>
  );
}
