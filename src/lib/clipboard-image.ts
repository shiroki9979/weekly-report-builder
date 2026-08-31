export type ClipboardImageWriter = {
  write: (items: ClipboardItems) => Promise<void>
}

type CreateClipboardItem = (blob: Blob) => ClipboardItem

function defaultCreateClipboardItem(blob: Blob): ClipboardItem {
  return new ClipboardItem({
    "image/png": blob,
  })
}

export async function copyImageToClipboard(
  blob: Blob,
  clipboard: ClipboardImageWriter,
  createItem: CreateClipboardItem = defaultCreateClipboardItem
): Promise<void> {
  await clipboard.write([createItem(blob)])
}
