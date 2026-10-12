"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/analysis", label: "Analysis", icon: "▥" },
  { href: "/details/All", label: "Transactions", icon: "↕" },
];

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-5 sm:py-5">
          <Link href="/" className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.2em] text-emerald-700 sm:text-xs">
              MY FINANCE
            </p>
            <p className="truncate text-sm font-bold text-slate-900 sm:text-base">
              Money dashboard
            </p>
          </Link>
          <button
            onClick={logout}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:px-4 sm:text-sm"
          >
            Log out
          </button>
        </div>
      </header>
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur sm:sticky sm:top-[73px] sm:bottom-auto sm:border-t-0 sm:border-b sm:px-5 sm:py-2 sm:shadow-none"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-around gap-1 sm:justify-start sm:gap-6">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold sm:flex-none sm:flex-row sm:gap-2 sm:px-3 sm:py-2 sm:text-sm ${
                  active
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <span className="text-lg leading-none sm:text-base">
                  {link.icon}
                </span>
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
