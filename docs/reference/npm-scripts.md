# pnpm 指令

建立日期：2026-08-31  
最後更新：2026-09-10

---

定義於 `package.json`。

| 指令                | 說明                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm install`      | 安裝相依套件                                                                                       |
| `pnpm dev`          | 啟動 Vite 開發伺服器（含 weeks API）                                                               |
| `pnpm build`        | TypeScript 建置 + Vite production build；複製 `weeks/` 至 `dist/weeks/`；一併產出 `prototype.html` |
| `pnpm preview`      | 預覽 production build                                                                              |
| `pnpm lint`         | ESLint                                                                                             |
| `pnpm format`       | Prettier 格式化程式碼、JSON、CSS、Markdown、YAML 與根目錄 HTML（`index.html`、`prototype.html`）   |
| `pnpm format:check` | 檢查 Prettier 格式，不修改檔案                                                                     |
| `pnpm typecheck`    | `tsc --noEmit`                                                                                     |
| `pnpm test`         | Vitest 單次執行                                                                                    |
| `pnpm test:watch`   | Vitest watch 模式                                                                                  |
| `pnpm test:e2e`     | Playwright；使用隔離的測試 weeks 目錄，不寫入 production `weeks/`                                  |

## 相關文件

- [開發伺服器 API](dev-server-api.md)
