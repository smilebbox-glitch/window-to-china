import type { ReactNode } from "react";

export type CorporateHeroVariant = "home" | "trucks" | "expo" | "travel";

export function CorporatePageHero({
  variant,
  kicker,
  title,
  subtitle,
  tagline,
  actions,
}: {
  variant: CorporateHeroVariant;
  kicker: string;
  title: ReactNode;
  subtitle: string;
  tagline?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className={`corp-hero corp-hero-${variant}`}>
      <div className="corp-hero-content">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-white/80 backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,.10)]" />
          MGC China Automotive Intelligence
        </div>
        <p className="corp-kicker">{kicker}</p>
        <h1 className="corp-title">{title}</h1>
        <p className="corp-subtitle">{subtitle}</p>
        {actions ? <div className="mt-6 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {tagline ? (
        <div className="corp-tagline">
          <span className="mb-2 block text-[9px] font-black uppercase tracking-[.16em] text-white/55">Decision intelligence</span>
          {tagline}
        </div>
      ) : null}
    </section>
  );
}

export function CorporatePageFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`corporate-page mx-auto max-w-[1540px] space-y-4 px-4 py-5 sm:px-6 lg:px-7 lg:py-6 ${className}`}>{children}</div>;
}
