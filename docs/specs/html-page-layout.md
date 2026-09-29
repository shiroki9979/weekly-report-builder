# HTML 全幅頁（16:9 逃生口）

建立日期：2026-09-03  
最後更新：2026-09-27
狀態：implemented（v0.1.0）

Grill 共識（2026-09-03）。已於 v0.1.0 實作。

---

## Problem Statement

工坊 v1 每頁只能是 `two-column`（左欄三點 + 右側 panel）。一次性畫面、或暫時搬進來的既有 HTML 週報，不值得先做成正式 layout，但作者仍需要它們出現在 16:9 預覽裡，並能匯出 PNG 貼進團隊 deck。

沒有逃生口時，只能硬塞進 table／flow，或放棄在工坊裡預覽／匯出該頁。

## Solution

新增頁面模式 `layout: "html"`：整頁佔滿 16:9，不渲染三點與 panel。HTML 本體放在該週資料夾的獨立 `.html` 檔；週次 JSON 只存相對檔名 `htmlFile`。預覽用 Shadow DOM 隔離；PNG 匯出時在 capture host 改掛 light DOM，沿用現有 `html-to-image`。工坊表單只編路徑與 title／notes／hidden；不在 app 內編 HTML、也不提供 layout 下拉。

反覆出現的版面仍應另加正式 `layout`，不把逃生口當成 CMS。

## User Stories

1. 身為週報作者，我要在需要時把任意 HTML 片段鋪滿 16:9，以便一次性畫面不必先做成 layout。
2. 身為週報作者，我要把既有 HTML 週報暫時搬進工坊預覽，以便有空再做成結構化 layout。
3. 身為週報作者，我要 HTML 頁佔滿整個 stage，以便複雜畫面不受左欄三點擠壓。
4. 身為週報作者，我不要 HTML 只塞在右側 panel，以便逃生口真的覆蓋整張投影片。
5. 身為週報作者，我要 HTML 存在獨立檔案、JSON 只存檔名，以便用編輯器改 markup、diff 也比較乾淨。
6. 身為週報作者，我要 `htmlFile` 相對於該週資料夾（例如 `p03.html`），以便 clone 後不必改路徑字串。
7. 身為週報作者，我要路徑不能跳出該週目錄，以便誤寫 `../` 不會讀到別處檔案。
8. 身為週報作者，我要 `layout: "html"` 的頁不必填 `items` 與 `panel`，以便 JSON 沒有幽靈欄位。
9. 身為週報作者，我要 `two-column` 頁的解析與表單完全不變，以便既有週次不受影響。
10. 身為週報作者，我要在工坊裡編 `htmlFile`、title、notes、hidden，以便不必為改檔名去手改 JSON（仍可手改 JSON）。
11. 身為週報作者，我不要在工坊裡用 textarea 編 HTML 本體，以便工坊維持表單工坊、不是 IDE。
12. 身為週報作者，我不要表單上的 layout 下拉，以便切換模式時不會默默丟掉三點／panel。
13. 身為週報作者，我要 HTML 本體在檔案存檔後預覽更新，以便用外部編輯器改完就能對稿。
14. 身為週報作者，我要預覽把片段放進 Shadow DOM，以便片段 CSS 不污染工坊 chrome，工坊主題也不污染片段。
15. 身為週報作者，我要片段能用 `.stage-root` 繼承下來的 `--blue` 等 token，以便顏色對齊 PPT，又不必依賴 `.stage-slide` 等 class。
16. 身為週報作者，我不要系統把 `stage.css` 的 class 灌進 shadow，以便改 stage 版面時不會連 HTML 頁一起壞。
17. 身為週報作者，我要片段可含 `<style>`，以便該頁自備排版。
18. 身為週報作者，我要系統在掛上前剝掉 `<script>`、`on*`、`javascript:`，以便片段不當迷你瀏覽器執行。
19. 身為週報作者，我要缺失、空檔名或無法讀取的 html 在 stage 顯示錯誤，以便知道是路徑問題而不是空白投影片。
20. 身為週報作者，我要 PNG 下載與複製仍包含 HTML 頁的畫面，以便逃生口頁也能進團隊 deck。
21. 身為週報作者，我要匯出時不依賴 Shadow DOM 被 `html-to-image` 拍到，以便現有 capture 路徑繼續用。
22. 身為週報作者，我要 hidden 的 HTML 頁與其他頁一樣略過批次匯出，以便行為一致。
23. 身為週報作者，我要 HTML 頁仍有 speaker notes 小抄，以便講稿與逃生口頁一併使用。
24. 身為週報作者，我要 navigator 用 JSON 的 title（與 id）標示 HTML 頁，以便切頁不必讀 HTML 檔。
25. 身為週報作者，我要建立新週次時連同 html 檔拷到新週目錄且內容原樣，以便結構被 clone、下週再改文案。
26. 身為週報作者，我要 clone 後 `htmlFile` 仍是同一個相對檔名，以便新週 JSON 不必改寫路徑。
27. 身為週報作者，我要 clone 時 HTML 頁的 title／notes 仍被清空（與 two-column 一致），以便新週不會帶上週講稿。
28. 身為開發者，我要路徑解析與消毒是可單測的純函式，以便不掛整顆工坊也能鎖行為。
29. 身為開發者，我要 parse 能拒絕不合法的 html 頁，以便壞 JSON 進不了編輯 state。
30. 身為開發者，我要靜態伺服把該週目錄內受控的 `.html` 提供給預覽 fetch，以便 dev 與 preview 都讀得到片段。
31. 身為週報作者，v1 我不需要片段裡的相對圖片或外連 CSS 檔，以便逃生口保持小。

