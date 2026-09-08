const baseUrl = new URL(process.env.BASE_URL || process.env.PILOT_BASE_URL || "http://127.0.0.1:3000");
const token = process.env.ADMIN_API_TOKEN?.trim() || process.env.PILOT_ADMIN_TOKEN?.trim() || "";
const headers = { accept: "application/json", ...(token ? { "x-admin-token": token } : {}) };

try {
  const response = await fetch(new URL("/api/pilot/report", baseUrl), { headers, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    console.error(`STOP: pilot report HTTP ${response.status}`);
    process.exit(1);
  }
  const report = await response.json();
  console.log(`PILOT OUTCOME: ${report.outcome}`);
  console.log(`Cohort: ${report.cohort?.activeUsers ?? 0} users; repeat=${report.cohort?.repeatPct ?? 0}%`);
  console.log(`Feedback: ${report.feedback?.respondents ?? 0} respondents; useful=${report.feedback?.usefulPct ?? 0}%; saved=${report.feedback?.savedMinutes ?? 0} min`);
  console.log(`Issues: S1=${report.issues?.openBySeverity?.S1 ?? 0}; S2=${report.issues?.openBySeverity?.S2 ?? 0}`);
  for (const reason of report.reasons || []) console.log(` - ${reason}`);
  if (report.outcome === "STOP") process.exit(1);
  process.exit(0);
} catch (error) {
  console.error(`STOP: unable to read pilot outcome: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
