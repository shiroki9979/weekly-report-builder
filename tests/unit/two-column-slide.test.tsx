import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TwoColumnSlide } from "@/components/stage/two-column-slide"
import { parseWeekDocument } from "@/lib/week-document"

const fixturePath = resolve(
  import.meta.dirname,
  "../../weeks/2026-08-24.json"
)

describe("TwoColumnSlide", () => {
  it("renders title, three left items, and a right table on the stage", () => {
    const raw = readFileSync(fixturePath, "utf-8")
    const week = parseWeekDocument(JSON.parse(raw))
    const page = week.pages[1]

    render(<TwoColumnSlide page={page} />)

    expect(
      screen.getByRole("heading", { level: 1, name: "Platform · Eval Gate" })
    ).toBeInTheDocument()
    expect(screen.getByText("Task-scoped evaluation metrics")).toBeInTheDocument()
    expect(screen.getByText("Manual promote from history")).toBeInTheDocument()
    expect(screen.getByText("Production pin and unpin")).toBeInTheDocument()
    expect(screen.getByText("Loaded model")).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Action" })).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "Pinned" })).toHaveClass("strong")
  })
})
