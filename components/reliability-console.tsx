"use client";

import { useEffect, useState } from "react";
import { Database, RefreshCw, ShieldCheck, ShieldX, TimerReset } from "lucide-react";

type ReliabilityPayload = {
  serviceLevel: "HEALTHY" | "STALE" | "DEGRADED" | "WARMING_UP";
  pilotOperations: {
    decision: "GO" | "NO_GO";
    briefStatus: "GO" | "DEGRADED" | "STALE";
    aggregate: {
      available: boolean;
      ageSeconds: number | null;
      qualityScore: number | null;
      itemCount: number;
      state: string;
      sourceCount: number;
      totalSources: number;
    };
    sources: { fresh: number; stale: number; error: number; empty: number; total: number };
    sla: { maxAgeSeconds: number; minQuality: number };
    reasons: string[];
  };
  database: { available: boolean; path: string; snapshots: number; contentItems: number; error?: string };
  scheduler: { configured: boolean; intervalSeconds: number };
  content: Record<string, number>;
  reliability: {
    sources: Array<{ sourceKey: string; scope: string; runs: number; avgQuality: number; successfulRuns: number; lastRun: string; lastSuccess: string }>;
    snapshots: Array<{ cacheKey: string; sourceKey: string; scope: string; fetchedAt: string; status: string; qualityScore: number; itemCount: number; state: "fresh" | "stale" | "expired"; ageSeconds: number; error: string }>;
  };
};

function tokenHeaders(token: string): Record<string, string> { return token ? { "x-admin-token": token } : {}; }
function age(value: number) { if (value < 60) return `${value}с`; if (value < 3600) return `${Math.floor(value / 60)}м`; return `${Math.floor(value / 3600)}ч`; }

