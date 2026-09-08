"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, RefreshCw, Save, ShieldCheck, UserPlus, Users } from "lucide-react";

type Report = {
  decision: "GO" | "ADJUST" | "STOP";
  generatedAt: string;
  reasons: string[];
  policy: { minCohort: number; targetCohort: number; activeRate: number; returnRate: number; minRating: number; minFeedback: number; minUsefulSignals: number };
  operations: { decision: string; briefStatus: string };
  metrics: {
    days: number; cohort: string; cohortSize: number; invited: number; activeUsers: number; activeRate: number; returningUsers: number; returnRate: number;
    totalEvents: number; pageViews: number; feedbackCount: number; feedbackUsers: number; avgRating: number; usefulSignals: number; savedMinutes: number;
    blockers: number; majors: number; departments: Array<{ department: string; members: number; activeUsers: number; events: number }>;
  };
};
type Member = { participantCode: string; department: string; pilotRole: string; status: string; joinedAt: string; updatedAt: string; keyFingerprint: string };
type Feedback = { id: string; participantCode: string; department: string; pilotRole: string; category: string; severity: string; rating: number; usefulSignal: boolean; savedMinutes: number; comment: string; createdAt: string };
type Review = { id: string; reviewType: string; decision: string; summary: string; createdAt: string; createdBy: string };

