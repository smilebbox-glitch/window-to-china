"use client";

import { useState } from "react";
import { CheckCircle2, MessageSquareText, Send } from "lucide-react";

const functions = ["R&D", "Закупки", "Логистика", "Производство", "Качество", "Руководство", "Другое"];
const outcomes = [
  ["useful_signal", "Нашёл полезный сигнал"],
  ["saved_time", "Сэкономил время"],
  ["decision_support", "Помогло принять/подготовить решение"],
  ["data_quality", "Есть замечание к данным"],
  ["issue", "Нашёл проблему в сервисе"],
  ["no_value", "Пока не вижу пользы"],
  ["other", "Другое"],
] as const;

export function PilotFeedbackForm() {
  const [workFunction, setWorkFunction] = useState("R&D");
  const [rating, setRating] = useState(4);
  const [usefulness, setUsefulness] = useState(4);
  const [savedMinutes, setSavedMinutes] = useState(0);
  const [outcome, setOutcome] = useState("useful_signal");
  const [section, setSection] = useState("Новости");
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("sending");
    try {
      const response = await fetch("/api/pilot/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workFunction, rating, usefulness, savedMinutes, outcome, section, comment }),
      });
      if (!response.ok) throw new Error("feedback failed");
      setState("done");
      setComment("");
    } catch {
      setState("error");
    }
  }

  return (
    <main className="mgc-surface min-h-[calc(100vh-4rem)] text-zinc-950">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="border border-zinc-300 bg-white p-6 shadow-[0_18px_60px_rgba(18,24,35,0.08)] sm:p-8">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#285fff]"><MessageSquareText className="size-4" /> Controlled Pilot · v1.7.5</div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Обратная связь по «Окну в Китай»</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-600">Нам важно понять не «нравится ли сайт», а помог ли он быстрее заметить полезную информацию, сэкономить время или подготовить решение. Имя и почта в этой форме не сохраняются.</p>

          {state === "done" ? (
            <div className="mt-8 border border-emerald-300 bg-emerald-50 p-5 text-sm text-emerald-800"><div className="flex items-center gap-2 font-black"><CheckCircle2 className="size-5" /> Отзыв сохранён</div><p className="mt-2">Спасибо. Можно продолжать пользоваться сервисом и отправить новый отзыв позже, если появится конкретный полезный кейс или проблема.</p><button type="button" onClick={() => setState("idle")} className="mt-4 border border-emerald-400 px-4 py-2 text-xs font-black uppercase tracking-[0.08em]">Отправить ещё</button></div>
          ) : (
            <form onSubmit={submit} className="mt-8 grid gap-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Функция">
                  <select value={workFunction} onChange={(e) => setWorkFunction(e.target.value)} className="h-11 w-full border border-zinc-300 bg-white px-3 text-sm">{functions.map((item) => <option key={item}>{item}</option>)}</select>
                </Field>
                <Field label="Что произошло">
                  <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="h-11 w-full border border-zinc-300 bg-white px-3 text-sm">{outcomes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                </Field>
                <Field label="Общая оценка 1–5"><Score value={rating} onChange={setRating} /></Field>
                <Field label="Практическая полезность 1–5"><Score value={usefulness} onChange={setUsefulness} /></Field>
                <Field label="Сколько минут примерно сэкономлено">
                  <input type="number" min={0} max={480} step={5} value={savedMinutes} onChange={(e) => setSavedMinutes(Number(e.target.value))} className="h-11 w-full border border-zinc-300 px-3 text-sm" />
                </Field>
                <Field label="Раздел">
                  <select value={section} onChange={(e) => setSection(e.target.value)} className="h-11 w-full border border-zinc-300 bg-white px-3 text-sm"><option>Новости</option><option>Грузовики</option><option>Решения</option><option>Руководство</option><option>ИИ-анализ</option><option>Рынок</option><option>Календарь</option><option>Перед поездкой</option><option>Другое</option></select>
                </Field>
              </div>
              <Field label="Коротко: что было полезно или что нужно исправить">
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1200} rows={5} className="w-full border border-zinc-300 p-3 text-sm" placeholder="Например: увидел изменение по китайским HCV раньше, чем в обычной подборке; нужно уточнить источник цифры..." />
              </Field>
              {state === "error" && <p className="text-sm font-bold text-red-700">Не удалось сохранить отзыв. Попробуйте ещё раз.</p>}
              <button disabled={state === "sending"} className="inline-flex h-12 items-center justify-center gap-2 bg-[#285fff] px-6 text-sm font-black text-white disabled:opacity-60"><Send className="size-4" /> {state === "sending" ? "Сохраняю..." : "Отправить отзыв"}</button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2"><span className="text-xs font-black uppercase tracking-[0.08em] text-zinc-500">{label}</span>{children}</label>;
}

function Score({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <div className="grid grid-cols-5 gap-2">{[1,2,3,4,5].map((score) => <button key={score} type="button" onClick={() => onChange(score)} className={`h-11 border text-sm font-black ${value === score ? "border-[#285fff] bg-[#285fff] text-white" : "border-zinc-300 bg-white text-zinc-700"}`}>{score}</button>)}</div>;
}
