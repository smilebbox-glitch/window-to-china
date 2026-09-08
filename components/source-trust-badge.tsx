import { BadgeCheck, Newspaper, Send } from "lucide-react";
import type { NewsItem } from "@/lib/data";

type SourceType = NewsItem["sourceType"];

const labels: Record<SourceType, string> = {
  official: "Официальный источник",
  media: "Отраслевое СМИ",
  telegram: "Telegram",
};

const descriptions: Record<SourceType, string> = {
  official: "Первичный источник: сайт бренда, компании, ассоциации или государственного органа.",
  media: "Профессиональное отраслевое или деловое издание.",
  telegram: "Оперативный Telegram-канал. Для важных решений рекомендуется открыть первоисточник.",
};

const classes: Record<SourceType, string> = {
  official: "border-emerald-200 bg-emerald-50 text-emerald-800",
  media: "border-slate-200 bg-slate-50 text-slate-700",
  telegram: "border-sky-200 bg-sky-50 text-sky-800",
};

export function sourceTrustLabel(sourceType: SourceType) {
  return labels[sourceType];
}

export function SourceTrustBadge({ sourceType, compact = false }: { sourceType: SourceType; compact?: boolean }) {
  const Icon = sourceType === "official" ? BadgeCheck : sourceType === "telegram" ? Send : Newspaper;
  return (
    <span
      title={descriptions[sourceType]}
      aria-label={`Тип источника: ${labels[sourceType]}`}
      className={`inline-flex items-center gap-1 rounded-full border font-bold leading-none ${compact ? "px-2 py-1 text-[9px]" : "px-2.5 py-1.5 text-[10px]"} ${classes[sourceType]}`}
    >
      <Icon className={compact ? "size-3" : "size-3.5"} aria-hidden="true" />
      {labels[sourceType]}
    </span>
  );
}
