import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StageSlide } from "@/components/stage/stage-slide"
import { createBlankTrendTargetPage } from "@/lib/page-lifecycle"
import { assessContentReadiness } from "@/lib/export-readiness"
import { cloneWeekFromPrevious } from "@/lib/week-clone"
import {
  parseWeekDocument,
  type TrendTargetPage,
  type WeekDocument,
} from "@/lib/week-document"
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

// complete 的最後一筆觀測落在此報告週
const reportingWeek = { start: "2026-07-20", end: "2026-07-24" }

function weekWith(...pages: TrendTargetPage[]): WeekDocument {
  return { ...reportingWeek, pages }
}

function sessionWith(...pages: TrendTargetPage[]) {
  return createEditingSession(weekWith(...pages))
}

function renderTrend(page: TrendTargetPage, weekLabel = reportingWeek.start) {
  return render(
    <StageSlide
      page={page}
      context={{ weekLabel, pageLabel: "", showPageNumber: false }}
    />
  )
}

function yAxisTickLabels(container: HTMLElement) {
  return [...container.querySelectorAll("svg .editorial-trend-axis")]
    .slice(0, 5)
    .map((node) => node.textContent)
}

describe("Trend & Target", () => {
  describe("an observation entered before dating", () => {
    const value = { pageId: "p01", path: "observations[0].value" } as const
    const startMonday = { pageId: "p01", path: "startMonday" } as const

    function undatedSessionWithValue() {
      const session = sessionWith({
        ...complete,
        startMonday: null,
        observations: [{ state: "unfilled" }, { state: "unfilled" }],
      })
      return writeTrendInput(session, value, "0")
    }

    it("stays pending and blocks save", () => {
      const session = undatedSessionWithValue()

      expect(readTrendInput(session, value)).toBe("0")
      expect(canSaveSession(session).allowed).toBe(false)
    })

    it("stays uncommitted while dating is left empty", () => {
      const session = undatedSessionWithValue()

      const next = writeTrendInput(session, startMonday, "")

      expect(next.week?.pages[0]).toMatchObject({
        startMonday: null,
        observations: [{ state: "unfilled" }, { state: "unfilled" }],
      })
    })

    it("commits once a valid starting Monday is entered", () => {
      const session = undatedSessionWithValue()

      const next = writeTrendInput(session, startMonday, "2026-07-06")

      expect(next.week?.pages[0]).toMatchObject({
        startMonday: "2026-07-06",
        observations: [{ state: "measured", value: 0 }, { state: "unfilled" }],
      })
      expect(readTrendInput(next, value)).toBe("0")
      expect(canSaveSession(next).allowed).toBe(true)
      expect(parseWeekDocument(next.week).pages[0]).toMatchObject({
        observations: [{ state: "measured", value: 0 }, { state: "unfilled" }],
      })
    })
  })

  describe("y-axis ticks", () => {
    it("keeps close large-magnitude ticks distinct and identifies their offset", () => {
      const page: TrendTargetPage = {
        ...complete,
        observations: [
          { state: "measured", value: 1_000_000_000_000 },
          { state: "measured", value: 1_000_000_000_001 },
        ],
        target: 1_000_000_000_001,
      }

      const { container } = renderTrend(page)

      expect(new Set(yAxisTickLabels(container)).size).toBe(5)
      expect(
        container.querySelector(".editorial-trend-axis-offset")
      ).toHaveTextContent("1e+12")
    })

    describe("finite subnormal observations", () => {
      const page: TrendTargetPage = {
        ...complete,
        observations: [
          { state: "measured", value: 1e-314 },
          { state: "measured", value: 1.000000001e-314 },
        ],
        target: 1.000000001e-314,
      }

      it("are ready for export", () => {
        expect(
          assessContentReadiness(page, { reportingMonday: reportingWeek.start })
        ).toEqual([])
      })

      it("render readable, distinct ticks", () => {
        const { container } = renderTrend(page)

        const labels = [
          ...container.querySelectorAll("svg .editorial-trend-axis"),
        ]
          .filter((node) => node.getAttribute("text-anchor") === "end")
          .map((node) => node.textContent)
        expect(labels.length).toBeGreaterThanOrEqual(2)
        expect(labels).not.toContain("NaN")
        expect(new Set(labels).size).toBe(labels.length)
      })
    })

    it("keeps closely spaced midrange ticks distinct", () => {
      const page: TrendTargetPage = {
        ...complete,
        observations: [
          { state: "measured", value: 100_000_000 },
          { state: "measured", value: 100_000_000.00001 },
        ],
        target: 100_000_000.000005,
      }

      const { container } = renderTrend(page)

      expect(new Set(yAxisTickLabels(container)).size).toBe(5)
    })

    it("does not repeat labels when measurements are one representable step apart", () => {
      const page: TrendTargetPage = {
        ...complete,
        observations: [
          { state: "measured", value: 100_000_000 },
          { state: "measured", value: 100_000_000.00000001 },
        ],
        target: 100_000_000,
      }

      const { container } = renderTrend(page)

      const labels = yAxisTickLabels(container)
      expect(labels.length).toBeGreaterThanOrEqual(2)
      expect(new Set(labels).size).toBe(labels.length)
    })
  })

  describe("endpoint availability", () => {
    const weeks = (length: number) =>
      Array.from({ length }, () => ({ state: "unfilled" as const }))

    it.each([
      { length: 11, change: "prepend", allowed: true },
      { length: 12, change: "append", allowed: false },
      { length: 3, change: "remove-last", allowed: true },
      { length: 2, change: "remove-first", allowed: false },
    ] as const)(
      "with $length weeks, $change is allowed: $allowed",
      ({ length, change, allowed }) => {
        expect(canChangeTrendEndpoint(weeks(length), change)).toBe(allowed)
      }
    )
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

    it("prepends an unfilled week one Monday earlier and moves Metric Input with its week", () => {
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

    it("removes the latest week together with its invalid Metric Input", () => {
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
      return writeTrendInput(
        sessionWith(complete),
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
  })

  describe("clearing dating while weeks are entered", () => {
    function sessionWithClearedDating(page: TrendTargetPage = complete) {
      return writeTrendInput(
        sessionWith(page),
        { pageId: "p01", path: "startMonday" },
        ""
      )
    }

    it("keeps the Monday and reports readiness", () => {
      const session = sessionWithClearedDating()

      expect(session.week?.pages[0]).toMatchObject({
        startMonday: "2026-07-06",
      })
      expect(canSaveSession(session).allowed).toBe(false)
      expect(sessionReadiness(session, "p01")).toContainEqual(
        expect.objectContaining({ path: "startMonday" })
      )
    })

    it("blocks Copy", async () => {
      const session = sessionWithClearedDating()
      const snapshot = session.week!

      const copy = await exportPage(snapshot, snapshot.pages[0], {
        adapter: fakeAdapter(),
        metricInput: session.metricInput,
      })

      expect(copy).toMatchObject({
        kind: "blocked",
        issues: [expect.objectContaining({ path: "startMonday" })],
      })
    })

    it("skips the page in batch without preparing capture", async () => {
      const session = sessionWithClearedDating()
      const snapshot = session.week!
      const adapter = fakeAdapter()

      const batch = await exportVisiblePages(snapshot.start, snapshot, {
        adapter,
        metricInput: session.metricInput,
        download: () => {},
      })

      expect(batch.skipped).toEqual([
        expect.objectContaining({ pageId: "p01" }),
      ])
      expect(adapter.prepare).not.toHaveBeenCalled()
    })

    it("undates the page once every observation is cleared", () => {
      let session = sessionWithClearedDating()

      for (const index of [0, 1, 2])
        session = writeTrendInput(
          session,
          { pageId: "p01", path: `observations[${index}].value` },
          ""
        )

      expect(session.week?.pages[0]).toMatchObject({ startMonday: null })
      expect(canSaveSession(session).allowed).toBe(true)
    })

    describe("when the only entered week is Missing", () => {
      const missingThenUnfilled: TrendTargetPage = {
        ...complete,
        observations: [{ state: "missing" }, { state: "unfilled" }],
      }

      it("blocks save", () => {
        const session = sessionWithClearedDating(missingThenUnfilled)

        expect(canSaveSession(session).allowed).toBe(false)
      })

      it("clears pending dating once that week becomes Unfilled", () => {
        const session = sessionWithClearedDating(missingThenUnfilled)

        const next = setTrendObservationState(
          session,
          { pageId: "p01", index: 0 },
          "unfilled"
        )

        expect(next.week?.pages[0]).toMatchObject({ startMonday: null })
        expect(
          readTrendInput(next, { pageId: "p01", path: "startMonday" })
        ).toBe("")
        expect(canSaveSession(next).allowed).toBe(true)
      })
    })
  })

  it("creates a blank draft with eight unfilled positions and no dating or target", () => {
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
  })

  describe("parsing", () => {
    it("reads measured, missing, and unfilled observations", () => {
      const observations = [
        { state: "measured", value: -2 },
        { state: "missing" },
        { state: "unfilled" },
      ] as const

      const week = parseWeekDocument(
        weekWith({ ...complete, observations: [...observations] })
      )

      expect(week.pages[0]).toMatchObject({ observations })
    })

    it.each([
      {
        field: "a Missing observation with a value",
        page: {
          observations: [
            { state: "measured", value: 1 },
            { state: "missing", value: 0 },
          ],
        },
        error: /observations\[1\]/,
      },
      {
        field: "an Unfilled observation with a value",
        page: {
          observations: [
            { state: "unfilled", value: 0 },
            { state: "measured", value: 1 },
          ],
        },
        error: /observations\[0\]/,
      },
      {
        field: "a starting date that is not a Monday",
        page: { startMonday: "2026-07-07" },
        error: /startMonday/,
      },
      {
        field: "an unknown direction",
        page: { direction: "lower" },
        error: /direction/,
      },
      {
        field: "a single observation",
        page: { observations: [{ state: "measured", value: 1 }] },
        error: /observations/,
      },
    ])("rejects $field", ({ page, error }) => {
      expect(() =>
        parseWeekDocument({
          ...reportingWeek,
          pages: [{ ...complete, ...page }],
        })
      ).toThrow(error)
    })
  })

  describe("reporting week", () => {
    it("is ready when the final observation falls on the reporting week", () => {
      expect(
        assessContentReadiness(complete, { reportingMonday: "2026-07-20" })
      ).toEqual([])
    })

    it("reports observations that end after the reporting week", () => {
      expect(
        assessContentReadiness(complete, { reportingMonday: "2026-07-13" })
      ).toContainEqual(
        expect.objectContaining({
          path: "observations",
          code: "invalid-content",
        })
      )
    })
  })

  it("reports a missed target from the unrounded latest value", () => {
    renderTrend(complete, "2026-07-20 — 2026-07-24")

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

    renderTrend(page, "2026-07-13")

    expect(screen.getByText("Target missed")).toBeInTheDocument()
    expect(screen.getByText("Exact: -0.04 s < 0 s")).toBeInTheDocument()
  })

  it("names the metric unit in the chart caption", () => {
    renderTrend(complete)

    expect(
      screen.getByText("Mean export duration (s)", { selector: "figcaption" })
    ).toBeInTheDocument()
  })

  describe("Missing observations with two measurements", () => {
    const interiorMissing: TrendTargetPage = {
      ...complete,
      observations: [
        { state: "measured", value: 9 },
        { state: "missing" },
        { state: "measured", value: 8 },
      ],
    }
    const finalMissing: TrendTargetPage = {
      ...interiorMissing,
      observations: [...interiorMissing.observations, { state: "missing" }],
    }
    const finalMissingWeek = {
      start: "2026-07-27",
      end: "2026-07-31",
      pages: [finalMissing],
    }

    it("are ready when interior", () => {
      expect(
        assessContentReadiness(interiorMissing, {
          reportingMonday: reportingWeek.start,
        })
      ).toEqual([])
    })

    it("are ready when final", () => {
      expect(
        assessContentReadiness(finalMissing, {
          reportingMonday: finalMissingWeek.start,
        })
      ).toEqual([])
    })

    it("export when final", async () => {
      const result = await exportPage(finalMissingWeek, finalMissing, {
        adapter: fakeAdapter(),
      })

      expect(result.kind).toBe("captured")
    })

    it("round-trip through Week JSON", () => {
      const restored = parseWeekDocument(
        JSON.parse(JSON.stringify(finalMissingWeek))
      )

      expect(restored.pages[0]).toMatchObject({
        observations: finalMissing.observations,
      })
    })

    it("carry into the next week's clone", () => {
      const cloned = cloneWeekFromPrevious(finalMissingWeek, "2026-08-03")

      expect(cloned.pages[0]).toMatchObject({
        observations: finalMissing.observations,
        startMonday: "2026-07-06",
        measurementContext: complete.measurementContext,
        title: "",
        interpretation: "",
      })
    })
  })

  describe("final displayed week", () => {
    const withGap: TrendTargetPage = {
      ...complete,
      observations: [
        { state: "measured", value: 0 },
        { state: "missing" },
        { state: "measured", value: 8 },
        { state: "missing" },
      ],
    }

    it("marks Missing weeks and reports no data without falling back", () => {
      renderTrend(withGap, "2026-07-27")

      expect(screen.getByText("No data")).toBeInTheDocument()
      expect(screen.getByText("× No observation")).toBeInTheDocument()
      expect(screen.getAllByLabelText("No observation")).toHaveLength(2)
      expect(
        screen.getByText(
          "Measurement Context: p95 exports, 100 requests each Monday."
        )
      ).toBeInTheDocument()
    })

    it("reports an Unfilled week as not entered", () => {
      const unfilledLast: TrendTargetPage = {
        ...withGap,
        observations: [
          ...withGap.observations.slice(0, -1),
          { state: "unfilled" },
        ],
      }

      renderTrend(unfilledLast, "2026-07-27")

      expect(screen.getByText("Not entered")).toBeInTheDocument()
      expect(screen.queryByText("No data")).not.toBeInTheDocument()
      expect(screen.getAllByLabelText("No observation")).toHaveLength(1)
    })
  })

  describe("observation state changes", () => {
    const secondValue = {
      pageId: "p01",
      path: "observations[1].value",
    } as const
    const second = { pageId: "p01", index: 1 }

    function sessionWithPendingErrors() {
      const session = writeTrendInput(sessionWith(complete), secondValue, "bad")
      return writeTrendInput(session, { pageId: "p01", path: "target" }, "oops")
    }

    it("drop a week's value and pending error when it becomes Missing", () => {
      const session = sessionWithPendingErrors()

      const next = setTrendObservationState(session, second, "missing")

      expect(next.week?.pages[0]).toMatchObject({
        observations: [
          { state: "measured", value: 9.2 },
          { state: "missing" },
          { state: "measured", value: 8.04 },
        ],
      })
      expect(next.metricInput.p01?.["observations[1].value"]).toBeUndefined()
      expect(canSaveSession(next).allowed).toBe(false)
      expect(sessionReadiness(next, "p01")).toContainEqual(
        expect.objectContaining({ path: "target", code: "invalid-content" })
      )
    })

    it("leave an empty value when a Missing week becomes Unfilled", () => {
      const session = setTrendObservationState(
        sessionWithPendingErrors(),
        second,
        "missing"
      )

      const next = setTrendObservationState(session, second, "unfilled")

      expect(readTrendInput(next, secondValue)).toBe("")
      expect(next.week?.pages[0]).toMatchObject({
        observations: [
          { state: "measured", value: 9.2 },
          { state: "unfilled" },
          { state: "measured", value: 8.04 },
        ],
      })
    })

    it("measure an Unfilled week once a value is entered", () => {
      const session = sessionWith({
        ...complete,
        observations: [
          { state: "measured", value: 9.2 },
          { state: "unfilled" },
          { state: "measured", value: 8.04 },
        ],
      })

      const next = writeTrendInput(session, secondValue, "0")

      expect(next.week?.pages[0]).toMatchObject({
        observations: [
          { state: "measured", value: 9.2 },
          { state: "measured", value: 0 },
          { state: "measured", value: 8.04 },
        ],
      })
    })

    it("return a measured week to Unfilled when its value is cleared", () => {
      const next = writeTrendInput(sessionWith(complete), secondValue, "")

      expect(next.week?.pages[0]).toMatchObject({
        observations: [
          { state: "measured", value: 9.2 },
          { state: "unfilled" },
          { state: "measured", value: 8.04 },
        ],
      })
    })
  })

  describe("incomplete drafts", () => {
    const allMissing: TrendTargetPage = {
      ...complete,
      observations: Array.from({ length: 3 }, () => ({ state: "missing" })),
    }
    const oneMeasured: TrendTargetPage = {
      ...complete,
      observations: [
        { state: "measured", value: 0 },
        { state: "missing" },
        { state: "missing" },
      ],
    }

    it.each([
      {
        draft: "all Missing",
        page: allMissing,
        path: "observations",
        message: "At least two measured observations are required",
      },
      {
        draft: "one measurement",
        page: oneMeasured,
        path: "observations",
        message: "At least two measured observations are required",
      },
      {
        draft: "an Unfilled week",
        page: {
          ...complete,
          observations: [
            { state: "measured", value: 0 },
            { state: "measured", value: 8 },
            { state: "unfilled" },
          ],
        } satisfies TrendTargetPage,
        path: "observations[2]",
        message: "Observation is unfilled",
      },
      {
        draft: "no Measurement Context",
        page: { ...complete, measurementContext: "" },
        path: "measurementContext",
        message: "Measurement Context is required",
      },
    ])("reports $draft as not ready", ({ page, path, message }) => {
      expect(
        assessContentReadiness(page, { reportingMonday: reportingWeek.start })
      ).toContainEqual(expect.objectContaining({ path, message }))
    })

    it("are skipped by batch while ready pages export", async () => {
      const week = weekWith(
        { ...allMissing, id: "p01" },
        { ...oneMeasured, id: "p02" },
        { ...complete, id: "p03" }
      )
      const downloaded: string[] = []

      const result = await exportVisiblePages(week.start, week, {
        adapter: fakeAdapter(),
        download: (_blob, filename) => downloaded.push(filename),
      })

      expect(result.skipped.map((entry) => entry.pageId)).toEqual([
        "p01",
        "p02",
      ])
      expect(downloaded).toEqual(["2026-07-20-p03.png"])
    })
  })

  describe("inclusive targets at both series limits", () => {
    const twoWeeks: TrendTargetPage = {
      ...complete,
      startMonday: "2026-08-24",
      observations: [
        { state: "measured", value: -3 },
        { state: "measured", value: 0 },
      ],
      target: 0,
      direction: "at-least",
    }
    const twelveZeros: TrendTargetPage = {
      ...complete,
      startMonday: "2025-12-15",
      observations: Array.from({ length: 12 }, () => ({
        state: "measured",
        value: 0,
      })),
      target: 0,
    }

    it.each([
      { series: "two signed weeks", page: twoWeeks, monday: "2026-08-31" },
      { series: "twelve zero weeks", page: twelveZeros, monday: "2026-03-02" },
    ])("accept $series as ready", ({ page, monday }) => {
      expect(assessContentReadiness(page, { reportingMonday: monday })).toEqual(
        []
      )
    })

    it("meet an at-least target equal to the latest value", () => {
      renderTrend(twoWeeks, "2026-08-31 — 2026-09-04")

      expect(screen.getByText("Target met")).toBeInTheDocument()
    })

    it("pad a flat zero series by one unit either side", () => {
      expect(trendBounds(twelveZeros)).toEqual([-1, 1])
    })

    it("show the full twelve-week range and meet an equal at-most target", () => {
      renderTrend(twelveZeros, "2026-03-02 — 2026-03-06")

      expect(
        screen.getByText("Observed weeks: 2025-12-15 – 2026-03-02")
      ).toBeInTheDocument()
      expect(screen.getByText("Target met")).toBeInTheDocument()
    })
  })

  it("retains dated evidence and clears weekly conclusions when cloned", () => {
    const week = cloneWeekFromPrevious(weekWith(complete), "2026-07-27")

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

  describe("scientific input", () => {
    const location = { pageId: "p01", path: "observations[2].value" } as const

    it("keeps nonzero input that underflows to zero pending", () => {
      const session = writeTrendInput(sessionWith(complete), location, "1e-324")

      expect(readTrendInput(session, location)).toBe("1e-324")
      expect(session.week?.pages[0]).toMatchObject({
        observations: complete.observations,
      })
      expect(canSaveSession(session).allowed).toBe(false)
      expect(sessionReadiness(session, "p01")).toContainEqual(
        expect.objectContaining({
          path: location.path,
          code: "invalid-content",
          message: "Number is too small to represent",
        })
      )
    })

    it("commits an exponent-form zero", () => {
      const session = writeTrendInput(sessionWith(complete), location, "0e-324")

      expect(session.week?.pages[0]).toMatchObject({
        observations: [
          { state: "measured", value: 9.2 },
          { state: "measured", value: 8.8 },
          { state: "measured", value: 0 },
        ],
      })
      expect(canSaveSession(session).allowed).toBe(true)
    })

    it("commits a signed value", () => {
      const session = writeTrendInput(sessionWith(complete), location, "-1.2e1")

      expect(session.week?.pages[0]).toMatchObject({
        observations: [
          { state: "measured", value: 9.2 },
          { state: "measured", value: 8.8 },
          { state: "measured", value: -12 },
        ],
      })
    })

    describe("an invalid signed value", () => {
      function sessionWithInvalidSignedInput() {
        return writeTrendInput(sessionWith(complete), location, "-1e")
      }

      it("stays visible and blocks save", () => {
        const session = sessionWithInvalidSignedInput()

        expect(readTrendInput(session, location)).toBe("-1e")
        expect(canSaveSession(session).allowed).toBe(false)
        expect(sessionReadiness(session, "p01")).toContainEqual(
          expect.objectContaining({
            path: location.path,
            code: "invalid-content",
          })
        )
      })

      it("blocks Copy without preparing capture", async () => {
        const session = sessionWithInvalidSignedInput()
        const snapshot = session.week!
        const adapter = fakeAdapter()

        const copy = await exportPage(snapshot, snapshot.pages[0], {
          adapter,
          metricInput: session.metricInput,
        })

        expect(copy.kind).toBe("blocked")
        expect(adapter.prepare).not.toHaveBeenCalled()
      })

      it("is skipped by batch while ready pages export", async () => {
        const session = sessionWithInvalidSignedInput()
        const downloads: string[] = []

        const batch = await exportVisiblePages(
          reportingWeek.start,
          weekWith(session.week!.pages[0] as TrendTargetPage, {
            ...complete,
            id: "p02",
          }),
          {
            adapter: fakeAdapter(),
            metricInput: session.metricInput,
            download: (_blob, filename) => downloads.push(filename),
          }
        )

        expect(batch.skipped).toEqual([
          expect.objectContaining({ pageId: "p01" }),
        ])
        expect(downloads).toEqual(["2026-07-20-p02.png"])
      })
    })
  })

  describe("an invalid starting date", () => {
    const startMonday = { pageId: "p01", path: "startMonday" } as const
    const week = weekWith(complete, createBlankTrendTargetPage("p02"))

    function sessionWithInvalidDate() {
      return writeTrendInput(
        createEditingSession(week),
        startMonday,
        "2026-07-07"
      )
    }

    it("stays attached to its page as pending input and blocks save", () => {
      const session = sessionWithInvalidDate()

      expect(readTrendInput(session, startMonday)).toBe("2026-07-07")
      expect(session.week?.pages[0]).toMatchObject({
        startMonday: "2026-07-06",
      })
      expect(canSaveSession(session).allowed).toBe(false)
    })

    it("does not return when the Page ID is reused after deletion", () => {
      const deleted = deleteSessionPage(sessionWithInvalidDate(), "p01")

      const session = addSessionPage(deleted, createBlankTrendTargetPage("p01"))

      expect(canSaveSession(session).allowed).toBe(true)
      expect(readTrendInput(session, startMonday)).toBe("")
    })

    it("is cleared when another week opens", () => {
      const session = openSessionWeek(sessionWithInvalidDate(), week)

      expect(session.metricInput).toEqual({})
    })
  })

  describe("a reporting week before the final observation", () => {
    const earlyWeek = {
      start: "2026-07-13",
      end: "2026-07-17",
      pages: [complete],
    }

    it("reports readiness in the editor", () => {
      const session = createEditingSession(earlyWeek)

      expect(sessionReadiness(session, "p01")).toContainEqual(
        expect.objectContaining({
          path: "observations",
          message: expect.stringContaining("after reporting week"),
        })
      )
    })

    it("blocks Copy", async () => {
      const copy = await exportPage(earlyWeek, complete, {
        adapter: fakeAdapter(),
      })

      expect(copy).toMatchObject({
        kind: "blocked",
        issues: [expect.objectContaining({ path: "observations" })],
      })
    })

    it("is skipped by batch without preparing capture", async () => {
      const adapter = fakeAdapter()

      const batch = await exportVisiblePages(earlyWeek.start, earlyWeek, {
        adapter,
        download: () => {},
      })

      expect(batch.skipped).toEqual([
        expect.objectContaining({ pageId: "p01" }),
      ])
      expect(adapter.prepare).not.toHaveBeenCalled()
    })
  })

  it("blocks Copy when the canonical stage overflows", async () => {
    const copy = await exportPage(weekWith(complete), complete, {
      adapter: fakeAdapter("overflow"),
    })

    expect(copy).toMatchObject({
      kind: "blocked",
      issues: [expect.objectContaining({ code: "overflow" })],
    })
  })
})
