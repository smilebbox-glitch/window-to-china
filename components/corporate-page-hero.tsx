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
        <p className="corp-kicker">{kicker}</p>
        <h1 className="corp-title">{title}</h1>
        <p className="corp-subtitle">{subtitle}</p>
        {actions ? <div className="mt-6 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {tagline ? <div className="corp-tagline">{tagline}</div> : null}
    </section>
  );
}

export function CorporatePageFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`corporate-page mx-auto max-w-[1540px] space-y-4 px-4 py-5 sm:px-6 lg:px-7 lg:py-6 ${className}`}>{children}</div>;
}
