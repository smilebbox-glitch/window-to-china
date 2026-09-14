"use client";

import { NewsDashboard } from "@/components/news-dashboard";

/**
 * v1.7 fresh-first entrypoint.
 *
 * The legacy dashboard used seedNews as both an offline fallback and an unconditional
 * part of the live list. That could reintroduce old/duplicate cards after the server
 * had already canonicalized and fuzzy-deduplicated the same story from newer sources.
 *
 * For the corporate intelligence feed, stale-but-labelled API snapshots are safer
 * than hard-coded editorial seeds: the API has timestamps, source health and cache
 * state.
 *
 * This used to be implemented by splicing the shared `seedNews` array empty during
 * render. That mutated module state owned by `lib/data` for every other importer in
 * the same bundle and made the render impure. Passing an explicit empty seed list is
 * equivalent, local, and order-independent.
 */
const NO_SEEDS: never[] = [];

export function NewsDashboardLive() {
  return <NewsDashboard seeds={NO_SEEDS} />;
}
