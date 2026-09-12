# Demo weeks bootstrap

建立日期：2026-09-12
最後更新：2026-09-12
狀態：approved

本文件記錄 `weeks/` 私有化與 demo 初始資料的 Grill 共識，並作為後續實作與驗收的 source of truth。

---

## Problem Statement

`weeks/` 同時承擔本機作者資料、公開範例與部分測試 fixture。這使真實週報可能被提交到 Git，也使 clean checkout 在移除 `weeks/` 後無法直接啟動、測試或建置。

專案需要把可公開的合成 demo 與本機作者資料分離，同時保留既有 runtime `/weeks` URL、讀寫 API 與本機 authoring flow。

## Solution

Repository 提供 tracked `demo/` 作為可公開的 Demo Week Set，並將 runtime authoring store `weeks/` 整體排除於 Git。Fresh checkout 的 `postinstall` 與明確的 `pnpm seed:weeks` 共用一個 atomic bootstrap seam，只在 `weeks/` 完全不存在時複製 Demo Week Set。

Workshop 先列出可用週次再載入最新 Week Document，不再依賴固定日期。測試、build 與文件同步解除對 tracked `weeks/` 的依賴，同時保留既有 runtime 路徑、API 與 E2E isolation。

## User Stories

1. As a contributor, I want `pnpm install` to create an initial local week automatically, so that a fresh checkout can open the Workshop without manual file setup.
2. As a contributor, I want an explicit `pnpm seed:weeks` command, so that I can recover when lifecycle scripts were skipped.
3. As a weekly-report author, I want real reports under `weeks/` ignored by Git, so that private or company-specific content is not committed accidentally.
4. As a weekly-report author, I want bootstrap to leave an existing `weeks/` directory untouched, so that local work is never merged with or replaced by demo content.
5. As a weekly-report author, I want an empty existing `weeks/` directory treated as intentional, so that setup does not silently change it.
6. As a contributor, I want bootstrap to fail when `weeks` is a file or symlink, so that an invalid target is visible instead of being treated as a valid authoring store.
7. As a contributor, I want bootstrap to publish a complete directory atomically, so that an interrupted copy cannot leave a half-created store that blocks retry.
8. As a contributor, I want concurrent bootstrap attempts to preserve the first completed store, so that install races cannot overwrite files.
9. As a contributor, I want setup failures to include actionable context and a non-zero exit code, so that CI and local installation do not report false success.
10. As a demo viewer, I want a fictional public week, so that the repository does not expose real organizations, projects, metrics, or reports.
11. As a demo viewer, I want the five production layout types represented, so that I can inspect both established and Editorial Layout Family behavior immediately.
12. As a demo viewer, I want the demo pages to form one coherent Harbor Grid report, so that the example reads like a real weekly narrative rather than disconnected fixtures.
13. As a demo viewer, I want the HTML Page asset included in bootstrap, so that full-bleed HTML preview and export work in a fresh checkout.
14. As a maintainer, I want the Demo Week Set tracked independently from `weeks/`, so that public examples and private authoring data have distinct ownership.
15. As a Workshop user, I want startup to select the latest available Week Document, so that demo dates and real reporting dates can evolve without code changes.
16. As a Workshop user, I want a clear empty state when no Week Documents exist, so that an empty store is not reported as a missing hard-coded file.
17. As a Workshop user, I want list failures shown separately from an empty store, so that connectivity and data-state problems remain distinguishable.
18. As a Workshop user, I want existing `/weeks/...` URLs and week APIs preserved, so that authoring, preview, clone, save, and export behavior keep their established paths.
19. As a Workshop user, I want Create week to continue cloning the latest local week, so that the seeded demo can become the first reusable structure.
20. As a test author, I want the shipped Demo Week Set validated by the production parser, so that repository examples cannot silently become invalid.
21. As a test author, I want focused edge-case tests to use dedicated fixtures, so that assertions are not coupled to demo copywriting.
22. As a test author, I want E2E to retain its isolated temporary weeks store, so that browser tests never mutate local authoring data.
23. As a maintainer, I want unit tests independent of ignored `weeks/`, so that clean CI does not depend on uncommitted local files.
24. As a build operator, I want a missing `weeks/` store to produce an actionable build error, so that build never creates authoring data implicitly.
25. As a build operator, I want a normally installed checkout to include the seeded week in production output, so that the documented setup path builds successfully.
26. As a maintainer, I want currently tracked weeks removed from the index without deleting this working tree's local copies, so that migration does not destroy the active authoring files.
27. As a maintainer, I want the scope to exclude Git history rewriting, so that this change does not invalidate existing clones or remote references.
28. As a documentation reader, I want setup, privacy, empty-store, and build behavior documented consistently, so that I know when bootstrap runs and which directory to edit.
29. As a contributor using `WEEKS_DIR`, I want bootstrap to ignore that runtime override, so that installation cannot unexpectedly write to a test or external path.
30. As a maintainer, I want the old feature branch treated only as reference material, so that outdated seeding semantics are not merged into current `dev`.

