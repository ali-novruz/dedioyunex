"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrefs } from "./PrefsProvider";
import { Icon, type IconName } from "./Icons";

export function MainNav() {
  const { l } = usePrefs();
  const path = usePathname();
  const items: { href: string; icon: IconName; label: string }[] = [
    { href: "/ev", icon: "home", label: l("Əsas", "Home") },
    { href: "/ayarlar", icon: "sliders", label: l("Ayarlar", "Settings") },
    { href: "/xidmetler", icon: "link", label: l("Xidmətlər", "Services") },
  ];
  return (
    <nav aria-label={l("Əsas menyu", "Main menu")} className="nav shell">
      {items.map((i) => (
        <Link key={i.href} className="btn btn-primary" href={i.href} aria-current={path === i.href ? "page" : undefined}>
          <Icon name={i.icon} />
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
