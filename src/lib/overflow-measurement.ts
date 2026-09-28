export const STAGE_CAPTURE_ROOT_ATTR = "data-stage-capture-root"

export const CAPTURE_STAGE_WIDTH = 1280
export const CAPTURE_STAGE_HEIGHT = 720
export const CAPTURE_STAGE_SIZE_LABEL = `${CAPTURE_STAGE_WIDTH} × ${CAPTURE_STAGE_HEIGHT}`

const SUBPIXEL_TOLERANCE_PX = 1
const DEFAULT_TIMEOUT_MS = 5000

type OverflowAxis = "horizontal" | "vertical"

export type OverflowMeasurement =
  | { status: "fit" }
  | { status: "overflow"; axes: OverflowAxis[] }
  | { status: "measurement-failed"; message: string }

// ponytail: 固定等 2 個 rAF；字型或動畫若超過兩幀才穩定，改等 layout 事件或拉長 timeout 重試
function waitFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    const step = (remaining: number) => {
      if (remaining <= 0) {
        resolve()
        return
      }
      requestAnimationFrame(() => step(remaining - 1))
    }
    step(count)
  })
}

async function waitForLayoutToSettle(timeoutMs: number): Promise<void> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Timed out waiting for capture measurement to settle"))
    }, timeoutMs)
  })

  try {
    await Promise.race([
      (async () => {
        if (document.fonts?.ready) {
          await document.fonts.ready
        }
        await waitFrames(2)
      })(),
      timeout,
    ])
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
  }
}

function hasLayoutBox(element: Element): boolean {
  return element.getClientRects().length > 0
}

function isMeasurableDescendant(element: Element): boolean {
  const style = getComputedStyle(element)
  if (style.display === "none" || style.visibility === "hidden") {
    return false
  }

  return hasLayoutBox(element)
}

function collectOverflowAxes(root: HTMLElement): OverflowAxis[] {
  const axes = new Set<OverflowAxis>()

  if (root.scrollWidth > root.clientWidth + SUBPIXEL_TOLERANCE_PX) {
    axes.add("horizontal")
  }
  if (root.scrollHeight > root.clientHeight + SUBPIXEL_TOLERANCE_PX) {
    axes.add("vertical")
  }

  const rootRect = root.getBoundingClientRect()
  for (const descendant of root.querySelectorAll("*")) {
    if (!isMeasurableDescendant(descendant)) {
      continue
    }

    const rect = descendant.getBoundingClientRect()
    if (rect.right - rootRect.right > SUBPIXEL_TOLERANCE_PX) {
      axes.add("horizontal")
    }
    if (rootRect.left - rect.left > SUBPIXEL_TOLERANCE_PX) {
      axes.add("horizontal")
    }
    if (rect.bottom - rootRect.bottom > SUBPIXEL_TOLERANCE_PX) {
      axes.add("vertical")
    }
    if (rootRect.top - rect.top > SUBPIXEL_TOLERANCE_PX) {
      axes.add("vertical")
    }
  }

  return [...axes]
}

function findCaptureRoot(host: ParentNode): HTMLElement | null {
  if (
    host instanceof HTMLElement &&
    host.hasAttribute(STAGE_CAPTURE_ROOT_ATTR)
  ) {
    return host
  }

  const found = host.querySelector(`[${STAGE_CAPTURE_ROOT_ATTR}]`)
  return found instanceof HTMLElement ? found : null
}

export async function measureStageOverflow(
  host: ParentNode,
  options?: { timeoutMs?: number }
): Promise<OverflowMeasurement> {
  const root = findCaptureRoot(host)
  if (!(root instanceof HTMLElement)) {
    return {
      status: "measurement-failed",
      message: "Capture measurement root was not found",
    }
  }

  try {
    await waitForLayoutToSettle(options?.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  } catch (cause: unknown) {
    return {
      status: "measurement-failed",
      message:
        cause instanceof Error
          ? cause.message
          : "Timed out waiting for capture measurement to settle",
    }
  }

  const width = root.clientWidth
  const height = root.clientHeight
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return {
      status: "measurement-failed",
      message: "Capture measurement root has non-finite dimensions",
    }
  }

  try {
    const axes = collectOverflowAxes(root)
    if (axes.length === 0) {
      return { status: "fit" }
    }
    return { status: "overflow", axes }
  } catch (cause: unknown) {
    return {
      status: "measurement-failed",
      message:
        cause instanceof Error ? cause.message : "Browser measurement failed",
    }
  }
}
