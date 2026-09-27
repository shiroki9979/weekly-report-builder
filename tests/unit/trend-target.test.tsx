import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StageSlide } from "@/components/stage/stage-slide"
import { createBlankTrendTargetPage } from "@/lib/page-lifecycle"
import { assessContentReadiness } from "@/lib/export-readiness"
import { cloneWeekFromPrevious } from "@/lib/week-clone"
import { parseWeekDocument, type TrendTargetPage } from "@/lib/week-document"
import {
  canSaveSession,
  createEditingSession,
  deleteSessionPage,
  addSessionPage,
  openSessionWeek,
  readTrendInput,
  sessionReadiness,
  writeTrendInput,
  changeTrendEndpoint,
  confirmTrendRedate,
  cancelTrendRedate,
} from "@/lib/editing-session"
import { exportPage } from "@/lib/export-page-gate"
import { fakeAdapter } from "./export-fixtures"
import { exportVisiblePages } from "@/lib/week-export"
import { trendBounds } from "@/lib/trend-target"

const complete: TrendTargetPage = {
  id: "p01",
  layout: "trend-target",
  title: "Exports recovered this quarter.",
  metric: {
    label: "Mean export duration",
    unit: "s",
    unitPosition: "after",
    unitSpacing: "space",
    precision: 1,
  },
  startMonday: "2026-07-06",
  observations: [
    { state: "measured", value: 9.2 },
    { state: "measured", value: 8.8 },
    { state: "measured", value: 8.04 },
  ],
  target: 8,
  direction: "at-most",
  interpretation: "Recent work reduced export time.",
  measurementContext: "p95 exports, 100 requests each Monday.",
}

