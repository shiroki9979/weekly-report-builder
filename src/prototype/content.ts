// PROTOTYPE — 虛構文案（Harbor Forecast 試行回顧），與 demo Deck Set 同為虛構；可進 repo
import type { DeckCopy, Lang } from "./types"

const en: DeckCopy = {
  deckTitle: "Harbor Forecast · Pilot review",
  pageTotal: 15,
  pageNumbers: { cover: 1, compare: 9, table: 7, closing: 8 },
  cover: {
    eyebrow: "Platform review · Q1",
    title: "Keep the pilot small until large-image exports pass",
    subtitle:
      "What changed in the export path, which option we chose, and what we verify next.",
    byline: "Mei Lin (fictional)",
    meta: "Harbor Forecast · Platform team · 2026-01-09",
  },
  compare: {
    eyebrow: "Export path",
    headline: "Cache rendered pages; keep per-page capture as the fallback",
    columns: [
      {
        label: "Cached renders",
        points: [
          "Reuses unchanged pages across runs",
          "Average export 12 s → 8 s on the 10-page sample",
          "Needs an invalidation rule per layout",
        ],
      },
      {
        label: "Per-page capture",
        points: [
          "No cache state to reason about",
          "Same 12 s baseline on every run",
          "Already covered by export tests",
        ],
      },
    ],
    chosen: 0,
    tradeoff: {
      why: "Reviewers re-export the same deck several times a day; most pages do not change between runs.",
      cost: "Every layout now owns an invalidation rule, and a stale cache is a silent wrong PNG.",
    },
    boundary:
      "Verification: timings are the average of 20 runs on one fictional 10-page deck; large images are not yet tested.",
  },
  table: {
    eyebrow: "Checks",
    headline: "What the pilot has verified so far",
    columns: ["Check", "Result", "Page"],
    rows: [
      ["Cold export of the sample deck", "8 s average, no failed pages", "3"],
      [
        "Warm export after a one-page edit",
        "Only the edited page re-rendered",
        "3",
      ],
      ["Hidden pages", "Skipped, and counted in the summary", "4"],
      [
        "HTML Page load failure",
        "Page skipped with its reason listed",
        "4 · B1",
      ],
      ["Large images in an HTML Page", "Not tested", "B2"],
    ],
    refColumn: 2,
    boundary:
      "Scope: one fictional deck on one machine; the numbers are illustrative.",
  },
  closing: {
    eyebrow: "Next",
    headline: "Decide on wider rollout after the large-image case",
    takeaways: [
      { ref: "Thu", text: "Finish the large-image export case" },
      { ref: "Fri", text: "Re-run the 20-run timing on the same deck" },
      { ref: "B1", text: "Write the invalidation rule for HTML Pages" },
      {
        ref: "B2",
        text: "Decide: widen the pilot or keep it to the platform team",
      },
    ],
    closingLine: "Mei Lin · platform@example.invalid · fictional demo content",
  },
}

const zh: DeckCopy = {
  deckTitle: "Harbor Forecast · 試行回顧",
  pageTotal: 15,
  pageNumbers: { cover: 1, compare: 9, table: 7, closing: 8 },
  cover: {
    eyebrow: "平台回顧 · Q1",
    title: "大圖匯出通過之前，試行維持小範圍",
    subtitle: "匯出路徑改了什麼、我們選了哪個方案、接下來驗證什麼。",
    byline: "林美（虛構）",
    meta: "Harbor Forecast · 平台組 · 2026-01-09",
  },
  compare: {
    eyebrow: "匯出路徑",
    headline: "快取已渲染的頁面；逐頁截圖保留為退路",
    columns: [
      {
        label: "快取渲染結果",
        points: [
          "跨次匯出重用未變更的頁面",
          "10 頁樣本平均 12 秒 → 8 秒",
          "每種 layout 需要自己的失效規則",
        ],
      },
      {
        label: "逐頁截圖",
        points: [
          "沒有快取狀態要推理",
          "每次都是 12 秒基準",
          "既有匯出測試已涵蓋",
        ],
      },
    ],
    chosen: 0,
    tradeoff: {
      why: "審閱者一天會把同一份 Deck 匯出好幾次；多數頁面在兩次之間沒有變動。",
      cost: "每種 layout 都要擁有失效規則；過期的快取是一張看不出錯的 PNG。",
    },
    boundary:
      "驗證：時間為同一份虛構 10 頁 Deck 跑 20 次的平均；大圖案例尚未測試。",
  },
  table: {
    eyebrow: "檢查",
    headline: "試行到目前為止驗證了什麼",
    columns: ["檢查項目", "結果", "頁碼"],
    rows: [
      ["樣本 Deck 冷啟動匯出", "平均 8 秒，沒有失敗頁", "3"],
      ["改一頁後的熱匯出", "只有被改的頁重新渲染", "3"],
      ["隱藏頁", "略過並計入摘要", "4"],
      ["HTML Page 載入失敗", "略過該頁並列出原因", "4 · B1"],
      ["HTML Page 內的大圖", "尚未測試", "B2"],
    ],
    refColumn: 2,
    boundary: "範圍：一份虛構 Deck、一台機器；數字僅供示意。",
  },
  closing: {
    eyebrow: "下一步",
    headline: "大圖案例完成後再決定是否擴大",
    takeaways: [
      { ref: "週四", text: "完成大圖匯出案例" },
      { ref: "週五", text: "在同一份 Deck 重跑 20 次計時" },
      { ref: "B1", text: "為 HTML Page 寫失效規則" },
      { ref: "B2", text: "決定擴大試行或維持在平台組" },
    ],
    closingLine: "林美 · platform@example.invalid · 虛構示範內容",
  },
}

export const COPY: Record<Lang, DeckCopy> = { en, zh }
