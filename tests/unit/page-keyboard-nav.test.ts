import { describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"

import { usePageKeyboardNav } from "@/hooks/use-page-keyboard-nav"

describe("usePageKeyboardNav", () => {
  it("moves to the previous and next page with arrow keys", () => {
    const onSelect = vi.fn()
    renderHook(() =>
      usePageKeyboardNav({
        pageCount: 3,
        selectedPageIndex: 1,
        onSelect,
      })
    )

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }))
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }))

    expect(onSelect).toHaveBeenNthCalledWith(1, 0)
    expect(onSelect).toHaveBeenNthCalledWith(2, 2)
  })

  it("does not move past the first or last page", () => {
    const onSelect = vi.fn()
    const { rerender } = renderHook(
      ({ selectedPageIndex }) =>
        usePageKeyboardNav({
          pageCount: 2,
          selectedPageIndex,
          onSelect,
        }),
      { initialProps: { selectedPageIndex: 0 } }
    )

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }))
    expect(onSelect).not.toHaveBeenCalled()

    rerender({ selectedPageIndex: 1 })
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("ignores arrow keys while typing in an input", () => {
    const onSelect = vi.fn()
    renderHook(() =>
      usePageKeyboardNav({
        pageCount: 3,
        selectedPageIndex: 1,
        onSelect,
      })
    )

    const input = document.createElement("input")
    document.body.appendChild(input)

    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })
    )

    expect(onSelect).not.toHaveBeenCalled()
    input.remove()
  })
})
