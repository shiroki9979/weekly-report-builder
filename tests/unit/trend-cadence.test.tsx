import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StageSlide } from "@/components/stage/stage-slide"
import { createEditingSession } from "@/lib/editing-session"
import { assessContentReadiness } from "@/lib/export-readiness"
import { createBlankTrendTargetPage } from "@/lib/page-lifecycle"
import {
  readTrendInput,
  setTrendCadence,
  TREND_CADENCE_LOCKED,
  writeTrendInput,
} from "@/lib/trend-session"
import {
  alignTrendStart,
  observationDate,
  trendDatingError,
  trendEndDate,
} from "@/lib/trend-target"
import { parseDeck, type TrendTargetPage } from "@/lib/deck"
import { serializeDeck } from "@/lib/decks-io"

const monthly: TrendTargetPage = {
  id: "p01",
  layout: "trend-target",
  title: "Churn stayed under target through the holidays.",
  metric: {
    label: "Monthly churn",
    unit: "%",
    unitPosition: "after",
    unitSpacing: "none",
    precision: 1,
  },
  cadence: "month",
  start: "2025-11-01",
  observations: [
    { state: "measured", value: 2.4 },
    { state: "missing" },
    { state: "measured", value: 1.9 },
  ],
  target: 2,
  direction: "at-most",
  interpretation: "Retention offers held churn down.",
  measurementContext: "Paid accounts, measured on the last business day.",
}

function sessionWith(page: TrendTargetPage) {
  return createEditingSession({ pages: [page] }, "q1-review")
}

describe("Trend & Target cadence", () => {
  describe("dating", () => {
    it("steps monthly observations across a year boundary", () => {
      expect(observationDate("month", "2025-11-01", 2)).toBe("2026-01-01")
      expect(observationDate("month", "2025-11-01", -11)).toBe("2024-12-01")
      expect(trendEndDate(monthly)).toBe("2026-01-01")
    })

    it("requires the first day of a month for a monthly start", () => {
      expect(trendDatingError("month", "2025-11-03", 3)).toEqual({
        path: "start",
        message: "Starting month must be the first day of a calendar month",
      })
      expect(trendDatingError("month", "2025-11-01", 3)).toBeNull()
      expect(trendDatingError("month", "9999-12-01", 2)).toMatchObject({
        path: "observations",
      })
    })

    it("aligns a start to the new cadence", () => {
      expect(alignTrendStart("month", "2026-07-06")).toBe("2026-07-01")
      expect(alignTrendStart("week", "2026-07-01")).toBe("2026-07-06")
      expect(alignTrendStart("week", "2026-06-01")).toBe("2026-06-01")
      expect(alignTrendStart("week", null)).toBeNull()
    })
  })

  describe("parsing", () => {
    const legacy = { ...monthly, cadence: undefined, start: undefined }

    it("reads a legacy startMonday as a weekly series and saves the new fields", () => {
      const deck = parseDeck({
        pages: [
          {
            ...legacy,
            startMonday: "2026-07-06",
            observations: [{ state: "unfilled" }, { state: "unfilled" }],
          },
        ],
      })

      expect(deck.pages[0]).toMatchObject({
        cadence: "week",
        start: "2026-07-06",
      })
      const saved = JSON.parse(serializeDeck(deck)).pages[0]
      expect(saved).not.toHaveProperty("startMonday")
      expect(saved).toMatchObject({ cadence: "week", start: "2026-07-06" })
    })

    it("round-trips a monthly series", () => {
      const deck = parseDeck({ pages: [monthly] })
      expect(deck.pages[0]).toEqual(monthly)
    })

    it.each([
      {
        field: "both dating formats",
        page: { ...monthly, startMonday: "2026-07-06" },
        error: /either startMonday or cadence\/start/,
      },
      {
        field: "an unknown cadence",
        page: { ...monthly, cadence: "day" },
        error: /cadence must be week or month/,
      },
      {
        field: "a monthly start that is not the first",
        page: { ...monthly, start: "2025-11-15" },
        error: /start: Starting month must be the first day/,
      },
    ])("rejects $field", ({ page, error }) => {
      expect(() => parseDeck({ pages: [page] })).toThrow(error)
    })
  })

  describe("readiness", () => {
    it("compares the final month with the deck period end", () => {
      expect(assessContentReadiness(monthly, { asOf: "2026-01-31" })).toEqual(
        []
      )
      expect(
        assessContentReadiness(monthly, { asOf: "2025-12-31" })
      ).toContainEqual(
        expect.objectContaining({
          path: "observations",
          message:
            "Observed range ends 2026-01-01, after the deck period ending 2025-12-31",
        })
      )
    })

    it("skips the period check for a deck without a period", () => {
      expect(assessContentReadiness(monthly, {})).toEqual([])
    })

    it("names the monthly start when it is missing", () => {
      const undated: TrendTargetPage = {
        ...monthly,
        start: null,
        observations: [{ state: "unfilled" }, { state: "unfilled" }],
      }
      expect(assessContentReadiness(undated)).toContainEqual(
        expect.objectContaining({
          path: "start",
          message: "Starting month is required",
        })
      )
    })
  })

  describe("switching cadence", () => {
    it("aligns the start and clears a pending start while nothing is entered", () => {
      const blank = {
        ...createBlankTrendTargetPage("p01"),
        start: "2026-07-06",
      }
      let session = sessionWith(blank)
      session = writeTrendInput(
        session,
        { pageId: "p01", path: "start" },
        "2026-07-0"
      )

      session = setTrendCadence(session, "p01", "month")

      expect(session.deck?.pages[0]).toMatchObject({
        cadence: "month",
        start: "2026-07-01",
      })
      expect(readTrendInput(session, { pageId: "p01", path: "start" })).toBe(
        "2026-07-01"
      )
    })

    it("refuses once observations are entered", () => {
      expect(() =>
        setTrendCadence(sessionWith(monthly), "p01", "week")
      ).toThrow(TREND_CADENCE_LOCKED)
    })

    it("asks for the starting month before observations", () => {
      const undated = sessionWith({
        ...monthly,
        start: null,
        observations: [{ state: "unfilled" }, { state: "unfilled" }],
      })
      expect(() =>
        writeTrendInput(
          undated,
          { pageId: "p01", path: "observations[0].value" },
          "2"
        )
      ).toThrow("Set starting month before entering observations")
    })
  })

  describe("slide", () => {
    it("labels a monthly series by month", () => {
      const { container } = render(
        <StageSlide
          page={monthly}
          context={{
            documentId: "q1-review",
            frameLabel: "",
            pageLabel: "",
            showPageNumber: false,
          }}
        />
      )

      expect(screen.getByText("Monthly target")).toBeInTheDocument()
      expect(screen.getByText("Latest month · 2026-01-01")).toBeInTheDocument()
      expect(
        screen.getByText(/Observed months: 2025-11-01.*2026-01-01/)
      ).toBeInTheDocument()
      const axis = [...container.querySelectorAll("svg .editorial-trend-axis")]
        .map((node) => node.textContent)
        .slice(-3)
      expect(axis).toEqual(["Nov", "Dec", "Jan"])
      expect(container.querySelector("svg title")?.textContent).toBe(
        "Monthly churn (%) by month"
      )
    })
  })
})
