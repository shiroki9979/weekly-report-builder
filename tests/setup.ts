import "@testing-library/jest-dom/vitest"
import { beforeEach } from "vitest"

// Deck 選擇會寫入網址，jsdom 的 location 在同一檔案內跨測試共用，需逐測試重置
beforeEach(() => {
  window.history.replaceState(null, "", "/")
})
