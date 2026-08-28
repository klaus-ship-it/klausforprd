# VIP 機制詳細分析

- 分析日期：2026-08-20
- 範圍：[src/types/vip.ts](../../src/types/vip.ts)、[src/api/vip.ts](../../src/api/vip.ts)、[src/views/VIPManagement/VIPSettings.vue](../../src/views/VIPManagement/VIPSettings.vue)、[src/views/DataCenter/VIPStats.vue](../../src/views/DataCenter/VIPStats.vue)、以及 Player/RolloverEngine 中所有 VIP 相關引用點（見下方逐項引用）。
- 方法：全文搜尋 `grep -rn "vip\|VIP"` 逐一追蹤每個引用點的實際程式邏輯，非僅讀規格文件。查不到的一律標 `not_stated`。

## 1. 機制概觀：資料模型

`VIPLevel`（[src/types/vip.ts:1-42](../../src/types/vip.ts)）定義單一等級的完整欄位：

- **識別**：`rank`、`name`、圖示/頭像框 URL
- **晉升條件**：`promo_deposit`（終生累計儲值）、`promo_turnover`（終生累計流水）、`promo_special`/`bind_data`（特殊條件，如綁定手機）
- **升級獎勵**：`upgrade_reward_currency`（銀幣/銅幣）、`upgrade_reward_amount`、銀幣專屬的流水倍率與轉換上限
- **保級條件**：`is_perpetual`（無條件保級）、`retain_deposit`（月累計儲值）、`retain_turnover`（月累計流水）、`retain_active_days`（月活躍天數）
- **權益**：`gift_fee_rate`（P2P 贈禮手續費）、`rebate_rate`（投注返水）
- 每個文案欄位都有 `_zh_tw` / `_zh_cn` / `_en` 三語系版本

[src/api/vip.ts](../../src/api/vip.ts) 的 mock 資料實際列出 **16 個等級（rank 0~15：鐵牌→無極）**，儲值/流水門檻與返水率隨等級遞增設計合理（例如 rebate_rate 從 0% 一路到 1.5%，gift_fee_rate 從 0% 到高等級歸零）。

## 2. 前端實作現況

- **[VIPSettings.vue](../../src/views/VIPManagement/VIPSettings.vue)**：`/admin/vip-settings` 路由（[src/router/index.ts:344-347](../../src/router/index.ts)，僅 `DEVELOPER`/`MANAGER` 可見），列表 + 兩個獨立 Modal（「編輯」處理多語系文案與圖示上傳；「設定」處理數值門檻與費率），呼叫 `vipApi.getVIPLevels()` / `updateVIPLevel()`。
- **[VIPStats.vue](../../src/views/DataCenter/VIPStats.vue)**：`/admin/vip-stats` 路由（同上權限），用 echarts 畫等級分佈圓餅圖、以及選定等級的保級率/降級率/晉升率環圈圖。
- **`vipApi`**：`getVIPLevels()` 回傳整包 mock 陣列；`updateVIPLevel()` 依 `rank` 找到陣列項目後整包覆蓋，純記憶體操作，重新整理頁面即重置。

## 3. 資料流追蹤結果（核心發現）

追蹤 `promo_deposit`、`promo_turnover`、`retain_deposit`、`retain_turnover`、`retain_active_days`、`rebate_rate`、`gift_fee_rate` 這些欄位在整個 `src/` 中的所有引用點，結果如下：

| 欄位 | 定義處 | 實際被讀取/計算的地方 |
|---|---|---|
| `promo_deposit` / `promo_turnover` | VIPSettings 表單 | **無**——沒有任何程式碼拿玩家的累計儲值/流水去跟這個門檻比對 |
| `retain_deposit` / `retain_turnover` / `retain_active_days` | VIPSettings 表單 | **無** |
| `rebate_rate` | VIPSettings 表單 | 僅 [VIPStats.vue:244](../../src/views/DataCenter/VIPStats.vue) 讀出來顯示文字，未被用於任何金額計算 |
| `gift_fee_rate` | VIPSettings 表單 | 同上，僅顯示用 |

對照 `Player` 資料模型（[src/types/player.ts:35](../../src/types/player.ts)）：玩家身上只有一個**手動數字欄位** `vip_level`（mock 資料是 `Math.floor(Math.random()*5)` 隨機給的，[src/mocks/player.ts:25](../../src/mocks/player.ts)）與一個**手動布林開關** `is_retention_active`（保級判定，[src/types/player.ts:52](../../src/types/player.ts)），兩者都是管理員在 [PlayerList.vue](../../src/views/Master/PlayerList.vue) / [PlayerDetail.vue](../../src/views/Master/PlayerDetail.vue) 的表單裡用 `NInputNumber` / `NSwitch` **手動輸入**（[PlayerDetail.vue:1104](../../src/views/Master/PlayerDetail.vue)），沒有任何累計儲值/流水/活躍天數的欄位存在於 `Player` 身上，也沒有任何排程或引擎去計算它們。

