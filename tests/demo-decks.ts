import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { parseDeck, type Deck } from "../src/lib/deck"

export type DemoDeck = { id: string; raw: unknown; deck: Deck }

// 單元與瀏覽器測試都以 demo/ 的實際內容為準，新增示範檔時兩邊自動納入
export function readDemoDecks(demoDir: string): DemoDeck[] {
  return readdirSync(demoDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const raw: unknown = JSON.parse(
        readFileSync(resolve(demoDir, name), "utf8")
      )
      return { id: name.replace(/\.json$/, ""), raw, deck: parseDeck(raw) }
    })
}
