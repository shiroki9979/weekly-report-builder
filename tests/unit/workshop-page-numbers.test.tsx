import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { PageNumberSelect } from "@/components/workshop/page-number-select"
import { WorkshopToolbar } from "@/components/workshop/workshop-toolbar"
import { PageEditorForm } from "@/components/workshop/page-editor-form"
import { EditorialPageEditorChrome } from "@/components/workshop/editorial-page-editor-chrome"
import type { LayoutEditorControls } from "@/hooks/use-editing-session"
import type { WeekDocument } from "@/lib/week-document"
import {
  unusedComparisonMetricControls,
  unusedTrendControls,
} from "./support/editor-controls"

const unusedLayoutControls: LayoutEditorControls = {
  evidenceDecision: unusedComparisonMetricControls,
  trendTarget: unusedTrendControls,
}

function sampleWeek(showPageNumbers?: boolean): WeekDocument {
  return {
    start: "2026-08-24",
    end: "2026-08-28",
    showPageNumbers,
    pages: [
      {
        id: "p01",
        layout: "html",
        title: "HTML Cover",
        htmlFile: "cover.html",
      },
      {
        id: "p02",
        layout: "weekly-overview",
        title: "Overview",
        agenda: [],
      },
    ],
  }
}

const idleSave = {
  onSave: () => {},
  saving: false,
  message: null,
  error: null,
}

const idleCreate = {
  onCreate: () => {},
  creating: false,
  error: null,
  suggestedMonday: "2026-08-31",
}

describe("WorkshopToolbar showPageNumbers toggle", () => {
  function renderToolbar({
    onChange = () => {},
    disabled = false,
  }: { onChange?: (show: boolean) => void; disabled?: boolean } = {}) {
    render(
      <WorkshopToolbar
        weeks={["2026-08-24"]}
        selectedMonday="2026-08-24"
        onWeekChange={() => {}}
        save={idleSave}
        create={idleCreate}
        pageNumbers={{ show: true, disabled, onChange }}
      />
    )
    return screen.getByRole("checkbox", { name: "Show page numbers" })
  }

  it("checks the box while the week shows page numbers", () => {
    const checkbox = renderToolbar()

    expect(checkbox).toBeChecked()
  })

  it("reports hiding page numbers when the box is unchecked", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const checkbox = renderToolbar({ onChange })

    await user.click(checkbox)

    expect(onChange).toHaveBeenCalledWith(false)
  })

  it("disables the checkbox when page numbers are disabled", () => {
    const checkbox = renderToolbar({ disabled: true })

    expect(checkbox).toHaveAttribute("aria-disabled", "true")
  })

  it("explains that HTML pages opt in to page numbers individually", () => {
    const checkbox = renderToolbar()

    expect(checkbox).toHaveAccessibleDescription(
      "HTML pages show a page number only when set on the page."
    )
  })
})

describe("PageNumberSelect", () => {
  it("displays Default (Show) when week has showPageNumbers true and page has undefined", () => {
    const week = sampleWeek(true)
    render(<PageNumberSelect week={week} pageIndex={1} onChange={() => {}} />)

    expect(screen.getByText("Default (Show)")).toBeInTheDocument()
  })

  it("displays Default (Hide) when week has showPageNumbers false and page has undefined", () => {
    const week = sampleWeek(false)
    render(<PageNumberSelect week={week} pageIndex={1} onChange={() => {}} />)

    expect(screen.getByText("Default (Hide)")).toBeInTheDocument()
  })

  it("displays Default (Hide) for an HTML Page even when the week shows page numbers", () => {
    const week = sampleWeek(true)
    render(<PageNumberSelect week={week} pageIndex={0} onChange={() => {}} />)

    expect(screen.getByText("Default (Hide)")).toBeInTheDocument()
  })

  it("changes page.showPageNumber when selected", async () => {
    const user = userEvent.setup()
    let updatedWeek: WeekDocument | null = null

    const Harness = () => {
      const [week, setWeek] = useState(sampleWeek(true))
      return (
        <PageNumberSelect
          week={week}
          pageIndex={0}
          onChange={(update) => {
            setWeek((current) => {
              const next = update(current)
              updatedWeek = next
              return next
            })
          }}
        />
      )
    }

    render(<Harness />)

    const trigger = screen.getByRole("combobox", { name: "Page number" })
    await user.click(trigger)

    const hideOption = await screen.findByRole("option", { name: "Hide" })
    await user.click(hideOption)

    expect(updatedWeek).not.toBeNull()
    expect(updatedWeek!.pages[0].showPageNumber).toBe(false)
  })
})

describe("PageEditorForm and EditorialPageEditorChrome integration", () => {
  it("renders page number select in EditorialPageEditorChrome", () => {
    const week = sampleWeek(true)
    render(
      <EditorialPageEditorChrome
        week={week}
        pageIndex={1}
        page={week.pages[1]}
        invalidPaths={new Set()}
        onChange={() => {}}
      >
        <div>Content</div>
      </EditorialPageEditorChrome>
    )

    expect(
      screen.getByRole("combobox", { name: "Page number" })
    ).toBeInTheDocument()
  })

  it("renders page number select in PageEditorForm for html page", () => {
    const week = sampleWeek(true)
    render(
      <PageEditorForm
        week={week}
        pageIndex={0}
        onChange={() => {}}
        layoutControls={unusedLayoutControls}
      />
    )

    expect(
      screen.getByRole("combobox", { name: "Page number" })
    ).toBeInTheDocument()
  })

  it("does not render page number select for a two-column page", () => {
    const week: WeekDocument = {
      start: "2026-08-24",
      end: "2026-08-28",
      pages: [
        {
          id: "p01",
          layout: "two-column",
          title: "Two column",
          items: [
            { heading: "", body: "" },
            { heading: "", body: "" },
            { heading: "", body: "" },
          ],
          panel: {
            kind: "table",
            title: "",
            columns: ["A"],
            rows: [{ cells: [""] }],
          },
        },
      ],
    }

    render(
      <PageEditorForm
        week={week}
        pageIndex={0}
        onChange={() => {}}
        layoutControls={unusedLayoutControls}
      />
    )

    expect(
      screen.queryByRole("combobox", { name: "Page number" })
    ).not.toBeInTheDocument()
  })
})
