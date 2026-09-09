"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { MaintenanceBanner } from "@/components/maintenance-banner";
import { ExecutiveTheme } from "@/components/executive-theme";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Home,
  Info,
  Newspaper,
  Search,
  Truck,
} from "lucide-react";

const navigation = [
  { href: "/", label: "Главная", displayLabel: "Главная", icon: Home },
  { href: "/news", label: "Новости", displayLabel: "Новости и сигналы", icon: Newspaper },
  { href: "/trucks", label: "Коммерческий транспорт", displayLabel: "Коммерческий транспорт", icon: Truck },
  { href: "/market", label: "Рынок", displayLabel: "Рынок и продажи", icon: ChartNoAxesCombined },
  { href: "/analysis", label: "Аналитика", displayLabel: "Аналитика", icon: BarChart3 },
  { href: "/calendar", label: "Выставки и события", displayLabel: "Выставки и события", icon: CalendarDays },
  { href: "/travel-guide", label: "Перед поездкой", displayLabel: "Перед поездкой", icon: BriefcaseBusiness },
] as const;

const mobileNavigation = navigation;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = search.trim();
    router.push(value ? `/search?q=${encodeURIComponent(value)}` : "/search");
  }

  return (
    <div className="corporate-app min-h-screen bg-[#f4f8fc] text-[#0b1d4b]">
      <ExecutiveTheme />
      <header className="corporate-topbar sticky top-0 z-50 border-b border-[#dbe7f3] bg-white/95 backdrop-blur-xl">
        <div className="flex h-[68px] items-center gap-3 px-4 md:gap-4 md:px-6">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3 lg:hidden" aria-label="Окно в Китай — главная">
            <span className="corporate-mark" aria-hidden="true"><i /><i /><i /></span>
            <span className="min-w-0"><span className="block truncate text-[18px] font-black tracking-[-0.035em] text-[#0a1d54]">Окно в Китай</span><span className="hidden text-[8px] font-bold uppercase tracking-[0.2em] text-[#6e86a5] sm:block">China Automotive Intelligence</span></span>
          </Link>

          <form onSubmit={submitSearch} className="hidden w-full max-w-[760px] md:block lg:ml-1">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#6480a4]" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по новостям, компаниям, моделям, выставкам..." className="h-10 w-full rounded-xl border border-[#d9e6f2] bg-[#f4f8fc] pl-11 pr-16 text-sm text-[#142a56] outline-none transition placeholder:text-[#8ea0b8] focus:border-[#2483ff] focus:bg-white focus:ring-4 focus:ring-[#2483ff]/10" />
              <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-[#d9e6f2] bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#7d90a8] sm:inline-flex">⌘ K</span>
            </label>
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-2.5">
            <div className="hidden items-center gap-2 rounded-full bg-[#eefaf6] px-3 py-1.5 text-[11px] font-black text-[#087458] lg:flex"><span className="signal-dot !size-1.5" /> Live</div>
            <div className="flex items-center gap-2 rounded-xl border border-[#e2ebf3] bg-white px-2.5 py-1.5">
              <span className="grid size-8 place-items-center rounded-full bg-[#0d2b5c] text-[11px] font-black text-white">M</span>
              <span className="hidden pr-1 sm:block"><span className="block text-xs font-black text-[#122657]">MGC</span><span className="block text-[9px] text-[#7c90aa]">Корпоративный пилот</span></span>
            </div>
          </div>
        </div>
      </header>

      <nav className="corporate-mobile-nav sticky top-[68px] z-40 flex gap-1 overflow-x-auto border-b border-[#dce8f3] bg-white/95 px-3 py-2 backdrop-blur-xl lg:hidden" aria-label="Мобильная навигация">
        {mobileNavigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return <Link key={item.href} href={item.href} className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition ${active ? "bg-[#eaf4ff] text-[#147efb]" : "text-[#496784] hover:bg-[#f1f6fb] hover:text-[#173368]"}`}><Icon className="size-4" /><span>{item.label}</span></Link>;
        })}
      </nav>

      <div className="corporate-layout grid min-h-[calc(100vh-68px)] lg:grid-cols-[228px_minmax(0,1fr)]">
        <aside className="corporate-sidebar hidden bg-[#081a31] text-white lg:flex lg:flex-col">
          <Link href="/" className="border-b border-white/10 px-5 py-5" aria-label="MGC China Intelligence">
            <div className="flex items-center gap-3"><span className="corporate-mark corporate-mark-dark" aria-hidden="true"><i /><i /><i /></span><div><p className="text-[17px] font-black tracking-[-.03em] text-white">MGC</p><p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#91a9c4]">China Intelligence</p></div></div>
          </Link>

          <nav className="space-y-1 p-3 pt-4" aria-label="Основная навигация">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return <Link key={item.href} href={item.href} className={`corporate-nav-item ${active ? "is-active" : ""}`}><Icon className="size-[18px]" /><span>{item.displayLabel}</span>{item.href === "/news" && <span className="ml-auto rounded-full bg-[#f1464f] px-2 py-0.5 text-[9px] font-black text-white">LIVE</span>}</Link>;
            })}
          </nav>

          <div className="mt-auto p-4">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(160deg,#12375e,#0a223e)] p-4 shadow-[0_16px_40px_rgba(0,0,0,.18)]">
              <div className="absolute -right-8 -top-8 size-28 rounded-full border border-white/10" /><div className="absolute -right-2 top-7 size-16 rounded-full border border-white/10" />
              <Building2 className="size-5 text-[#5ab0ff]" />
              <p className="mt-4 text-sm font-black leading-5 text-white">Китай. Автопром.<br />Реальные возможности.</p>
              <div className="mt-3 h-0.5 w-8 bg-[#22c7b8]" />
              <p className="mt-3 text-[10px] leading-4 text-[#9db3ca]">Знания. Аналитика. Решения.</p>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="border-b border-[#dce8f3] bg-[#f8fbfe] px-4 py-3 sm:px-6">
            <div className="mx-auto flex max-w-[1540px] items-center gap-2 text-[15px] font-bold leading-5 text-[#18345f]">
              <Info className="size-5 shrink-0 text-[#285fff]" aria-hidden="true" />
              <span>В тестовом режиме. Данные могут быть неполны.</span>
            </div>
          </div>
          <MaintenanceBanner />
          <div className="pilot-content">{children}</div>
          <footer className="border-t border-[#dfe9f2] bg-white px-5 py-5 text-xs text-[#6f86a4] sm:px-8">
            <div className="mx-auto flex max-w-[1540px] flex-wrap items-center justify-between gap-3"><span>© 2026 Окно в Китай · MGC China Automotive Intelligence</span><div className="flex items-center gap-4"><Link href="/pilot-feedback" className="hover:text-[#147efb]">Обратная связь</Link><Link href="/admin" className="hover:text-[#147efb]">IT / Admin</Link></div></div>
          </footer>
        </div>
      </div>
    </div>
  );
}
