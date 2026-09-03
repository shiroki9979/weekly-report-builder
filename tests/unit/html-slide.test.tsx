import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { HtmlSlide } from "@/components/stage/html-slide"
import { clearHtmlCache, setCachedHtml } from "@/lib/html-page"
import type { HtmlWeekPage } from "@/lib/week-document"

describe("HtmlSlide", () => {
  beforeEach(() => {
    clearHtmlCache()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    clearHtmlCache()
    vi.restoreAllMocks()
  })

  it("renders a stage-warning when htmlFile is invalid", () => {
    const page: HtmlWeekPage = {
      id: "p03",
      layout: "html",
      title: "Test",
      htmlFile: "../invalid.html",
    }

    render(<HtmlSlide page={page} monday="2026-08-24" />)

    expect(screen.getByRole("status")).toHaveTextContent(
      "Invalid HTML file: ../invalid.html"
    )
  })

  it("renders a stage-warning when fetch fails with non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as Response)

    const page: HtmlWeekPage = {
      id: "p03",
      layout: "html",
      title: "Test",
      htmlFile: "missing.html",
    }

    render(<HtmlSlide page={page} monday="2026-08-24" />)

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Failed to load HTML file: missing.html"
      )
    })
  })

  it("mounts sanitized content in Shadow DOM for preview mode", async () => {
    const rawHtml =
      '<div class="card"><h1>Slide Title</h1><script>bad()</script><button onclick="exploit()">Click</button></div>'
    setCachedHtml("2026-08-24", "p03.html", "")

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      text: async () => rawHtml,
    } as Response)

    // Clear cache to trigger fetch
    clearHtmlCache()

    const page: HtmlWeekPage = {
      id: "p03",
      layout: "html",
      title: "Preview Test",
      htmlFile: "p03.html",
    }

    render(<HtmlSlide page={page} monday="2026-08-24" isCapture={false} />)

    await waitFor(() => {
      const shadowHost = screen.getByTestId("html-slide-shadow")
      expect(shadowHost.shadowRoot).not.toBeNull()
      const content = shadowHost.shadowRoot?.innerHTML ?? ""
      expect(content).toContain("Slide Title")
      expect(content).not.toContain("<script>")
      expect(content).not.toContain("bad()")
      expect(content).not.toContain("onclick")
      expect(content).not.toContain("exploit()")
    })
  })

  it("mounts sanitized content in Light DOM for capture mode", () => {
    const sanitized = '<div class="card"><h1>Capture Title</h1></div>'
    setCachedHtml("2026-08-24", "p03.html", sanitized)

    const page: HtmlWeekPage = {
      id: "p03",
      layout: "html",
      title: "Capture Test",
      htmlFile: "p03.html",
    }

    render(<HtmlSlide page={page} monday="2026-08-24" isCapture={true} />)

    const captureEl = screen.getByTestId("html-slide-capture")
    expect(captureEl.innerHTML).toContain("Capture Title")
    expect(captureEl.shadowRoot).toBeNull()
  })
})
