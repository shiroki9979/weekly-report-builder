import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { StageSlide } from "@/components/stage/stage-slide"
import {
  parseWeekDocument,
  type HtmlWeekPage,
  type TwoColumnWeekPage,
  type WeeklyOverviewPage,
  type EvidenceDecisionPage,
  type NextActionsPage,
} from "@/lib/week-document"

const weekContext = {
  documentId: "2026-08-24",
  weekLabel: "2026-08-24 — 2026-08-28",
  pageLabel: "1 / 1",
  showPageNumber: true,
}

describe("StageSlide", () => {
  it("renders two-column layout slide with stage context", () => {
    const page: TwoColumnWeekPage = {
      id: "p01",
      layout: "two-column",
      title: "Slide Title",
      items: [
        { heading: "Heading 1", body: "Body 1" },
        { heading: "Heading 2", body: "Body 2" },
        { heading: "Heading 3", body: "Body 3" },
      ],
      panel: {
        kind: "checklist",
        title: "Checklist",
        items: [{ label: "Item 1", checked: true }],
      },
    }

    render(<StageSlide page={page} context={weekContext} />)

    expect(
      screen.getByRole("heading", { level: 1, name: "Slide Title" })
    ).toBeInTheDocument()
    expect(screen.getByText("Heading 1")).toBeInTheDocument()
  })

  it("loads an HTML Page from the document id, not the displayed week label", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      text: async () => "<div>Custom Content</div>",
    } as Response)

    const page: HtmlWeekPage = {
      id: "p03",
      layout: "html",
      title: "HTML Slide",
      htmlFile: "p03.html",
    }

    render(
      <StageSlide
        page={page}
        context={{
          ...weekContext,
          documentId: "2026-08-31",
          weekLabel: "Label that is not an id",
        }}
        isCapture
      />
    )

    await waitFor(() => {
      const captureEl = screen.getByTestId("html-slide-capture")
      expect(captureEl).toHaveAttribute("data-status", "ready")
      expect(captureEl).toHaveTextContent("Custom Content")
    })
    expect(String(fetch.mock.calls[0][0])).toContain(
      "/weeks/2026-08-31/p03.html"
    )
  })

  it("shows Hidden on hidden pages", () => {
    const page: TwoColumnWeekPage = {
      id: "p02",
      layout: "two-column",
      title: "Hidden slide",
      hidden: true,
      items: [
        { heading: "Heading 1", body: "Body 1" },
        { heading: "Heading 2", body: "Body 2" },
        { heading: "Heading 3", body: "Body 3" },
      ],
      panel: {
        kind: "checklist",
        title: "Checklist",
        items: [{ label: "Item 1" }],
      },
    }

    render(
      <StageSlide
        page={page}
        context={{ ...weekContext, pageLabel: "Hidden" }}
      />
    )

    expect(screen.getByRole("status")).toHaveTextContent("Hidden")
  })

  it("renders weekly-overview with the editorial frame context", () => {
    const page: WeeklyOverviewPage = {
      id: "p01",
      layout: "weekly-overview",
      title: "Delivery recovered, and the week closed with two durable gains.",
      lead: {
        workstream: "Delivery",
        figure: "5 days",
        result: "Turnaround fell from 9 days to 5.",
        impact: "Work now finishes in the same week it starts.",
        status: { label: "On track", tone: "positive" },
      },
      supporting: [
        {
          workstream: "Accuracy",
          figure: "1.2%",
          result: "Faults that reached users dropped to 1.2%.",
          impact: "Fewer late fixes after something went live.",
          status: { label: "Improved", tone: "positive" },
        },
      ],
    }

    render(<StageSlide page={page} context={weekContext} />)

    expect(screen.getByText("Weekly Overview")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Delivery recovered, and the week closed with two durable gains.",
      })
    ).toBeInTheDocument()
    expect(screen.getByText("2026-08-24 — 2026-08-28")).toBeInTheDocument()
    expect(screen.getByText("1 / 1").closest("footer")).toHaveClass(
      "editorial-page-number"
    )
    expect(screen.getByText("Delivery")).toBeInTheDocument()
    expect(screen.getByText("Accuracy")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Turnaround fell from 9 days to 5.",
      })
    ).toBeInTheDocument()
  })

  it("renders evidence-decision Comparison Metrics with fixed Baseline and Candidate labels", () => {
    const page: EvidenceDecisionPage = {
      id: "p01",
      layout: "evidence-decision",
      title: "Ship the candidate. The baseline is slower.",
      verdict: "Adopt the candidate.",
      metrics: [
        {
          label: "Turnaround",
          baselineValue: 9.4,
          candidateValue: 5.1,
          unit: "days",
          unitPosition: "after",
          unitSpacing: "space",
          precision: 1,
        },
      ],
      interpretations: ["The candidate finishes the same week."],
    }

    render(<StageSlide page={page} context={weekContext} />)

    expect(screen.getByText("Evidence-backed Decision")).toBeInTheDocument()
    expect(screen.getByText("Adopt the candidate.")).toBeInTheDocument()
    expect(screen.getByText("Baseline")).toBeInTheDocument()
    expect(screen.getByText("Candidate")).toBeInTheDocument()
    expect(screen.getByText("9.4 days")).toBeInTheDocument()
    expect(screen.getByText("5.1 days")).toBeInTheDocument()
  })

  it("renders next-actions commitments with derived numbers", () => {
    const page: NextActionsPage = {
      id: "p01",
      layout: "next-actions",
      title: "Five-day reviews and a held reserve.",
      commitments: [
        {
          title: "Stabilize the review queue",
          outcome: "Changes land within five days.",
          checkpoint: "Median wait ≤ 5 days next Friday.",
        },
        {
          title: "Hold the reserve",
          outcome: "Use stays below 25%.",
          checkpoint: "Reserve report signed before the next release.",
        },
      ],
    }

    render(<StageSlide page={page} context={weekContext} />)

    expect(screen.getByText("Next Actions")).toBeInTheDocument()
    expect(screen.getByText("01")).toBeInTheDocument()
    expect(screen.getByText("02")).toBeInTheDocument()
    expect(screen.getByText("Stabilize the review queue")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Hold the reserve",
      })
    ).toBeInTheDocument()
  })

  it("shows aligned action and checkpoint headings for Rows", () => {
    const page: NextActionsPage = {
      id: "p01",
      layout: "next-actions",
      variant: "rows",
      title: "Act on the review delay",
      commitments: [
        {
          title: "Reduce the queue",
          outcome: "Fewer aged reviews",
          checkpoint: "Median ≤ 5 days",
        },
        {
          title: "Keep a reserve",
          outcome: "Capacity stays available",
          checkpoint: "Reserve review Friday",
        },
      ],
    }

    render(<StageSlide page={page} context={weekContext} />)
    expect(screen.getByText("Action & intended outcome")).toBeInTheDocument()
    expect(screen.getByText("Verification checkpoint")).toBeInTheDocument()
    expect(screen.getByText("Median ≤ 5 days")).toBeInTheDocument()
    expect(screen.getByText("Reserve review Friday")).toBeInTheDocument()
  })

  it("warns for an unknown layout without rendering it as a two-column slide", () => {
    const week = parseWeekDocument({
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [{ id: "p04", layout: "future-layout", title: "Future Slide" }],
    })

    render(
      <StageSlide
        page={week.pages[0]}
        context={{ ...weekContext, pageLabel: "" }}
      />
    )

    expect(screen.getByRole("status")).toHaveTextContent(
      "Unknown layout: future-layout"
    )
  })

  it("hides page number on editorial layout when showPageNumber is false", () => {
    const page: WeeklyOverviewPage = {
      id: "p01",
      layout: "weekly-overview",
      title: "Title",
      lead: {
        workstream: "Work",
        figure: "1",
        result: "Done",
        impact: "Impact",
        status: { label: "OK", tone: "positive" },
      },
      supporting: [
        {
          workstream: "Sub",
          figure: "2",
          result: "Done 2",
          impact: "Impact 2",
          status: { label: "OK", tone: "positive" },
        },
      ],
    }

    render(
      <StageSlide
        page={page}
        context={{ ...weekContext, showPageNumber: false }}
      />
    )

    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument()
  })

  it("renders page number on html layout when showPageNumber is true", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      text: async () => "<div>Custom Content</div>",
    } as Response)

    const page: HtmlWeekPage = {
      id: "p03",
      layout: "html",
      title: "HTML Slide",
      htmlFile: "p03.html",
    }

    render(
      <StageSlide
        page={page}
        context={{ ...weekContext, showPageNumber: true }}
      />
    )

    expect(screen.getByText("1 / 1").closest("footer")).toHaveClass(
      "stage-page-number"
    )
  })

  it("hides page number on html layout when showPageNumber is false", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      text: async () => "<div>Custom Content</div>",
    } as Response)

    const page: HtmlWeekPage = {
      id: "p03",
      layout: "html",
      title: "HTML Slide",
      htmlFile: "p03.html",
    }

    render(
      <StageSlide
        page={page}
        context={{ ...weekContext, showPageNumber: false }}
      />
    )

    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument()
  })

  it("does not render a page number on two-column layout", () => {
    const page: TwoColumnWeekPage = {
      id: "p01",
      layout: "two-column",
      title: "Slide Title",
      items: [
        { heading: "Heading 1", body: "Body 1" },
        { heading: "Heading 2", body: "Body 2" },
        { heading: "Heading 3", body: "Body 3" },
      ],
      panel: {
        kind: "table",
        title: "Table",
        columns: ["Col"],
        rows: [{ cells: ["Val"] }],
      },
    }

    render(
      <StageSlide
        page={page}
        context={{ ...weekContext, showPageNumber: true }}
      />
    )

    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument()
  })
})