## Implementation Decisions

### Bootstrap lifecycle

- 提供可明確執行的 `pnpm seed:weeks`。
- `pnpm install` 的 `postinstall` 會呼叫同一個 bootstrap seam，使 fresh clone 自動取得初始週報。
- 不在 `dev` 或 `build` 內隱含建立或修改 `weeks/`。

### Copy precondition

- 僅在 `weeks/` 路徑完全不存在時複製 demo。
- `weeks/` 一旦存在，即使是空目錄，也不得由 bootstrap 補檔、合併或覆寫。
- 因此 repository 不保留 `weeks/.gitkeep`。

### Demo content

- Demo 必須是可公開的合成資料，不得由目前的真實 `weeks/` 內容轉製。
- 更新既有虛構 demo，使其涵蓋完整 Editorial Layout Family。
- Demo 至少保留一個 HTML Page，以驗證相關 HTML asset 會隨目錄一起複製。

### Initial week selection

- Workshop 啟動時不再依賴硬編碼日期。
- Client 先取得可用週次，再開啟最新一週。
- Demo 日期可以隨內容演進，不必配合程式內固定日期。

### Source tree and page coverage

- Committed bootstrap source 使用頂層 `demo/`，並完整鏡像 `weeks/` 的目錄結構。
- 文件將這組可公開的合成內容稱為 **Demo Week Set**；它不是 JavaScript object，也不是產品領域模型。
- Demo Week Set 包含五頁，依序涵蓋 Two-column Layout、Weekly Overview、Evidence-backed Decision、Next Actions 與 HTML Page。

### Test data boundaries

- 驗證 shipped demo 與實際檔案載入的 smoke tests 直接讀取 `demo/`。
- 精準驗證 parser、editor 與錯誤邊界的測試使用 `tests/fixtures/`，避免與展示文案耦合。
- E2E 繼續使用暫存 `WEEKS_DIR` 與 `tests/e2e/fixtures/weeks/`，不改用 repository root 的 `weeks/`。

### Atomic bootstrap and failures

- Bootstrap 先複製到 `weeks/` 的同層暫存目錄，完成後以 atomic rename 建立 target。
- `weeks/` 已是目錄時回報 skipped，包括空目錄；不得合併或補檔。
- `weeks` 已是一般檔案或 symlink 時明確失敗。
- Demo 不存在或複製失敗時明確失敗，並清除 bootstrap 建立的暫存內容。
- 並行 bootstrap 僅允許一方成功建立 `weeks/`；另一方遇到 target 已建立時安全地回報 skipped，不得覆寫。

### Destination and empty state

- `postinstall` 與 `pnpm seed:weeks` 只以 repository root 的 `demo/` 與 `weeks/` 為 source／destination，不讀取 `WEEKS_DIR`。
- `WEEKS_DIR` 只保留給 runtime store override 與測試隔離。
- `weeks/` 已存在但沒有週報時，Workshop 顯示明確且可操作的 empty state；不得由 client 自動載入 demo、建立第一週或修改該目錄。

### Git scope

- Git 忽略整個 `weeks/`，並從目前 index 移除既有 tracked paths，同時保留執行變更之 working tree 中的本機檔案。
- Demo Week Set 保持 tracked。
- 本變更不重寫 Git history；ignore 與 index migration 不會移除舊 commits 內的內容。

### Integration approach

- 實作留在目前 `dev`，不 merge、rebase 或切換至 `origin/feat/demo-weeks-seed`。
- 舊 feature branch 只作為參考；可選擇性移植仍符合本規格的虛構內容、測試想法或程式片段。
- Seeder 必須依本規格重新驗證，不得沿用舊分支「目錄存在但沒有 Monday JSON 仍可複製」或非 atomic copy 的行為。

### Demo scenario

- Demo Week Set 只有一個 Week Document，日期為 `2026-01-05`。
- 內容使用英文及虛構的 Harbor Grid 情境，不包含真實公司、專案或營運數據。
- 五頁內容形成連貫週報，同時滿足 Source tree and page coverage 所列的 layout coverage。

### User-visible outcomes

- Bootstrap 成功時輸出建立位置並以 exit code 0 結束。
- `weeks/` 已是目錄時輸出 skipped 與原因並以 exit code 0 結束。
- `weeks` 是一般檔案或 symlink、demo 缺失或複製失敗時，輸出帶有上下文的英文錯誤並以 non-zero exit code 結束。
- `build` 發現 `weeks/` 缺失時不得自動 seed；它必須明確失敗並提示執行 `pnpm seed:weeks`。
- Workshop 找不到任何週次時顯示英文 empty state，說明既有 `weeks/` 沒有資料，並提示移除空目錄後執行 `pnpm seed:weeks`。
- API 或網路載入失敗必須和合法的零週次狀態分開呈現。

