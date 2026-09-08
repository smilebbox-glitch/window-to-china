"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, MessageSquareText, Send, ShieldCheck } from "lucide-react";

type Me = {
  cohort: string;
  enforcement: boolean;
  eligible: boolean;
  member: null | { participantCode: string; department: string; pilotRole: string; status: string; joinedAt: string };
};

const categories = [
  ["general", "Общее впечатление"],
  ["news", "Новости / источники"],
  ["trucks", "Грузовики"],
  ["decision", "Decision Cockpit"],
  ["executive", "Executive Brief"],
  ["market", "Рыночные данные"],
  ["usability", "Интерфейс"],
  ["data-quality", "Качество данных"],
];

export function PilotFeedback() {
  const [me, setMe] = useState<Me | null>(null);
  const [rating, setRating] = useState(4);
  const [category, setCategory] = useState("general");
  const [severity, setSeverity] = useState("note");
  const [usefulSignal, setUsefulSignal] = useState(false);
  const [savedMinutes, setSavedMinutes] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/pilot/me", { cache: "no-store" }).then(async (response) => {
      if (response.ok) setMe(await response.json() as Me);
    });
  }, []);

  async function submit() {
    if (!comment.trim()) {
      setMessage("Опишите, что было полезно или что нужно исправить.");
      return;
    }
    setSending(true);
    setMessage("");
    try {
      const response = await fetch("/api/pilot/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, severity, rating, usefulSignal, savedMinutes, comment }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Не удалось сохранить feedback.");
      setComment("");
      setUsefulSignal(false);
      setSavedMinutes(0);
      setSeverity("note");
      setMessage("Спасибо. Feedback добавлен в журнал текущей пилотной волны.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить feedback.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mgc-surface min-h-[calc(100vh-4rem)] text-zinc-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="border border-zinc-300 bg-white p-6 shadow-[0_18px_60px_rgba(18,24,35,0.08)] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#285fff]"><MessageSquareText className="size-4" /> Controlled Corporate Pilot</p>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Обратная связь по «Окну в Китай»</h1>
              <p className="mt-4 text-sm leading-6 text-zinc-600">Нам важны не общие впечатления, а конкретная бизнес-польза: нашли ли вы сигнал раньше обычного, сэкономили ли время, какие данные вызывают сомнения и что мешает использовать сервис в работе.</p>
            </div>
            <div className="border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-zinc-600">
              <p className="flex items-center gap-2 font-black text-[#285fff]"><ShieldCheck className="size-4" /> {me?.cohort || "pilot"}</p>
              <p className="mt-1">{me?.member ? `${me.member.participantCode} · ${me.member.department} · ${me.member.status}` : "Проверяем участие…"}</p>
            </div>
          </div>

          {me && !me.eligible ? (
            <div className="mt-7 border border-orange-300 bg-orange-50 p-5 text-sm leading-6 text-zinc-700">
              Feedback доступен активным участникам текущей волны. Попросите Pilot Admin активировать ваш SSO subject в cohort <strong>{me.cohort}</strong>.
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="space-y-5">
                <Field label="Раздел">
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full border border-zinc-300 bg-white px-3 py-3 text-sm outline-none focus:border-[#285fff]">
                    {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>

                <Field label="Общая оценка">
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} className={`border px-3 py-3 text-sm font-black ${rating === value ? "border-[#285fff] bg-[#285fff] text-white" : "border-zinc-300 bg-white text-zinc-600"}`}>{value}</button>)}
                  </div>
                </Field>

                <Field label="Влияние проблемы">
                  <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="w-full border border-zinc-300 bg-white px-3 py-3 text-sm outline-none focus:border-[#285fff]">
                    <option value="note">Замечание / идея</option>
                    <option value="minor">Небольшая проблема</option>
                    <option value="major">Серьёзно мешает работе</option>
                    <option value="blocker">Блокирует использование</option>
                  </select>
                </Field>
              </div>

              <div className="space-y-5">
                <label className="flex items-start gap-3 border border-zinc-300 bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
                  <input type="checkbox" checked={usefulSignal} onChange={(event) => setUsefulSignal(event.target.checked)} className="mt-1 size-4" />
                  <span><strong className="block text-zinc-950">Нашёл полезный бизнес-сигнал</strong>Отметьте, если сервис помог заметить важную новость, риск, рыночное изменение или возможность.</span>
                </label>

                <Field label="Оценка сэкономленного времени, минут">
                  <input type="number" min={0} max={1440} step={5} value={savedMinutes} onChange={(event) => setSavedMinutes(Number(event.target.value))} className="w-full border border-zinc-300 bg-white px-3 py-3 text-sm outline-none focus:border-[#285fff]" />
                </Field>

                <Field label="Что произошло и что нужно сделать">
                  <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={7} maxLength={4000} placeholder="Например: увидел изменение по HCV раньше, чем в обычной подборке; не хватает ссылки на первичный документ; фильтр грузовиков сработал корректно…" className="w-full resize-y border border-zinc-300 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#285fff]" />
                </Field>
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-4 border-t border-zinc-200 pt-6">
            <button type="button" disabled={sending || Boolean(me && !me.eligible)} onClick={() => void submit()} className="inline-flex items-center gap-2 bg-[#285fff] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
              <Send className="size-4" /> {sending ? "Сохраняем…" : "Отправить feedback"}
            </button>
            {message && <p className="flex items-center gap-2 text-sm text-zinc-600"><CheckCircle2 className="size-4 text-[#285fff]" /> {message}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-zinc-500">{label}</span>{children}</label>;
}
