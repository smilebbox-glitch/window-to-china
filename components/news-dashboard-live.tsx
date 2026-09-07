"use client";

import { NewsDashboard } from "@/components/news-dashboard";
import { seedNews } from "@/lib/data";

let seedFeedRetired = false;

/**
 * v1.7 fresh-first entrypoint.
 *
 * The legacy dashboard used seedNews as both an offline fallback and an unconditional
 * part of the live list. That could reintroduce old/duplicate cards after the server
 * had already canonicalized and fuzzy-deduplicated the same story from newer sources.
 *
 * For the corporate intelligence feed, stale-but-labelled API snapshots are safer
 * than hard-coded editorial seeds: the API has timestamps, source health and cache
 * state. Clear the legacy seed list before NewsDashboard initializes its local state.
 */
export function NewsDashboardLive() {
  if (!seedFeedRetired) {
    seedNews.splice(0, seedNews.length);
    seedFeedRetired = true;
  }
  return <NewsDashboard />;
}