describe("Trend & Target", () => {
  it("maintains endpoint dates and raw input without moving retained evidence", () => {
    const week = {
      start: "2027-01-11",
      end: "2027-01-15",
      pages: [
        {
          ...complete,
          startMonday: "2026-12-28",
          observations: [
            { state: "measured" as const, value: 1 },
            { state: "missing" as const },
            { state: "measured" as const, value: 3 },
          ],
        },
      ],
    }
    let session = createEditingSession(week)
    session = writeTrendInput(
      session,
      { pageId: "p01", path: "observations[0].value" },
      "1.00"
    )
    session = writeTrendInput(
      session,
      { pageId: "p01", path: "observations[2].value" },
      "3e"
    )
    session = changeTrendEndpoint(session, "p01", "prepend")
    expect(session.week?.pages[0]).toMatchObject({
      startMonday: "2026-12-21",
      observations: [
        { state: "unfilled" },
        { state: "measured", value: 1 },
        { state: "missing" },
        { state: "measured", value: 3 },
      ],
    })
    expect(
      readTrendInput(session, { pageId: "p01", path: "observations[3].value" })
    ).toBe("3e")
    expect(
      readTrendInput(session, { pageId: "p01", path: "observations[1].value" })
    ).toBe("1.00")
    expect(canSaveSession(session).allowed).toBe(false)
    session = changeTrendEndpoint(session, "p01", "remove-first")
    expect(session.week?.pages[0]).toMatchObject({ startMonday: "2026-12-28" })
    expect(
      readTrendInput(session, { pageId: "p01", path: "observations[2].value" })
    ).toBe("3e")
    session = changeTrendEndpoint(session, "p01", "remove-last")
    expect(canSaveSession(session).allowed).toBe(true)
    expect(session.week?.pages[0]).toMatchObject({
      observations: [{ state: "measured", value: 1 }, { state: "missing" }],
    })
    expect(() => changeTrendEndpoint(session, "p01", "remove-first")).toThrow(
      /two/
    )
  })

  it("requires explicit confirmation to re-date entered weeks and preserves invalid clearing", () => {
    const week = { start: "2026-07-20", end: "2026-07-24", pages: [complete] }
    let session = createEditingSession(week)
    session = writeTrendInput(
      session,
      { pageId: "p01", path: "startMonday" },
      "2026-07-13"
    )
    expect(session.week?.pages[0]).toMatchObject({ startMonday: "2026-07-06" })
    expect(canSaveSession(session).allowed).toBe(false)
    session = cancelTrendRedate(session, "p01")
    expect(
      readTrendInput(session, { pageId: "p01", path: "startMonday" })
    ).toBe("2026-07-06")
    session = writeTrendInput(
      session,
      { pageId: "p01", path: "startMonday" },
      "2026-07-13"
    )
    session = confirmTrendRedate(session, "p01")
    expect(session.week?.pages[0]).toMatchObject({
      startMonday: "2026-07-13",
      observations: complete.observations,
    })
    expect(canSaveSession(session).allowed).toBe(true)
    session = writeTrendInput(
      session,
      { pageId: "p01", path: "startMonday" },
      ""
    )
    expect(session.week?.pages[0]).toMatchObject({ startMonday: "2026-07-13" })
    expect(canSaveSession(session).allowed).toBe(false)
    expect(sessionReadiness(session, "p01")).toContainEqual(
      expect.objectContaining({ path: "startMonday" })
    )
  })

  it("never evicts at twelve positions", () => {
    const page = {
      ...complete,
      startMonday: "2026-01-05",
      observations: Array.from({ length: 12 }, () => ({
        state: "unfilled" as const,
      })),
    }
    let session = createEditingSession({
      start: "2026-03-23",
      end: "2026-03-27",
      pages: [page],
    })
    expect(() => changeTrendEndpoint(session, "p01", "append")).toThrow(
      /twelve/
    )
    session = changeTrendEndpoint(session, "p01", "remove-first")
    expect(session.week?.pages[0]).toMatchObject({ startMonday: "2026-01-12" })
    session = changeTrendEndpoint(session, "p01", "append")
    expect(
      (session.week?.pages[0] as TrendTargetPage).observations
    ).toHaveLength(12)
    expect(
      (session.week?.pages[0] as TrendTargetPage).observations.at(-1)
    ).toEqual({ state: "unfilled" })
  })

  it("blocks output while populated dating is cleared and permits undating only after every observation is cleared", async () => {
    let session = createEditingSession({
      start: "2026-07-20",
      end: "2026-07-24",
      pages: [complete],
    })
    session = writeTrendInput(
      session,
      { pageId: "p01", path: "startMonday" },
      ""
    )
    expect(canSaveSession(session).allowed).toBe(false)
    const snapshot = session.week!
    const adapter = fakeAdapter()
    expect(
      await exportPage(snapshot, snapshot.pages[0], {
        adapter,
        metricInput: session.metricInput,
      })
    ).toMatchObject({
      kind: "blocked",
      issues: [expect.objectContaining({ path: "startMonday" })],
    })
    const batch = await exportVisiblePages(snapshot.start, snapshot, {
      adapter,
      metricInput: session.metricInput,
      download: () => {},
    })
    expect(batch.skipped).toEqual([expect.objectContaining({ pageId: "p01" })])
    expect(adapter.prepare).not.toHaveBeenCalled()
    for (let index = 0; index < 3; index++)
      session = writeTrendInput(
        session,
        { pageId: "p01", path: `observations[${index}].value` },
        ""
      )
    expect(session.week?.pages[0]).toMatchObject({ startMonday: null })
    expect(canSaveSession(session).allowed).toBe(true)
  })
  it("creates an eight-position draft and parses measured, missing, and unfilled states", () => {
    const blank = createBlankTrendTargetPage("p02")
    expect(blank.startMonday).toBeNull()
    expect(blank.target).toBeNull()
    expect(blank.observations).toEqual(
      Array.from({ length: 8 }, () => ({ state: "unfilled" }))
    )
    expect(blank.metric).toMatchObject({
      precision: 1,
      unitPosition: "after",
      unitSpacing: "space",
    })

    const week = parseWeekDocument({
      start: "2026-07-20",
      end: "2026-07-24",
      pages: [
        {
          ...complete,
          observations: [
            { state: "measured", value: -2 },
            { state: "missing" },
            { state: "unfilled" },
          ],
        },
      ],
    })
    expect(week.pages[0]).toMatchObject({
      observations: [
        { state: "measured", value: -2 },
        { state: "missing" },
        { state: "unfilled" },
      ],
    })
    expect(() =>
      parseWeekDocument({
        ...week,
        pages: [
          {
            ...complete,
            observations: [
              { state: "measured", value: 1 },
              { state: "missing", value: 0 },
            ],
          },
        ],
      })
    ).toThrow(/observations\[1\]/)
    expect(() =>
      parseWeekDocument({
        ...week,
        pages: [{ ...complete, startMonday: "2026-07-07" }],
      })
    ).toThrow(/startMonday/)
    expect(() =>
      parseWeekDocument({
        ...week,
        pages: [{ ...complete, direction: "lower" }],
      })
    ).toThrow(/direction/)
    expect(() =>
      parseWeekDocument({
        ...week,
        pages: [
          { ...complete, observations: [{ state: "measured", value: 1 }] },
        ],
      })
    ).toThrow(/observations/)
  })

  it("uses reporting week and unrounded latest value for readiness and status", () => {
    expect(assessContentReadiness(complete, {}, "2026-07-20")).toEqual([])
    expect(assessContentReadiness(complete, {}, "2026-07-13")).toContainEqual(
      expect.objectContaining({ path: "observations", code: "invalid-content" })
    )
    render(
      <StageSlide
        page={complete}
        context={{
          weekLabel: "2026-07-20 — 2026-07-24",
          pageLabel: "1 / 1",
          showPageNumber: true,
        }}
      />
    )
    expect(screen.getByText("Target missed")).toBeInTheDocument()
    expect(screen.getByText(/Exact: 8\.04 s > 8 s/)).toBeInTheDocument()
    expect(
      screen.getByText(/Observed weeks: 2026-07-06.*2026-07-20/)
    ).toBeInTheDocument()
  })

  it("rejects missing observations for export until the follow-up slice", () => {
    const page: TrendTargetPage = {
      ...complete,
      observations: [
        { state: "measured", value: 9 },
        { state: "missing" },
        { state: "measured", value: 8 },
      ],
    }
    expect(assessContentReadiness(page, {}, "2026-07-20")).toContainEqual(
      expect.objectContaining({
        path: "observations[1]",
        code: "invalid-content",
      })
    )
  })

  it("accepts inclusive targets and preserves zero and signed values at both series limits", () => {
    const two: TrendTargetPage = {
      ...complete,
      startMonday: "2026-08-24",
      observations: [
        { state: "measured", value: -3 },
        { state: "measured", value: 0 },
      ],
      target: 0,
      direction: "at-least",
    }
    expect(assessContentReadiness(two, {}, "2026-08-31")).toEqual([])
    const { unmount } = render(
      <StageSlide
        page={two}
        context={{
          weekLabel: "2026-08-31 — 2026-09-04",
          pageLabel: "",
          showPageNumber: false,
        }}
      />
    )
    expect(screen.getByText("Target met")).toBeInTheDocument()
    unmount()

    const twelve: TrendTargetPage = {
      ...complete,
      startMonday: "2025-12-15",
      observations: Array.from({ length: 12 }, () => ({
        state: "measured",
        value: 0,
      })),
      target: 0,
    }
    expect(assessContentReadiness(twelve, {}, "2026-03-02")).toEqual([])
    expect(trendBounds(twelve)).toEqual([-1, 1])
    render(
      <StageSlide
        page={twelve}
        context={{
          weekLabel: "2026-03-02 — 2026-03-06",
          pageLabel: "",
          showPageNumber: false,
        }}
      />
    )
    expect(
      screen.getByText("Observed weeks: 2025-12-15 – 2026-03-02")
    ).toBeInTheDocument()
    expect(screen.getByText("Target met")).toBeInTheDocument()
  })

  it("retains dated evidence and clears weekly conclusions when cloned", () => {
    const week = cloneWeekFromPrevious(
      { start: "2026-07-20", end: "2026-07-24", pages: [complete] },
      "2026-07-27"
    )
    expect(week.pages[0]).toMatchObject({
      title: "",
      interpretation: "",
      notes: undefined,
      metric: complete.metric,
      startMonday: "2026-07-06",
      observations: complete.observations,
      target: 8,
      measurementContext: complete.measurementContext,
    })
  })

  it("keeps invalid signed input visible and blocks save, Copy, and batch preflight", async () => {
    const week = { start: "2026-07-20", end: "2026-07-24", pages: [complete] }
    let session = createEditingSession(week)
    session = writeTrendInput(
      session,
      { pageId: "p01", path: "observations[2].value" },
      "-1.2e1"
    )
    expect(session.week?.pages[0]).toMatchObject({
      observations: [
        { state: "measured", value: 9.2 },
        { state: "measured", value: 8.8 },
        { state: "measured", value: -12 },
      ],
    })
    session = writeTrendInput(
      session,
      { pageId: "p01", path: "observations[2].value" },
      "-1e"
    )
    expect(
      readTrendInput(session, { pageId: "p01", path: "observations[2].value" })
    ).toBe("-1e")
    expect(canSaveSession(session).allowed).toBe(false)
    expect(sessionReadiness(session, "p01")).toContainEqual(
      expect.objectContaining({
        path: "observations[2].value",
        code: "invalid-content",
      })
    )
    const snapshot = session.week!
    const adapter = fakeAdapter()
    expect(
      (
        await exportPage(snapshot, snapshot.pages[0], {
          adapter,
          metricInput: session.metricInput,
        })
      ).kind
    ).toBe("blocked")
    expect(adapter.prepare).not.toHaveBeenCalled()

    const downloads: string[] = []
    const batch = await exportVisiblePages(
      "2026-07-20",
      { ...week, pages: [snapshot.pages[0], { ...complete, id: "p02" }] },
      {
        adapter,
        metricInput: session.metricInput,
        download: (_blob, filename) => downloads.push(filename),
      }
    )
    expect(batch.skipped).toEqual([expect.objectContaining({ pageId: "p01" })])
    expect(downloads).toEqual(["2026-07-20-p02.png"])

    session = deleteSessionPage(
      createEditingSession({
        ...week,
        pages: [complete, createBlankTrendTargetPage("p02")],
      }),
      "p02"
    )
    session = addSessionPage(session, createBlankTrendTargetPage("p02"))
    expect(canSaveSession(session).allowed).toBe(true)
    expect(readTrendInput(session, { pageId: "p02", path: "target" })).toBe("")
    expect(openSessionWeek(session, week).metricInput).toEqual({})
  })

  it("keeps an invalid date attached to its page and clears it on week switch", () => {
    const week = {
      start: "2026-07-20",
      end: "2026-07-24",
      pages: [complete, createBlankTrendTargetPage("p02")],
    }
    let session = createEditingSession(week)
    session = writeTrendInput(
      session,
      { pageId: "p01", path: "startMonday" },
      "2026-07-07"
    )
    expect(
      readTrendInput(session, { pageId: "p01", path: "startMonday" })
    ).toBe("2026-07-07")
    expect(session.week?.pages[0]).toMatchObject({ startMonday: "2026-07-06" })
    expect(canSaveSession(session).allowed).toBe(false)
    session = deleteSessionPage(session, "p01")
    session = addSessionPage(session, createBlankTrendTargetPage("p01"))
    expect(canSaveSession(session).allowed).toBe(true)
    expect(
      readTrendInput(session, { pageId: "p01", path: "startMonday" })
    ).toBe("")
    expect(openSessionWeek(session, week).metricInput).toEqual({})
  })

  it("uses the same reporting Monday for editor, Copy gate, and batch; checks canonical overflow", async () => {
    const week = { start: "2026-07-13", end: "2026-07-17", pages: [complete] }
    const session = createEditingSession(week)
    expect(sessionReadiness(session, "p01")).toContainEqual(
      expect.objectContaining({
        path: "observations",
        message: expect.stringContaining("after reporting week"),
      })
    )
    const adapter = fakeAdapter()
    const copy = await exportPage(week, complete, { adapter })
    expect(copy).toMatchObject({
      kind: "blocked",
      issues: [expect.objectContaining({ path: "observations" })],
    })
    const batch = await exportVisiblePages(week.start, week, {
      adapter,
      download: () => {},
    })
    expect(batch.skipped).toEqual([expect.objectContaining({ pageId: "p01" })])
    expect(adapter.prepare).not.toHaveBeenCalled()

    const currentWeek = { ...week, start: "2026-07-20", end: "2026-07-24" }
    const overflowing = await exportPage(currentWeek, complete, {
      adapter: fakeAdapter("overflow"),
    })
    expect(overflowing).toMatchObject({
      kind: "blocked",
      issues: [expect.objectContaining({ code: "overflow" })],
    })
  })
})
