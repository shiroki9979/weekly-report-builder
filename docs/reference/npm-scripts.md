# pnpm 指令

建立日期：2026-08-31  
最後更新：2026-09-28

---

定義於 `package.json`。

| 指令                | 說明                                                                                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`      | 安裝相依套件；`postinstall` 呼叫與 `seed:weeks` 相同的 bootstrap seam。僅在 repo 根目錄的 `weeks/` 不存在時，從 tracked `demo/` 複製 Demo Week Set。不讀取 `WEEKS_DIR`。                              |
| `pnpm seed:weeks`   | 與 `postinstall` 共用 bootstrap。`weeks/` 已是目錄（含空目錄）時 skipped、不補檔、不覆寫；路徑不存在時將 `demo/` 複製為 `weeks/`。`weeks` 為一般檔案或 symlink、demo 缺失或複製失敗時 non-zero 結束。 |
| `pnpm dev`          | 啟動 Vite 開發伺服器（含 weeks API）。不建立或修改 `weeks/`。                                                                                                                                         |
| `pnpm build`        | TypeScript 建置 + Vite production build；複製既有 `weeks/` 至 `dist/weeks/`。缺少 `weeks/` 時失敗並提示執行 `pnpm seed:weeks`，不會自動 seed。                                                        |
| `pnpm preview`      | 預覽 production build                                                                                                                                                                                 |
| `pnpm lint`         | ESLint                                                                                                                                                                                                |
| `pnpm format`       | Prettier 格式化程式碼、JSON、CSS、Markdown、YAML 與根目錄 HTML（`index.html`）                                                                                                                        |
| `pnpm format:check` | 檢查 Prettier 格式，不修改檔案                                                                                                                                                                        |
| `pnpm typecheck`    | `tsc --noEmit`                                                                                                                                                                                        |
| `pnpm test`         | Vitest 單次執行                                                                                                                                                                                       |
| `pnpm test:watch`   | Vitest watch 模式                                                                                                                                                                                     |
| `pnpm test:e2e`     | Playwright；使用隔離的測試 weeks 目錄（`WEEKS_DIR`），不寫入 runtime `weeks/`                                                                                                                         |

`demo/` 是 Git 追蹤的公開 Demo Week Set（bootstrap 來源）。`weeks/` 是本機 authoring store，整個目錄被 Git 忽略；Workshop 開啟 API 回傳的最新週次，不依賴固定日期。忽略與從目前 index 移除 `weeks/` 不會重寫 Git history，也不會刪除舊 commits 內的物件。`WEEKS_DIR` 只覆寫 runtime／測試讀寫路徑，bootstrap 不使用它。

## 相關文件

- [開發伺服器 API](dev-server-api.md)
- [工坊架構](../explanation/workshop-architecture.md)
