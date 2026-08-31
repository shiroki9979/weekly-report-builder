import { useEffect } from "react"

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  return (
    target.closest(
      "input, textarea, select, [contenteditable='true'], [role='listbox'], [role='combobox'], [role='option'], [data-slot='select-content']"
    ) !== null
  )
}

type UsePageKeyboardNavOptions = {
  pageCount: number
  selectedPageIndex: number
  onSelect: (index: number) => void
  enabled?: boolean
}

/** 左右方向鍵切換頁面；表單／下拉聚焦時不攔截 */
export function usePageKeyboardNav({
  pageCount,
  selectedPageIndex,
  onSelect,
  enabled = true,
}: UsePageKeyboardNavOptions) {
  useEffect(() => {
    if (!enabled || pageCount <= 0) {
      return undefined
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      if (event.key === "ArrowLeft") {
        if (selectedPageIndex <= 0) {
          return
        }

        event.preventDefault()
        onSelect(selectedPageIndex - 1)
        return
      }

      if (event.key === "ArrowRight") {
        if (selectedPageIndex >= pageCount - 1) {
          return
        }

        event.preventDefault()
        onSelect(selectedPageIndex + 1)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [enabled, onSelect, pageCount, selectedPageIndex])
}
