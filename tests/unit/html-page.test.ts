import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it, vi } from "vitest"

import {
  preloadHtmlFragment,
  resolveHtmlUrl,
  sanitizeHtmlFragment,
  validateHtmlFileName,
} from "@/lib/html-page"

describe("html-page", () => {
  describe("validateHtmlFileName", () => {
    it("accepts valid HTML file names", () => {
      expect(() => validateHtmlFileName("p03.html")).not.toThrow()
      expect(() => validateHtmlFileName("slide-1.html")).not.toThrow()
      expect(() => validateHtmlFileName("custom_page.html")).not.toThrow()
      expect(() => validateHtmlFileName("123.html")).not.toThrow()
    })

    it("rejects non-string or empty input", () => {
      expect(() => validateHtmlFileName("")).toThrow(/empty/i)
      expect(() => validateHtmlFileName("   ")).toThrow()
      // @ts-expect-error 測試執行階段型別檢查
      expect(() => validateHtmlFileName(null)).toThrow()
      // @ts-expect-error 測試執行階段型別檢查
      expect(() => validateHtmlFileName(undefined)).toThrow()
    })

    it("rejects path traversal and directory separators", () => {
      expect(() => validateHtmlFileName("../p03.html")).toThrow(
        /traversal|path/i
      )
      expect(() => validateHtmlFileName("sub/p03.html")).toThrow(
        /separator|path/i
      )
      expect(() => validateHtmlFileName("sub\\p03.html")).toThrow(
        /separator|path/i
      )
      expect(() => validateHtmlFileName("/p03.html")).toThrow(/separator|path/i)
      expect(() => validateHtmlFileName("..")).toThrow()
    })

    it("rejects whitespace in file name", () => {
      expect(() => validateHtmlFileName("p 03.html")).toThrow(/whitespace/i)
      expect(() => validateHtmlFileName("p03.html ")).toThrow(/whitespace/i)
      expect(() => validateHtmlFileName(" p03.html")).toThrow(/whitespace/i)
      expect(() => validateHtmlFileName("p03\t.html")).toThrow(/whitespace/i)
    })

    it("rejects non-html extensions or bare .html", () => {
      expect(() => validateHtmlFileName("p03.htm")).toThrow(/\.html/i)
      expect(() => validateHtmlFileName("p03.txt")).toThrow(/\.html/i)
      expect(() => validateHtmlFileName("p03.json")).toThrow(/\.html/i)
      expect(() => validateHtmlFileName(".html")).toThrow()
    })
  })

  describe("resolveHtmlUrl", () => {
    it("resolves valid monday and html file name to /weeks/{monday}/{htmlFile}", () => {
      expect(resolveHtmlUrl("2026-08-24", "p03.html")).toBe(
        "/weeks/2026-08-24/p03.html"
      )
    })

    it("rejects invalid monday format", () => {
      expect(() => resolveHtmlUrl("invalid-date", "p03.html")).toThrow(
        /monday/i
      )
      expect(() => resolveHtmlUrl("2026/08/24", "p03.html")).toThrow(/monday/i)
    })

    it("rejects invalid htmlFile", () => {
      expect(() => resolveHtmlUrl("2026-08-24", "../bad.html")).toThrow()
    })
  })

  describe("sanitizeHtmlFragment", () => {
    it("strips script elements and their content", () => {
      const raw =
        '<div><h1>Title</h1><script>alert("xss")</script><p>Body</p></div>'
      const sanitized = sanitizeHtmlFragment(raw)
      expect(sanitized).not.toContain("<script>")
      expect(sanitized).not.toContain("alert")
      expect(sanitized).toContain("<h1>Title</h1>")
      expect(sanitized).toContain("<p>Body</p>")
    })

    it("strips case-insensitive inline event handlers (on*)", () => {
      const raw =
        '<button onclick="alert(1)" ONMOUSEOVER="doSomething()" id="btn" class="primary">Click</button>'
      const sanitized = sanitizeHtmlFragment(raw)
      expect(sanitized).not.toContain("onclick")
      expect(sanitized).not.toContain("ONMOUSEOVER")
      expect(sanitized).toContain('id="btn"')
      expect(sanitized).toContain('class="primary"')
      expect(sanitized).toContain("Click")
    })

    it("strips javascript: pseudo-protocol in attributes", () => {
      const raw =
        '<a href="javascript:alert(1)">Link</a><iframe src=" javascript:doEvil()"></iframe>'
      const sanitized = sanitizeHtmlFragment(raw)
      expect(sanitized).not.toContain("javascript:")
      expect(sanitized).toContain("Link")
    })

    it("removes nested browsing contexts that can execute scripts through srcdoc", () => {
      const raw =
        '<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe><p>Safe</p>'
      const sanitized = sanitizeHtmlFragment(raw)

      expect(sanitized).not.toContain("iframe")
      expect(sanitized).not.toContain("srcdoc")
      expect(sanitized).toContain("<p>Safe</p>")
    })

    it("preserves inline SVG diagrams used by html layout slides", () => {
      const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" role="img" aria-labelledby="demo-title demo-desc">
  <title id="demo-title">Demo</title>
  <desc id="demo-desc">A blue square.</desc>
  <defs>
    <marker id="demo-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#5c5c5c"/>
    </marker>
  </defs>
  <rect x="4" y="4" width="32" height="32" fill="#2e75b6"/>
  <line x1="4" y1="20" x2="28" y2="20" stroke="#2d2d2d" marker-end="url(#demo-arrow)"/>
</svg>`
      const sanitized = sanitizeHtmlFragment(raw)
      expect(sanitized).toContain("<svg")
      expect(sanitized).toContain("viewBox")
      expect(sanitized).toContain("<rect")
      expect(sanitized).toContain("<line")
      expect(sanitized).toContain("marker-end")
      expect(sanitized).toContain("#2e75b6")
    })

    it("keeps a week-dir SVG diagram after whole-document sanitize", () => {
      const raw = readFileSync(
        resolve(import.meta.dirname, "../fixtures/html-pages/svg-diagram.html"),
        "utf-8"
      )
      const sanitized = sanitizeHtmlFragment(raw)
      expect(sanitized).toContain("<svg")
      expect(sanitized).toContain("Contract check before landing")
      expect(sanitized).toContain("marker-end")
      expect(sanitized).toContain("<style>")
      expect(sanitized).not.toContain("<script")
    })

    it("preserves valid style elements and safe markup", () => {
      const raw =
        '<style>.custom-banner { color: var(--blue); font-weight: bold; }</style><div class="custom-banner">Hello World</div>'
      const sanitized = sanitizeHtmlFragment(raw)
      expect(sanitized).toContain("<style>")
      expect(sanitized).toContain("color: var(--blue)")
      expect(sanitized).toContain('class="custom-banner"')
      expect(sanitized).toContain("Hello World")
    })

    it("preserves body style and class attributes on a root wrapper div", () => {
      // 驗證既有 HTML 週報中的整頁 body 樣式與 class 會轉換至 wrapper div 保留，不被 DOMParser 丟棄
      const raw =
        '<body class="theme-dark report-root" style="background-color: #121212; color: #ffffff;"><main>Content</main></body>'
      const sanitized = sanitizeHtmlFragment(raw)
      expect(sanitized).toContain('class="theme-dark report-root"')
      expect(sanitized).toContain(
        'style="background-color: #121212; color: #ffffff;"'
      )
      expect(sanitized).toContain("<main>Content</main>")
      expect(sanitized.startsWith("<div")).toBe(true)
    })

    it("handles plain text or empty strings gracefully", () => {
      expect(sanitizeHtmlFragment("")).toBe("")
      expect(sanitizeHtmlFragment("Plain text only")).toBe("Plain text only")
    })
  })

  describe("preloadHtmlFragment", () => {
    it("fetches with cache: no-cache and returns sanitized html", async () => {
      // 驗證擷取 HTML 時帶有 no-cache 標頭，防止瀏覽器或快取層提供過期內容
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        text: async () => "<p>Fresh</p>",
      } as Response)

      const result = await preloadHtmlFragment("2026-08-24", "p03.html")
      expect(result).toBe("<p>Fresh</p>")
      expect(fetchSpy).toHaveBeenCalledWith("/weeks/2026-08-24/p03.html", {
        cache: "no-cache",
      })
    })
  })
})
