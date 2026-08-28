# Yota_operations_main 專案分析報告

- 分析日期：2026-08-20
- 分析對象：`/Users/cooperfu/Projects/Yota_operations_main`
- 方法：讀取根目錄六份規格文件 + 抽查 `src/` 程式碼結構與代表性檔案。查不到的資訊一律標註 `not_stated`，未做腦補。

## 1. 一句話結論

這是一個**博弈/遊戲營運後台管理系統（iGaming Aggregator Platform）**的 Vue 3 + TypeScript 前端專案，目前是**完全跑在前端記憶體 mock 資料上的功能原型**：UI 層開發範圍很廣（172 個原始碼檔案、約 13,290 行），但尚未串接真實後端、沒有自動化測試、沒有 CI/CD、也還沒有 git 版本控管。

## 2. 基本事實

| 項目 | 狀態 |
|---|---|
| git 版控 | 無 `.git`，尚未初始化 |
| 測試檔案 | 無（搜尋 `*.test.*` / `*.spec.*` / `tests/` 皆無結果） |
| CI/CD | 無 `.github/workflows` 或其他 CI 設定 |
| `node_modules` | 不存在，需先 `npm install` 才能跑 |
| `.gitignore` | 標準 Vite/Node 忽略清單；另有一行 `.gemini/antigravity/brain`，顯示曾在 Gemini/Antigravity 這類 AI 輔助開發工具環境下工作過 |

## 3. 技術棧

- **框架**：Vue 3（Composition API + `<script setup lang="ts">`）、TypeScript（`tsconfig.json` 開全套 strict 選項）、Vite 5
- **UI**：naive-ui 2.36、Tailwind CSS 3、`@vicons/ionicons5` / `@vicons/material`
- **狀態管理**：Pinia 2.1.6（三個 store，見下）
- **路由**：vue-router 4，用 `createWebHashHistory`（[src/router/index.ts:391](src/router/index.ts:391)）
- **其他**：vue-i18n（三語系 zh-TW/zh-CN/en）、echarts 6（圖表）、big.js（金額高精度運算）、axios（已安裝但實際 API 層走原生 `fetch`，未見實際使用）
- **build path 疑點**：`vite.config.ts` 的 `base: '/Game_operations/'` 與資料夾名 `Yota_operations_main`、`package.json` 的 `aggregator-platform` 三者不一致，可能是改名或多代號歷史遺留，確切原因 `not_stated`
- **lint**：`package.json` 有 `lint` script，但 devDependencies 未含 eslint 套件本身，指令可能無法直接執行

## 4. 專案架構

### 4.1 路由（[src/router/index.ts](src/router/index.ts)，約 61 個 path）
- `masterRoutes`：`/admin/*`，約 55 個子路由，涵蓋幾乎全部業務模組，角色 `DEVELOPER | MANAGER | USER | RISK`
- `merchantRoutes`：`/merchant/*`，目前只有 1 個 dashboard 子路由 —— **商戶端開發程度遠低於總控端**
- 角色守衛：`router.beforeEach` 做登入檢查與角色白名單檢查（[src/router/index.ts:395-424](src/router/index.ts:395)）
- `router.afterEach` 有一段清理殘留 `.n-modal-mask` DOM 的防禦性程式碼（[src/router/index.ts:427-443](src/router/index.ts:427)），暗示開發過程中遇過 naive-ui + Teleport 的已知問題

### 4.2 三個 Pinia Store
- `useAuthStore`：token / user / 權限檢查，持久化於 localStorage
- `useConfigStore`：語系 / 主題 / 伺服器時間校正
- `useMerchantStore`：Master 端切換操作目標商戶 context，`loadMerchantConfig()` 仍是佔位實作，未真正接 API

### 4.3 `src/api/`（41 檔）與 `src/mocks/`（23 檔）
依業務領域：認證帳號、玩家/會員、代理、財務/金流、遊戲、風控、行銷推廣、VIP、客服聊天、內容/公告、系統設定、報表、公會、商品、日誌。

**關鍵發現**：41 個 api 檔案中僅 2 個（`auth.ts`、`client.ts`）真正引用 `apiClient`；17 個從 `@/mocks` 取資料；其餘 22 個直接把假資料產生邏輯寫在 api 檔案內。也就是說**目前沒有任何一支 api 真正打真實後端**，全部是 mock。

`src/mocks/engine.ts` 的 `RolloverEngine` 值得特別一提——這不是靜態假資料，而是一個有狀態的彩金打碼（Rollover/Wagering）業務邏輯模擬引擎，處理建卡、啟用、下注/派彩、達標解鎖、破產重置、幣別兌換、P2P 轉帳等完整生命週期，全部在瀏覽器記憶體中運作，重新整理頁面即重置。

