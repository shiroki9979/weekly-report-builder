import { vi } from "vitest"

// jsdom 缺少 Workshop 元件會呼叫的瀏覽器 API：可調整面板要 ResizeObserver、主題切換要 matchMedia、
// Base UI 動畫要 Element.getAnimations；只需要它們存在，不依賴回呼結果
export function stubWorkshopDom(): () => void {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }))
  const original = Object.getOwnPropertyDescriptor(
    Element.prototype,
    "getAnimations"
  )
  Object.defineProperty(Element.prototype, "getAnimations", {
    configurable: true,
    writable: true,
    value: () => [],
  })

  return () => {
    vi.unstubAllGlobals()
    if (original) {
      Object.defineProperty(Element.prototype, "getAnimations", original)
    } else {
      Reflect.deleteProperty(Element.prototype, "getAnimations")
    }
  }
}
