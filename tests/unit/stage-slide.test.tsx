import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { StageSlide } from "@/components/stage/stage-slide"
import type { HtmlWeekPage, TwoColumnWeekPage } from "@/lib/week-document"

describe("StageSlide", () => {
  it("renders two-column layout slide with explicitly passed monday", () => {
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

    render(<StageSlide page={page} monday="2026-08-24" />)

    expect(
      screen.getByRole("heading", { level: 1, name: "Slide Title" })
    ).toBeInTheDocument()
    expect(screen.getByText("Heading 1")).toBeInTheDocument()
  })

  it("renders html layout slide in capture mode with explicitly passed monday", async () => {
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

    render(<StageSlide page={page} monday="2026-08-24" isCapture />)

    await waitFor(() => {
      const captureEl = screen.getByTestId("html-slide-capture")
      expect(captureEl).toHaveAttribute("data-status", "ready")
      expect(captureEl).toHaveTextContent("Custom Content")
    })
  })
})
