"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { MaintenanceBanner } from "@/components/maintenance-banner";
import { ExecutiveTheme } from "@/components/executive-theme";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Home,
  Info,
  Menu,
  Newspaper,
  Search,
  Truck,
  X,
} from "lucide-react";

const navigation = [
  { href: "/", label: "Главная", displayLabel: "Главная", icon: Home },
  { href: "/news", label: "Новости", displayLabel: "Новости и сигналы", icon: Newspaper },
  { href: "/trucks", label: "Коммерческий транспорт", displayLabel: "Коммерческий транспорт", icon: Truck },
  { href: "/market", label: "Рынок", displayLabel: "Рынок и продажи", icon: ChartNoAxesCombined },
  { href: "/calendar", label: "Выставки и события", displayLabel: "Выставки и события", icon: CalendarDays },
  { href: "/travel-guide", label: "Перед поездкой", displayLabel: "Перед поездкой", icon: BriefcaseBusiness },
] as const;

const primaryMobileNavigation = [navigation[0], navigation[1], navigation[3], navigation[4]] as const;
const mobileMoreNavigation = [navigation[2], navigation[5]] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function mobileLabel(href: string, fallback: string) {
  if (href === "/calendar") return "События";
  return fallback;
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = search.trim();
    router.push(value ? `/search?q=${encodeURIComponent(value)}` : "/search");
  }

  const moreActive = mobileMoreNavigation.some((item) => isActive(pathname, item.href));

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
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по новостям, компаниям, моделям, выставкам..." className="h-10 w-full rounded-xl border border-[#d9e6f2] bg-[#f4f8fc] pl-11 pr-4 text-sm text-[#142a56] outline-none transition placeholder:text-[#8ea0b8] focus:border-[#2483ff] focus:bg-white focus:ring-4 focus:ring-[#2483ff]/10" />
            </label>
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-2.5 pr-12 lg:pr-0">
            <Link href="/search" className="mobile-top-search md:hidden" aria-label="Открыть поиск"><Search className="size-[18px]" /></Link>
            <div className="hidden items-center gap-2 rounded-xl border border-[#e2ebf3] bg-white px-2.5 py-1.5 lg:flex">
              <span className="grid size-8 place-items-center rounded-full bg-[#0d2b5c] text-[11px] font-black text-white">M</span>
              <span className="pr-1"><span className="block text-xs font-black text-[#122657]">MGC</span><span className="block text-[9px] text-[#7c90aa]">Корпоративный пилот</span></span>
            </div>
          </div>
        </div>
      </header>

      <div className="corporate-layout grid min-h-[calc(100vh-68px)] lg:grid-cols-[228px_minmax(0,1fr)]">
        <aside className="corporate-sidebar hidden bg-[#081a31] text-white lg:flex lg:flex-col">
          <Link href="/" className="border-b border-white/10 px-5 py-5" aria-label="MGC China Intelligence">
            <div className="flex items-center gap-3"><span className="corporate-mark corporate-mark-dark" aria-hidden="true"><i /><i /><i /></span><div><p className="text-[17px] font-black tracking-[-.03em] text-white">MGC</p><p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#91a9c4]">China Intelligence</p></div></div>
          </Link>

          <nav className="space-y-1 p-3 pt-4" aria-label="Основная навигация">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return <Link key={item.href} href={item.href} className={`corporate-nav-item ${active ? "is-active" : ""}`}><Icon className="size-[18px]" /><span>{item.displayLabel}</span></Link>;
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

      {mobileMoreOpen && (
        <>
          <button type="button" className="mobile-more-backdrop lg:hidden" onClick={() => setMobileMoreOpen(false)} aria-label="Закрыть дополнительное меню" />
          <section className="mobile-more-sheet lg:hidden" aria-label="Дополнительные разделы">
            <div className="mobile-more-sheet-header">
              <div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#8fc5ff]">MGC Intelligence</p><p className="mt-1 text-base font-black text-white">Ещё разделы</p></div>
              <button type="button" onClick={() => setMobileMoreOpen(false)} className="grid size-10 place-items-center rounded-xl border border-white/15 bg-white/10 text-white" aria-label="Закрыть меню"><X className="size-5" /></button>
            </div>
            <div className="mobile-more-sheet-grid">
              <Link href="/search" onClick={() => setMobileMoreOpen(false)} className="mobile-more-sheet-link"><Search /><span>Поиск</span></Link>
              {mobileMoreNavigation.map((item) => {
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} onClick={() => setMobileMoreOpen(false)} className="mobile-more-sheet-link"><Icon /><span>{item.displayLabel}</span></Link>;
              })}
            </div>
          </section>
        </>
      )}

      <nav className="corporate-mobile-nav mobile-app-nav lg:hidden" aria-label="Основная мобильная навигация">
        {primaryMobileNavigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return <Link key={item.href} href={item.href} className={`mobile-app-nav-item ${active ? "is-active" : ""}`}><Icon /><span>{mobileLabel(item.href, item.label)}</span></Link>;
        })}
        <button type="button" onClick={() => setMobileMoreOpen((value) => !value)} className={`mobile-app-nav-item ${moreActive || mobileMoreOpen ? "is-active" : ""}`} aria-expanded={mobileMoreOpen} aria-label="Ещё разделы"><Menu /><span>Ещё</span></button>
      </nav>
    </div>
  );
}
