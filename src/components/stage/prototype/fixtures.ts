import type { NextActionsPage } from "@/lib/week-document"

// 原型資料刻意獨立於週檔，避免視覺比較誤寫作者內容。
export type TrendFixture = {
  id: string
  name: string
  headline: string
  metric: string
  unit: string
  precision: number
  firstWeek: string
  values: (number | null)[]
  target: number
  direction: "at-most" | "at-least"
  domain: [number, number]
  interpretation: string
  context: string
}

export const trendFixtures: TrendFixture[] = [
  {
    id: "recovery",
    name: "Target met · 8 weeks",
    headline: "Export time stays below target for a second week.",
    metric: "Mean export duration",
    unit: "s",
    precision: 1,
    firstWeek: "2026-08-03",
    values: [13.2, 12.8, 11.6, 10.4, 9.6, 8.8, 7.6, 7.2],
    target: 8,
    direction: "at-most",
    domain: [0, 16],
    interpretation:
      "The last two weeks meet the target. Validate large-image reports before expanding the pilot.",
    context:
      "Fictional benchmark · Same 10-page report · 20 runs per week · Large images excluded",
  },
  {
    id: "above-target",
    name: "Target missed · 12 weeks",
    headline: "Exports are faster; the target is still out of reach.",
    metric: "Mean export duration",
    unit: "s",
    precision: 1,
    firstWeek: "2026-07-06",
    values: [16, 15.2, 15.8, 14, 13.2, 12.8, 11.6, 10.4, 9.6, 8.8, 8.6, 8.4],
    target: 8,
    direction: "at-most",
    domain: [0, 20],
    interpretation:
      "The latest result misses the target by 0.4 seconds. Keep the pilot limited while investigating image processing.",
    context:
      "Fictional benchmark · Same 10-page report · 20 runs per week · Large images excluded",
  },
  {
    id: "missing",
    name: "Missing weeks · no latest result",
    headline: "This week's result is missing; target status is unknown.",
    metric: "Mean export duration",
    unit: "s",
    precision: 1,
    firstWeek: "2026-08-03",
    values: [12, 11.2, null, 10.1, 9, 8.4, 7.8, null],
    target: 8,
    direction: "at-most",
    domain: [0, 16],
    interpretation:
      "The previous week met the target. Missing runs prevent a conclusion about this week; rerun the same benchmark.",
    context:
      "Fictional benchmark · Same 10-page report · 20 planned runs per week · Gaps mean no observation",
  },
  {
    id: "higher-is-better",
    name: "Higher is better · 中文",
    headline: "成功率首次達到 99%，下一週持續驗證穩定性。",
    metric: "匯出成功率",
    unit: "%",
    precision: 1,
    firstWeek: "2026-08-03",
    values: [96, 96.4, 97, 97.5, 98, 98.2, 98.8, 99],
    target: 99,
    direction: "at-least",
    domain: [95, 100],
    interpretation:
      "本週剛好達標，尚不足以判定長期穩定。維持相同測試條件，確認改善能否持續。",
    context: "虛構資料 · 每週 1,000 次匯出 · 相同週報樣本 · 縱軸範圍為 95–100%",
  },
  {
    id: "zero",
    name: "Zero is a measured value",
    headline: "No failed exports were recorded across eight weeks.",
    metric: "Failed exports",
    unit: "runs",
    precision: 0,
    firstWeek: "2026-08-03",
    values: [0, 0, 0, 0, 0, 0, 0, 0],
    target: 0,
    direction: "at-most",
    domain: [0, 1],
    interpretation:
      "Zero represents a completed observation. Keep monitoring the same sample; these results do not cover every report type.",
    context:
      "Fictional benchmark · 20 runs per week · Zero is not missing data",
  },
]

export const actionFixtures: {
  id: string
  name: string
  page: NextActionsPage
}[] = [
  {
    id: "two",
    name: "2 commitments · English",
    page: {
      id: "prototype-actions",
      layout: "next-actions",
      title: "Close the evidence gaps before expanding the pilot.",
      commitments: [
        {
          title: "Verify target stability",
          outcome:
            "Confirm the faster export time holds under the same workload.",
          checkpoint:
            "Friday: publish 20 runs with a mean of 8 seconds or less.",
        },
        {
          title: "Test large-image reports",
          outcome:
            "Understand whether image size changes the rollout decision.",
          checkpoint:
            "Thursday: review three image-heavy reports and record failures.",
        },
      ],
    },
  },
  {
    id: "three",
    name: "3 commitments · 中文",
    page: {
      id: "prototype-actions",
      layout: "next-actions",
      title: "補齊測試證據，再決定是否擴大試行。",
      commitments: [
        {
          title: "確認匯出耗時持續達標",
          outcome: "維持相同樣本與測試條件，確認本週改善可以重現。",
          checkpoint: "週五前完成 20 次測試，平均耗時不超過 8 秒。",
        },
        {
          title: "補測大型圖片週報",
          outcome: "釐清圖片大小是否影響速度與成功率，補足目前證據缺口。",
          checkpoint: "週四前完成三份圖片密集週報，記錄耗時與失敗原因。",
        },
        {
          title: "整理試行決策依據",
          outcome: "讓會後讀者也能理解建議、比較基準與適用限制。",
          checkpoint: "週五會議前提供測試摘要與擴大試行建議。",
        },
      ],
    },
  },
  {
    id: "four-long",
    name: "4 commitments · longer mixed copy",
    page: {
      id: "prototype-actions",
      layout: "next-actions",
      title: "擴大試行前，完成效能、圖片與交接驗證。",
      commitments: [
        {
          title: "Repeat the export benchmark",
          outcome:
            "使用相同 10 頁週報重新量測，確認改善可重現，並保留每次執行結果供會後查核。",
          checkpoint: "Friday: 20 runs, mean ≤ 8 s; include the run log.",
        },
        {
          title: "Cover image-heavy reports",
          outcome:
            "補測三份大型圖片週報，分開記錄匯出耗時與成功率，避免平均值掩蓋失敗案例。",
          checkpoint: "Thursday: document all three reports and any failures.",
        },
        {
          title: "Check the reading experience",
          outcome:
            "邀請未參與設計的同事閱讀成品，確認結論、目標與限制在沒有講者時仍能理解。",
          checkpoint: "Wednesday: capture misreadings at the 800 × 450 view.",
        },
        {
          title: "Prepare the rollout handoff",
          outcome:
            "整理證據、尚未驗證的條件與下一次檢查時間，讓接手同事能延續相同測試口徑。",
          checkpoint:
            "Friday: review the evidence and record a rollout decision.",
        },
      ],
    },
  },
]

export function weekLabels(fixture: TrendFixture): string[] {
  const first = new Date(`${fixture.firstWeek}T00:00:00Z`)
  return fixture.values.map((_, index) => {
    const week = new Date(first)
    week.setUTCDate(first.getUTCDate() + index * 7)
    return week.toISOString().slice(0, 10)
  })
}
