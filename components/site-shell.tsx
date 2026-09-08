import Link from "next/link";
import { headers } from "next/headers";
import { MaintenanceBanner } from "@/components/maintenance-banner";
import { resolvePrincipal } from "@/lib/auth";
import { principalPilotAccess } from "@/lib/pilot-program";
import {
  BriefcaseBusiness,
  ChartNoAxesCombined,
  CalendarDays,
  Crosshair,
  FileText,
  MessageSquareText,
  Newspaper,
  Radar,
  Sparkles,
  Settings,
  Truck,
} from "lucide-react";

const navigation = [
  { href: "/", label: "Новости", icon: Newspaper },
  { href: "/trucks", label: "Грузовики", icon: Truck },
  { href: "/decision", label: "Решения", icon: Crosshair },
  { href: "/executive", label: "Руководство", icon: FileText },
  { href: "/analysis", label: "ИИ-анализ", icon: Sparkles },
  { href: "/market", label: "Рынок", icon: ChartNoAxesCombined },
  { href: "/calendar", label: "Календарь", icon: CalendarDays },
  { href: "/travel-guide", label: "Перед поездкой", icon: BriefcaseBusiness },
  { href: "/pilot", label: "Пилот", icon: MessageSquareText },
];

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const incoming = await headers();
  const request = new Request("http://internal/", { headers: Object.fromEntries(incoming.entries()) });
  const principal = resolvePrincipal(request);
  const pilotAccess = principalPilotAccess(principal);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#101114]/96 backdrop-blur-xl">
        <div className="mx-auto flex h-17 max-w-[1560px] items-center gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="Окно в Китай — главная"
            title="Окно в Китай"
            className="group flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5f84ff]"
          >
            <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden bg-[#285fff] text-white sm:size-12">
              <Radar className="size-5 transition-transform duration-500 group-hover:rotate-45 sm:size-6" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-orange-400 shadow-[0_0_10px_#fb923c]" />
            </span>
          </Link>

          <nav className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1" aria-label="Основная навигация">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex h-10 items-center gap-2 border-b-2 border-transparent px-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-400 transition-colors hover:border-[#285fff] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5f84ff] sm:px-3"
                >
                  <Icon className="size-4 text-[#6f91ff]" />
                  <span className="hidden 2xl:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <Link
            href="/admin"
            aria-label="Администрирование пилота"
            title="Администрирование"
            className="grid size-10 shrink-0 place-items-center border border-white/10 text-zinc-500 transition-colors hover:border-[#5f84ff]/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5f84ff]"
          >
            <Settings className="size-4" />
          </Link>
        </div>
      </header>
      <MaintenanceBanner />

      {pilotAccess.allowed ? children : (
        <main className="mx-auto min-h-[70vh] w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <section className="border border-orange-300 bg-white p-8 shadow-[0_18px_60px_rgba(18,24,35,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-700">Controlled Corporate Pilot</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-zinc-950">Доступ ограничен участниками текущей пилотной волны</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-600">
              Этот экземпляр работает в controlled cohort mode. Если вы должны участвовать в пилоте, IT/Admin должен добавить ваш SSO subject в активную волну. Корпоративный логин в базе пилота в открытом виде не сохраняется.
            </p>
            <p className="mt-4 text-xs text-zinc-500">Причина: {pilotAccess.reason} · роль: {principal.role}</p>
          </section>
        </main>
      )}

      <footer className="border-t border-white/8 bg-[#101114]">
        <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-4 px-4 py-6 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600 sm:px-6 lg:px-8">
          <span>Окно в Китай</span>
          <Link href="/pilot" className="text-zinc-500 transition-colors hover:text-white">Обратная связь по пилоту</Link>
        </div>
      </footer>
    </div>
  );
}
