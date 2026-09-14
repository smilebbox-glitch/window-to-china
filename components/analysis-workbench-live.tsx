"use client";

import { AnalysisWorkbench } from "@/components/analysis-workbench";

/**
 * The corporate intelligence workbench must not silently mix historical demo seeds
 * into a healthy live corpus. If live ingestion is unavailable, the analysis UI will
 * report limited/empty evidence instead of presenting old demo material as current.
 *
 * Previously this was done by splicing the shared `seedNews` array empty during
 * render, which mutated module state owned by `lib/data` for every other importer
 * and made the render impure. An explicit empty seed list is equivalent and local.
 *
 * NOTE: this only controls the client-side corpus. `app/api/analyze/route.ts` still
 * merges `seedNews` into the server-side corpus, so seeded items can reappear in an
 * answer's evidence. See the review notes.
 */
const NO_SEEDS: never[] = [];

export function AnalysisWorkbenchLive() {
  return <AnalysisWorkbench seeds={NO_SEEDS} />;
}
