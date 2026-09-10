import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it } from "vitest"

import { PageEditorForm } from "@/components/workshop/page-editor-form"
import { PageLifecycleControls } from "@/components/workshop/page-lifecycle-controls"
import { createBlankTwoColumnPage } from "@/lib/page-lifecycle"
import type { PageLifecycleResult } from "@/lib/page-lifecycle"
import type { WeekDocument } from "@/lib/week-document"

function sampleWeek(): WeekDocument {
  return {
    start: "2026-08-24",
    end: "2026-08-28",
    pages: [
      {
        id: "p01",
        layout: "html",
        title: "First",
        htmlFile: "p01.html",
      },
      {
        id: "p02",
        layout: "html",
        title: "Second",
        htmlFile: "p02.html",
      },
    ],
  }
}

function LifecycleHarness({
  initialWeek = sampleWeek(),
}: {
  initialWeek?: WeekDocument
}) {
  const [week, setWeek] = useState(initialWeek)
  const [selectedPageId, setSelectedPageId] = useState(week.pages[0].id)

  const onChange = (result: PageLifecycleResult) => {
    setWeek(result.week)
    setSelectedPageId(result.selectedPageId)
  }

  return (
    <div>
      <p data-testid="selected-page">{selectedPageId}</p>
      <p data-testid="page-ids">
        {week.pages.map((page) => page.id).join(",")}
      </p>
      <PageLifecycleControls
        week={week}
        selectedPageId={selectedPageId}
        onChange={onChange}
      />
      <PageEditorForm
        week={week}
        pageIndex={week.pages.findIndex((page) => page.id === selectedPageId)}
        onChange={setWeek}
      />
    </div>
  )
}

describe("workshop page lifecycle", () => {
  it("adds a blank two-column page after the selection and selects it", async () => {
    const user = userEvent.setup()
    render(<LifecycleHarness />)

    await user.click(screen.getByRole("button", { name: "Add page" }))

    expect(screen.getByTestId("page-ids")).toHaveTextContent("p01,p03,p02")
    expect(screen.getByTestId("selected-page")).toHaveTextContent("p03")
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Draft page — missing or invalid content"
    )
  })

  it("moves the selected page while keeping the same page id selected", async () => {
    const user = userEvent.setup()
    render(<LifecycleHarness />)

    await user.click(screen.getByRole("button", { name: "Move down" }))

    expect(screen.getByTestId("page-ids")).toHaveTextContent("p02,p01")
    expect(screen.getByTestId("selected-page")).toHaveTextContent("p01")
  })

  it("deletes the selected page after confirming the dialog", async () => {
    const user = userEvent.setup()
    render(<LifecycleHarness />)

    await user.click(screen.getByRole("button", { name: "Delete page" }))
    expect(screen.getByRole("dialog")).toHaveTextContent("First · html")
    await user.click(screen.getByRole("button", { name: /^Delete$/ }))

    expect(screen.getByTestId("page-ids")).toHaveTextContent("p02")
    expect(screen.getByTestId("selected-page")).toHaveTextContent("p02")
  })

  it("marks draft two-column title as invalid", () => {
    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [createBlankTwoColumnPage("p01", "table")],
    }

    render(<LifecycleHarness initialWeek={week} />)

    expect(screen.getByLabelText("Title")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
    expect(screen.getByRole("button", { name: "Add row" })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Add column" })
    ).toBeInTheDocument()
  })

  it("adds a weekly overview page and shows its editor", async () => {
    const user = userEvent.setup()
    render(<LifecycleHarness />)

    await user.click(screen.getByRole("combobox", { name: "Add page" }))
    await user.click(screen.getByRole("option", { name: "Weekly Overview" }))
    await user.click(screen.getByRole("button", { name: "Add page" }))

    expect(screen.getByTestId("page-ids")).toHaveTextContent("p01,p03,p02")
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Draft page — missing or invalid content"
    )
    expect(screen.getByText("Lead outcome")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Add supporting outcome" })
    ).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Make lead" })).toHaveLength(2)
    expect(screen.getByLabelText("Title")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
  })
})
