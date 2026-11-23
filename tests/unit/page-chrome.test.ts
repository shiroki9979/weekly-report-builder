import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { isEditorialFramePage, parseDeck, type Deck } from "@/lib/deck"
import {
  setPageBoundary,
  setPageEyebrow,
  setPageHidden,
  setPageNotes,
  setPageShowPageNumber,
} from "@/lib/deck-editor"
import { createDeckFromTemplate } from "@/lib/deck-template"
import { serializeDeck } from "@/lib/decks-io"
import { ADDABLE_LAYOUTS, createBlankAddablePage } from "@/lib/page-lifecycle"
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