## Implementation Decisions

- **頁面模型**（parse 後的形狀；prototype 等級的決策，不是示範碼）：

  `two-column` 頁維持 `items`（3）+ `panel`。  
  `html` 頁：**沒有** `items` / `panel`；必填非空 `htmlFile`（相對該週資料夾的單一檔名，副檔名 `.html`）。

  共同欄位：`id`、`layout`、`title`、可選 `hidden`、`notes`。

- **路徑**：以 Deck ID（檔名，週次即週一日期）組成 `weeks/<id>/<htmlFile>`。只允許檔名層級（無 `/`）、禁止 `..`、絕對路徑、空白。超出該週目錄即錯誤。
- **載入**：預覽與 capture 都 fetch 片段字串，消毒後再掛上。不要把未消毒的檔案直接當 `srcdoc`。
- **消毒**：掛上前以 DOMPurify 消毒，移除 `script`、事件屬性、危險 URL 與可執行內容的巢狀瀏覽環境（例如 `iframe`／`srcdoc`）；保留片段自帶的 `<style>`。這是防止 DOM XSS 的必要相依。
- **預覽掛載**：`.stage-root` 內 Shadow DOM；**不要**把 `stage.css` stylesheet adopt 進 shadow。CSS 變數從 `.stage-root` 繼承即可。
- **匯出掛載**：既有 off-screen capture host 改走 **light DOM 注入**（同一份已消毒字串）。不要為 HTML 頁換截圖庫，也不要用 iframe（現行 capture 拍不到）。
- **工坊表單**：`layout === "html"` 時顯示 `htmlFile` 與既有 title／notes／hidden；隱藏 items／panel 編輯。受既有 edit lock 約束。沒有 layout 切換控件。
- **錯誤**：讀檔失敗、路徑非法、缺失檔案 → stage 英文警告（既有 warning 模式），不要靜默空白。
- **靜態提供**：開發伺服必須能提供該週目錄下受控 `.html`（現況 `/weeks` 只送同層 json，必須擴充）。production copy 若只拷 `*.json`，需一併拷週目錄內 html。
- **Clone**：拷貝來源週目錄內被引用的 html 檔到新週目錄；內容不清空。`cloneWeekFromPrevious` 對 html 頁保留 `htmlFile` 字串、清空 title／notes；不要發明空的 items／panel。
- **語言**：工坊 chrome 英文；片段內容與 `weeks` JSON 一樣由作者自訂、語言不限。
- **文件**：更新週次 JSON 格式說明、clone how-to（會連 html 檔一起拷）、工坊架構（第二種頁面模式）。不要新開 tutorial，除非現有入門文需要一句話提到 html 頁。

## Testing Decisions

- 測對外行為（parse 接受／拒絕、路徑解析結果、消毒後字串、clone 後檔案內容），不測 Shadow DOM API、className、Vite plugin 內部。
- **Seam 1 — `parseWeekDocument`（既有）**：html 頁必填 `htmlFile`、不要求 items／panel；two-column 不變；非法 `htmlFile` 在 parse 或路徑函式拒絕（擇一處、測得到即可）。
- **Seam 2 — 路徑 + 消毒純函式（本票主 seam）**：`p03.html` 解析到該週目錄內；`..`、絕對路徑、空字串、非 `.html` 失敗；`<script>`／`onclick`／`javascript:` 被剝掉；合法 `<style>` 與文字保留。
- **Seam 3 — `createWeekFromPrevious` / weeks-store（既有，含檔案）**：clone 後新週目錄有相同相對檔名的 html，bytes／文字與來源相同；JSON 的 `htmlFile` 仍為相對檔名。
- Prior art：`parse-week-document`、`week-clone`、`weeks-store` 的 tempDir 檔案測試。
- 不要求：掛 workshop-shell、比對 PNG bytes、測 iframe、測 middleware 函式簽名。Stage 文字煙霧測試可選，比照 `two-column-slide`，非必須。

## Out of Scope

- 新的結構化 layout 產品線（除了這個 `html` 頁面模式本身）。
- `panel.kind: html`、iframe、presenter 模式。
- 工坊內 HTML 編輯器、layout 下拉、markdown。
- 片段相對圖片、額外 `.css` 檔、外部資源保證。
- Script 可跑的互動頁、動畫保證進 PNG。
- 把 `stage.css` class 灌進 shadow。
- 持久化 collapse 等與本功能無關的 chrome。
- Login、CMS、多人協作、取代團隊 PPT。

## Further Notes

- 產品仍是 solo 編輯工坊 → PNG → 團隊 deck，不是簡報播放器。
- `html-to-image` 對 Shadow DOM 不穩，故預覽／capture 兩種掛法是刻意的，不是暫時 hack 到可以省略。
- Token 繼承：自訂屬性會穿過 shadow；class 選擇器不會。這是 Q13 選「只有變數」的技術含義。
- Fetch error、timeout 與 capture 失敗的現行 block／skip 政策見 [HTML Page export failure policy](html-page-error-png.md)。
