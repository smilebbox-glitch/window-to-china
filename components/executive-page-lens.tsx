import type { ReactNode } from "react";

export type ExecutiveLensItem = {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  tone?: "blue" | "red" | "orange" | "green";
};

const toneClasses: Record<NonNullable<ExecutiveLensItem["tone"]>, string> = {
  blue: "border-[#c9ddf3] bg-[#f7fbff] text-[#1269cf]",
  red: "border-[#f3d2d2] bg-[#fff8f8] text-[#c23b45]",
  orange: "border-[#f2dec4] bg-[#fffaf3] text-[#c66a12]",
  green: "border-[#cce9df] bg-[#f5fcf9] text-[#08785a]",
};

export function ExecutivePageLens({
  label = "Executive workspace",
  title,
  description,
  items,
}: {
  label?: string;
  title: string;
  description: string;
  items: ExecutiveLensItem[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#dce7f1] bg-white shadow-[0_14px_45px_rgba(22,48,83,.06)]">
      <div className="flex flex-col gap-3 border-b border-[#e7eef5] px-4 py-4 sm:px-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-[#147efb]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#12b76a] shadow-[0_0_0_4px_rgba(18,183,106,.09)]" />
            {label}
          </div>
          <h2 className="mt-2 text-xl font-black tracking-[-.025em] text-[#102a58] sm:text-2xl">{title}</h2>
        </div>
        <p className="max-w-2xl text-xs leading-5 text-[#7186a2] sm:text-sm">{description}</p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const tone = item.tone ?? "blue";
          return (
            <article key={`${item.eyebrow}-${item.title}`} className="border-b border-[#e7eef5] p-4 last:border-b-0 sm:p-5 sm:odd:border-r xl:border-b-0 xl:border-r xl:last:border-r-0">
              <div className={`grid size-10 place-items-center rounded-xl border ${toneClasses[tone]}`}>{item.icon}</div>
              <p className="mt-4 text-[10px] font-black uppercase tracking-[.12em] text-[#8295aa]">{item.eyebrow}</p>
              <p className="mt-1 text-base font-black tracking-[-.015em] text-[#17345f]">{item.title}</p>
              <p className="mt-1.5 text-xs leading-5 text-[#7186a2]">{item.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
