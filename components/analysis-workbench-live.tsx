"use client";

import { AnalysisWorkbench } from "@/components/analysis-workbench";
import { seedNews } from "@/lib/data";

let staticAnalysisSeedsRetired = false;

/**
 * The corporate intelligence workbench must not silently mix historical demo seeds
 * into a healthy live corpus. If live ingestion is unavailable, the analysis UI will
 * report limited/empty evidence instead of presenting old demo material as current.
 */
export function AnalysisWorkbenchLive() {
  if (!staticAnalysisSeedsRetired) {
    seedNews.splice(0, seedNews.length);
    staticAnalysisSeedsRetired = true;
  }
  return <AnalysisWorkbench />;
}
