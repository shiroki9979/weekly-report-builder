import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ThemeProvider } from "@/components/theme-provider"
import {
  EMPTY_STORE_MESSAGE,
  WorkshopShell,
} from "@/components/workshop/workshop-shell"
import type { WeekDocument } from "@/lib/week-document"
import { InMemoryWeekStore, type WeekStore } from "@/lib/week-store"

const LATEST_MONDAY = "2026-01-12"

function weekDocument(monday: string, title: string): WeekDocument {
  return {
    start: monday,
    end: monday,
    pages: [
      {
        id: "p01",
        layout: "two-column",
        title,
        items: [
          { heading: "One", body: "A" },
          { heading: "Two", body: "B" },
          { heading: "Three", body: "C" },
        ],
        panel: {
          kind: "table",
          title: "Metrics",
          columns: ["Item"],
          rows: [{ cells: ["1"] }],
        },
      },
    ],
  }
}

function renderWorkshop(weekStore: WeekStore) {
  return render(
    <ThemeProvider defaultTheme="light">
      <WorkshopShell weekStore={weekStore} />
    </ThemeProvider>
  )
}

describe("Workshop empty store vs list failure", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }))
    Object.defineProperty(Element.prototype, "getAnimations", {
      configurable: true,
      writable: true,
      value: () => [],
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("explains the empty weeks directory and does not offer first-week creation", async () => {
    renderWorkshop(new InMemoryWeekStore())

    await waitFor(() => {
      expect(screen.getAllByText(EMPTY_STORE_MESSAGE).length).toBeGreaterThan(0)
    })

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Create week" })
    ).not.toBeInTheDocument()
  })

  it("keeps list failures in the error alert instead of the empty store", async () => {
    const store = new InMemoryWeekStore()
    store.listWeeks = async () => {
      throw new Error("Failed to list week files (503)")
    }
    renderWorkshop(store)

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Failed to list week files (503)"
      )
    })

    expect(screen.queryByText(EMPTY_STORE_MESSAGE)).not.toBeInTheDocument()
  })

  it("opens the latest listed week without a Create week empty-state", async () => {
    renderWorkshop(
      new InMemoryWeekStore(
        new Map([
          [LATEST_MONDAY, weekDocument(LATEST_MONDAY, "Harbor Grid latest")],
        ])
      )
    )

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Harbor Grid latest" })
      ).toBeInTheDocument()
    })

    expect(screen.queryByText(EMPTY_STORE_MESSAGE)).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Create week" })
    ).toBeInTheDocument()
  })
})
