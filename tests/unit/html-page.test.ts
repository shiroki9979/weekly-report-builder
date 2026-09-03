import { describe, expect, it } from "vitest"

import {
  clearHtmlCache,
  getCachedHtml,
  resolveHtmlUrl,
  sanitizeHtmlFragment,
  setCachedHtml,
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

    it("handles plain text or empty strings gracefully", () => {
      expect(sanitizeHtmlFragment("")).toBe("")
      expect(sanitizeHtmlFragment("Plain text only")).toBe("Plain text only")
    })
  })

  describe("HTML caching", () => {
    it("sets, gets, and clears cached HTML fragments", () => {
      clearHtmlCache()
      expect(getCachedHtml("2026-08-24", "p03.html")).toBeNull()

      setCachedHtml("2026-08-24", "p03.html", "<div>Cached</div>")
      expect(getCachedHtml("2026-08-24", "p03.html")).toBe("<div>Cached</div>")

      clearHtmlCache()
      expect(getCachedHtml("2026-08-24", "p03.html")).toBeNull()
    })
  })
})
