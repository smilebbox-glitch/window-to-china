"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, RefreshCw, ShieldAlert, SquareActivity, Users } from "lucide-react";

type Report = {
  outcome: "GO" | "ADJUST" | "STOP";
  generatedAt: string;
  policy: { windowDays: number; targetMinUsers: number; targetMaxUsers: number; minFeedback: number; minUsefulPct: number; minRepeatPct: number };
  operations: { decision: string; briefStatus: string };
  cohort: { activeUsers: number; repeatUsers: number; repeatPct: number; participants: Array<{ code: string; firstSeen: string; lastSeen: string; events: number; activeDays: number }> };
  usage: { totalEvents: number; decisionViews: number; executiveViews: number; truckViews: number; pages: Array<{ path: string; views: number; users: number }> };
  feedback: { responses: number; respondents: number; avgRating: number; avgUsefulness: number; usefulPct: number; savedMinutes: number; functions: Array<{ workFunction: string; count: number }> };
  issues: { open: number; openBySeverity: { S1: number; S2: number; S3: number; S4: number }; total: number };
  reasons: string[];
};

type Issue = { id: string; severity: string; title: string; description: string; status: string; source: string; updatedAt: string };

export function PilotControlRoom({ canManageIssues }: { canManageIssues: boolean }) {
  const [report, setReport] = useState<Report | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState("S3");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const reportResponse = await fetch("/api/pilot/report", { cache: "no-store" });
      if (reportResponse.ok) setReport(await reportResponse.json() as Report);
      if (canManageIssues) {
        const issueResponse = await fetch("/api/admin/pilot/issues", { cache: "no-store" });
        if (issueResponse.ok) setIssues((await issueResponse.json() as { issues: Issue[] }).issues || []);
      }
    } finally { setLoading(false); }
  }, [canManageIssues]);

  useEffect(() => { void load(); }, [load]);

  async function createIssue(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    const response = await fetch("/api/admin/pilot/issues", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ severity, title, description, status: "open", source: "pilot-control-room" }) });
    if (response.ok) { setTitle(""); setDescription(""); await load(); }
  }

  async function setIssueStatus(issue: Issue, status: "open" | "mitigated" | "closed") {
    const response = await fetch("/api/admin/pilot/issues", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: issue.id, severity: issue.severity, title: issue.title, description: issue.description, source: issue.source, status }),
    });
    if (response.ok) await load();
  }

  const outcomeClass = report?.outcome === "GO" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : report?.outcome === "STOP" ? "border-red-300 bg-red-50 text-red-800" : "border-orange-300 bg-orange-50 text-orange-800";

  return (
    <main className="mgc-surface min-h-[calc(100vh-4rem)] text-zinc-950">
      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <section className="border border-zinc-300 bg-white p-6 shadow-[0_18px_60px_rgba(18,24,35,0.08)] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#285fff]">v1.7.5 · Controlled Corporate Pilot</p><h1 className="mt-2 text-4xl font-black tracking-[-0.05em]">Pilot Control Room</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">Агрегированные KPI пилота 5–10 сотрудников. Участники отображаются псевдонимами P-XXXXXX; имена и email здесь не сохраняются.</p></div>
            <button type="button" onClick={() => void load()} className="inline-flex h-10 items-center gap-2 border border-zinc-300 px-4 text-xs font-black uppercase tracking-[0.08em]"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Обновить</button>
          </div>
        </section>

        {report && <>
          <section className={`mt-5 border p-5 ${outcomeClass}`}><div className="flex items-center gap-3"><OutcomeIcon outcome={report.outcome} /><div><p className="text-xs font-black uppercase tracking-[0.12em]">Итог пилота на текущих данных</p><p className="mt-1 text-3xl font-black">{report.outcome}</p></div></div><div className="mt-4 grid gap-2 text-sm">{report.reasons.map((reason) => <p key={reason}>• {reason}</p>)}</div></section>

          <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <Metric label="Участники" value={`${report.cohort.activeUsers}`} note={`цель ${report.policy.targetMinUsers}–${report.policy.targetMaxUsers}`} icon={Users} />
            <Metric label="Повторное использование" value={`${report.cohort.repeatPct}%`} note={`цель ≥ ${report.policy.minRepeatPct}%`} icon={SquareActivity} />
            <Metric label="Feedback" value={`${report.feedback.respondents}`} note={`${report.feedback.responses} ответов`} icon={ClipboardCheck} />
            <Metric label="Полезность" value={`${report.feedback.usefulPct}%`} note={`средняя ${report.feedback.avgUsefulness}/5`} icon={CheckCircle2} />
            <Metric label="Сэкономлено" value={`${report.feedback.savedMinutes}`} note="минут по самооценке" icon={CheckCircle2} />
            <Metric label="S1 / S2" value={`${report.issues.openBySeverity.S1} / ${report.issues.openBySeverity.S2}`} note={`${report.issues.open} open issues`} icon={ShieldAlert} />
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="border border-zinc-300 bg-white">
              <div className="border-b border-zinc-200 p-5"><p className="text-xs font-black uppercase tracking-[0.12em] text-[#285fff]">Cohort</p><h2 className="mt-1 text-2xl font-black">Фактические участники за {report.policy.windowDays} дней</h2></div>
              <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-zinc-50 text-xs uppercase tracking-[0.08em] text-zinc-500"><tr><th className="p-3">Код</th><th className="p-3">Активных дней</th><th className="p-3">Событий</th><th className="p-3">Последняя активность</th></tr></thead><tbody>{report.cohort.participants.map((participant) => <tr key={participant.code} className="border-t border-zinc-100"><td className="p-3 font-black">{participant.code}</td><td className="p-3">{participant.activeDays}</td><td className="p-3">{participant.events}</td><td className="p-3 text-zinc-500">{new Date(participant.lastSeen).toLocaleString("ru-RU")}</td></tr>)}</tbody></table></div>
            </div>
            <div className="border border-zinc-300 bg-white p-5"><p className="text-xs font-black uppercase tracking-[0.12em] text-[#285fff]">Использование ключевых контуров</p><div className="mt-5 space-y-4"><Bar label="Decision Cockpit" value={report.usage.decisionViews} /><Bar label="Executive Brief" value={report.usage.executiveViews} /><Bar label="Truck Radar" value={report.usage.truckViews} /><Bar label="Всего product page views" value={report.usage.totalEvents} /></div><p className="mt-6 text-xs leading-5 text-zinc-500">Это usage telemetry для оценки пилота, а не рейтинг производительности сотрудников.</p></div>
          </section>
        </>}

        <section className="mt-5 grid gap-5 xl:grid-cols-2">
          <div className="border border-zinc-300 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#285fff]">Issue register</p><h2 className="mt-1 text-2xl font-black">S1–S4</h2>
            {canManageIssues ? <div className="mt-5 space-y-3">{issues.length ? issues.map((issue) => <div key={issue.id} className="border border-zinc-200 p-3"><div className="flex items-center justify-between gap-3"><span className={`text-xs font-black ${issue.severity === "S1" || issue.severity === "S2" ? "text-red-700" : "text-zinc-600"}`}>{issue.severity} · {issue.status}</span><span className="text-xs text-zinc-400">{new Date(issue.updatedAt).toLocaleDateString("ru-RU")}</span></div><p className="mt-2 font-bold">{issue.title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{issue.description}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void setIssueStatus(issue, "open")} className="border border-zinc-300 px-2 py-1 text-[10px] font-black uppercase">Open</button><button type="button" onClick={() => void setIssueStatus(issue, "mitigated")} className="border border-orange-300 bg-orange-50 px-2 py-1 text-[10px] font-black uppercase text-orange-700">Mitigated</button><button type="button" onClick={() => void setIssueStatus(issue, "closed")} className="border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-700">Closed</button></div></div>) : <p className="text-sm text-zinc-500">Issues пока не зарегистрированы.</p>}</div> : <p className="mt-4 text-sm text-zinc-500">Детальный issue register доступен администратору. В агрегированных KPI выше видны только количества S1–S4.</p>}
          </div>
          {canManageIssues && <form onSubmit={createIssue} className="border border-zinc-300 bg-white p-5"><p className="text-xs font-black uppercase tracking-[0.12em] text-[#285fff]">Регистрация проблемы</p><div className="mt-4 grid gap-3"><select value={severity} onChange={(e) => setSeverity(e.target.value)} className="h-10 border border-zinc-300 px-3 text-sm"><option>S1</option><option>S2</option><option>S3</option><option>S4</option></select><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Краткое название" className="h-10 border border-zinc-300 px-3 text-sm" /><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание / воспроизведение / влияние" rows={5} className="border border-zinc-300 p-3 text-sm" /><button className="h-10 bg-[#285fff] px-4 text-sm font-black text-white">Добавить issue</button></div></form>}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof Users }) { return <div className="border border-zinc-300 bg-white p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">{label}</p><Icon className="size-4 text-[#285fff]" /></div><p className="mt-3 text-3xl font-black">{value}</p><p className="mt-1 text-xs text-zinc-500">{note}</p></div>; }
function Bar({ label, value }: { label: string; value: number }) { return <div className="flex items-center justify-between border-b border-zinc-100 pb-3"><span className="text-sm font-semibold">{label}</span><span className="text-lg font-black text-[#285fff]">{value}</span></div>; }
function OutcomeIcon({ outcome }: { outcome: "GO" | "ADJUST" | "STOP" }) { return outcome === "GO" ? <CheckCircle2 className="size-7" /> : outcome === "STOP" ? <ShieldAlert className="size-7" /> : <AlertTriangle className="size-7" />; }
