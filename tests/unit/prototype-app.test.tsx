import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { PrototypeApp } from "@/prototype/prototype-app"

const layouts = [
  {
    name: "Weekly Overview",
    conclusion:
      "Delivery recovered, and the week closed with two durable gains.",
  },
  {
    name: "Evidence-backed Decision",
    conclusion: "Ship the candidate. The baseline is slower and less stable.",
  },
  {
    name: "Next Actions",
    conclusion: "Five-day reviews, fewer misses, and a held reserve.",
  },
] as const

describe("PrototypeApp", () => {
  it("shows a gallery of Weekly Overview, Evidence-backed Decision, and Next Actions", () => {
    render(<PrototypeApp />)

    for (const layout of layouts) {
      expect(
        screen.getByRole("button", { name: new RegExp(layout.name, "i") })
      ).toBeInTheDocument()
    }
  })

  it("opens each gallery preview in a focused 16:9 page and returns to the gallery", async () => {
    const user = userEvent.setup()
    render(<PrototypeApp />)

    for (const layout of layouts) {
      await user.click(
        screen.getByRole("button", { name: new RegExp(layout.name, "i") })
      )

      expect(screen.getByTestId("stage-frame")).toBeInTheDocument()
      expect(
        screen.getByRole("heading", { name: layout.conclusion })
      ).toBeInTheDocument()

      for (const other of layouts) {
        if (other.name !== layout.name) {
          expect(
            screen.queryByRole("button", {
              name: new RegExp(other.name, "i"),
            })
          ).not.toBeInTheDocument()
        }
      }

      await user.click(screen.getByRole("button", { name: /Back to gallery/i }))

      expect(
        screen.getByRole("button", { name: /Weekly Overview/i })
      ).toBeInTheDocument()
    }
  })
})
