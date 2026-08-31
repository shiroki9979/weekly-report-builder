import { describe, expect, it, vi } from "vitest"

import { copyImageToClipboard } from "@/lib/clipboard-image"

describe("copyImageToClipboard", () => {
  const createItem = (blob: Blob) =>
    ({
      types: ["image/png"],
      getType: async () => blob,
    }) as unknown as ClipboardItem

  it("writes a PNG blob through the clipboard seam", async () => {
    const write = vi.fn(async () => undefined)
    const blob = new Blob(["png"], { type: "image/png" })

    await copyImageToClipboard(blob, { write }, createItem)

    expect(write).toHaveBeenCalledOnce()
    const items = write.mock.calls[0][0]
    expect(items).toHaveLength(1)
    expect(items[0].types).toContain("image/png")
  })

  it("surfaces clipboard write failures", async () => {
    const blob = new Blob(["png"], { type: "image/png" })

    await expect(
      copyImageToClipboard(
        blob,
        {
          write: () => Promise.reject(new Error("Clipboard write denied")),
        },
        createItem
      )
    ).rejects.toThrow("Clipboard write denied")
  })
})
