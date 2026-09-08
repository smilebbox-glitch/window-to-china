const baseUrl = new URL(process.env.BASE_URL || "http://127.0.0.1:3000");
const url = new URL("/api/pilot/operations", baseUrl);

try {
  const response = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const status = await response.json();
  console.log(`Pilot decision: ${status.decision}`);
  console.log(`Executive brief status: ${status.briefStatus}`);
  console.log(`Aggregate age: ${status.aggregate?.ageSeconds ?? "n/a"} sec; quality=${status.aggregate?.qualityScore ?? "n/a"}`);
  console.log(`Sources: fresh=${status.sources?.fresh ?? 0}, stale=${status.sources?.stale ?? 0}, error=${status.sources?.error ?? 0}`);
  for (const reason of status.reasons || []) console.log(` - ${reason}`);
  if (status.decision !== "GO") process.exit(2);
} catch (error) {
  console.error(`NO-GO: operational endpoint unavailable: ${error instanceof Error ? error.message : error}`);
  process.exit(2);
}
