import type { Locator } from "@playwright/test"

// 預期值寫成 Stage 的角色或 CSS 長度，由瀏覽器解析後再比對：
// hex 與 rgb、字型清單的引號與空白、cqw 與 px 寫法不同都不該誤判
export type StyleProbe = {
  mono?: true
  // 與 .stage-root 的內文字型相同
  body?: true
  color?: string
  fontSize?: string
  paddingTop?: string
}

// 主題事實裡的字型值直接當探針的鍵用；由 StyleProbe 推得，兩邊改名時型別檢查會一起抓到
export type FontRole = keyof Pick<StyleProbe, "mono" | "body">

export function matchStageStyle(
  target: Locator,
  probe: StyleProbe
): Promise<Record<string, boolean>[]> {
  return target.evaluateAll(
    (elements, probe) =>
      elements.map((element) => {
        const root = element.closest(".stage-root")!
        const normalize = (value: string) =>
          value.replace(/["'\s]/g, "").toLowerCase()
        // 探針放在元素旁邊，var() 與 cqw 才會對到元素所在的同一組角色與 container
        const resolve = (
          property: "color" | "fontSize" | "paddingTop",
          value: string
        ) => {
          const span = document.createElement("span")
          span.style[property] = value
          element.parentElement!.append(span)
          const resolved = getComputedStyle(span)[property]
          span.remove()
          return resolved
        }
        const style = getComputedStyle(element)
        const matches: Record<string, boolean> = {}
        if (probe.mono)
          matches.mono =
            normalize(style.fontFamily) ===
            normalize(getComputedStyle(root).getPropertyValue("--mono"))
        if (probe.body)
          matches.body =
            normalize(style.fontFamily) ===
            normalize(getComputedStyle(root).fontFamily)
        if (probe.color)
          matches.color =
            style.color === resolve("color", `var(${probe.color})`)
        if (probe.fontSize)
          matches.fontSize =
            style.fontSize === resolve("fontSize", probe.fontSize)
        if (probe.paddingTop)
          matches.paddingTop =
            style.paddingTop === resolve("paddingTop", probe.paddingTop)
        return matches
      }),
    probe
  )
}
