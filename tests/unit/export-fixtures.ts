import { vi } from "vitest"

import type { CaptureAdapter } from "@/lib/export-page-gate"
import type { Deck } from "@/lib/deck"

export const completePage = {
  id: "p01",
  layout: "two-column" as const,
  title: "Overview",
  items: [
    { heading: "One", body: "First" },
    { heading: "Two", body: "Second" },
    { heading: "Three", body: "Third" },
  ],
  panel: {
    kind: "chart" as const,
    title: "Commits",
    categories: ["24"],
    series: [{ name: "Platform", values: [1] }],
  },
}

export const week: Deck = {
  period: { start: "2026-08-24", end: "2026-08-28" },
  pages: [
    completePage,
    { ...completePage, id: "p02", hidden: true },
    { ...completePage, id: "p03" },
  ],
}

export function fakeAdapter(status: "fit" | "overflow" = "fit") {
  const prepare = vi.fn<CaptureAdapter["prepare"]>(async () => ({
    measure: async () =>
      status === "fit"
        ? { status: "fit" }
        : { status: "overflow", axes: ["vertical"] },
    capture: async () => new Blob(["png"], { type: "image/png" }),
    dispose: vi.fn(),
  }))
  return { prepare }
}
