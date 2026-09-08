"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, RefreshCw, ShieldAlert, Timer, WifiOff } from "lucide-react";

type Operations = {
  decision: "GO" | "NO_GO";
  briefStatus: "GO" | "DEGRADED" | "STALE";
  executiveMinimumRole: string;
  aggregate: {
    available: boolean;
    fetchedAt: string | null;
    ageSeconds: number | null;
    qualityScore: number | null;
    itemCount: number;
    state: string;
    sourceCount: number;
    totalSources: number;
  };
  sources: { fresh: number; stale: number; error: number; empty: number; total: number; degraded: Array<{ source: string; state: string; items: number; latencyMs: number }> };
  sla: { maxAgeSeconds: number; minQuality: number };
  database: { available: boolean; migrationsPending?: number };
  reasons: string[];
};

function minutes(seconds: number | null) {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds} сек`;
  return `${Math.floor(seconds / 60)} мин`;
}

export function ExecutiveOperationsPanel() {
  const [status, setStatus] = useState<Operations | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/pilot/operations", { cache: "no-store", signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error("operations unavailable");
      setStatus(await response.json() as Operations);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (failed && !status) {
    return (
      <section className="mx-auto mt-6 max-w-[1500px] border border-red-300 bg-red-50 px-5 py-4 text-sm text-red-800">
        <div className="flex items-center gap-2 font-black"><WifiOff className="size-4" /> Operational status недоступен</div>
        <p className="mt-1 text-xs">Не используйте управленческий brief как подтверждённый источник до восстановления operational endpoint.</p>
      </section>
    );
  }

  if (!status) return <div className="mx-auto mt-6 max-w-[1500px] px-4 text-xs text-zinc-500">Проверка operational readiness…</div>;

  const tone = status.briefStatus === "GO"
    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
    : status.briefStatus === "DEGRADED"
      ? "border-orange-300 bg-orange-50 text-orange-900"
      : "border-red-300 bg-red-50 text-red-900";
  const Icon = status.briefStatus === "GO" ? CheckCircle2 : status.briefStatus === "DEGRADED" ? AlertTriangle : ShieldAlert;

  return (
    <section className="mx-auto mt-6 max-w-[1500px] px-4 sm:px-6 lg:px-8 print:hidden">
      <div className={`border p-5 ${tone}`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em]"><Icon className="size-4" /> Pilot Operations · {status.briefStatus}</div>
            <h2 className="mt-2 text-xl font-black">Go/No-Go: {status.decision}</h2>
            <p className="mt-1 text-xs opacity-75">Executive minimum role: {status.executiveMinimumRole}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Kpi icon={Timer} label="Возраст данных" value={minutes(status.aggregate.ageSeconds)} />
            <Kpi icon={Database} label="Quality" value={status.aggregate.qualityScore == null ? "—" : `${status.aggregate.qualityScore}/100`} />
            <Kpi icon={CheckCircle2} label="Fresh sources" value={`${status.sources.fresh}/${status.sources.total || status.aggregate.totalSources}`} />
            <Kpi icon={AlertTriangle} label="Stale / Error" value={`${status.sources.stale} / ${status.sources.error}`} />
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex h-10 items-center justify-center gap-2 border border-current px-3 text-xs font-black uppercase tracking-[0.08em]" disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Проверить
          </button>
        </div>

        <div className="mt-4 grid gap-4 border-t border-current/15 pt-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.12em] opacity-65">Причины статуса</p>
            <ul className="mt-2 space-y-1 text-xs leading-5">
              {status.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
            </ul>
          </div>
          <div className="text-xs leading-5 opacity-75">
            <p>SLA freshness: ≤ {Math.round(status.sla.maxAgeSeconds / 60)} мин · min quality: {status.sla.minQuality}/100.</p>
            <p>Aggregate: {status.aggregate.state} · {status.aggregate.itemCount} материалов · {status.aggregate.sourceCount}/{status.aggregate.totalSources} live sources.</p>
            {status.aggregate.fetchedAt && <p>Последнее обновление: {new Date(status.aggregate.fetchedAt).toLocaleString("ru-RU")}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: typeof Timer; label: string; value: string }) {
  return <div className="min-w-[130px] border border-current/20 bg-white/40 px-3 py-2"><p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.09em] opacity-60"><Icon className="size-3" /> {label}</p><p className="mt-1 text-sm font-black tabular-nums">{value}</p></div>;
}
