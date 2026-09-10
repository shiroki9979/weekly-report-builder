import { describe, expect, it } from "vitest"

import {
  STAGE_CAPTURE_ROOT_ATTR,
  measureStageOverflow,
} from "@/lib/overflow-measurement"

describe("measureStageOverflow", () => {
  it("fails closed when the capture root is missing", async () => {
    const host = document.createElement("div")

    await expect(measureStageOverflow(host)).resolves.toEqual({
      status: "measurement-failed",
      message: "Capture measurement root was not found",
    })
  })

  it("fails closed when the capture root has non-finite dimensions", async () => {
    const host = document.createElement("div")
    const root = document.createElement("div")
    root.setAttribute(STAGE_CAPTURE_ROOT_ATTR, "")
    Object.defineProperty(root, "clientWidth", { get: () => Number.NaN })
    Object.defineProperty(root, "clientHeight", { get: () => 720 })
    Object.defineProperty(root, "scrollWidth", { get: () => 1280 })
    Object.defineProperty(root, "scrollHeight", { get: () => 720 })
    host.append(root)

    await expect(measureStageOverflow(host)).resolves.toEqual({
      status: "measurement-failed",
      message: "Capture measurement root has non-finite dimensions",
    })
  })
})
