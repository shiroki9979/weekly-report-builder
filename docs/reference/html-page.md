# HTML Page

建立日期：2026-11-21  
最後更新：2026-11-21

---

`layout: "html"` 是 16:9 的逃生口：整頁由 Deck 目錄內的一份 `.html` 片段鋪滿，不渲染三點與 panel。適合一次性畫面或暫時搬進來的既有 HTML；反覆出現的構圖應該做成正式 Structured Layout，不把逃生口當 CMS。JSON 欄位見 [Deck JSON 格式](deck-json-format.md#layout-html)，匯出失敗政策見 [Export gate](export-gate.md)。

## 檔案與路徑

- JSON 只存相對檔名 `htmlFile`，檔案放在 `decks/<id>/<htmlFile>`，預覽以 `/decks/<id>/<htmlFile>` 讀取。
- `htmlFile` 只能是單一檔名：不可空白、不可含空白字元、`/`、`\`、`..`，副檔名須為 `.html`。違反時 parser 拒絕，預覽在 Stage 顯示英文警告，不會是空白投影片。實作見 `src/lib/html-page.ts` 的 `validateHtmlFileName`。
- 不支援片段引用相對圖片、外部 `.css` 或其他外部資源。
- 從 Deck Template 或上一週建立 Deck 時，被引用的 html 檔原樣拷到新目錄，`htmlFile` 保持同一個相對檔名；title 與 notes 清空，`showPageNumber` 沿用。

## 載入與消毒

預覽與匯出都先 fetch 片段字串，以 DOMPurify 消毒後才掛上；不把未消毒的檔案當 `srcdoc`。這是防止 DOM XSS 的必要步驟，不可省略。

- 移除 `script`、事件屬性（`on*`）、`javascript:` 等危險 URL，以及能載入可執行內容的元素（`iframe`、`object`、`embed`、`frame`、`portal`、`base`、`link`、`meta`）與 `srcdoc` 屬性。
- 保留片段自帶的 `<style>`（含 `<head>` 內的）、inline SVG，以及 `<body>` 上的 `class` 與 `style`。
- 消毒不拋錯；消毒後為空字串的片段仍可截圖。
- 完整規則以 `sanitizeHtmlFragment` 為準。

## 掛載：預覽用 Shadow DOM，匯出用 light DOM

| 情境 | 掛載方式                                     | 理由                                                                    |
| ---- | -------------------------------------------- | ----------------------------------------------------------------------- |
| 預覽 | `.stage-root` 內的 Shadow DOM                | 片段 CSS 不污染工坊 chrome，工坊樣式也不污染片段                        |
| 匯出 | 離屏 capture host 的 light DOM（同一份字串） | `html-to-image` 拍 Shadow DOM 不穩定；改用 iframe 則現行 capture 拍不到 |

兩種掛法是刻意的，不是可以合併的暫時做法。`stage.css` 不 adopt 進 shadow：CSS 自訂屬性會穿過 shadow boundary，class 選擇器不會，所以片段只依賴 token，不依賴 `.stage-slide` 等 class，Stage 改版也不會連帶弄壞 HTML Page。

## 色彩與字型

- 色彩引用 Stage 角色（`--paper`、`--ink`、`--accent` 等，或舊 `--blue*` 別名）時會跟隨 Deck Theme；寫死的色碼不被改寫，也不跟隨。角色清單見 [ADR-0002](../adr/0002-deck-theme.md)。
- 內文不指定 `font-family`，從 `.stage-root` 繼承主題字型；繼承會穿過 Shadow DOM，capture host 的 light DOM 也一樣。
- 等寬字一律用 `var(--mono)`。SVG 的 `font-family` 屬性不能用 `var()`，改在片段 `<style>` 裡用 class 指定。
- 不內嵌字型（`@font-face` 搭配 `data:` URI）。需要的字型由主題樣式表提供，PNG 只嵌入該頁實際用到的自架字型。
- sanitizer 不剝除既有片段的 `font-family` 或 `@font-face`，因此既有私人 Deck 的輸出不會無預警改變，只是不跟隨主題。

## 頁尾與安全區

頁面設 `showPageNumber: true` 時，app 在片段之外畫出與 Editorial Frame 相同的頁尾：左側 Deck Title、右側 Page Position；Deck 沒有 Deck Title 時只畫 Page Position。所有主題的頁尾結構相同，主題只改字型與頁碼格式（例如 `observatory` 補零）。預覽與匯出的頁尾位置一致。

- **預設關閉，不繼承 Deck 的 `showPageNumbers`**。這點刻意和 Editorial Frame 不同：既有片段可能自帶頁尾，若頁尾或 Deck Title 一律出現，會改變既有輸出並與片段重疊。關閉時整組頁尾都不畫，Deck Title 不會單獨出現。Hidden Page 不畫頁尾。
- **安全區**：頁尾開啟時，片段底部 `8cqw`（1280 × 720 下約 102 px）保留給頁尾，與 Editorial Frame 正文底部到 Stage 底邊的距離相同。`cqw` 以 Stage 寬度為準，Shadow DOM 內也能用。安全區內不放文字、圖形或來源說明；鋪滿整頁的底色不算內容。
- **責任在作者**：系統不偵測片段是否自帶頁尾，也不裁切內容。`editorial-footer-overlap.spec` 只檢查 Demo Deck Set 的 HTML Page 在每個主題下不與頁尾重疊。

## 片段撰寫契約

手寫片段與 repo 外的週報產生器都遵守以下規則，Structured Layout 與 HTML Page 混排時翻頁才不會換字型、日期格式與頁尾：

- 色彩只用 Stage 角色，字型靠繼承，等寬字用 `var(--mono)`，不內嵌字型。
- 片段不自畫頁尾或頁碼；JSON 設 `showPageNumber: true`，片段讓出底部 `8cqw`。
- 標頭日期用 ISO 格式（`2026-11-16`）。
- 「Source: …」等來源說明留在片段內，用 `var(--mute)`。

範例：[`demo/demo-ledger/schedule.html`](../../demo/demo-ledger/schedule.html)。

## 不支援

- 片段內可執行的 script、互動或保證進 PNG 的動畫。
- 工坊內的 HTML 編輯器或 layout 切換；頁面表單只編 `htmlFile`、title、notes 與 hidden。
- `panel.kind: "html"` 或 iframe 掛載。

## 相關文件

- [Deck JSON 格式](deck-json-format.md)
- [Export gate](export-gate.md)
- [工坊架構](../explanation/workshop-architecture.md)
