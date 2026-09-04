import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { HtmlSlide } from "@/components/stage/html-slide"
import type { HtmlWeekPage } from "@/lib/week-document"

describe("HtmlSlide", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders a stage-warning with data-status=error when htmlFile is invalid", () => {
    const page: HtmlWeekPage = {
      id: "p03",
      layout: "html",
      title: "Test",
      htmlFile: "../invalid.html",
    }

    render(<HtmlSlide page={page} monday="2026-08-24" />)

    const statusEl = screen.getByRole("status")
    expect(statusEl).toHaveTextContent("Invalid HTML file: ../invalid.html")
    expect(statusEl).toHaveAttribute("data-status", "error")
  })

  it("shows loading placeholder with data-status=loading while fetch is in-flight", () => {
    // 透過永不 resolve 的 Promise 模擬網路延遲，驗證等待期間呈現 loading 佔位狀態
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(() => new Promise(() => {}))

    const page: HtmlWeekPage = {
      id: "p03",
      layout: "html",
      title: "Test",
      htmlFile: "p03.html",
    }

    render(<HtmlSlide page={page} monday="2026-08-24" />)

    const placeholder = screen.getByRole("status")
    expect(placeholder).toHaveTextContent("Loading HTML slide…")
    expect(placeholder).toHaveAttribute("data-status", "loading")
  })

  it("renders a stage-warning with data-status=error when fetch fails with non-ok response", async () => {
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
      const statusEl = screen.getByRole("status")
      expect(statusEl).toHaveTextContent(
        "Failed to load HTML file: missing.html (status 404)"
      )
      expect(statusEl).toHaveAttribute("data-status", "error")
    })
  })

  it("mounts sanitized content in Shadow DOM for preview mode", async () => {
    const rawHtml =
      '<div class="card"><h1>Slide Title</h1><script>bad()</script><button onclick="exploit()">Click</button></div>'

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      text: async () => rawHtml,
    } as Response)

    const page: HtmlWeekPage = {
      id: "p03",
      layout: "html",
      title: "Preview Test",
      htmlFile: "p03.html",
    }

    render(<HtmlSlide page={page} monday="2026-08-24" isCapture={false} />)

    await waitFor(() => {
      const shadowHost = screen.getByTestId("html-slide-shadow")
      expect(shadowHost).toHaveAttribute("data-status", "ready")
      expect(shadowHost.shadowRoot).not.toBeNull()
      const content = shadowHost.shadowRoot?.innerHTML ?? ""
      expect(content).toContain("Slide Title")
      expect(content).not.toContain("<script>")
      expect(content).not.toContain("bad()")
      expect(content).not.toContain("onclick")
      expect(content).not.toContain("exploit()")
    })
  })

  it("mounts sanitized content in Light DOM for capture mode", async () => {
    const rawHtml = '<div class="card"><h1>Capture Title</h1></div>'
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      text: async () => rawHtml,
    } as Response)

    const page: HtmlWeekPage = {
      id: "p03",
      layout: "html",
      title: "Capture Test",
      htmlFile: "p03.html",
    }

    render(<HtmlSlide page={page} monday="2026-08-24" isCapture={true} />)

    await waitFor(() => {
      const captureEl = screen.getByTestId("html-slide-capture")
      expect(captureEl).toHaveAttribute("data-status", "ready")
      expect(captureEl.innerHTML).toContain("Capture Title")
      expect(captureEl.shadowRoot).toBeNull()
    })
  })
})
