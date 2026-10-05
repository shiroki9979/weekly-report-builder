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

  it.each([
    { case: "missing", notes: undefined },
    { case: "blank", notes: "   " },
  ])("shows No speaker notes when notes are $case", ({ notes }) => {
    render(<SpeakerNotesCue notes={notes} />)

    expect(screen.getByText("No speaker notes")).toBeInTheDocument()
  })

  it("is expanded by default and labeled Speaker notes", () => {
    render(<SpeakerNotesCue notes="Cue body" />)

    expect(
      screen.getByRole("button", { name: /Speaker notes/i })
    ).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Cue body")).toBeInTheDocument()
  })

  it("collapses when the disclosure row is clicked", async () => {
    const user = userEvent.setup()
    render(<SpeakerNotesCue notes="Hide me" />)
    const toggle = screen.getByRole("button", { name: /Speaker notes/i })

    await user.click(toggle)

    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Hide me")).not.toBeInTheDocument()
  })

  it("expands again on a second click", async () => {
    const user = userEvent.setup()
    render(<SpeakerNotesCue notes="Hide me" />)
    const toggle = screen.getByRole("button", { name: /Speaker notes/i })
    await user.click(toggle)

    await user.click(toggle)

    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Hide me")).toBeInTheDocument()
  })

  describe("when a panel owner controls expansion", () => {
    it("requests a position change without toggling expansion", async () => {
      const user = userEvent.setup()
      const onToggle = vi.fn()
      const onTogglePosition = vi.fn()
      const { rerender } = render(
        <SpeakerNotesCue
          notes="Cue body"
          expanded={false}
          onToggle={onToggle}
          position="bottom"
          onTogglePosition={onTogglePosition}
        />
      )

      await user.click(
        screen.getByRole("button", { name: "Move notes to right" })
      )

      expect(onTogglePosition).toHaveBeenCalledOnce()
      expect(onToggle).not.toHaveBeenCalled()

      rerender(
        <SpeakerNotesCue
          notes="Cue body"
          expanded={false}
          onToggle={onToggle}
          position="right"
          onTogglePosition={onTogglePosition}
        />
      )

      expect(
        screen.getByRole("button", { name: "Move notes below slide" })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: "Speaker notes" })
      ).toHaveAttribute("aria-expanded", "false")
      expect(screen.queryByText("Cue body")).not.toBeInTheDocument()
    })

    it("only requests a toggle when clicked", async () => {
      const user = userEvent.setup()
      const onToggle = vi.fn()
      render(<SpeakerNotesCue notes="Hide me" expanded onToggle={onToggle} />)

      await user.click(screen.getByRole("button", { name: /Speaker notes/i }))

      expect(onToggle).toHaveBeenCalledOnce()
      expect(screen.getByText("Hide me")).toBeInTheDocument()
    })

    it("hides the notes once the owner collapses it", () => {
      render(
        <SpeakerNotesCue notes="Hide me" expanded={false} onToggle={() => {}} />
      )

      expect(
        screen.getByRole("button", { name: /Speaker notes/i })
      ).toHaveAttribute("aria-expanded", "false")
      expect(screen.queryByText("Hide me")).not.toBeInTheDocument()
    })
  })
})
