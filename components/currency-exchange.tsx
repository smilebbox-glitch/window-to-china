"use client";

import { ArrowRightLeft, BadgeRussianRuble, Building2, Calculator, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FxCity, FxSnapshot } from "@/lib/fx";

const formatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
const rateFormatter = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

export function CurrencyExchange() {
  const [city, setCity] = useState<FxCity>("kaluga");
  const [data, setData] = useState<FxSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("100");
  const [direction, setDirection] = useState<"cny-rub" | "rub-cny">("cny-rub");

  async function load(selectedCity = city) {
    setLoading(true);
    try {
      const response = await fetch(`/api/fx?city=${selectedCity}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error("FX request failed");
      const snapshot = (await response.json()) as FxSnapshot;
      if (!Number.isFinite(snapshot?.cbr?.rubPerCny) || snapshot.cbr.rubPerCny <= 0 || !Array.isArray(snapshot.bankRates)) {
        throw new Error("Invalid FX payload");
      }
      setData(snapshot);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(city);
  }, [city]);

  const result = useMemo(() => {
    const value = Number(amount.replace(/\s+/gu, "").replace(",", "."));
    if (!data || !Number.isFinite(value) || value < 0) return null;
    return direction === "cny-rub" ? value * data.cbr.rubPerCny : value / data.cbr.rubPerCny;
  }, [amount, data, direction]);

  const inputCurrency = direction === "cny-rub" ? "CNY" : "RUB";
  const outputCurrency = direction === "cny-rub" ? "₽" : "CNY";

  return (
    <section className="mt-8 rounded-[22px] border border-[#dce7f0] bg-white p-5 shadow-[0_12px_36px_rgba(21,54,91,.06)] sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#147efb]">
            <BadgeRussianRuble className="size-4" /> Деньги в поездке
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#10285c] sm:text-3xl">Юань ↔ рубль и наличный обмен</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6f86a4]">
            Официальный курс ЦБ — для ориентира и расчётов. Курсы банков показывают, сколько банк покупает и продаёт наличный CNY; перед поездкой в отделение проверьте наличие валюты.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["kaluga", "moskva"] as FxCity[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCity(item)}
              className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${city === item ? "border-[#147efb] bg-[#147efb] text-white" : "border-[#d7e3ee] bg-white text-[#5f7897] hover:border-[#a9c9e8] hover:text-[#173368]"}`}
            >
              {item === "kaluga" ? "Калуга" : "Москва"}
            </button>
          ))}
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-xl border border-[#d7e3ee] bg-white px-3 py-2 text-xs font-bold text-[#5f7897] transition hover:border-[#a9c9e8] hover:text-[#147efb]">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Обновить
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="mt-5 rounded-2xl border border-[#e0e9f2] bg-[#f8fbfe] p-5 text-sm text-[#8193aa]">Получаем актуальные курсы…</div>
      ) : data ? (
        <>
          <div className="mt-5 rounded-2xl border border-[#cfe3f6] bg-[#f5faff] p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#147efb]">Курс ЦБ РФ</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.03em] text-[#10285c]">1 CNY = {rateFormatter.format(data.cbr.rubPerCny)} ₽</p>
                <p className="mt-2 text-xs font-semibold text-[#7f93aa]">Действует с {data.cbr.effectiveDate}</p>
              </div>
              <a href={data.cbr.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-black text-[#147efb] hover:text-[#0f65cf]">Банк России ↗</a>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[#e0e9f2] bg-[#f9fbfd] p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-black text-[#173368]"><Calculator className="size-4 text-[#147efb]" /> Конвертер</div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-end">
              <label className="text-xs font-bold text-[#6f86a4]">
                Сумма, {inputCurrency}
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  aria-label={`Сумма в ${inputCurrency}`}
                  className="mt-2 h-11 w-full rounded-xl border border-[#cfdde9] bg-white px-3 text-base font-semibold text-[#173368] outline-none transition placeholder:text-[#9aabba] focus:border-[#147efb] focus:ring-2 focus:ring-[#147efb]/10"
                />
              </label>
              <button type="button" onClick={() => setDirection((value) => value === "cny-rub" ? "rub-cny" : "cny-rub")} className="grid size-11 place-items-center rounded-xl border border-[#cfdde9] bg-white text-[#147efb] transition hover:border-[#147efb] hover:bg-[#f2f8ff]" aria-label="Поменять направление">
                <ArrowRightLeft className="size-4" />
              </button>
              <div>
                <p className="text-xs font-bold text-[#6f86a4]">{direction === "cny-rub" ? "CNY → RUB" : "RUB → CNY"}</p>
                <div className="mt-2 flex min-h-11 items-center rounded-xl border border-[#cfdde9] bg-white px-3 text-lg font-black text-[#10285c]">
                  {result == null ? "—" : `${formatter.format(result)} ${outputCurrency}`}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm font-black text-[#173368]"><Building2 className="size-4 text-[#147efb]" /> Где купить/продать наличный CNY — {data.cityLabel}</div>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-[#dfe8f1] bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f5f8fb] text-xs font-bold uppercase tracking-[0.08em] text-[#7186a2]">
                <tr><th className="px-4 py-3">Банк</th><th className="px-4 py-3">Банк покупает CNY</th><th className="px-4 py-3">Банк продаёт CNY</th><th className="px-4 py-3">Обновлено</th></tr>
              </thead>
              <tbody>
                {data.bankRates.map((rate, index) => (
                  <tr key={`${rate.bank}-${rate.updatedAt}-${index}`} className="border-t border-[#e7eef5]">
                    <td className="px-4 py-3 font-black text-[#173368]"><a href={rate.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#147efb]">{rate.bank?.trim() || `Банк ${index + 1}`}</a></td>
                    <td className="px-4 py-3 font-semibold text-[#405f82]">{rateFormatter.format(rate.buy)} ₽</td>
                    <td className="px-4 py-3 font-black text-[#147efb]">{rateFormatter.format(rate.sell)} ₽</td>
                    <td className="px-4 py-3 text-xs font-medium text-[#8193aa]">{rate.updatedAt}</td>
                  </tr>
                ))}
                {data.bankRates.length === 0 && (
                  <tr className="border-t border-[#e7eef5]"><td colSpan={4} className="px-4 py-6 text-center text-sm text-[#7186a2]">Банковские курсы сейчас недоступны. Попробуйте обновить данные позже.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-col gap-1 text-xs font-medium leading-5 text-[#8193aa] sm:flex-row sm:items-center sm:justify-between">
            <span>{data.mode === "live" ? "Онлайн-данные получены успешно." : "Часть данных показана из резервного снимка."}</span>
            <span>Получено сервером: {new Date(data.fetchedAt).toLocaleString("ru-RU")}</span>
          </div>
          {data.warnings.length > 0 && <p className="mt-2 rounded-xl border border-[#f2deb9] bg-[#fff9ef] px-3 py-2 text-xs leading-5 text-[#8a651f]">{data.warnings.join(" ")}</p>}
        </>
      ) : (
        <div className="mt-5 rounded-2xl border border-[#f2deb9] bg-[#fff9ef] p-4 text-sm text-[#7b6741]">Курсы сейчас недоступны. Повторите обновление; остальная часть раздела продолжает работать.</div>
      )}
    </section>
  );
}
