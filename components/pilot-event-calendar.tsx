"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  Clock3,
  FileCheck2,
  Hotel,
  Luggage,
  MapPin,
  Plane,
  Ticket,
} from "lucide-react";
import { autoEvents, eventGuidance, type AutoEvent } from "@/lib/data";
import { eventTravelPlans, travelPriceNotice, tripDocuments } from "@/lib/travel";
import { pilotEventHotels, pilotVenueOverrides } from "@/lib/pilot-event-hotels";

type RangeFilter = "upcoming" | "all" | "past";

const fullDate = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function parseDate(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

function formatRange(event: AutoEvent) {
  if (event.start === event.end) return fullDate.format(parseDate(event.start));
  return `${fullDate.format(parseDate(event.start))} — ${fullDate.format(parseDate(event.end))}`;
}

function statusOf(event: AutoEvent, today: string) {
  if (event.end < today) return "past" as const;
  if (event.start <= today && event.end >= today) return "now" as const;
  return "upcoming" as const;
}

function toIcsDate(value: string, addOneDay = false) {
  const date = parseDate(value);
  if (addOneDay) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function downloadIcs(event: AutoEvent) {
  const venue = pilotVenueOverrides[event.id] ?? event.venue;
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Окно в Китай//RU",
    "BEGIN:VEVENT",
    `UID:${event.id}@okno-v-kitay`,
    `DTSTART;VALUE=DATE:${toIcsDate(event.start)}`,
    `DTEND;VALUE=DATE:${toIcsDate(event.end, true)}`,
    `SUMMARY:${event.name.replaceAll(",", "\\,")}`,
    `LOCATION:${venue.replaceAll(",", "\\,")}, ${event.city}`,
    `DESCRIPTION:${event.note.replaceAll("\n", "\\n")}\\n${event.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${event.id}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PilotEventCalendar() {
  const [range, setRange] = useState<RangeFilter>("upcoming");
  const [category, setCategory] = useState("Все форматы");
  const today = new Date().toISOString().slice(0, 10);

  const categories = useMemo(() => ["Все форматы", ...new Set(autoEvents.filter((event) => event.country === "Китай").map((event) => event.category))], []);
  const events = useMemo(() => [...autoEvents]
    .filter((event) => event.country === "Китай")
    .filter((event) => {
      const status = statusOf(event, today);
      if (range === "past" && status !== "past") return false;
      if (range === "upcoming" && status === "past") return false;
      return category === "Все форматы" || event.category === category;
    })
    .sort((a, b) => a.start.localeCompare(b.start)), [category, range, today]);

  return (
    <main className="px-4 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px]">
        <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#dbe7f2] bg-white p-4 shadow-[0_10px_30px_rgba(20,52,95,.06)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#147efb]">Календарь поездок</p>
            <h2 className="mt-1 text-xl font-black tracking-[-.025em] text-[#102a58]">Выставки и деловые события Китая</h2>
            <p className="mt-1 text-xs text-[#7186a2]">Для предстоящих событий показаны проверенные отели рядом с площадкой и прямые ссылки на бронирование.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {([[
              "upcoming", "Предстоящие",
            ], ["all", "Все"], ["past", "Архив"]] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setRange(value)} className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${range === value ? "border-[#147efb] bg-[#147efb] text-white" : "border-[#d8e5f0] bg-white text-[#395a7e] hover:border-[#aac9e8]"}`}>{label}</button>
            ))}
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-[#d8e5f0] bg-white px-3 py-2 text-xs font-bold text-[#395a7e] outline-none focus:border-[#147efb]">
              {categories.map((value) => <option key={value}>{value}</option>)}
            </select>
          </div>
        </section>

        <div className="space-y-4">
          {events.map((event) => {
            const status = statusOf(event, today);
            const guidance = eventGuidance[event.id];
            const travel = eventTravelPlans[event.id];
            const hotels = pilotEventHotels[event.id] ?? [];
            const venue = pilotVenueOverrides[event.id] ?? event.venue;
            return (
              <article key={event.id} className="overflow-hidden rounded-2xl border border-[#dbe7f2] bg-white shadow-[0_10px_30px_rgba(20,52,95,.055)]">
                <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[150px_minmax(0,1fr)_auto] lg:items-start">
                  <div className="rounded-2xl bg-[#f3f8fd] p-4 text-center">
                    <CalendarDays className="mx-auto size-5 text-[#147efb]" />
                    <p className="mt-3 text-sm font-black text-[#102a58]">{new Date(`${event.start}T12:00:00Z`).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" })}</p>
                    <p className="mt-1 text-[11px] text-[#7186a2]">{new Date(`${event.start}T12:00:00Z`).getUTCFullYear()}</p>
                    {status === "now" && <span className="mt-3 inline-flex rounded-full bg-[#e9f8f2] px-2.5 py-1 text-[10px] font-black uppercase text-[#087458]">идёт сейчас</span>}
                    {status === "past" && <span className="mt-3 inline-flex rounded-full bg-[#f1f4f7] px-2.5 py-1 text-[10px] font-black uppercase text-[#7288a4]">завершено</span>}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#eaf4ff] px-2.5 py-1 text-[10px] font-black uppercase tracking-[.06em] text-[#126edb]">{event.category}</span>
                      {event.priority === "high" && <span className="rounded-full bg-[#fff2df] px-2.5 py-1 text-[10px] font-black uppercase tracking-[.06em] text-[#a65a00]">приоритет</span>}
                    </div>
                    <h3 className="mt-3 text-xl font-black tracking-[-.025em] text-[#102a58]">{event.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#607995]">{event.note}</p>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#7186a2]">
                      <span className="inline-flex items-center gap-1.5"><Clock3 className="size-4" />{formatRange(event)}</span>
                      <span className="inline-flex items-start gap-1.5"><MapPin className="mt-0.5 size-4 shrink-0" />{event.city} · {venue}</span>
                    </div>
                    {guidance && (
                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        <MiniFact label="Зачем ехать" value={guidance.whyGo} />
                        <MiniFact label="Как попасть" value={guidance.access} />
                        <MiniFact label="Билет" value={guidance.ticketPrice} />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 lg:w-44 lg:flex-col">
                    <a href={guidance?.registrationUrl ?? event.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#0e315c] px-3 text-xs font-black text-white transition hover:bg-[#0a274c]">Регистрация <ArrowUpRight className="size-4" /></a>
                    <a href={event.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#d8e5f0] bg-white px-3 text-xs font-bold text-[#234a75] transition hover:bg-[#f6faff]">Официальный сайт <ArrowUpRight className="size-4" /></a>
                    <button type="button" onClick={() => downloadIcs(event)} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#d8e5f0] bg-white px-3 text-xs font-bold text-[#234a75] transition hover:bg-[#f6faff]"><CalendarPlus className="size-4" />В календарь</button>
                  </div>
                </div>

                {travel && status !== "past" && (
                  <details className="group border-t border-[#e2ebf3] bg-[#f8fbfe]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-black text-[#17345f] sm:px-6">
                      <span className="inline-flex items-center gap-2"><Luggage className="size-4 text-[#147efb]" />Перелёт, проверенные отели и подготовка</span>
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="grid gap-3 border-t border-[#e2ebf3] p-5 sm:p-6 lg:grid-cols-2">
                      <TravelCard icon={Plane} title="Перелёт из Москвы">
                        <p className="text-sm font-black text-[#17345f]">{travel.flightPrice}</p>
                        <p className="mt-1 text-xs leading-5 text-[#607995]">{travel.journeyFromSvo} · {travel.journeyBreakdown}</p>
                        <a href={travel.flightUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[#147efb]">Проверить рейсы <ArrowUpRight className="size-3.5" /></a>
                      </TravelCard>

                      <TravelCard icon={Hotel} title="Отели рядом с площадкой">
                        <p className="text-xs leading-5 text-[#607995]">{travel.stayBudget}</p>
                        <div className="mt-3 space-y-2">
                          {hotels.length ? hotels.map((hotel) => (
                            <a key={hotel.name} href={hotel.bookingUrl} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-[#dce8f3] bg-white p-3 transition hover:border-[#9fc7ec] hover:shadow-sm">
                              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-[#17345f]">{hotel.name}</p><p className="mt-0.5 text-[11px] text-[#7186a2]">{hotel.chineseName}</p></div><span className="shrink-0 text-[11px] font-black text-[#147efb]">Открыть ↗</span></div>
                              <p className="mt-2 text-[11px] leading-4 text-[#405f82]">{hotel.proximity}</p>
                              <p className="mt-1 text-[11px] font-bold text-[#607995]">{hotel.nightlyPrice}</p>
                            </a>
                          )) : <p className="text-xs text-[#7186a2]">Для этой площадки проверенные варианты будут добавлены после верификации расстояния.</p>}
                        </div>
                      </TravelCard>

                      <TravelCard icon={FileCheck2} title="Документы">
                        <ul className="space-y-1.5 text-xs leading-5 text-[#607995]">{tripDocuments.slice(0, 3).map((item) => <li key={item}>• {item}</li>)}</ul>
                      </TravelCard>

                      <TravelCard icon={Ticket} title="Перед согласованием">
                        <p className="text-xs leading-5 text-[#607995]">{travelPriceNotice}</p>
                      </TravelCard>
                    </div>
                  </details>
                )}
              </article>
            );
          })}

          {events.length === 0 && <div className="rounded-2xl border border-dashed border-[#cbdbe9] bg-white px-6 py-16 text-center text-sm text-[#7186a2]">Для выбранных фильтров событий нет.</div>}
        </div>
      </div>
    </main>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#e1ebf4] bg-[#f8fbff] p-3"><p className="text-[9px] font-black uppercase tracking-[.1em] text-[#147efb]">{label}</p><p className="mt-1.5 text-xs leading-5 text-[#405f82]">{value}</p></div>;
}

function TravelCard({ icon: Icon, title, children }: { icon: typeof Plane; title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-[#dce8f3] bg-white p-4"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.08em] text-[#17345f]"><Icon className="size-4 text-[#147efb]" />{title}</div><div className="mt-3">{children}</div></section>;
}
