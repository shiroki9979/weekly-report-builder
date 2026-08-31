import { toBlob } from "html-to-image"

export async function captureStageToPng(element: HTMLElement): Promise<Blob> {
  const blob = await toBlob(element, {
    cacheBust: true,
    pixelRatio: 2,
  })

  if (!blob) {
    throw new Error("Failed to capture stage as PNG")
  }

  return blob
}
