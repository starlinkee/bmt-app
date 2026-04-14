"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Building2,
  Users,
  FileText,
  Wallet,
  Zap,
  Upload,
  Settings,
  LogOut,
  Home,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Strona główna", icon: Home, exact: true },
  { href: "/properties", label: "Nieruchomości", icon: Building2 },
  { href: "/tenants", label: "Najemcy", icon: Users },
  { href: "/contracts", label: "Umowy", icon: FileText },
  { href: "/finance", label: "Wystawienie czynszu", icon: Wallet },
  { href: "/media", label: "Media", icon: Zap },
  { href: "/reminders", label: "Przypomnienia", icon: Bell },
  { href: "/import", label: "Import CSV", icon: Upload },
  { href: "/settings", label: "Ustawienia", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-72 flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-[4.5rem] items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shrink-0">
          <Home className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-sidebar-accent-foreground leading-tight">
            BMT
          </span>
          <span className="text-[11px] text-sidebar-foreground/50 leading-tight font-medium tracking-wide uppercase">
            Zarządzanie
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-[0.9375rem] font-medium transition-all duration-150",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[1.1rem] w-[1.1rem] shrink-0",
                      isActive ? "opacity-100" : "opacity-70"
                    )}
                  />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3.5 rounded-xl px-4 py-2.5 text-[0.9375rem] font-medium text-sidebar-foreground/55 transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-[1.1rem] w-[1.1rem] shrink-0 opacity-70" />
          Wyloguj się
        </button>
      </div>
    </aside>
  );
}
