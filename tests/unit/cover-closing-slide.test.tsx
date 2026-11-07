import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { StageSlide } from "@/components/stage/stage-slide"
import { createStagePageContext } from "@/lib/stage-page-context"
import { parseDeck } from "@/lib/deck"

describe("Cover and Closing on the Stage", () => {
  it("renders Cover metadata without numbering and Closing with its default eyebrow and Boundary Note", () => {
    const deck = parseDeck({
      title: "Harbor pilot",
      period: { start: "2026-11-02", end: "2026-11-06" },
      pages: [
        {
          id: "cover",
          layout: "cover",
          title: "Pilot findings",
          subtitle: "Fictional forecast",
          byline: "Harbor team",
          showPageNumber: true,
        },
        {
          id: "closing",
          layout: "closing",
          title: "Continue the pilot",
          takeaways: [{ ref: "02", text: "Keep measuring" }],
          closingLine: "Contact the team",
          boundary: "Fictional sample only",
        },
      ],
    })
    const { rerender } = render(
      <StageSlide
        page={deck.pages[0]}
        context={createStagePageContext("pilot", deck, "cover")}
      />
    )
    expect(
      screen.getByRole("heading", { name: "Pilot findings" })
    ).toBeInTheDocument()
    expect(screen.getByText("Fictional forecast")).toBeInTheDocument()
    expect(screen.getByText("Harbor team")).toBeInTheDocument()
    expect(screen.getByText("2026-11-02 — 2026-11-06")).toBeInTheDocument()
    expect(screen.queryByText("1 / 2")).not.toBeInTheDocument()
    rerender(
      <StageSlide
        page={deck.pages[1]}
        context={createStagePageContext("pilot", deck, "closing")}
      />
    )
    expect(screen.getByText("Closing")).toBeInTheDocument()
    expect(screen.getByText("Keep measuring")).toBeInTheDocument()
    expect(screen.getByText("Contact the team")).toBeInTheDocument()
    expect(screen.getByText("Fictional sample only")).toBeInTheDocument()
    expect(screen.getByText("2 / 2")).toBeInTheDocument()
  })
  it("renders Boundary Note on every existing Editorial Frame layout", () => {
    const demo = parseDeck(
      JSON.parse(
        readFileSync(
          resolve(import.meta.dirname, "../../demo/2026-01-05.json"),
          "utf8"
        )
      )
    )
    for (const layout of [
      "overview",
      "evidence-decision",
      "next-actions",
      "trend-target",
    ]) {
      const original = demo.pages.find((page) => page.layout === layout)
      if (!original) throw new Error(`Missing ${layout} fixture`)
      const deck = {
        ...demo,
        pages: [{ ...original, boundary: "Fictional pilot only" }],
      }
      const view = render(
        <StageSlide
          page={deck.pages[0]}
          context={createStagePageContext("pilot", deck, original.id)}
        />
      )
      expect(screen.getByText("Fictional pilot only")).toBeInTheDocument()
      view.unmount()
    }
  })
})
