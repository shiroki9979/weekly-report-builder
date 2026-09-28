import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it } from "vitest"

import { PageEditorForm } from "@/components/workshop/page-editor-form"
import { PageLifecycleControls } from "@/components/workshop/page-lifecycle-controls"
import {
  addSessionMetric,
  addSessionPage,
  createEditingSession,
  deleteSessionPage,
  editSessionContent,
  moveSessionMetric,
  moveSessionPage,
  readMetricInput,
  removeSessionMetric,
  sessionReadiness,
  writeMetricInput,
} from "@/lib/editing-session"
import { createBlankTwoColumnPage } from "@/lib/page-lifecycle"
import type { WeekDocument } from "@/lib/week-document"
import { unusedTrendControls } from "./support/editor-controls"

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
  const [session, setSession] = useState(() =>
    createEditingSession(initialWeek)
  )
  const week = session.week!
  const selectedPageId = session.selectedPageId!

  return (
    <div>
      <p data-testid="selected-page">{selectedPageId}</p>
      <p data-testid="page-ids">
        {week.pages.map((page) => page.id).join(",")}
      </p>
      <PageLifecycleControls
        week={week}
        selectedPageId={selectedPageId}
        onAdd={(page) => setSession((current) => addSessionPage(current, page))}
        onDelete={(pageId) =>
          setSession((current) => deleteSessionPage(current, pageId))
        }
        onMove={(pageId, direction) =>
          setSession((current) => moveSessionPage(current, pageId, direction))
        }
      />
      <PageEditorForm
        week={week}
        pageIndex={week.pages.findIndex((page) => page.id === selectedPageId)}
        onChange={(update) =>
          setSession((current) => editSessionContent(current, update))
        }
        layoutControls={{
          evidenceDecision: {
            read: (location) => readMetricInput(session, location),
            write: (location, raw) =>
              setSession((current) => writeMetricInput(current, location, raw)),
            add: (pageId) =>
              setSession((current) => addSessionMetric(current, pageId)),
            move: (move) =>
              setSession((current) => moveSessionMetric(current, move)),
            remove: (metric) =>
              setSession((current) => removeSessionMetric(current, metric)),
            readiness: (pageId) => sessionReadiness(session, pageId),
          },
          trendTarget: unusedTrendControls,
        }}
      />
    </div>
  )
}

async function chooseAddPageLayout(
  user: ReturnType<typeof userEvent.setup>,
  name: string
) {
  await user.click(screen.getByRole("combobox", { name: "Add page" }))
  // Base UI Select 的 listbox 在 jsdom 裡是非同步掛上；後續測試若立刻 getByRole 會誤判沒開
  await user.click(await screen.findByRole("option", { name }))
}

describe("workshop page lifecycle", () => {
  it("adds a blank two-column page after the selection and selects it", async () => {
    const user = userEvent.setup()
    render(<LifecycleHarness />)

    await user.click(screen.getByRole("button", { name: "Add page" }))

    expect(screen.getByTestId("page-ids")).toHaveTextContent("p01,p03,p02")
    expect(screen.getByTestId("selected-page")).toHaveTextContent("p03")
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Draft Page — missing required content"
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

    await chooseAddPageLayout(user, "Weekly Overview")
    await user.click(screen.getByRole("button", { name: "Add page" }))

    expect(screen.getByTestId("page-ids")).toHaveTextContent("p01,p03,p02")
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Draft Page — missing required content"
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

  async function addEvidenceDecisionPage(
    user: ReturnType<typeof userEvent.setup>
  ) {
    await chooseAddPageLayout(user, "Evidence-backed Decision")
    await user.click(screen.getByRole("button", { name: "Add page" }))
  }

  it("adds an evidence-backed decision page and shows its editor", async () => {
    const user = userEvent.setup()
    render(<LifecycleHarness />)

    await addEvidenceDecisionPage(user)

    expect(screen.getByRole("alert")).toHaveTextContent("Draft Page")
    expect(screen.getByLabelText("Verdict")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Add metric" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Add interpretation" })
    ).toBeInTheDocument()
  })

  it("restores a removed metric with Add metric", async () => {
    const user = userEvent.setup()
    render(<LifecycleHarness />)
    await addEvidenceDecisionPage(user)
    await user.click(
      within(screen.getByRole("group", { name: "Metric 2" })).getByRole(
        "button",
        { name: "Remove" }
      )
    )

    await user.click(screen.getByRole("button", { name: "Add metric" }))

    expect(screen.getByRole("group", { name: "Metric 2" })).toBeInTheDocument()
  })

  it("adds a next-actions page and shows its editor", async () => {
    const user = userEvent.setup()
    render(<LifecycleHarness />)

    await chooseAddPageLayout(user, "Next Actions")
    await user.click(screen.getByRole("button", { name: "Add page" }))

    expect(screen.getByRole("alert")).toHaveTextContent("Draft Page")
    expect(
      screen.getByRole("button", { name: "Add commitment" })
    ).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(3)
  })
})
