import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ThemeProvider } from "@/components/theme-provider"
import { EMPTY_STORE_MESSAGE } from "@/components/workshop/empty-store-message"
import { WorkshopShell } from "@/components/workshop/workshop-shell"
import type { Deck } from "@/lib/deck"
import type { WorkshopStore } from "@/lib/deck-store"
import { InMemoryWorkshopStore } from "./support/in-memory-deck-store"
import { stubWorkshopDom } from "./support/workshop-dom"

const LATEST_MONDAY = "2026-01-12"

function weekDocument(monday: string, title: string): Deck {
  return {
    period: { start: monday, end: monday },
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

function renderWorkshop(deckStore: WorkshopStore) {
  return render(
    <ThemeProvider defaultTheme="light">
      <WorkshopShell deckStore={deckStore} />
    </ThemeProvider>
  )
}

describe("Workshop empty store vs list failure", () => {
  let restoreDom: () => void

  beforeEach(() => {
    vi.restoreAllMocks()
    restoreDom = stubWorkshopDom()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    restoreDom()
  })

  it("explains the empty weeks directory and does not offer first-week creation", async () => {
    renderWorkshop(new InMemoryWorkshopStore())

    await waitFor(() => {
      expect(screen.getAllByText(EMPTY_STORE_MESSAGE).length).toBeGreaterThan(0)
    })

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Create week" })
    ).not.toBeInTheDocument()
  })

  it("keeps list failures in the error alert instead of the empty store", async () => {
    const store = new InMemoryWorkshopStore()
    store.listDecks = async () => {
      throw new Error("Failed to list deck files (503)")
    }
    renderWorkshop(store)

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Failed to list deck files (503)"
      )
    })

    expect(screen.queryByText(EMPTY_STORE_MESSAGE)).not.toBeInTheDocument()
  })

  it("opens the latest listed week without a Create week empty-state", async () => {
    renderWorkshop(
      new InMemoryWorkshopStore(
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