### 4.4 `src/views/`（依模組分類）
- **Master/**（30 檔）：權限帳號、玩家管理、財務金流、遊戲管理、商戶/公會/商品、內容行銷素材、系統技術管理、稽核 —— 開發量最大
- **AgentManagement/**（4 檔）、**ChatManagement/**（3+子元件）、**DataCenter/**（7 檔）、**Promotion/**（6 檔）、**Risk/**（3 檔）、**VIPManagement/**（1 檔）
- **Merchant/**（僅 2 檔：Layout + Dashboard）—— 明顯是骨架階段

### 4.5 代碼風格一致性
抽查 `PlayerList.vue`、`AgentList.vue`、`RealtimeDashboard.vue` 三個不同模組的代表檔案，皆一致採用 `<script setup lang="ts">` + naive-ui + 呼叫 `src/api/*.ts` 封裝函式 + `useI18n()` + snake_case 型別欄位，顯示 [CODE_STYLE_GUIDE.md](CODE_STYLE_GUIDE.md) 的規範確實有被落實。

## 5. 文件 vs 實作的落差

| 文件說法 | 實際程式碼 | 落差 |
|---|---|---|
| FRONTEND_TECH_SPEC.md：角色僅 `MASTER`/`MERCHANT` 二分 | 實際角色為 `DEVELOPER｜MANAGER｜USER｜RISK｜MERCHANT` | 規格文件已過時 |
| CODE_STYLE_GUIDE.md：mock 開發應走 MSW（`src/mocks/handlers.ts`） | 無此檔案，`package.json` 也無 `msw` 依賴，實際是自製 in-memory 陣列 + `delay()` | 規格與實作不符 |
| FRONTEND_TECH_SPEC.md：儀表板每 15 秒輪詢，分頁隱藏時應暫停 | `RealtimeDashboard.vue` 用 10 秒 `setInterval`，未實作 `visibilitychange` 暫停 | 間隔不同 + 少一項優化 |

## 6. 完成度（僅陳述有文件佐證的部分）

[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) 與 [COMPLETION_REPORT.md](COMPLETION_REPORT.md)（日期 2025-01-29，作者標註 GitHub Copilot）**明確且有依據地**指出「權限管理系統」四個模組已完成、20/20 驗收標準通過：

| 模組 | 路由 | 檔案 |
|---|---|---|
| OPE-105 個人帳號管理 | `/admin/account` | [src/views/Master/PersonalAccount.vue](src/views/Master/PersonalAccount.vue)（277行） |
| OPE-102 群組與帳號管理 | `/admin/groups` | [src/views/Master/GroupManagement.vue](src/views/Master/GroupManagement.vue)（694行） |
| OPE-103 帳號與權限綜合管理 | `/admin/accounts` | [src/views/Master/AccountManagement.vue](src/views/Master/AccountManagement.vue)（832行） |
| OPE-104 後台操作日誌 | `/admin/logs` | [src/views/Master/OperationLog.vue](src/views/Master/OperationLog.vue)（548行） |

**明確列出的未完成項（Phase 2/3，兩份文件皆有列）**：
- Phase 2：真實後端 API 集成、批量操作管理、權限模板匯入/匯出、審計報告生成、定時清理日誌、實時 2FA 驗證（目前 2FA 僅為開關，無實際驗證邏輯）
- Phase 3：LDAP/SSO 集成、動態權限計算、權限變更通知、審批工作流、多租戶支持

**重要提醒**：這兩份完成報告**只涵蓋權限管理子模組**，不代表整個平台（玩家、代理、財務、遊戲、風控等 51 個以上其他業務頁面）的完成度或驗收狀態——這部分完成度是 `not_stated`，只能確認頁面與 mock API 存在且可在瀏覽器中運作，無法確認功能正確性或是否經過任何驗收流程。

## 7. 建議的下一步（供 Cooper 參考，非最終決策）

1. 若要往生產環境推進，優先順序建議：(a) 補上 git 版控與初始 commit，(b) 依 QUICK_START.md 已寫好的後端集成步驟開始串接真實 API，(c) 補自動化測試（目前完全沒有）。
2. Merchant 端開發程度明顯落後 Master 端，若商戶自助後台是必要交付項，需要規劃補齊。
3. 規格文件（FRONTEND_TECH_SPEC.md、CODE_STYLE_GUIDE.md）已與實作出現落差，建議挑時間校正文件或標記文件版本已過時，避免後續開發者誤依過時規格。
4. 這些屬於技術/文件管理層面的建議，不涉及 RTP、賠付、金額等商業數值，故未附驗證方式；若要往這些方向推進，建議由 Cooper 決定優先順序。
