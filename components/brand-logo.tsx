"use client";

type BrandLogoProps = {
  brand: string;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
};

const officialDomains: Record<string, string> = {
  LADA: "lada.ru",
  HAVAL: "haval.ru",
  TENET: "tenet.ru",
  GEELY: "geely-motors.com",
  BELGEE: "belgee.ru",
  CHANGAN: "changanauto.ru",
  TOYOTA: "toyota.com",
  JETOUR: "jetour-ru.com",
  MAZDA: "mazda.com",
  GAC: "gacmotor.com",
  CHERY: "chery.ru",
  SOLARIS: "solaris.auto",
  OMODA: "omoda.ru",
  EXEED: "exeed.ru",
  JAECOO: "jaecoo.ru",
  TANK: "tank.ru",
  "МОСКВИЧ": "moskvich.ru",
  "LI AUTO": "lixiang.com",
  HONGQI: "hongqi-auto.com",
  VOYAH: "voyah.su",
  WEY: "wey.ru",
  GWM: "gwm-global.com",
  SHACMAN: "shacman.com",
};

const sizeClasses = {
  sm: "size-7 rounded-lg",
  md: "size-9 rounded-xl",
  lg: "size-11 rounded-xl",
} as const;

const fallbackTextClasses = {
  sm: "text-[9px]",
  md: "text-[10px]",
  lg: "text-xs",
} as const;

function logoUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

export function BrandLogo({ brand, size = "md", showName = false }: BrandLogoProps) {
  const domain = officialDomains[brand];
  const fallback = brand === "МОСКВИЧ" ? "М" : brand.slice(0, 2).toUpperCase();

  return (
    <span className="inline-flex min-w-0 items-center gap-2.5" aria-label={`Логотип ${brand}`}>
      <span className={`relative grid shrink-0 place-items-center overflow-hidden border border-[#d9e5ef] bg-white font-black text-[#173f66] shadow-[0_3px_10px_rgba(15,37,67,.08)] ${sizeClasses[size]} ${fallbackTextClasses[size]}`}>
        <span aria-hidden="true">{fallback}</span>
        {domain && (
          <img
            src={logoUrl(domain)}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full bg-white object-contain p-[3px]"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(event) => { event.currentTarget.style.display = "none"; }}
          />
        )}
      </span>
      {showName && <span className="truncate font-black tracking-[-0.02em] text-[#102a58]">{brand}</span>}
    </span>
  );
}
