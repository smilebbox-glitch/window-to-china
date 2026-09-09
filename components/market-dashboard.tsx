"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Building2, ExternalLink, Gauge, Info, Target, TrendingUp } from "lucide-react";
import { marketBrands, marketSources, marketTotals, type BrandOrigin } from "@/lib/market-data";
import { BrandLogo } from "@/components/brand-logo";

type OriginFilter = "Все" | BrandOrigin;
type SortKey = "sales2026Ytd" | "sales2025" | "yoy2026";

const number = new Intl.NumberFormat("ru-RU");
const compact = new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 });

export function MarketDashboard() {
  const [origin, setOrigin] = useState<OriginFilter>("Все");
  const [sort, setSort] = useState<SortKey>("sales2026Ytd");

  const rows = useMemo(() => marketBrands
    .filter((item) => origin === "Все" || item.origin === origin)
    .sort((a, b) => (b[sort] ?? -Infinity) - (a[sort] ?? -Infinity)), [origin, sort]);

  const top2026 = Math.max(...marketBrands.map((item) => item.sales2026Ytd ?? 0));
  const gwmBrands = marketBrands.filter((item) => item.focus === "GWM");
  const gwm2025 = gwmBrands.reduce((sum, item) => sum + item.sales2025, 0);
  const gwm2026 = gwmBrands.reduce((sum, item) => sum + (item.sales2026Ytd ?? 0), 0);
  const currentTopFive = marketBrands
    .filter((item) => item.sales2026Ytd !== null)
    .sort((a, b) => (b.sales2026Ytd ?? 0) - (a.sales2026Ytd ?? 0))
    .slice(0, 5)
    .reduce((sum, item) => sum + (item.sales2026Ytd ?? 0), 0);
  const concentration = (currentTopFive / marketTotals.sales2026Ytd) * 100;
  const chinaBrands = marketBrands.filter((item) => item.origin === "Китай" && item.sales2026Ytd !== null);
  const chinaVolume = chinaBrands.reduce((sum, item) => sum + (item.sales2026Ytd ?? 0), 0);

  return (
    <main className="min-h-0 text-[#10244f]">
      <div className="space-y-4">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MarketKpi label="Рынок 2025" value={compact.format(marketTotals.sales2025)} note="новых легковых" icon={Building2} />
          <MarketKpi label="2026 · 7 месяцев" value={compact.format(marketTotals.sales2026Ytd)} note="+12,2% год к году" icon={TrendingUp} positive />
          <MarketKpi label="Лидер иномарок" value="HAVAL" note="99 719 автомобилей" icon={Target} accent brand="HAVAL" />
          <MarketKpi label="Доля Китая" value={`${marketTotals.chinaShareJuly2026}%`} note="в июле 2026" icon={BarChart3} />
          <MarketKpi label="TOP-5" value={`${concentration.toFixed(1)}%`} note="концентрация рынка" icon={Gauge} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_350px]">
          <div className="corp-card overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-[#e3ecf4] px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#147efb]">Марочный рейтинг</p>
                <h2 className="mt-1.5 text-xl font-black tracking-[-0.025em] text-[#102a58]">Продажи автомобильных марок в России</h2>
                <p className="mt-1 text-xs text-[#7186a2]">2025 полный год + январь–июль 2026. Логотипы помогают быстрее считывать позиции брендов.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7186a2]">Происхождение
                  <select value={origin} onChange={(event) => setOrigin(event.target.value as OriginFilter)} className="mt-1 block h-9 min-w-36 border border-[#d9e6f1] bg-white px-3 text-xs font-bold text-[#17345f]">
                    {(["Все", "Россия", "Китай", "Беларусь", "Другие"] as OriginFilter[]).map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7186a2]">Сортировка
                  <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="mt-1 block h-9 min-w-40 border border-[#d9e6f1] bg-white px-3 text-xs font-bold text-[#17345f]">
                    <option value="sales2026Ytd">Продажи 2026</option>
                    <option value="sales2025">Продажи 2025</option>
                    <option value="yoy2026">Динамика</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead className="bg-[#f5f9fd] text-[10px] font-black uppercase tracking-[0.08em] text-[#7288a4]">
                  <tr>
                    <th className="px-5 py-3">#</th>
                    <th className="px-4 py-3">Марка</th>
                    <th className="px-4 py-3">Страна</th>
                    <th className="px-4 py-3">2025</th>
                    <th className="px-4 py-3">Янв–июль 2026</th>
                    <th className="px-4 py-3">Динамика</th>
                    <th className="px-5 py-3">Сигнал</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8eff5]">
                  {rows.map((item, index) => {
                    const width = item.sales2026Ytd ? Math.max(4, (item.sales2026Ytd / top2026) * 100) : 0;
                    return (
                      <tr key={item.brand} className={`align-middle transition hover:bg-[#f7fbff] ${item.focus === "GWM" ? "bg-[#f8fbff]" : "bg-white"}`}>
                        <td className="px-5 py-3 text-xs font-black tabular-nums text-[#8a9bb0]">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5"><BrandLogo brand={item.brand} size="sm" showName />{item.focus === "GWM" && <span className="rounded-full bg-[#e7f2ff] px-2 py-1 text-[9px] font-black uppercase tracking-[.08em] text-[#126edb]">GWM</span>}</div>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-[#607995]">{item.origin}</td>
                        <td className="px-4 py-3 font-bold tabular-nums text-[#17345f]">{number.format(item.sales2025)}</td>
                        <td className="px-4 py-3">
                          {item.sales2026Ytd === null ? <span className="text-xs text-[#9aabba]">вне открытого TOP-10</span> : (
                            <div className="min-w-40">
                              <div className="flex items-center justify-between gap-3"><span className="font-black tabular-nums text-[#102a58]">{number.format(item.sales2026Ytd)}</span><span className="text-[10px] font-bold text-[#8a9bb0]">{Math.round((item.sales2026Ytd / marketTotals.sales2026Ytd) * 100)}%</span></div>
                              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e8f0f7]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#147efb,#54a8ff)]" style={{ width: `${width}%` }} /></div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">{item.yoy2026 === null ? <span className="text-xs text-[#9aabba]">нет базы</span> : <Trend value={item.yoy2026} />}</td>
                        <td className="max-w-[300px] px-5 py-3 text-xs leading-5 text-[#607995]">{item.note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-4">
            <section className="corp-card overflow-hidden p-5">
              <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#147efb]">Фокус группы</p><h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[#102a58]">GWM в России</h2></div><BrandLogo brand="GWM" size="lg" /></div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#f2f7fd] p-3"><p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7288a4]">2025</p><p className="mt-1 text-2xl font-black tracking-[-.04em] text-[#102a58]">{number.format(gwm2025)}</p></div>
                <div className="rounded-xl bg-[#eefaf6] p-3"><p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#4e8a74]">2026 YTD</p><p className="mt-1 text-2xl font-black tracking-[-.04em] text-[#087458]">{number.format(gwm2026)}</p></div>
              </div>
              <div className="mt-4 space-y-3">
                {gwmBrands.map((item) => {
                  const value = item.sales2026Ytd ?? 0;
                  const max = Math.max(...gwmBrands.map((brand) => brand.sales2026Ytd ?? 0), 1);
                  return <div key={item.brand}><div className="flex items-center justify-between gap-3"><BrandLogo brand={item.brand} size="sm" showName /><span className="text-xs font-black tabular-nums text-[#17345f]">{item.sales2026Ytd === null ? "—" : number.format(item.sales2026Ytd)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e9f0f7]"><div className="h-full rounded-full bg-[#147efb]" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} /></div></div>;
                })}
              </div>
              <p className="mt-4 border-t border-[#e5edf5] pt-4 text-xs leading-5 text-[#607995]">Haval остаётся ключевым объёмным брендом группы; TANK и WEY усиливают присутствие в SUV- и премиальном сегментах.</p>
            </section>

            <section className="corp-card p-5">
              <div className="flex items-center gap-2"><Info className="size-5 text-[#147efb]" /><h2 className="text-base font-black text-[#102a58]">Как читать данные</h2></div>
              <ol className="mt-4 space-y-3 text-xs leading-5 text-[#607995]">
                <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#e9f3ff] font-black text-[#147efb]">1</span><span>Семь месяцев 2026 нельзя напрямую сравнивать с полным 2025 годом как готовый темп роста.</span></li>
                <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#e9f3ff] font-black text-[#147efb]">2</span><span>Колонка «Динамика» показывает изменение к январю–июлю 2025.</span></li>
                <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#e9f3ff] font-black text-[#147efb]">3</span><span>SHACMAN относится к грузовому сегменту и не включён в рейтинг легковых автомобилей.</span></li>
              </ol>
            </section>
          </aside>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr_1.15fr]">
          <article className="corp-card p-5">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#147efb]">Структура рынка</p>
            <div className="mt-4 flex items-center gap-5">
              <div className="relative grid size-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#147efb 0 ${marketTotals.chinaShareJuly2026}%, #dce9f4 ${marketTotals.chinaShareJuly2026}% 100%)` }}><div className="grid size-20 place-items-center rounded-full bg-white text-center"><div><p className="text-2xl font-black tracking-[-.04em] text-[#102a58]">{marketTotals.chinaShareJuly2026}%</p><p className="text-[9px] font-bold uppercase text-[#7186a2]">Китай</p></div></div></div>
              <div><h3 className="text-base font-black text-[#102a58]">Китайские бренды</h3><p className="mt-1 text-xs leading-5 text-[#607995]">Сильнейший иностранный кластер российского рынка. В открытом TOP-10 января–июля — {chinaBrands.length} китайских марок.</p></div>
            </div>
          </article>

          <article className="corp-card p-5">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#147efb]">Открытый объём</p>
            <p className="mt-3 text-4xl font-black tracking-[-.05em] text-[#102a58]">{number.format(chinaVolume)}</p>
            <p className="mt-1 text-xs text-[#607995]">автомобилей китайских брендов в доступном TOP-10 января–июля 2026</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e8f0f7]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#147efb,#46b6ff)]" style={{ width: `${Math.min(100, (chinaVolume / marketTotals.sales2026Ytd) * 100)}%` }} /></div>
          </article>

          <article className="corp-card p-5">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#147efb]">Методология</p><h3 className="mt-1 text-base font-black text-[#102a58]">Источники и ограничения</h3></div><Info className="size-5 text-[#147efb]" /></div>
            <p className="mt-3 text-xs leading-5 text-[#607995]">2026 — данные АВТОСТАТ/ППК за январь–июль. Значения 2025 ниже первой десятки дополнены рейтингом «Автостат Инфо». Разные методики могут давать небольшое расхождение.</p>
            <p className="mt-2 text-[10px] font-bold text-[#8a9bb0]">Обновлено {marketTotals.updatedAt}</p>
            <div className="mt-4 flex flex-wrap gap-2">{marketSources.slice(0, 2).map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-[#d9e6f1] px-2.5 py-2 text-[10px] font-bold text-[#147efb] hover:bg-[#f6faff]">Источник <ExternalLink className="size-3" /></a>)}<a href="/analysis" className="inline-flex items-center gap-1 rounded-lg bg-[#0e315c] px-2.5 py-2 text-[10px] font-black text-white">Глубже в аналитику <ArrowRight className="size-3" /></a></div>
          </article>
        </section>
      </div>
    </main>
  );
}

function MarketKpi({ label, value, note, icon: Icon, positive = false, accent = false, brand }: { label: string; value: string; note: string; icon: typeof Gauge; positive?: boolean; accent?: boolean; brand?: string }) {
  return (
    <article className={`executive-kpi ${accent ? "executive-kpi-orange" : "executive-kpi-blue"}`}>
      <div className="flex items-center justify-between gap-3">{brand ? <BrandLogo brand={brand} size="sm" /> : <span className={`executive-kpi-icon ${accent ? "executive-kpi-icon-orange" : "executive-kpi-icon-blue"}`}><Icon className="size-5" /></span>}<ArrowRight className="size-4 opacity-30" /></div>
      <p className="mt-3 text-3xl font-black tracking-[-0.045em] text-[#102a58]">{value}</p>
      <p className={`mt-1 text-xs ${positive ? "font-black text-[#0a8f65]" : "font-semibold text-[#7186a2]"}`}>{note}</p>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[.08em] text-[#55708e]">{label}</p>
    </article>
  );
}

function Trend({ value }: { value: number }) {
  const positive = value >= 0;
  return <span className={`inline-flex items-center gap-1 font-black tabular-nums ${positive ? "text-[#0a8f65]" : "text-[#d43e49]"}`}>{positive ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}{positive ? "+" : ""}{value.toLocaleString("ru-RU")}%</span>;
}
