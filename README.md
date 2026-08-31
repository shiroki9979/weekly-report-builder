# weekly-report-builder

個人週報工坊：用表單整理當週內容，16:9 預覽後匯出 PNG，再手動貼進團隊共同編輯的 PPT。只有自己用。

不是簡報台、不是多人 CMS、也不取代團隊 PPT。

## 現況

App 尚未實作。決策與票在：

- [Spec](.scratch/weekly-workshop/spec.md)
- [Tickets](.scratch/weekly-workshop/issues/)（frontier：`01`）

Agent 設定見 [AGENTS.md](AGENTS.md)。

## 做成之後怎麼用

1. 開當週（檔名為該週週一 `weeks/YYYY-MM-DD.json`；新週複製上一週結構，清空內文）
2. 每頁填標題、左欄三點、右卡（chart／table／flow／checklist）
3. 不貼進團隊的頁面藏起來
4. 未隱藏頁逐頁下載 PNG，或複製到剪貼簿

編輯在 shadcn 工坊殼；預覽畫布用固定藍白 PPT 色票，不上 shadcn 元件。

## 不做

登入、分享、在畫布上拖曳排版、用這支 app 開會、把 localStorage 當唯一資料源。`fields` 右卡只寫在 spec，v1 不做。
