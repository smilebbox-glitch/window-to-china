"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { MaintenanceBanner } from "@/components/maintenance-banner";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Crown,
  Crosshair,
  Home,
  Info,
  Languages,
  Newspaper,
  Search,
  Settings,
  Sparkles,
  Truck,
} from "lucide-react";

const navigation = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/news", label: "Новости", icon: Newspaper },
  { href: "/trucks", label: "Коммерческий транспорт", icon: Truck },
  { href: "/market", label: "Рынок", icon: ChartNoAxesCombined },
  { href: "/analysis", label: "Аналитика", icon: BarChart3 },
  { href: "/decision", label: "Решения", icon: Crosshair },
  { href: "/executive", label: "Руководство", icon: Crown },
  { href: "/calendar", label: "Выставки и события", icon: CalendarDays },
  { href: "/travel-guide", label: "Перед поездкой", icon: BriefcaseBusiness },
] as const;

const serviceNavigation = [
  { href: "/pilot", label: "Пилот", icon: Sparkles },
  { href: "/admin", label: "Администрирование", icon: Settings },
] as const;

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
    router.push(value ? `/news?q=${encodeURIComponent(value)}` : "/news");
  }

  return (
    <div className="corporate-app min-h-screen bg-[#f5f9fd] text-[#0b1d4b]">
      <header className="corporate-topbar sticky top-0 z-50 border-b border-[#dbe7f3] bg-white/95 backdrop-blur-xl">
        <div className="flex h-[68px] items-center gap-4 px-4 md:px-6">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3" aria-label="Окно в Китай — главная">
            <span className="corporate-mark" aria-hidden="true"><i /><i /><i /></span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate text-[21px] font-black tracking-[-0.035em] text-[#0a1d54]">Окно в Китай</span>
              <span className="block text-[8px] font-bold uppercase tracking-[0.2em] text-[#6e86a5]">Автопром. Рынки. Возможности.</span>
            </span>
          </Link>

          <form onSubmit={submitSearch} className="mx-auto hidden w-full max-w-[720px] md:block">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#6480a4]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск по новостям, компаниям, моделям, выставкам..."
                className="h-10 w-full rounded-xl border border-[#d9e6f2] bg-[#f4f8fc] pl-11 pr-4 text-sm text-[#142a56] outline-none transition placeholder:text-[#8ea0b8] focus:border-[#2483ff] focus:bg-white focus:ring-4 focus:ring-[#2483ff]/10"
              />
            </label>
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button type="button" className="hidden h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-[#173368] hover:bg-[#f1f6fb] sm:flex" aria-label="Язык интерфейса">
              <Languages className="size-4" /> RU
            </button>
            <button type="button" className="relative grid size-10 place-items-center rounded-lg text-[#173368] hover:bg-[#f1f6fb]" aria-label="Уведомления">
              <Bell className="size-5" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-[#ef3d45] ring-2 ring-white" />
            </button>
            <div className="hidden items-center gap-2 rounded-xl border border-[#e2ebf3] bg-white px-2.5 py-1.5 lg:flex">
              <span className="grid size-8 place-items-center rounded-full bg-[#0d2b5c] text-[11px] font-black text-white">П</span>
              <span className="pr-1">
                <span className="block text-xs font-bold text-[#122657]">Корпоративный пилот</span>
                <span className="block text-[10px] text-[#7c90aa]">MGC</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="corporate-layout grid min-h-[calc(100vh-68px)] lg:grid-cols-[208px_minmax(0,1fr)]">
        <aside className="corporate-sidebar hidden border-r border-[#dce8f3] bg-white lg:flex lg:flex-col">
          <nav className="space-y-1 p-3 pt-4" aria-label="Основная навигация">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} className={`corporate-nav-item ${active ? "is-active" : ""}`}>
                  <Icon className="size-[19px]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-[#e4edf5] p-3">
            <div className="mb-3 rounded-2xl bg-[linear-gradient(180deg,#f4f9fd,#edf5fb)] p-4">
              <Building2 className="size-5 text-[#2587ff]" />
              <p className="mt-3 text-sm font-black leading-5 text-[#11285e]">Надёжный мост для вашего бизнеса в Китае</p>
              <div className="mt-3 h-0.5 w-8 bg-[#22c7b8]" />
              <p className="mt-3 text-[10px] leading-4 text-[#7b91aa]">Знания. Аналитика. Возможности.</p>
            </div>
            <details className="group">
              <summary className="corporate-nav-item cursor-pointer list-none"><Info className="size-[19px]" /><span>Сервис</span></summary>
              <div className="mt-1 space-y-1 pl-3">
                {serviceNavigation.map((item) => {
                  const Icon = item.icon;
                  return <Link key={item.href} href={item.href} className={`corporate-nav-item text-xs ${isActive(pathname, item.href) ? "is-active" : ""}`}><Icon className="size-4" />{item.label}</Link>;
                })}
              </div>
            </details>
          </div>
        </aside>

        <div className="min-w-0">
          <MaintenanceBanner />
          <div className="pilot-content">{children}</div>
          <footer className="border-t border-[#dfe9f2] bg-white px-5 py-5 text-xs text-[#6f86a4] sm:px-8">
            <div className="mx-auto flex max-w-[1540px] flex-wrap items-center justify-between gap-3">
              <span>© 2026 Окно в Китай · Корпоративный пилот</span>
              <div className="flex items-center gap-4"><Link href="/pilot-feedback" className="hover:text-[#147efb]">Обратная связь</Link><Link href="/admin" className="hover:text-[#147efb]">IT / Admin</Link></div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
