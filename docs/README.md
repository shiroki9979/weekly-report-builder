# 文件索引

本專案技術文件依 [Diátaxis](https://diataxis.fr/) 分為四象限，各象限僅服務單一閱讀目的，彼此以連結交叉引用，避免混雜教學、操作、規格與架構論述。

建立日期：2026-08-31  
最後更新：2026-09-10

## Tutorials（入門教學）

帶領初學者完成首次端到端體驗。

| 文件                                           | 說明                              |
| ---------------------------------------------- | --------------------------------- |
| [第一份週報](tutorials/first-weekly-report.md) | 從啟動工坊到匯出 PNG 貼入團隊簡報 |

## How-To Guides（操作手冊）

假設已會基本操作，針對特定任務給步驟。

| 文件                                                           | 說明                            |
| -------------------------------------------------------------- | ------------------------------- |
| [建立新週次](how-to/create-new-week.md)                        | 自上一週 clone 結構並建立新檔   |
| [編輯並儲存週次](how-to/edit-and-save-a-week.md)               | 修改頁面內容並寫回 JSON         |
| [新增、刪除與重排頁面](how-to/add-delete-reorder-pages.md)     | Workshop 頁面生命週期操作       |
| [匯出 PNG 至團隊簡報](how-to/export-slides-to-team-deck.md)    | 批次下載或複製到剪貼簿          |
| [隱藏不需匯出的頁面](how-to/hide-pages-from-export.md)         | 保留編輯但略過 PNG 匯出         |
| [Author Editorial Layouts](how-to/author-editorial-layouts.md) | 新增與編輯三種 Editorial Layout |

## Reference（規格手冊）

客觀描述格式、API 與指令，不含操作步驟。

| 文件                                            | 說明                         |
| ----------------------------------------------- | ---------------------------- |
| [週次 JSON 格式](reference/week-json-format.md) | `weeks/YYYY-MM-DD.json` 結構 |
| [開發伺服器 API](reference/dev-server-api.md)   | `GET/PUT/POST /api/weeks`    |
| [pnpm 指令](reference/npm-scripts.md)           | 建置、測試、lint             |

## Explanation（架構闡述）

說明設計取捨與系統邊界，不含逐步操作。

| 文件                                               | 說明                                           |
| -------------------------------------------------- | ---------------------------------------------- |
| [工坊架構](explanation/workshop-architecture.md)   | 工坊殼 vs 16:9 stage、資料流                   |
| [Layout 家族原型](explanation/layout-prototype.md) | 歷史 800 × 450 驗證與 production adoption 指標 |

## Specs（尚未落地的功能規格）

給實作 agent 的完整規格。

| 文件                                                                            | 說明                                              |
| ------------------------------------------------------------------------------- | ------------------------------------------------- |
| [HTML 全幅頁](specs/html-page-layout.md)                                        | `layout: "html"` 16:9 逃生口                      |
| [HTML Page error-PNG](specs/html-page-error-png.md)                             | HTML fetch／timeout／capture 失敗政策（尚未實作） |
| [Editorial Layout Family production adoption](specs/editorial-layout-family.md) | 三種溝通職能 layout 的 production 規格            |

## 其他

| 文件                            | 說明                    |
| ------------------------------- | ----------------------- |
| [AGENTS.md](../AGENTS.md)       | Agent 語言與 issue 慣例 |
| [CHANGELOG.md](../CHANGELOG.md) | 版本變更紀錄            |