`updatePlayer()`（[src/api/player.ts:148-161](../../src/api/player.ts)）中的 `reissue_past_vip_rewards` 選項（補發過去升級獎勵）**唯一動作是 `console.log`**（[src/api/player.ts:143, 156](../../src/api/player.ts)），不會真的把獎勵加進玩家錢包。

另外，`src/mocks/engine.ts` 的 `RolloverEngine`（P2P 轉帳、下注/派彩處理）**完全沒有引用 `vip_level`、`gift_fee_rate`、`rebate_rate` 任何一個字**——已確認：`p2pTransfer()` 的手續費是寫死 8%，不會查表套用該玩家等級的 `gift_fee_rate`；`processBet()`/`processWin()` 也沒有計算返水加值。

`VIPStats.vue` 頁面上的分佈人數、晉升/保級/降級率、`statsData.settledDate` 等全部數字（[VIPStats.vue:27-69](../../src/views/DataCenter/VIPStats.vue)）都是寫死在 `reactive({...})` 裡的展示用假資料，不是從任何玩家資料聚合計算出來。

BACKEND_TECH_SPEC.md 與 FRONTEND_TECH_SPEC.md **全文搜尋 "vip" 皆無結果** —— VIP 模組完全沒有出現在既有的後端/前端技術規格文件中，沒有資料模型、API 合約或結算規則的正式定義。

## 4. 結論一句話

**目前的 VIP 機制只是一張可編輯的靜態設定表（等級名稱、門檻文案、費率數字）+ 一頁純展示用假資料儀表板。晉升、保級、返水、手續費折扣、升級獎勵發放——這五項在 UI 上看起來已經做好的核心業務邏輯，實際上沒有一項被任何程式碼真正執行過。** 這與前次整體分析報告中「Master 端頁面數量多但多數業務規則尚未有驗證/串接」的結論一致，VIP 是其中落差最徹底的模組之一。

---

## 5. 設計上發現的問題

以嚴重度排序，每項附證據與影響：

### 問題 1：晉升/保級門檻完全沒有被強制執行（最關鍵）
- **現象**：`promo_deposit`/`promo_turnover`/`retain_*` 這些欄位存在於資料模型與編輯 UI 中，但沒有任何計算引擎讀取玩家的累計儲值/流水/活躍天數去跟門檻比對、也沒有排程去做月結保級判斷。玩家的 `vip_level` 純粹是後台手動輸入的數字。
- **影響**：如果照目前設計直接對業主展示，容易造成「以為設定完門檻系統就會自動運作」的誤解。實際上這套系統一旦要上線，等於要從零設計並實作一套完整的累計計算＋排程結算引擎（且涉及金錢與玩家權益，屬於 CLAUDE.md 全域規則中「涉及機率/賠付/金額的結論需附驗證方式」的高風險項目），目前規格文件（BACKEND_TECH_SPEC.md）完全沒有著墨，工作量被低估的風險高。
- **建議**：在對外溝通完成度時，明確標註「VIP 等級管理」目前僅為設定介面原型，晉升/保級的自動判斷邏輯尚未設計，避免預期落差。

### 問題 2：VIP 承諾的權益未被實際引擎套用（手續費/返水形同虛設）
- **現象**：`gift_fee_rate`、`rebate_rate` 定義在每個等級上，但 `RolloverEngine.p2pTransfer()` 手續費寫死 8%（未依等級查表），下注/派彩流程也沒有計算返水入帳。
- **影響**：如果之後直接把現有的 mock 邏輯當作「已完成的業務邏輯」去對接後端，玩家實際上不會拿到後台設定畫面上承諾的手續費折扣或返水，容易變成營運端已經跟玩家/代理宣傳的權益兌現不了的客訴風險。
- **建議**：串後端前，需先確認金流引擎（P2P 轉帳、下注結算）要不要吃 VIP 費率表，這是一個需要業主拍板的產品範圍決策，不是單純技術實作問題。

