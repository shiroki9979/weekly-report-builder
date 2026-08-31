# pnpm 指令

建立日期：2026-08-31  
最後更新：2026-08-31

---

定義於 `package.json`。

| 指令 | 說明 |
|------|------|
| `pnpm install` | 安裝相依套件 |
| `pnpm dev` | 啟動 Vite 開發伺服器（含 weeks API） |
| `pnpm build` | TypeScript 建置 + Vite production build；複製 `weeks/` 至 `dist/weeks/` |
| `pnpm preview` | 預覽 production build |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier 格式化 `**/*.{ts,tsx}` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest 單次執行 |
| `pnpm test:watch` | Vitest watch 模式 |

## 相關文件

- [開發伺服器 API](dev-server-api.md)
