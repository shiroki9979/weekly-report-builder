import type { DeckTheme } from "../../src/lib/deck"

// 各主題的事實只寫在這裡：Record 讓新增主題時型別檢查強制寫下預期，spec 改讀欄位而不以主題名稱分支
export type ThemeExpectation = {
  paddedPageNumbers: boolean
  ink: { accent: string; mute: string; line: string }
  legend: string[]
  leadBackground: string
  // Overview 頁匯出時是否嵌入自架的 Instrument Sans
  embedsInstrumentSans: boolean
  // --mono 是否自架 IBM Plex Mono（用到 var(--mono) 時才嵌入）
  hostsIbmPlexMono: boolean
  // --frame-font 的值：Editorial Frame 外框與 Overview 的 workstream、Status Signal 用 --mono 或內文字型
  frameFont: "mono" | "body"
  // 跨版型共用的 item index（補零等寬索引）是否取代項目標記；ledger 刻意不帶入補零編號。
  // Side-by-side point、Two-column 項目與 Full-width table 的列索引都讀這一項，不另記各自的標記種類
  itemIndex: boolean
  // Two-column 項目標題的色彩角色；主題只換 Stage Element 的處理，不重排構圖
  twoColumnHeading: "--blue" | "--ink"
  // table reference 欄的字型；ledger 雖自架 Plex，reference 欄仍沿用內文字型，所以不能由 frameFont 或 hostsIbmPlexMono 推得
  referenceFont: "mono" | "body"
}

const DEFAULT_LEGEND = [
  "rgb(46, 117, 182)",
  "rgb(126, 176, 214)",
  "rgb(161, 65, 136)",
]

export const THEME_EXPECTATIONS: Record<DeckTheme, ThemeExpectation> = {
  default: {
    paddedPageNumbers: false,
    ink: { accent: "#2e75b6", mute: "#5c5c5c", line: "#d0d7de" },
    legend: DEFAULT_LEGEND,
    leadBackground: "rgb(238, 244, 250)",
    embedsInstrumentSans: false,
    hostsIbmPlexMono: false,
    frameFont: "body",
    itemIndex: false,
    twoColumnHeading: "--blue",
    referenceFont: "body",
  },
  observatory: {
    paddedPageNumbers: true,
    ink: { accent: "#287b78", mute: "#5a6e7e", line: "#d6dee4" },
    legend: ["rgb(40, 123, 120)", "rgb(31, 95, 92)", "rgb(161, 65, 136)"],
    leadBackground: "rgba(0, 0, 0, 0)",
    embedsInstrumentSans: true,
    hostsIbmPlexMono: true,
    frameFont: "mono",
    itemIndex: true,
    twoColumnHeading: "--ink",
    referenceFont: "mono",
  },
  // ledger 沿用 default 的色彩與構圖，只換 --line、--accent-wash 與外框等寬字
  ledger: {
    paddedPageNumbers: false,
    ink: { accent: "#2e75b6", mute: "#5c5c5c", line: "#c7d9e9" },
    legend: DEFAULT_LEGEND,
    leadBackground: "rgb(219, 232, 244)",
    embedsInstrumentSans: false,
    hostsIbmPlexMono: true,
    frameFont: "mono",
    itemIndex: false,
    twoColumnHeading: "--blue",
    referenceFont: "body",
  },
}
