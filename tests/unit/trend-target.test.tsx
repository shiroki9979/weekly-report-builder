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
  sessionReadiness,
} from "@/lib/editing-session"
import {
  cancelTrendRedate,
  changeTrendEndpoint,
  confirmTrendRedate,
  readTrendInput,
  setTrendObservationState,
  writeTrendInput,
} from "@/lib/trend-session"
import { exportPage } from "@/lib/export-page-gate"
import { fakeAdapter } from "./export-fixtures"
import { exportVisiblePages } from "@/lib/week-export"
import { trendBounds } from "@/lib/trend-target"
import { canChangeTrendEndpoint } from "@/lib/trend-input"

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
  it("commits an observation entered before its starting Monday once dating is valid", () => {
    let session = createEditingSession({
      start: "2026-07-20",
      end: "2026-07-24",
      pages: [
        {
          ...complete,
          startMonday: null,
          observations: [{ state: "unfilled" }, { state: "unfilled" }],
        },
      ],
    })
    session = writeTrendInput(
      session,
      { pageId: "p01", path: "observations[0].value" },
      "0"
    )
    expect(
      readTrendInput(session, { pageId: "p01", path: "observations[0].value" })
    ).toBe("0")
    expect(canSaveSession(session).allowed).toBe(false)

    session = writeTrendInput(
      session,
      { pageId: "p01", path: "startMonday" },
      ""
    )
    expect(session.week?.pages[0]).toMatchObject({
      startMonday: null,
      observations: [{ state: "unfilled" }, { state: "unfilled" }],
    })

    session = writeTrendInput(
      session,
      { pageId: "p01", path: "startMonday" },
      "2026-07-06"
    )

    expect(session.week?.pages[0]).toMatchObject({
      startMonday: "2026-07-06",
      observations: [{ state: "measured", value: 0 }, { state: "unfilled" }],
    })
    expect(
      readTrendInput(session, { pageId: "p01", path: "observations[0].value" })
    ).toBe("0")
    expect(canSaveSession(session).allowed).toBe(true)
    expect(parseWeekDocument(session.week).pages[0]).toMatchObject({
      observations: [{ state: "measured", value: 0 }, { state: "unfilled" }],
    })
  })

  it("keeps close large-magnitude y-axis ticks distinct and identifies their offset", () => {
    const page: TrendTargetPage = {
      ...complete,
      observations: [
        { state: "measured", value: 1_000_000_000_000 },
        { state: "measured", value: 1_000_000_000_001 },
      ],
      target: 1_000_000_000_001,
    }
    const { container } = render(
      <StageSlide
        page={page}
        context={{
          weekLabel: "2026-07-20",
          pageLabel: "",
          showPageNumber: false,
        }}
      />
    )
    const ticks = [...container.querySelectorAll("svg .editorial-trend-axis")]
      .slice(0, 5)
      .map((node) => node.textContent)
    expect(new Set(ticks).size).toBe(5)
    expect(
      container.querySelector(".editorial-trend-axis-offset")
    ).toHaveTextContent("1e+12")
  })

  it("renders readable ticks for finite subnormal weekly observations", () => {
    const page: TrendTargetPage = {
      ...complete,
      observations: [
        { state: "measured", value: 1e-314 },
        { state: "measured", value: 1.000000001e-314 },
      ],
      target: 1.000000001e-314,
    }

    expect(assessContentReadiness(page, {}, "2026-07-20")).toEqual([])
    const { container } = render(
      <StageSlide
        page={page}
        context={{
          weekLabel: "2026-07-20",
          pageLabel: "",
          showPageNumber: false,
        }}
      />
    )
    const labels = [...container.querySelectorAll("svg .editorial-trend-axis")]
      .filter((node) => node.getAttribute("text-anchor") === "end")
      .map((node) => node.textContent)
    expect(labels.length).toBeGreaterThanOrEqual(2)
    expect(labels).not.toContain("NaN")
    expect(new Set(labels).size).toBe(labels.length)
  })

  it("keeps closely spaced midrange y-axis ticks distinct", () => {
    const page: TrendTargetPage = {
      ...complete,
      observations: [
        { state: "measured", value: 100_000_000 },
        { state: "measured", value: 100_000_000.00001 },
      ],
      target: 100_000_000.000005,
    }
    const { container } = render(
      <StageSlide
        page={page}
        context={{
          weekLabel: "2026-07-20",
          pageLabel: "",
          showPageNumber: false,
        }}
      />
    )
    const ticks = [...container.querySelectorAll("svg .editorial-trend-axis")]
      .slice(0, 5)
      .map((node) => node.textContent)
    expect(new Set(ticks).size).toBe(5)
  })

  it("does not repeat y-axis labels when measurements are one representable step apart", () => {
    const page: TrendTargetPage = {
      ...complete,
      observations: [
        { state: "measured", value: 100_000_000 },
        { state: "measured", value: 100_000_000.00000001 },
      ],
      target: 100_000_000,
    }
    const { container } = render(
      <StageSlide
        page={page}
        context={{
          weekLabel: "2026-07-20",
          pageLabel: "",
          showPageNumber: false,
        }}
      />
    )
    const labels = [...container.querySelectorAll("svg .editorial-trend-axis")]
      .slice(0, 5)
      .map((node) => node.textContent)
    expect(labels.length).toBeGreaterThanOrEqual(2)
    expect(new Set(labels).size).toBe(labels.length)
  })

  describe("endpoint availability", () => {
    const weeks = (length: number) =>
      Array.from({ length }, () => ({ state: "unfilled" as const }))

    it("allows adding either endpoint until twelve weeks", () => {
      expect(canChangeTrendEndpoint(weeks(11), "prepend")).toBe(true)
      expect(canChangeTrendEndpoint(weeks(12), "append")).toBe(false)
    })

    it("allows removing either endpoint until two weeks remain", () => {
      expect(canChangeTrendEndpoint(weeks(3), "remove-last")).toBe(true)
      expect(canChangeTrendEndpoint(weeks(2), "remove-first")).toBe(false)
    })
  })

  describe("range endpoints", () => {
    const dated = {
      ...complete,
      startMonday: "2026-12-28",
      observations: [
        { state: "measured" as const, value: 1 },
        { state: "missing" as const },
        { state: "measured" as const, value: 3 },
      ],
    }

    function sessionWithRawInput() {
      let session = createEditingSession({
        start: "2027-01-11",
        end: "2027-01-15",
        pages: [dated],
      })
      session = writeTrendInput(
        session,
        { pageId: "p01", path: "observations[0].value" },
        "1.00"
      )
      return writeTrendInput(
        session,
        { pageId: "p01", path: "observations[2].value" },
        "3e"
      )
    }

    it("prepends an unfilled week one Monday earlier and moves raw input with its week", () => {
      const session = sessionWithRawInput()

      const next = changeTrendEndpoint(session, "p01", "prepend")

      expect(next.week?.pages[0]).toMatchObject({
        startMonday: "2026-12-21",
        observations: [
          { state: "unfilled" },
          { state: "measured", value: 1 },
          { state: "missing" },
          { state: "measured", value: 3 },
        ],
      })
      expect(
        readTrendInput(next, { pageId: "p01", path: "observations[1].value" })
      ).toBe("1.00")
      expect(
        readTrendInput(next, { pageId: "p01", path: "observations[3].value" })
      ).toBe("3e")
      expect(canSaveSession(next).allowed).toBe(false)
    })

    it("removes the earliest week and advances the starting Monday", () => {
      const session = sessionWithRawInput()

      const next = changeTrendEndpoint(session, "p01", "remove-first")

      expect(next.week?.pages[0]).toMatchObject({
        startMonday: "2027-01-04",
        observations: [{ state: "missing" }, { state: "measured", value: 3 }],
      })
      expect(
        readTrendInput(next, { pageId: "p01", path: "observations[1].value" })
      ).toBe("3e")
    })

    it("removes the latest week together with its invalid raw input", () => {
      const session = sessionWithRawInput()

      const next = changeTrendEndpoint(session, "p01", "remove-last")

      expect(next.week?.pages[0]).toMatchObject({
        startMonday: "2026-12-28",
        observations: [{ state: "measured", value: 1 }, { state: "missing" }],
      })
      expect(canSaveSession(next).allowed).toBe(true)
    })

    it("refuses to shrink below two weeks", () => {
      const session = createEditingSession({
        start: "2027-01-11",
        end: "2027-01-15",
        pages: [{ ...dated, observations: dated.observations.slice(0, 2) }],
      })

      expect(() => changeTrendEndpoint(session, "p01", "remove-first")).toThrow(
        "Trend & Target must keep at least 2 observations"
      )
    })

    describe("at twelve positions", () => {
      function fullSession() {
        return createEditingSession({
          start: "2026-03-23",
          end: "2026-03-27",
          pages: [
            {
              ...complete,
              startMonday: "2026-01-05",
              observations: Array.from({ length: 12 }, () => ({
                state: "unfilled" as const,
              })),
            },
          ],
        })
      }

      it("refuses to add a week instead of evicting history", () => {
        const session = fullSession()

        expect(() => changeTrendEndpoint(session, "p01", "append")).toThrow(
          "Trend & Target can have at most 12 observations"
        )
      })

      it("appends an unfilled latest week after the earliest is removed", () => {
        const trimmed = changeTrendEndpoint(
          fullSession(),
          "p01",
          "remove-first"
        )

        const next = changeTrendEndpoint(trimmed, "p01", "append")

        const page = next.week?.pages[0] as TrendTargetPage
        expect(page.startMonday).toBe("2026-01-12")
        expect(page.observations).toHaveLength(12)
        expect(page.observations.at(-1)).toEqual({ state: "unfilled" })
      })
    })
  })

  describe("re-dating entered weeks", () => {
    function sessionWithProposedMonday() {
      const session = createEditingSession({
        start: "2026-07-20",
        end: "2026-07-24",
        pages: [complete],
      })
      return writeTrendInput(
        session,
        { pageId: "p01", path: "startMonday" },
        "2026-07-13"
      )
    }

    it("holds a proposed Monday as pending input and blocks save", () => {
      const session = sessionWithProposedMonday()

      expect(session.week?.pages[0]).toMatchObject({
        startMonday: "2026-07-06",
      })
      expect(canSaveSession(session).allowed).toBe(false)
    })

    it("restores the committed Monday when the change is cancelled", () => {
      const session = sessionWithProposedMonday()

      const next = cancelTrendRedate(session, "p01")

      expect(readTrendInput(next, { pageId: "p01", path: "startMonday" })).toBe(
        "2026-07-06"
      )
      expect(canSaveSession(next).allowed).toBe(true)
    })

    it("moves every observation to the confirmed Monday without changing values", () => {
      const session = sessionWithProposedMonday()

      const next = confirmTrendRedate(session, "p01")

      expect(next.week?.pages[0]).toMatchObject({
        startMonday: "2026-07-13",
        observations: complete.observations,
      })
      expect(canSaveSession(next).allowed).toBe(true)
    })

    it("keeps the Monday and reports readiness when dating is cleared while weeks are entered", () => {
      const session = createEditingSession({
        start: "2026-07-20",
        end: "2026-07-24",
        pages: [complete],
      })

      const next = writeTrendInput(
        session,
        { pageId: "p01", path: "startMonday" },
        ""
      )

      expect(next.week?.pages[0]).toMatchObject({ startMonday: "2026-07-06" })
      expect(canSaveSession(next).allowed).toBe(false)
      expect(sessionReadiness(next, "p01")).toContainEqual(
        expect.objectContaining({ path: "startMonday" })
      )
    })
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

  it("clears pending dating when the final Missing week becomes Unfilled", () => {
    const page = {
      ...complete,
      observations: [
        { state: "missing" as const },
        { state: "unfilled" as const },
      ],
    }
    let session = createEditingSession({
      start: "2026-07-20",
      end: "2026-07-24",
      pages: [page],
    })
    session = writeTrendInput(
      session,
      { pageId: "p01", path: "startMonday" },
      ""
    )
    expect(canSaveSession(session).allowed).toBe(false)

    session = setTrendObservationState(
      session,
      { pageId: "p01", index: 0 },
      "unfilled"
    )
    expect(session.week?.pages[0]).toMatchObject({ startMonday: null })
    expect(
      readTrendInput(session, { pageId: "p01", path: "startMonday" })
    ).toBe("")
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
        pages: [
          {
            ...complete,
            observations: [
              { state: "unfilled", value: 0 },
              { state: "measured", value: 1 },
            ],
          },
        ],
      })
    ).toThrow(/observations\[0\]/)
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

  it("adds an exact comparison when a negative value rounds to the displayed zero target", () => {
    const page: TrendTargetPage = {
      ...complete,
      observations: [
        { state: "measured", value: 0.3 },
        { state: "measured", value: -0.04 },
      ],
      target: 0,
      direction: "at-least",
    }

    render(
      <StageSlide
        page={page}
        context={{
          weekLabel: "2026-07-13",
          pageLabel: "",
          showPageNumber: false,
        }}
      />
    )

    expect(screen.getByText("Target missed")).toBeInTheDocument()
    expect(screen.getByText("Exact: -0.04 s < 0 s")).toBeInTheDocument()
  })

  it("names the metric unit in the chart caption", () => {
    render(
      <StageSlide
        page={complete}
        context={{
          weekLabel: "2026-07-20",
          pageLabel: "",
          showPageNumber: false,
        }}
      />
    )

    expect(
      screen.getByText("Mean export duration (s)", { selector: "figcaption" })
    ).toBeInTheDocument()
  })

  it("exports an interior or final Missing observation when two measurements remain", async () => {
    const page: TrendTargetPage = {
      ...complete,
      observations: [
        { state: "measured", value: 9 },
        { state: "missing" },
        { state: "measured", value: 8 },
      ],
    }
    expect(assessContentReadiness(page, {}, "2026-07-20")).toEqual([])
    const lastMissing: TrendTargetPage = {
      ...page,
      observations: [...page.observations, { state: "missing" }],
    }
    expect(assessContentReadiness(lastMissing, {}, "2026-07-27")).toEqual([])
    const adapter = fakeAdapter()
    const week = {
      start: "2026-07-27",
      end: "2026-07-31",
      pages: [lastMissing],
    }
    expect((await exportPage(week, lastMissing, { adapter })).kind).toBe(
      "captured"
    )
    const restored = parseWeekDocument(JSON.parse(JSON.stringify(week)))
    expect(restored.pages[0]).toMatchObject({
      observations: [
        { state: "measured", value: 9 },
        { state: "missing" },
        { state: "measured", value: 8 },
        { state: "missing" },
      ],
    })
    expect(
      cloneWeekFromPrevious(restored, "2026-08-03").pages[0]
    ).toMatchObject({
      observations: lastMissing.observations,
      startMonday: "2026-07-06",
      measurementContext: complete.measurementContext,
      title: "",
      interpretation: "",
    })
  })

  it("marks a missing gap and summarizes the final displayed week without falling back", () => {
    const page: TrendTargetPage = {
      ...complete,
      observations: [
        { state: "measured", value: 0 },
        { state: "missing" },
        { state: "measured", value: 8 },
        { state: "missing" },
      ],
    }
    const { rerender } = render(
      <StageSlide
        page={page}
        context={{
          weekLabel: "2026-07-27",
          pageLabel: "",
          showPageNumber: false,
        }}
      />
    )
    expect(screen.getByText("No data")).toBeInTheDocument()
    expect(screen.getByText("× No observation")).toBeInTheDocument()
    expect(screen.getAllByLabelText("No observation")).toHaveLength(2)
    expect(
      screen.getByText(
        "Measurement Context: p95 exports, 100 requests each Monday."
      )
    ).toBeInTheDocument()
    rerender(
      <StageSlide
        page={{
          ...page,
          observations: [
            ...page.observations.slice(0, -1),
            { state: "unfilled" },
          ],
        }}
        context={{
          weekLabel: "2026-07-27",
          pageLabel: "",
          showPageNumber: false,
        }}
      />
    )
    expect(screen.getByText("Not entered")).toBeInTheDocument()
    expect(screen.queryByText("No data")).not.toBeInTheDocument()
    expect(screen.getAllByLabelText("No observation")).toHaveLength(1)
  })

  it("changes one observation to Missing and back without retaining its value or pending error", () => {
    const week = { start: "2026-07-20", end: "2026-07-24", pages: [complete] }
    let session = createEditingSession(week)
    session = writeTrendInput(
      session,
      { pageId: "p01", path: "observations[1].value" },
      "bad"
    )
    session = writeTrendInput(
      session,
      { pageId: "p01", path: "target" },
      "oops"
    )
    expect(canSaveSession(session).allowed).toBe(false)
    session = setTrendObservationState(
      session,
      { pageId: "p01", index: 1 },
      "missing"
    )
    expect(session.week?.pages[0]).toMatchObject({
      observations: [
        { state: "measured", value: 9.2 },
        { state: "missing" },
        { state: "measured", value: 8.04 },
      ],
    })
    expect(session.metricInput.p01?.["observations[1].value"]).toBeUndefined()
    expect(canSaveSession(session).allowed).toBe(false)
    expect(sessionReadiness(session, "p01")).toContainEqual(
      expect.objectContaining({ path: "target", code: "invalid-content" })
    )
    session = setTrendObservationState(
      session,
      { pageId: "p01", index: 1 },
      "unfilled"
    )
    expect(
      readTrendInput(session, { pageId: "p01", path: "observations[1].value" })
    ).toBe("")
    expect(session.week?.pages[0]).toMatchObject({
      observations: [
        { state: "measured", value: 9.2 },
        { state: "unfilled" },
        { state: "measured", value: 8.04 },
      ],
    })
    session = writeTrendInput(
      session,
      { pageId: "p01", path: "observations[1].value" },
      "0"
    )
    expect(session.week?.pages[0]).toMatchObject({
      observations: [
        { state: "measured", value: 9.2 },
        { state: "measured", value: 0 },
        { state: "measured", value: 8.04 },
      ],
    })
    session = writeTrendInput(
      session,
      { pageId: "p01", path: "observations[1].value" },
      ""
    )
    expect(session.week?.pages[0]).toMatchObject({
      observations: [
        { state: "measured", value: 9.2 },
        { state: "unfilled" },
        { state: "measured", value: 8.04 },
      ],
    })
  })

  it("blocks all-Missing, one-measurement, Unfilled and missing-context drafts while batch continues", async () => {
    const allMissing: TrendTargetPage = {
      ...complete,
      observations: Array.from({ length: 3 }, () => ({ state: "missing" })),
    }
    const oneMeasured: TrendTargetPage = {
      ...allMissing,
      observations: [
        { state: "measured", value: 0 },
        { state: "missing" },
        { state: "missing" },
      ],
    }
    const unfilled: TrendTargetPage = {
      ...complete,
      observations: [
        { state: "measured", value: 0 },
        { state: "measured", value: 8 },
        { state: "unfilled" },
      ],
    }
    const noContext: TrendTargetPage = { ...complete, measurementContext: "" }
    expect(assessContentReadiness(allMissing, {}, "2026-07-20")).toContainEqual(
      expect.objectContaining({
        path: "observations",
        message: "At least two measured observations are required",
      })
    )
    expect(
      assessContentReadiness(oneMeasured, {}, "2026-07-20")
    ).toContainEqual(
      expect.objectContaining({
        path: "observations",
        message: "At least two measured observations are required",
      })
    )
    expect(assessContentReadiness(unfilled, {}, "2026-07-20")).toContainEqual(
      expect.objectContaining({
        path: "observations[2]",
        message: "Observation is unfilled",
      })
    )
    expect(assessContentReadiness(noContext, {}, "2026-07-20")).toContainEqual(
      expect.objectContaining({
        path: "measurementContext",
        message: "Measurement Context is required",
      })
    )
    const week = {
      start: "2026-07-20",
      end: "2026-07-24",
      pages: [
        { ...allMissing, id: "p01" },
        { ...oneMeasured, id: "p02" },
        { ...complete, id: "p03" },
      ],
    }
    const downloaded: string[] = []
    const result = await exportVisiblePages(week.start, week, {
      adapter: fakeAdapter(),
      download: (_blob, filename) => downloaded.push(filename),
    })
    expect(result.skipped.map((entry) => entry.pageId)).toEqual(["p01", "p02"])
    expect(downloaded).toEqual(["2026-07-20-p03.png"])
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
