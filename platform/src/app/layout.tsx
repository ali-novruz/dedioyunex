import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { currentUser } from "@/lib/session";
import { PrefsProvider } from "@/components/PrefsProvider";
import { HeaderActions } from "@/components/HeaderActions";

export const metadata: Metadata = {
  title: "MƏNƏ UYĞUN",
  description: "Bir dəfə qur, hər xidmətdə özünə uyğun istifadə et.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b6e4f",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="az">
      <body>
        <PrefsProvider initial={user?.prefs ?? null}>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 btn btn-primary">
            Əsas məzmuna keç
          </a>
          <header className="border-b-2 border-[var(--line)] bg-white">
            <div className="mx-auto flex max-w-[46rem] flex-wrap items-center justify-between gap-3 px-4 py-3">
              <Link href={user ? "/ev" : "/"} className="flex items-center gap-2 text-[1.3rem] font-black tracking-tight text-[var(--brand)] no-underline">
                <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-[var(--brand)] text-[.8rem] text-white">MU</span>
                MƏNƏ UYĞUN
              </Link>
              <HeaderActions signedIn={!!user} />
            </div>
            {user && (
              <nav aria-label="Əsas menyu" className="mx-auto flex max-w-[46rem] gap-2 overflow-x-auto px-4 pb-3">
                <Link className="btn btn-secondary" href="/ev">🏠 Əsas</Link>
                <Link className="btn btn-secondary" href="/ayarlar">⚙️ Ayarlar</Link>
                <Link className="btn btn-secondary" href="/xidmetler">🔗 Xidmətlər</Link>
              </nav>
            )}
          </header>
          <main id="main" className="page">
            {children}
          </main>
        </PrefsProvider>
      </body>
    </html>
  );
}
