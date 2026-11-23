import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import {
  isEditorialFramePage,
  parseDeck,
  type Deck,
  type Page,
  type PageKind,
} from "@/lib/deck"
import {
  setPageBoundary,
  setPageEyebrow,
  setPageHidden,
  setPageNotes,
  setPageShowPageNumber,
} from "@/lib/deck-editor"
import { createDeckFromTemplate } from "@/lib/deck-template"
import { serializeDeck } from "@/lib/decks-io"
import {
  ADDABLE_LAYOUTS,
  createBlankAddablePage,
  type AddableLayout,
} from "@/lib/page-lifecycle"
import { readDemoDecks } from "../demo-decks"

const demoDecks = readDemoDecks(resolve(import.meta.dirname, "../../demo"))

function reloadAndSave(saved: string): string {
  return serializeDeck(parseDeck(JSON.parse(saved)))
}

// 依「最容易漂移」的順序逐一寫入：Eyebrow 最後寫，舊實作會把它接在所有欄位之後
function editEveryChromeField(deck: Deck): Deck {
  return deck.pages.reduce((next, page, index) => {
    let edited = setPageNotes(next, index, "Say this aloud")
    edited = setPageHidden(edited, index, true)
    edited = setPageShowPageNumber(edited, index, false)
    if (isEditorialFramePage(page)) {
      edited = setPageBoundary(edited, index, "Fictional sample only")
      edited = setPageEyebrow(edited, index, "Risks")
    }
    return edited
  }, deck)
}

describe("saved chrome key order", () => {
  it.each(ADDABLE_LAYOUTS)(
    "an added %s page saves the same after its chrome is edited and the Deck reloads",
    (layout) => {
      const added: Deck = {
        pages: [createBlankAddablePage("p01", layout, "table")],
      }
      const saved = serializeDeck(editEveryChromeField(added))

      expect(reloadAndSave(saved)).toBe(saved)
    }
  )

  it.each(demoDecks.map(({ id, deck }) => [id, deck] as const))(
    "a Deck created from %s saves the same after it reloads",
    (_id, template) => {
      const saved = serializeDeck(createDeckFromTemplate(template))

      expect(reloadAndSave(saved)).toBe(saved)
    }
  )

  it.each(demoDecks.map(({ id, deck }) => [id, deck] as const))(
    "a loaded %s saves the same after its chrome is edited and it reloads",
    (_id, loaded) => {
      const saved = serializeDeck(editEveryChromeField(loaded))

      expect(reloadAndSave(saved)).toBe(saved)
    }
  )

  it("places Editorial Frame chrome around the layout's own fields", () => {
    const added: Deck = {
      pages: [createBlankAddablePage("p01", "next-actions", "table")],
    }
    const saved = serializeDeck(editEveryChromeField(added))

    expect(Object.keys(JSON.parse(saved).pages[0])).toEqual([
      "id",
      "layout",
      "title",
      "eyebrow",
      "variant",
      "commitments",
      "hidden",
      "notes",
      "showPageNumber",
      "boundary",
    ])
  })
})

const AUTHORED_PAGE_CHROME = {
  title: "The pilot holds",
  notes: "Say this aloud",
  hidden: true,
  showPageNumber: false,
}

const AUTHORED_FRAME_CHROME = {
  ...AUTHORED_PAGE_CHROME,
  eyebrow: "Risks",
  boundary: "Fictional sample only",
}

// Headline、講稿與 Boundary Note 屬於當週內容；Eyebrow 與隱藏狀態屬於頁面結構；頁碼回到 Deck 預設
const PAGE_CHROME_FROM_TEMPLATE = {
  title: "",
  notes: undefined,
  hidden: true,
  showPageNumber: undefined,
}

const FRAME_CHROME_FROM_TEMPLATE = {
  ...PAGE_CHROME_FROM_TEMPLATE,
  eyebrow: "Risks",
  boundary: undefined,
}

function authoredFramePage(layout: AddableLayout): Page {
  return {
    ...createBlankAddablePage("p01", layout, "table"),
    ...AUTHORED_FRAME_CHROME,
  }
}

// 以 PageKind 為 key：新增版型時型別檢查要求補上它的 Deck Template chrome 預期
const TEMPLATE_CHROME_CASES: Record<
  PageKind,
  { page: Page; expected: Record<string, unknown> }
> = {
  html: {
    page: {
      id: "p01",
      layout: "html",
      htmlFile: "p01.html",
      ...AUTHORED_PAGE_CHROME,
    },
    // HTML Page 逐頁選擇是否顯示頁碼，沒有 Deck 預設可回
    expected: { ...PAGE_CHROME_FROM_TEMPLATE, showPageNumber: false },
  },
  cover: {
    page: {
      ...createBlankAddablePage("p01", "cover", "table"),
      ...AUTHORED_PAGE_CHROME,
    },
    expected: PAGE_CHROME_FROM_TEMPLATE,
  },
  unknown: {
    page: {
      id: "p01",
      layout: "future-layout",
      plan: "Kept as written",
      ...AUTHORED_PAGE_CHROME,
    },
    expected: { ...PAGE_CHROME_FROM_TEMPLATE, plan: "Kept as written" },
  },
  twoColumn: {
    page: authoredFramePage("two-column"),
    expected: FRAME_CHROME_FROM_TEMPLATE,
  },
  overview: {
    page: authoredFramePage("overview"),
    expected: FRAME_CHROME_FROM_TEMPLATE,
  },
  evidenceDecision: {
    page: authoredFramePage("evidence-decision"),
    expected: FRAME_CHROME_FROM_TEMPLATE,
  },
  nextActions: {
    page: authoredFramePage("next-actions"),
    expected: FRAME_CHROME_FROM_TEMPLATE,
  },
  trendTarget: {
    page: authoredFramePage("trend-target"),
    expected: FRAME_CHROME_FROM_TEMPLATE,
  },
  closing: {
    page: authoredFramePage("closing"),
    expected: FRAME_CHROME_FROM_TEMPLATE,
  },
  sideBySide: {
    page: authoredFramePage("side-by-side"),
    expected: FRAME_CHROME_FROM_TEMPLATE,
  },
  fullWidthPanel: {
    page: authoredFramePage("full-width-panel"),
    expected: FRAME_CHROME_FROM_TEMPLATE,
  },
}

function fieldsOf(page: Page, expected: Record<string, unknown>) {
  const fields = page as Record<string, unknown>
  return Object.fromEntries(
    Object.keys(expected).map((key) => [key, fields[key]])
  )
}

describe("Deck Template chrome", () => {
  it.each(Object.entries(TEMPLATE_CHROME_CASES))(
    "carries over a %s page's chrome by field",
    (_kind, { page, expected }) => {
      const [created] = createDeckFromTemplate({ pages: [page] }).pages

      expect(fieldsOf(created, expected)).toEqual(expected)
    }
  )
})