### 問題 3：型別註解與實際資料不同步
- **現象**：[src/types/vip.ts:2](../../src/types/vip.ts) 註解寫 `rank: number // 0-10`，但 `mockVIPLevels` 實際有 16 個等級（rank 0~15，見 [src/api/vip.ts:159-228](../../src/api/vip.ts)）。
- **影響**：後續工程師若信任這行註解去寫邊界檢查（例如 `v-for` range、驗證 rank ≤ 10），會在高等級漏掉邏輯，是低成本高風險的技術債。
- **建議**：順手修正註解為實際範圍，或改成從陣列長度動態推導，不要寫死數字在註解裡。

### 問題 4：升級獎勵沒有實際發放路徑
- **現象**：`upgrade_reward_amount`/`upgrade_reward_currency` 可在「編輯」Modal 設定，但玩家升級時沒有任何程式碼把獎勵加進玩家錢包；`reissue_past_vip_rewards` 只有 `console.log`。
- **影響**：與問題 1/2 同性質——UI 完整但業務邏輯是空的，若不特別標註，容易被誤判為「已完成」。
- **建議**：與問題 1 一併規劃，獎勵發放應綁定在晉升判定引擎完成時一起設計。

### 問題 5：編輯 UI 拆成兩個獨立 Modal，操作路徑不直覺
- **現象**：「編輯」Modal（[VIPSettings.vue:284-387](../../src/views/VIPManagement/VIPSettings.vue)）只能改名稱/圖示/多語系文案，費率相關表單被整段註解掉並註明 `<!-- V1: Hide reward settings to keep them hardcoded -->`（[VIPSettings.vue:362-377](../../src/views/VIPManagement/VIPSettings.vue)）；門檻與費率反而要點另一個「設定」按鈕開別的 Modal（[VIPSettings.vue:390-488](../../src/views/VIPManagement/VIPSettings.vue)）才能改。且兩個 Modal 各自用獨立的 `reactive` 副本（`editingLevel` / `settingsLevel`）深拷貝同一筆資料。
- **影響**：這是一個小的 UX 割裂問題——使用者要改一個等級的完整資訊，必須記得「文案在編辑、費率在設定」這種非顯而易見的分工，容易漏改。兩份獨立 state 目前靠各自 `fetchVIPData()` 重抓資料規避掉同步問題，但增加了不必要的複雜度，之後加欄位時容易漏同步到其中一份。
- **建議**：若這是刻意的產品決策（例如費率屬於更敏感的操作、要單獨留操作記錄），建議記錄下來說明原因；若只是暫時的實作權宜，建議合併成一個表單或用分頁（Tab）取代兩個 Modal。

### 問題 6：VIPStats.vue 儀表板是純展示假資料，容易被誤認為真實洞察
- **現象**：分佈人數、晉升率、保級率、降級率、`settledDate`（[VIPStats.vue:27-69](../../src/views/DataCenter/VIPStats.vue)）全部是寫死常數，不是從玩家資料聚合出來的。
- **影響**：這頁做得很像一個「真的在跑」的營運分析儀表板（有 echarts 動畫、有結算日期），如果不特別註明，很容易被業主或營運人員誤以為是即時/正確的營運數據去做決策。
- **建議**：與整體專案的 mock 現況一致處理——上線前這類頁面應該有明顯的「示意資料」標示，或至少在對業主 demo 時口頭說明清楚。

### 問題 7：圖示/頭像框上傳打到寫死的外部第三方網址
- **現象**：`NUpload` 的 `action` 屬性寫死指向 `https://www.mocky.io/v2/5e4bafc63100007100d8b70f`（[VIPSettings.vue:306](../../src/views/VIPManagement/VIPSettings.vue)、[VIPSettings.vue:316](../../src/views/VIPManagement/VIPSettings.vue)），這是一個公開的第三方 mock API 服務。
- **影響**：這只是開發期間的占位設定，但如果上線前忘記替換成真實的檔案上傳端點，等於把後台上傳的圖片檔案送到一個不受控的外部服務，有資料外洩與服務穩定性風險。
- **建議**：列入上線前檢查清單，確認所有 `NUpload` 的 `action` 都已替換成正式後端端點。

## 6. 與整體專案脈絡的關聯

這些發現與先前整體分析報告（[2026-08-20-project-analysis.md](2026-08-20-project-analysis.md)）中「41 個 api 檔案裡只有 2 個真正打後端、其餘全靠 mock 陣列」的結論一致，VIP 模組是這個現象的一個具體案例，且因為涉及金流/玩家權益，落差比其他純展示型模組（如公告、SEO 文章管理）風險更高，建議優先排入「需要業主與工程共同定義業務規則」的清單。
