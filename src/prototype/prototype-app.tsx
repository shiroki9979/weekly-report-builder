import { useState } from "react"

import { StageFrame } from "@/components/stage/stage-frame"
import { prototypeLayouts, type PrototypeLayoutId } from "@/prototype/content"
import { PrototypeLayoutView } from "@/prototype/layouts/prototype-layout-view"

const limitations =
  "Disposable prototype for composition and hierarchy. It is not wired to week files, the editor, or PNG export. Visual approval is not production readiness."

/** 獨立 Gallery／focused 殼，避免原型迭代碰到工坊導覽或週次資料 */
export function PrototypeApp() {
  const [focusedId, setFocusedId] = useState<PrototypeLayoutId | null>(null)
  const focused = prototypeLayouts.find((layout) => layout.id === focusedId)

  if (focused) {
    return (
      <div className="proto-shell">
        <div className="proto-focus">
          <button
            type="button"
            className="proto-back"
            onClick={() => setFocusedId(null)}
          >
            Back to gallery
          </button>
          <p className="proto-limitations">{limitations}</p>
          <StageFrame>
            <PrototypeLayoutView layout={focused} />
          </StageFrame>
        </div>
      </div>
    )
  }

  return (
    <div className="proto-shell">
      <header className="proto-shell-header">
        <h1>Structured Layout prototype</h1>
        <p className="proto-limitations">{limitations}</p>
      </header>
      <div className="proto-gallery">
        {prototypeLayouts.map((layout) => (
          <button
            key={layout.id}
            type="button"
            className="proto-preview"
            aria-label={layout.name}
            onClick={() => setFocusedId(layout.id)}
          >
            <span className="proto-preview-label">{layout.name}</span>
            <span className="proto-preview-stage">
              <StageFrame>
                <PrototypeLayoutView layout={layout} />
              </StageFrame>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
