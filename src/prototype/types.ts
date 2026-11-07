// PROTOTYPE — throwaway. 三個主題表現（A/B/C）× 五頁，以 ?variant=&page=&lang= 切換，入口為 /prototype.html

export type Lang = "en" | "zh"
export type PageKey = "cover" | "compare" | "table" | "closing" | "overview"
export type VariantKey = "A" | "B" | "C"

export type CoverCopy = {
  eyebrow: string
  title: string
  subtitle: string
  byline: string
  meta: string
}

export type CompareColumn = { label: string; points: string[] }

export type CompareCopy = {
  eyebrow: string
  headline: string
  columns: [CompareColumn, CompareColumn]
  chosen: 0 | 1 | null
  tradeoff: { why: string; cost: string } | null
  boundary: string
}

export type TableCopy = {
  eyebrow: string
  headline: string
  columns: string[]
  rows: string[][]
  refColumn: number
  boundary: string
}

export type ClosingCopy = {
  eyebrow: string
  headline: string
  takeaways: { ref: string; text: string }[]
  closingLine: string
}

export type DeckCopy = {
  deckTitle: string
  pageTotal: number
  pageNumbers: Record<Exclude<PageKey, "overview">, number>
  cover: CoverCopy
  compare: CompareCopy
  table: TableCopy
  closing: ClosingCopy
}

export type VariantProps = {
  page: Exclude<PageKey, "overview">
  copy: DeckCopy
  lang: Lang
}
