import { describe, expect, it } from "vitest"

import { matchPage, type Page, type PageKind } from "@/lib/deck"
import { createBlankAddablePage } from "@/lib/page-lifecycle"

// matchPage 的 if 鏈不受編譯器窮舉檢查：新增分支卻漏寫 guard，或空白頁形狀對不上 guard，都會靜默落到 unknown，
// Editorial Frame 成員表也就把它判成非成員。以 PageKind 為 key，新增分支時型別檢查要求補樣本，再在執行期確認分派
const SAMPLES: Record<PageKind, Page> = {
  html: { id: "p01", layout: "html", title: "", htmlFile: "p01.html" },
  twoColumn: createBlankAddablePage("p01", "two-column", "table"),
  overview: createBlankAddablePage("p01", "overview", "table"),
  evidenceDecision: createBlankAddablePage("p01", "evidence-decision", "table"),
  nextActions: createBlankAddablePage("p01", "next-actions", "table"),
  trendTarget: createBlankAddablePage("p01", "trend-target", "table"),
  cover: createBlankAddablePage("p01", "cover", "table"),
  closing: createBlankAddablePage("p01", "closing", "table"),
  sideBySide: createBlankAddablePage("p01", "side-by-side", "table"),
  fullWidthPanel: createBlankAddablePage("p01", "full-width-panel", "table"),
  unknown: { id: "p01", layout: "future-layout", title: "" },
}

// 每格回傳自己的分支名；satisfies 讓回傳值與 key 不一致時編譯失敗
const OWN_KIND = {
  html: () => "html",
  twoColumn: () => "twoColumn",
  overview: () => "overview",
  evidenceDecision: () => "evidenceDecision",
  nextActions: () => "nextActions",
  trendTarget: () => "trendTarget",
  cover: () => "cover",
  closing: () => "closing",
  sideBySide: () => "sideBySide",
  fullWidthPanel: () => "fullWidthPanel",
  unknown: () => "unknown",
} satisfies { [K in PageKind]: () => K }

describe("matchPage", () => {
  it.each(Object.entries(SAMPLES))(
    "dispatches a %s page to its own branch",
    (kind, page) => {
      expect(matchPage<PageKind>(page, OWN_KIND)).toBe(kind)
    }
  )
})