export function PilotControl({ canAdmin }: { canAdmin: boolean }) {
  const [report, setReport] = useState<Report | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [participantCode, setParticipantCode] = useState("");
  const [department, setDepartment] = useState("R&D");
  const [pilotRole, setPilotRole] = useState("participant");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reportResponse, cohortResponse, feedbackResponse, reviewsResponse] = await Promise.all([
        fetch("/api/pilot/report?days=14", { cache: "no-store" }),
        fetch("/api/pilot/cohort", { cache: "no-store" }),
        fetch("/api/pilot/feedback", { cache: "no-store" }),
        fetch("/api/pilot/reviews", { cache: "no-store" }),
      ]);
      if (!reportResponse.ok || !cohortResponse.ok || !feedbackResponse.ok || !reviewsResponse.ok) throw new Error("Pilot control API unavailable");
      setReport(await reportResponse.json() as Report);
      setMembers(((await cohortResponse.json()) as { members: Member[] }).members || []);
      setFeedback(((await feedbackResponse.json()) as { feedback: Feedback[] }).feedback || []);
      setReviews(((await reviewsResponse.json()) as { reviews: Review[] }).reviews || []);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить pilot control.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function enroll() {
    setMessage("");
    const response = await fetch("/api/pilot/cohort", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subject, participantCode, department, pilotRole, status: "active" }),
    });
    const payload = await response.json() as { error?: string };
    if (!response.ok) {
      setMessage(payload.error || "Не удалось добавить участника.");
      return;
    }
    setSubject("");
    setParticipantCode("");
    setMessage("Участник добавлен. Raw SSO subject в cohort table не сохранён.");
    await load();
  }

  async function createReview(reviewType: "weekly" | "final") {
    const response = await fetch("/api/pilot/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reviewType, days: reviewType === "weekly" ? 7 : 30 }),
    });
    if (!response.ok) {
      setMessage("Не удалось сохранить review snapshot.");
      return;
    }
    setMessage(reviewType === "weekly" ? "Weekly review сохранён." : "Final review сохранён.");
    await load();
  }

  const tone = report?.decision === "GO" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : report?.decision === "STOP" ? "border-red-300 bg-red-50 text-red-800" : "border-orange-300 bg-orange-50 text-orange-800";

  return (
    <main className="mgc-surface min-h-[calc(100vh-4rem)] text-zinc-950">
      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="border border-zinc-300 bg-white p-6 shadow-[0_18px_60px_rgba(18,24,35,0.08)] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#285fff]"><ShieldCheck className="size-4" /> v1.7.5 · Controlled Corporate Pilot</p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em]">Pilot Control Room</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">Одна корпоративная волна, измеримые KPI и формальный итог GO / ADJUST / STOP. Персонального Watchlist нет.</p>
            </div>
            <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 border border-zinc-300 px-4 py-2 text-xs font-black uppercase tracking-[0.08em]"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Обновить</button>
          </div>

          {report && <div className={`mt-6 border p-5 ${tone}`}><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.12em]">Pilot outcome</p><p className="mt-1 text-4xl font-black">{report.decision}</p></div><div className="max-w-3xl text-sm leading-6">{report.reasons.map((reason) => <p key={reason}>• {reason}</p>)}</div></div></div>}

          {report && <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <Metric label="Cohort" value={`${report.metrics.cohortSize}/${report.policy.targetCohort}`} note={`min ${report.policy.minCohort}`} />
            <Metric label="Активны" value={`${report.metrics.activeRate}%`} note={`${report.metrics.activeUsers} users`} />
            <Metric label="Вернулись" value={`${report.metrics.returnRate}%`} note={`${report.metrics.returningUsers} users`} />
            <Metric label="Feedback" value={String(report.metrics.feedbackCount)} note={`${report.metrics.feedbackUsers} users`} />
            <Metric label="Оценка" value={report.metrics.avgRating ? report.metrics.avgRating.toFixed(1) : "—"} note={`target ${report.policy.minRating}`} />
            <Metric label="Полезные сигналы" value={String(report.metrics.usefulSignals)} note={`target ${report.policy.minUsefulSignals}`} />
            <Metric label="Сэкономлено" value={`${report.metrics.savedMinutes} мин`} note="self-reported" />
            <Metric label="Major / Blocker" value={`${report.metrics.majors}/${report.metrics.blockers}`} note={report.operations.briefStatus} />
          </div>}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="space-y-6">
            <section className="border border-zinc-300 bg-white">
              <div className="flex items-center justify-between border-b border-zinc-200 p-5"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-[#285fff]">Wave 1</p><h2 className="mt-1 text-2xl font-black">Участники пилота</h2></div><Users className="size-5 text-[#285fff]" /></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-zinc-50 text-xs uppercase tracking-[0.08em] text-zinc-500"><tr><th className="p-3">Код</th><th className="p-3">Подразделение</th><th className="p-3">Роль</th><th className="p-3">Статус</th><th className="p-3">Key</th></tr></thead><tbody>{members.map((member) => <tr key={`${member.participantCode}-${member.keyFingerprint}`} className="border-t border-zinc-100"><td className="p-3 font-black">{member.participantCode}</td><td className="p-3">{member.department}</td><td className="p-3">{member.pilotRole}</td><td className="p-3">{member.status}</td><td className="p-3 font-mono text-xs text-zinc-400">{member.keyFingerprint}…</td></tr>)}{!members.length && <tr><td colSpan={5} className="p-5 text-zinc-500">Cohort ещё не заполнен.</td></tr>}</tbody></table></div>
            </section>

            <section className="border border-zinc-300 bg-white">
              <div className="border-b border-zinc-200 p-5"><p className="text-xs font-black uppercase tracking-[0.12em] text-[#285fff]">Feedback register</p><h2 className="mt-1 text-2xl font-black">Последние замечания участников</h2></div>
              <div className="divide-y divide-zinc-100">{feedback.slice(0, 20).map((item) => <article key={item.id} className="grid gap-3 p-5 md:grid-cols-[150px_minmax(0,1fr)_130px]"><div><p className="font-black">{item.participantCode}</p><p className="text-xs text-zinc-500">{item.department}</p><p className="mt-2 text-xs uppercase text-zinc-400">{item.category}</p></div><div><p className="text-sm leading-6 text-zinc-700">{item.comment}</p><p className="mt-2 text-xs text-zinc-400">{new Date(item.createdAt).toLocaleString("ru-RU")}</p></div><div className="text-xs"><p className={`font-black uppercase ${item.severity === "blocker" ? "text-red-700" : item.severity === "major" ? "text-orange-700" : "text-zinc-600"}`}>{item.severity}</p><p className="mt-2">Оценка {item.rating}/5</p><p className="mt-1">Сигнал: {item.usefulSignal ? "да" : "нет"}</p><p className="mt-1">Экономия: {item.savedMinutes} мин</p></div></article>)}{!feedback.length && <p className="p-5 text-sm text-zinc-500">Feedback пока не поступал.</p>}</div>
            </section>
          </div>

          <aside className="space-y-5">
            {canAdmin && <section className="border border-zinc-300 bg-white p-5"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#285fff]"><UserPlus className="size-4" /> Admin · Cohort enrollment</p><div className="mt-4 space-y-3"><input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="SSO subject / login" className="w-full border border-zinc-300 px-3 py-2 text-sm" /><input value={participantCode} onChange={(event) => setParticipantCode(event.target.value)} placeholder="Код, например P01" className="w-full border border-zinc-300 px-3 py-2 text-sm" /><select value={department} onChange={(event) => setDepartment(event.target.value)} className="w-full border border-zinc-300 px-3 py-2 text-sm"><option>R&D</option><option>Качество</option><option>Производство</option><option>Логистика</option><option>Закупки</option><option>Коммерческий блок</option><option>Руководство</option><option>IT</option></select><select value={pilotRole} onChange={(event) => setPilotRole(event.target.value)} className="w-full border border-zinc-300 px-3 py-2 text-sm"><option value="participant">participant</option><option value="manager">manager</option><option value="sponsor">sponsor</option><option value="admin">admin</option></select><button type="button" onClick={() => void enroll()} disabled={!subject.trim() || !participantCode.trim()} className="inline-flex w-full items-center justify-center gap-2 bg-[#285fff] px-4 py-3 text-sm font-black text-white disabled:opacity-40"><UserPlus className="size-4" /> Добавить / обновить</button><p className="text-xs leading-5 text-zinc-500">Raw SSO subject используется только для расчёта HMAC и не сохраняется в `pilot_members`.</p></div></section>}

            <section className="border border-zinc-300 bg-white p-5"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#285fff]"><Save className="size-4" /> Review snapshots</p><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => void createReview("weekly")} className="border border-zinc-300 px-3 py-3 text-xs font-black">Weekly review</button><button type="button" onClick={() => void createReview("final")} className="bg-[#101114] px-3 py-3 text-xs font-black text-white">Final review</button></div><div className="mt-4 space-y-3">{reviews.slice(0, 8).map((review) => <div key={review.id} className="border-t border-zinc-200 pt-3 text-xs"><div className="flex justify-between gap-2"><span className="font-black uppercase">{review.reviewType}</span><span className={review.decision === "GO" ? "text-emerald-700" : review.decision === "STOP" ? "text-red-700" : "text-orange-700"}>{review.decision}</span></div><p className="mt-1 text-zinc-500">{new Date(review.createdAt).toLocaleString("ru-RU")}</p></div>)}</div></section>

            {report && <section className="border border-zinc-300 bg-[#101114] p-5 text-white"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#7d9aff]"><Activity className="size-4" /> Подразделения</p><div className="mt-4 space-y-3">{report.metrics.departments.map((item) => <div key={item.department} className="border-b border-white/10 pb-2 text-sm"><div className="flex justify-between"><span>{item.department}</span><span className="font-black text-[#7d9aff]">{item.activeUsers}/{item.members}</span></div><p className="mt-1 text-xs text-zinc-500">{item.events} событий</p></div>)}</div></section>}
          </aside>
        </div>

        {message && <div className="mt-5 flex items-center gap-2 border border-blue-200 bg-blue-50 p-4 text-sm text-zinc-700"><CheckCircle2 className="size-4 text-[#285fff]" /> {message}</div>}
      </div>
    </main>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="border border-zinc-200 bg-zinc-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">{label}</p><p className="mt-2 text-2xl font-black tracking-[-0.04em]">{value}</p><p className="mt-1 text-[11px] text-zinc-500">{note}</p></div>;
}
