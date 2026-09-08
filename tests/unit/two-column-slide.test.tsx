import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TwoColumnSlide } from "@/components/stage/two-column-slide"
import { parseWeekDocument } from "@/lib/week-document"

const fixturePath = resolve(import.meta.dirname, "../../weeks/2026-08-24.json")

describe("TwoColumnSlide", () => {
  it("renders title, three left items, and a right table on the stage", () => {
    const raw = readFileSync(fixturePath, "utf-8")
    const week = parseWeekDocument(JSON.parse(raw))
    const page = week.pages[3]

    render(<TwoColumnSlide page={page} />)

    expect(
      screen.getByRole("heading", { level: 1, name: "Platform · Eval Gate" })
    ).toBeInTheDocument()
    expect(screen.getByText("評估指標依任務設定")).toBeInTheDocument()
    expect(screen.getByText("可從歷史版本手動晉升")).toBeInTheDocument()
    expect(screen.getByText("正式版可釘住、可解除")).toBeInTheDocument()
    expect(screen.getByText("Loaded model")).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "動作" })
    ).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "釘住中" })).toHaveClass("strong")
  })
})
