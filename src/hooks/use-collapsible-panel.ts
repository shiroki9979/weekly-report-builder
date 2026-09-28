import { useState } from "react"
import { usePanelRef } from "react-resizable-panels"

// 面板可由拖曳或按鈕收合；收合狀態一律以面板回報（onResize）為準，按鈕只送出切換要求，
// 兩種來源才不會各自維護一份而互相矛盾
export function useCollapsiblePanel() {
  const panelRef = usePanelRef()
  const [collapsed, setCollapsed] = useState(false)

  const toggle = () => {
    const panel = panelRef.current
    if (!panel) {
      return
    }
    if (panel.isCollapsed()) {
      panel.expand()
    } else {
      panel.collapse()
    }
  }

  const syncCollapsed = () => {
    const next = panelRef.current?.isCollapsed() ?? false
    setCollapsed((current) => (current === next ? current : next))
  }

  return { panelRef, collapsed, toggle, syncCollapsed }
}
