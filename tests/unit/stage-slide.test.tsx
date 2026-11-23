import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { StagePageContext } from "@/lib/stage-page-context"
import { StageSlide } from "@/components/stage/stage-slide"
import {
  parseDeck,
  type HtmlPage,
  type TwoColumnPage,
  type OverviewPage,
  type EvidenceDecisionPage,
  type NextActionsPage,
} from "@/lib/deck"

const weekContext: StagePageContext = {
  theme: "default",
  documentId: "2026-08-24",
  frameLabel: "2026-08-24 — 2026-08-28",
  hidden: false,
  footer: { position: { index: 1, total: 1 } },
}

describe("StageSlide", () => {
  it("renders two-column layout slide with stage context", () => {
    const page: TwoColumnPage = {
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

    const page: HtmlPage = {
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
          theme: "default",
          documentId: "2026-08-31",
          frameLabel: "Label that is not an id",
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
      "/decks/2026-08-31/p03.html"
    )
  })

  it("omits the period line from the editorial frame when the deck has none", () => {
    const page = parseDeck({
      pages: [
        {
          id: "p01",
          layout: "next-actions",
          title: "Next",
          commitments: [
            { title: "A", outcome: "a", checkpoint: "Mon" },
            { title: "B", outcome: "b", checkpoint: "Tue" },
          ],
        },
      ],
    }).pages[0]

    const { container } = render(
      <StageSlide page={page} context={{ ...weekContext, frameLabel: null }} />
    )

    expect(container.querySelector(".editorial-period")).toBeNull()
    expect(screen.getByText("1 / 1")).toBeInTheDocument()
  })

  it("shows Hidden on hidden pages", () => {
    const page: TwoColumnPage = {
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
        context={{
          ...weekContext,
          hidden: true,
          footer: { position: null },
        }}
      />
    )

    expect(screen.getByRole("status")).toHaveTextContent("Hidden")
  })

  it("renders overview with the editorial frame context", () => {
    const page: OverviewPage = {
      id: "p01",
      layout: "overview",
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

    expect(screen.getByText("Overview")).toBeInTheDocument()
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
    const week = parseDeck({
      period: { start: "2026-08-24", end: "2026-08-28" },
      pages: [{ id: "p04", layout: "future-layout", title: "Future Slide" }],
    })

    render(
      <StageSlide
        page={week.pages[0]}
        context={{ ...weekContext, footer: null }}
      />
    )

    expect(screen.getByRole("status")).toHaveTextContent(
      "Unknown layout: future-layout"
    )
  })

  it("hides page number on editorial layout when the footer has no Page Position", () => {
    const page: OverviewPage = {
      id: "p01",
      layout: "overview",
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
        context={{ ...weekContext, footer: { position: null } }}
      />
    )

    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument()
  })

  // 畫不畫、放什麼由 createStagePageContext 決定（見 stage-page-context.test），這裡只驗 Stage 照著畫
  it("draws the HTML Page footer it is given, the same as an Editorial Frame page, in preview and capture", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => "<div>Custom Content</div>",
    } as Response)
    const htmlPage: HtmlPage = {
      id: "p03",
      layout: "html",
      title: "HTML Slide",
      htmlFile: "p03.html",
    }
    const editorial = parseDeck({
      pages: [
        {
          id: "p01",
          layout: "next-actions",
          title: "Next",
          commitments: [
            { title: "A", outcome: "a", checkpoint: "Mon" },
            { title: "B", outcome: "b", checkpoint: "Tue" },
          ],
        },
      ],
    }).pages[0]
    const context: StagePageContext = {
      ...weekContext,
      footer: {
        deckTitle: "Harbor Forecast",
        position: { index: 3, total: 9 },
      },
    }

    const { container: editorialHost } = render(
      <StageSlide page={editorial} context={context} />
    )
    const { container: preview } = render(
      <StageSlide page={htmlPage} context={context} />
    )
    const { container: capture } = render(
      <StageSlide page={htmlPage} context={context} isCapture />
    )

    await waitFor(() => {
      expect(screen.getByTestId("html-slide-shadow")).toHaveAttribute(
        "data-status",
        "ready"
      )
      expect(screen.getByTestId("html-slide-capture")).toHaveAttribute(
        "data-status",
        "ready"
      )
    })
    const footer = preview.querySelector("footer")
    expect(footer).toHaveTextContent("Harbor Forecast")
    expect(footer).toHaveTextContent("3 / 9")
    expect(footer?.outerHTML).toBe(
      editorialHost.querySelector("footer")?.outerHTML
    )
    expect(capture.querySelector("footer")?.outerHTML).toBe(footer?.outerHTML)
  })

  it("renders the page number on two-column layout only when the context shows it", () => {
    const page: TwoColumnPage = {
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

    const { rerender } = render(
      <StageSlide page={page} context={weekContext} />
    )
    expect(screen.getByRole("contentinfo")).toHaveTextContent("1 / 1")

    rerender(
      <StageSlide
        page={page}
        context={{ ...weekContext, footer: { position: null } }}
      />
    )
    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument()
  })
})
