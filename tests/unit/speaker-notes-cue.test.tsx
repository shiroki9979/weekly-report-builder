import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SpeakerNotesCue } from "@/components/workshop/speaker-notes-cue"

describe("SpeakerNotesCue", () => {
  it("renders provided notes as plain text including newlines", () => {
    render(<SpeakerNotesCue notes={"Line one\nLine two"} />)

    expect(screen.getByText(/Line one/)).toBeInTheDocument()
    expect(screen.getByText(/Line two/)).toBeInTheDocument()
  })

  it("shows No speaker notes when notes are missing or blank", () => {
    const { rerender } = render(<SpeakerNotesCue />)
    expect(screen.getByText("No speaker notes")).toBeInTheDocument()

    rerender(<SpeakerNotesCue notes="   " />)
    expect(screen.getByText("No speaker notes")).toBeInTheDocument()
  })

  it("is expanded by default and labeled Speaker notes", () => {
    render(<SpeakerNotesCue notes="Cue body" />)

    expect(
      screen.getByRole("button", { name: /Speaker notes/i })
    ).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Cue body")).toBeInTheDocument()
  })

  it("collapses and expands when the disclosure row is clicked", async () => {
    const user = userEvent.setup()
    render(<SpeakerNotesCue notes="Hide me" />)

    const toggle = screen.getByRole("button", { name: /Speaker notes/i })
    await user.click(toggle)

    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Hide me")).not.toBeInTheDocument()

    await user.click(toggle)

    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Hide me")).toBeInTheDocument()
  })

  it("lets the panel owner hide the notes while the button only requests a toggle", async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    const { rerender } = render(
      <SpeakerNotesCue notes="Hide me" expanded onToggle={onToggle} />
    )

    const toggle = screen.getByRole("button", { name: /Speaker notes/i })
    await user.click(toggle)

    expect(onToggle).toHaveBeenCalledOnce()
    expect(screen.getByText("Hide me")).toBeInTheDocument()

    rerender(
      <SpeakerNotesCue notes="Hide me" expanded={false} onToggle={onToggle} />
    )

    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Hide me")).not.toBeInTheDocument()
  })
})
