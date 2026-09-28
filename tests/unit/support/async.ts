import { waitFor } from "@testing-library/react"

// 讓測試自行決定非同步依賴何時完成，才能在操作進行中改動狀態
export function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

// Arrange 階段等待非同步前置條件成立；等待本身不是測試要驗證的行為
export async function until(condition: () => boolean): Promise<void> {
  await waitFor(() => {
    if (!condition()) throw new Error("Precondition not reached yet")
  })
}
