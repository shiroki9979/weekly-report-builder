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
      // @ts-expect-error test runtime type check
      expect(() => validateHtmlFileName(null)).toThrow()
      // @ts-expect-error test runtime type check
      expect(() => validateHtmlFileName(undefined)).toThrow()
    })

    it("rejects path traversal and directory separators", () => {
      expect(() => validateHtmlFileName("../p03.html")).toThrow(/traversal|path/i)
      expect(() => validateHtmlFileName("sub/p03.html")).toThrow(/separator|path/i)
      expect(() => validateHtmlFileName("sub\\p03.html")).toThrow(/separator|path/i)
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
      expect(() => resolveHtmlUrl("invalid-date", "p03.html")).toThrow(/monday/i)
      expect(() => resolveHtmlUrl("2026/08/24", "p03.html")).toThrow(/monday/i)
    })

    it("rejects invalid htmlFile", () => {
      expect(() => resolveHtmlUrl("2026-08-24", "../bad.html")).toThrow()
    })
  })

  describe("sanitizeHtmlFragment", () => {
    it("strips script elements and their content", () => {
      const raw = '<div><h1>Title</h1><script>alert("xss")</script><p>Body</p></div>'
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
      expect(sanitized).toContain('style="background-color: #121212; color: #ffffff;"')
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
