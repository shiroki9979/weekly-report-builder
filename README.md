# weekly-report-builder

個人週報工坊：用表單整理當週內容，16:9 預覽後匯出 PNG，再手動貼進團隊共同編輯的 PPT。只有自己用。

不是簡報台、不是多人 CMS、也不取代團隊 PPT。

## 現況

- **骨架**：Vite + React + shadcn（`base-nova`）工坊殼已就緒；左編輯 placeholder、右 16:9 畫布 placeholder
- **功能**：尚未實作。決策與票在 [Spec](.scratch/weekly-workshop/spec.md)、[Tickets](.scratch/weekly-workshop/issues/)（frontier：`01`）

Agent 設定見 [AGENTS.md](AGENTS.md)。

## 開發

```bash
pnpm install
pnpm dev
```

其他指令：`pnpm build`、`pnpm lint`、`pnpm test`

週次資料目錄：`weeks/YYYY-MM-DD.json`（週一為檔名）

## 架構切線

| 區域 | 技術 |
|------|------|
| 工坊殼（編輯、側欄、拖曳分欄） | shadcn |
| 16:9 預覽畫布 | `src/styles/stage.css` token，不用 shadcn |

## 做成之後怎麼用

1. 開當週（檔名為該週週一 `weeks/YYYY-MM-DD.json`；新週複製上一週結構，清空內文）
2. 每頁填標題、左欄三點、右卡（chart／table／flow／checklist）
3. 不貼進團隊的頁面藏起來
4. 未隱藏頁逐頁下載 PNG，或複製到剪貼簿

## 不做

登入、分享、在畫布上拖曳排版、用這支 app 開會、把 localStorage 當唯一資料源。`fields` 右卡只寫在 spec，v1 不做。
