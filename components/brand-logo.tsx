type BrandLogoProps = {
  brand: string;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
};

const brandVisuals: Record<string, { mark: string; bg: string; fg: string; border?: string; letterSpacing?: string }> = {
  LADA: { mark: "L", bg: "#123c73", fg: "#ffffff" },
  HAVAL: { mark: "H", bg: "#ffffff", fg: "#111827", border: "#cbd5e1" },
  TENET: { mark: "T", bg: "#111827", fg: "#ffffff" },
  GEELY: { mark: "G", bg: "#132b46", fg: "#ffffff" },
  BELGEE: { mark: "B", bg: "#0f172a", fg: "#ffffff" },
  CHANGAN: { mark: "V", bg: "#eef6ff", fg: "#1267d8", border: "#b9d7f8" },
  TOYOTA: { mark: "T", bg: "#fff1f2", fg: "#d71920", border: "#fecdd3" },
  JETOUR: { mark: "J", bg: "#0b213f", fg: "#ffffff" },
  MAZDA: { mark: "M", bg: "#f8fafc", fg: "#334155", border: "#cbd5e1" },
  GAC: { mark: "G", bg: "#fff1f2", fg: "#d5212a", border: "#fecdd3" },
  CHERY: { mark: "A", bg: "#fff1f2", fg: "#d71920", border: "#fecdd3" },
  SOLARIS: { mark: "S", bg: "#f1f5f9", fg: "#0f172a", border: "#cbd5e1" },
  OMODA: { mark: "O", bg: "#111827", fg: "#ffffff" },
  EXEED: { mark: "X", bg: "#f6f1e7", fg: "#5b4636", border: "#dfd4c4" },
  JAECOO: { mark: "J", bg: "#f1f5f9", fg: "#1f2937", border: "#cbd5e1" },
  TANK: { mark: "T", bg: "#f4f0e8", fg: "#2e2a24", border: "#d8cfbf" },
  "МОСКВИЧ": { mark: "М", bg: "#fff1f2", fg: "#d81f2a", border: "#fecdd3" },
  "LI AUTO": { mark: "Li", bg: "#eefdf6", fg: "#047857", border: "#bbf7d0", letterSpacing: "-.08em" },
  HONGQI: { mark: "红", bg: "#fff1f2", fg: "#c91725", border: "#fecdd3" },
  VOYAH: { mark: "V", bg: "#edf4fb", fg: "#173f66", border: "#c7d8e8" },
  WEY: { mark: "W", bg: "#f5f5f4", fg: "#292524", border: "#d6d3d1" },
  GWM: { mark: "W", bg: "#f5f5f4", fg: "#292524", border: "#d6d3d1" },
  SHACMAN: { mark: "S", bg: "#eef4fb", fg: "#123c73", border: "#c7d8e8" },
};

const sizeClasses = {
  sm: "size-7 text-[10px] rounded-lg",
  md: "size-9 text-xs rounded-xl",
  lg: "size-11 text-sm rounded-xl",
} as const;

export function BrandLogo({ brand, size = "md", showName = false }: BrandLogoProps) {
  const visual = brandVisuals[brand] ?? { mark: brand.slice(0, 2).toUpperCase(), bg: "#edf4fb", fg: "#173f66", border: "#c7d8e8" };

  return (
    <span className="inline-flex min-w-0 items-center gap-2.5" aria-label={`Логотип ${brand}`}>
      <span
        aria-hidden="true"
        className={`grid shrink-0 place-items-center border font-black shadow-[0_3px_10px_rgba(15,37,67,.08)] ${sizeClasses[size]}`}
        style={{
          background: visual.bg,
          color: visual.fg,
          borderColor: visual.border ?? visual.bg,
          letterSpacing: visual.letterSpacing ?? "-.03em",
        }}
      >
        {visual.mark}
      </span>
      {showName && <span className="truncate font-black tracking-[-0.02em] text-[#102a58]">{brand}</span>}
    </span>
  );
}
