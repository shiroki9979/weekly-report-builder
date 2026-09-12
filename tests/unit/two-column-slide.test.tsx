import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TwoColumnSlide } from "@/components/stage/two-column-slide"
import { parseWeekDocument } from "@/lib/week-document"

const fixturePath = resolve(
  import.meta.dirname,
  "../fixtures/two-column-week.json"
)

describe("TwoColumnSlide", () => {
  it("renders title, three left items, and a right table on the stage", () => {
    const raw = readFileSync(fixturePath, "utf-8")
    const week = parseWeekDocument(JSON.parse(raw))
    const page = week.pages[0]
    if (page.layout !== "two-column") {
      throw new Error("expected two-column page")
    }

    render(<TwoColumnSlide page={page} />)

    expect(
      screen.getByRole("heading", { level: 1, name: "Eval Gate" })
    ).toBeInTheDocument()
    expect(screen.getByText("Metrics follow the task")).toBeInTheDocument()
    expect(screen.getByText("Manual promote is allowed")).toBeInTheDocument()
    expect(screen.getByText("Production can be pinned")).toBeInTheDocument()
    expect(screen.getByText("Loaded model")).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Action" })
    ).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "Pinned" })).toHaveClass("strong")
  })
})