### Documentation

- `README.md` 說明安裝時自動 bootstrap、手動 seed 指令與 `weeks/` 的私有性。
- `docs/reference/npm-scripts.md` 記錄 `seed:weeks` 與 `postinstall` 行為。
- `docs/tutorials/first-weekly-report.md` 使用自動選取的 demo week，不依賴固定 `2026-08-24`。
- `docs/how-to/create-new-week.md` 移除手動複製既有真實週報的過時指引。
- `docs/explanation/workshop-architecture.md` 區分 tracked `demo/` 與 ignored runtime `weeks/`。
- 這項 repository bootstrap policy 不建立 ADR；Demo Week Set 不是產品領域術語，因此不加入 `CONTEXT.md`。

## Testing Decisions

- 新增且僅新增一個 production seam：`seedWeeksFromDemo(demoDir, weeksDir)`。它回傳 `seeded` 或 `skipped` 的可辨識結果；CLI 與 `postinstall` 共用此 seam。
- Seeder tests 使用真實暫存目錄，從公開 seam 驗證 missing target、existing directory、file／symlink target、missing demo、完整 recursive copy、清理與競態結果，不斷言內部 copy steps。
- CLI tests 從 process boundary 驗證成功、skipped、failure message 與 exit code。
- Demo smoke test 以正式 Week Document parser 解析 tracked demo，並確認所引用的 HTML asset 存在。
- Latest-week、empty store 與 list failure 使用既有 `useWeekEditor` seam 驗證，不為日期選擇新增 production helper。
- 精準 parser／editor 邊界沿用 `tests/fixtures/`；既有 E2E global setup、暫存 `WEEKS_DIR` 與 reset fixtures 維持不變。
- Production build 與 clean CI 作為最高階整合 seam，驗證正常 install 後可 build，以及缺少 `weeks/` 時提供可操作的錯誤。
- 測試只驗證 caller 可觀察行為，不綁定暫存目錄名稱、copy loop 或 React state 更新順序。

## Out of Scope

- 自動修復已存在但為空或內容損壞的 `weeks/`。
- 從 Workshop UI 複製 demo 或建立第一個空白 Week Document。
- 讓 bootstrap 遵循 `WEEKS_DIR`。
- 在 `dev` 或 `build` 中自動執行 seed。
- 改名 runtime `weeks/`、公開 `/weeks/...` URL 或既有讀寫 API。
- 重寫 Git history 或清除歷史 Git objects。

## Further Notes

### Preserved boundaries

- Runtime authoring store 仍為本機 `weeks/`；公開 URL 仍使用 `/weeks/...`。
- Demo 是 bootstrap source，不是執行期寫入目標。
- E2E 現有的暫存 `WEEKS_DIR` 與專用 fixtures 維持隔離。
- 本變更不新增產品 layout、CMS、多人協作或遠端儲存能力。
- 不清除歷史 Git objects；若既有 commits 含必須撤回的敏感資訊，需另行規劃 history rewrite。

### Acceptance criteria

1. Fresh checkout 執行 `pnpm install` 後，自動從 `demo/` 建立可直接開啟的 `weeks/`。
2. `pnpm seed:weeks` 使用與 `postinstall` 相同的 bootstrap seam，且只在 `weeks/` 不存在時建立完整副本。
3. 既有 `weeks/` 不因 install、手動 seed、dev 或 build 被修改，即使它是空目錄。
4. Bootstrap 不會留下阻止下次重試的半完成 `weeks/`，且並行執行不會覆寫 winner 的資料。
5. Demo Week Set 可由正式 parser 解析，包含已確認的五種 layout 與所引用的 HTML asset。
6. Workshop 不使用硬編碼日期，會開啟 API 回傳的最新一週；零週次與載入失敗有不同 UI 狀態。
7. Unit tests 不再依賴 ignored `weeks/`；E2E 繼續使用隔離的暫存 store。
8. Production build 在已 bootstrap 的 clean checkout 成功；缺少 `weeks/` 時提供可操作的錯誤。
9. `weeks/` 不再受 Git 追蹤，而執行 index migration 的本機 working tree 內容保持存在。
10. README、tutorial、how-to、architecture 與 script reference 均反映新的 setup flow。

- GitHub 規格 issue 與 tracer-bullet tickets 是實作追蹤來源；本文件保留完整設計脈絡。
- Ticket rollout 使用 expand → parallel migrate → contract：先加入 bootstrap 與 startup behavior，再移除測試／build 對 tracked weeks 的依賴，最後停止追蹤 `weeks/`。