export function ReliabilityConsole({ token }: { token: string }) {
  const [data, setData] = useState<ReliabilityPayload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/reliability", { headers: tokenHeaders(token), cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setData(payload);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось получить reliability status."); }
    finally { setBusy(false); }
  }
  useEffect(() => { void load(); }, [token]);

  const operations = data?.pilotOperations;

  return <section className="border border-white/10 bg-[#14161a] p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><Database className="size-5 text-[#6f91ff]"/><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Reliability</p><h2 className="text-lg font-black text-white">Хранилище, свежесть и Pilot Operations</h2></div></div>
      <button onClick={() => void load()} disabled={busy} className="inline-flex h-9 items-center gap-2 border border-white/10 px-3 text-xs font-bold text-zinc-300 disabled:opacity-50"><RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`}/> Обновить</button>
    </div>
    {error && <p className="mt-4 text-sm text-amber-300">{error}</p>}
    {data && <>
      <div className="mt-4 flex items-center justify-between border border-white/8 bg-black/10 p-3"><span className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Overall data state</span><span className={data.serviceLevel === "HEALTHY" ? "font-black text-emerald-400" : data.serviceLevel === "WARMING_UP" ? "font-black text-zinc-400" : data.serviceLevel === "STALE" ? "font-black text-amber-400" : "font-black text-red-400"}>{data.serviceLevel}</span></div>

      {operations && <div className="mt-3 border border-white/8 bg-black/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {operations.decision === "GO" ? <ShieldCheck className="size-5 text-emerald-400" /> : <ShieldX className="size-5 text-red-400" />}
            <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">IT / Pilot Operations</p><p className="mt-0.5 text-sm font-black text-white">Go/No-Go: {operations.decision}</p></div>
          </div>
          <span className={`border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${operations.briefStatus === "GO" ? "border-emerald-500/30 text-emerald-400" : operations.briefStatus === "DEGRADED" ? "border-amber-500/30 text-amber-400" : "border-red-500/30 text-red-400"}`}>Pilot Operations · {operations.briefStatus}</span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <OperationalMetric label="SLA freshness" value={`${Math.round(operations.sla.maxAgeSeconds / 60)} мин`} note={`min Q ${operations.sla.minQuality}`} />
          <OperationalMetric label="Aggregate" value={operations.aggregate.available ? operations.aggregate.state.toUpperCase() : "MISSING"} note={operations.aggregate.ageSeconds === null ? "нет snapshot" : `возраст ${age(operations.aggregate.ageSeconds)}`} />
          <OperationalMetric label="Fresh sources" value={String(operations.sources.fresh)} note={`из ${operations.sources.total}`} />
          <OperationalMetric label="Stale / Error" value={`${operations.sources.stale} / ${operations.sources.error}`} note={`empty ${operations.sources.empty}`} />
          <OperationalMetric label="Quality" value={operations.aggregate.qualityScore === null ? "—" : `${operations.aggregate.qualityScore}/100`} note={`${operations.aggregate.itemCount} материалов`} />
        </div>
        <div className="mt-4 border-t border-white/8 pt-3">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">Причины / контроль</p>
          <ul className="mt-2 space-y-1.5 text-xs leading-5 text-zinc-400">{operations.reasons.slice(0, 4).map((reason) => <li key={reason}>• {reason}</li>)}</ul>
        </div>
      </div>}

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="border border-white/8 bg-black/10 p-3"><p className="text-xs text-zinc-500">SQLite</p><p className={data.database.available ? "mt-1 font-semibold text-emerald-400" : "mt-1 font-semibold text-red-400"}>{data.database.available ? "READY" : "ERROR"}</p><p className="mt-1 truncate font-mono text-[10px] text-zinc-600">{data.database.path}</p></div>
        <div className="border border-white/8 bg-black/10 p-3"><p className="text-xs text-zinc-500">Snapshots</p><p className="mt-1 text-xl font-black text-white">{data.database.snapshots}</p><p className="mt-1 text-[11px] text-zinc-600">persistent cache</p></div>
        <div className="border border-white/8 bg-black/10 p-3"><p className="text-xs text-zinc-500">Scheduler</p><p className={data.scheduler.configured ? "mt-1 font-semibold text-emerald-400" : "mt-1 font-semibold text-amber-400"}>{data.scheduler.configured ? "CONFIGURED" : "TOKEN MISSING"}</p><p className="mt-1 text-[11px] text-zinc-600">каждые {data.scheduler.intervalSeconds} сек.</p></div>
      </div>
      <div className="mt-5 space-y-2">
        {data.reliability.snapshots.length ? data.reliability.snapshots.map((item) => <div key={item.cacheKey} className="grid gap-2 border-b border-white/6 py-3 text-xs md:grid-cols-[1.5fr_90px_90px_90px] md:items-center">
          <div><p className="font-semibold text-zinc-200">{item.sourceKey}{item.scope ? ` · ${item.scope}` : ""}</p><p className="mt-1 truncate font-mono text-[10px] text-zinc-600">{item.cacheKey}</p></div>
          <span className={item.state === "fresh" ? "font-bold text-emerald-400" : item.state === "stale" ? "font-bold text-amber-400" : "font-bold text-red-400"}>{item.state.toUpperCase()}</span>
          <span className="text-zinc-400">Q {item.qualityScore}/100</span>
          <span className="inline-flex items-center gap-1 text-zinc-500"><TimerReset className="size-3"/>{age(item.ageSeconds)}</span>
        </div>) : <p className="text-sm text-zinc-500">Snapshots появятся после первого успешного обновления источников.</p>}
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {data.reliability.sources.slice(0, 12).map((item) => <div key={`${item.sourceKey}:${item.scope}`} className="border border-white/6 bg-black/10 p-3 text-xs"><div className="flex justify-between gap-3"><span className="truncate font-semibold text-zinc-300">{item.sourceKey}</span><span className={item.avgQuality >= 80 ? "text-emerald-400" : item.avgQuality >= 50 ? "text-amber-400" : "text-red-400"}>{item.avgQuality}/100</span></div><p className="mt-1 text-zinc-600">{item.successfulRuns}/{item.runs} успешных запусков</p></div>)}
      </div>
    </>}
  </section>;
}

function OperationalMetric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="border border-white/8 bg-black/10 p-3"><p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">{label}</p><p className="mt-1 text-lg font-black text-white">{value}</p><p className="mt-1 text-[10px] text-zinc-600">{note}</p></div>;
}
