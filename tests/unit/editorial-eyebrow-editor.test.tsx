import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { StageSlide } from "@/components/stage/stage-slide"
import { PageEditorForm } from "@/components/workshop/page-editor-form"
import type { Deck } from "@/lib/deck"
import { serializeDeck } from "@/lib/decks-io"
import type { EditorialFrameLayout } from "@/lib/eyebrow"
import { createBlankAddablePage } from "@/lib/page-lifecycle"
import { createStagePageContext } from "@/lib/stage-page-context"
import {
  unusedComparisonMetricControls,
  unusedTrendControls,
} from "./support/editor-controls"

// 預期值照 #74 表格寫死，不讀預設詞清單，避免同構斷言；
// 以 Record 鍵住每個 Editorial Frame 版型，新增版型卻沒補案例時型別檢查會失敗
const EXPECTED_PLACEHOLDERS: Record<EditorialFrameLayout, string> = {
  overview: "Overview",
  "evidence-decision": "Evidence-backed Decision",
  "next-actions": "Next Actions",
  "trend-target": "Trend & Target",
  "side-by-side": "Comparison",
  "full-width-panel": "Panel",
  closing: "Closing",
  "two-column": "Optional; no default eyebrow",
}

function blankDeck(layout: EditorialFrameLayout | "cover"): Deck {
  return { pages: [createBlankAddablePage("page-1", layout, "table")] }
}

// 編輯器與 preview 共用同一份 Deck state，才看得到欄位輸入是否真的走到 Stage
function Workshop({
  initialDeck,
  readOnly = false,
}: {
  initialDeck: Deck
  readOnly?: boolean
}) {
  const [deck, setDeck] = useState(initialDeck)
  const page = deck.pages[0]
  return (
    <>
      <PageEditorForm
        deck={deck}
        pageIndex={0}
        onChange={(update) => setDeck((current) => update(current))}
        layoutControls={{
          evidenceDecision: unusedComparisonMetricControls,
          trendTarget: unusedTrendControls,
        }}
        readOnly={readOnly}
      />
      <section aria-label="Preview">
        <StageSlide
          page={page}
          context={createStagePageContext("2026-08-24", deck, page.id)}
        />
      </section>
      <pre data-testid="deck-json">{serializeDeck(deck)}</pre>
    </>
  )
}

function savedPage() {
  return JSON.parse(screen.getByTestId("deck-json").textContent ?? "").pages[0]
}

describe("Eyebrow field in the shared Editorial page editor chrome", () => {
  it.each(Object.entries(EXPECTED_PLACEHOLDERS))(
    "shows the %s placeholder that the Stage falls back to",
    (layout, placeholder) => {
      render(
        <Workshop initialDeck={blankDeck(layout as EditorialFrameLayout)} />
      )

      expect(screen.getAllByRole("textbox", { name: "Eyebrow" })).toHaveLength(
        1
      )
      expect(screen.getByRole("textbox", { name: "Eyebrow" })).toHaveAttribute(
        "placeholder",
        placeholder
      )
    }
  )
})
