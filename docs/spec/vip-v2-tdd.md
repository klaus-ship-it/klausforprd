# VIP 機制 v2 — 技術設計文件（TDD）

- 版本：v2.0-draft
- 日期：2026-08-20
- 狀態：**草案，待業務規格書 [vip-v2-spec.md](vip-v2-spec.md) 確認後定案**
- 適用對象：前後端工程師
- 對應業務規格書：[docs/spec/vip-v2-spec.md](vip-v2-spec.md)（業務規則、欄位說明、驗收標準都在那份，這裡只談技術實作）
- 決策依據：[docs/decisions/2026-08-20-vip-mechanism-redesign.md](../decisions/2026-08-20-vip-mechanism-redesign.md)
- 現況落差對照：[docs/analysis/2026-08-20-vip-spec-vs-implementation.md](../analysis/2026-08-20-vip-spec-vs-implementation.md)
- 門檻數值模型與驗證：[docs/decisions/vip_threshold_model.py](../decisions/vip_threshold_model.py)、[輸出結果](../decisions/vip_threshold_model_output.json)

---

## 1. 範圍與邊界

這份 TDD 涵蓋 OPE-1002（等級配置）、OPE-1003（統計分析）、OPE-1004（升降級稽核）三個模組的資料模型與邏輯設計。

**本專案（`Yota_operations_main`）目前只有純前端 admin 後台，沒有後端、沒有排程系統。** 以下標示為「批次/排程」的邏輯（3.2 保級結算、快照同步）在真正上線前需要後端團隊實作對應的資料庫與排程服務；本專案這一輪原型只會：
1. 更新前端型別定義，反映完整資料模型
2. 更新 `VIPSettings.vue` 等既有畫面，補齊業務規格書列出的欄位與檢核
3. 用符合新資料結構的 mock 資料展示畫面骨架
4. **不會**實作真正會執行的月結批次或快照同步（這需要後端排期，見決策紀錄「尚待討論」段落）

---

## 2. 資料模型

### 2.1 `VIPLevel`（取代 [src/types/vip.ts](../../src/types/vip.ts) 全部內容）

```typescript
export type VIPLevelStatus = 'ACTIVE' | 'INACTIVE'
export type UpgradeRewardCurrency = 'BRONZE' | 'SILVER'

export interface VIPLevel {
    rank: number // 0-15，唯一，不可重複，數字越大等級越高
    name: string
    status: VIPLevelStatus
    icon_url?: string
    avatar_frame_url?: string

    // 晉升條件（終生累積）
    promo_deposit: number
    promo_turnover: number

    // 保級條件（當月累積）
    is_perpetual: boolean
    retain_deposit: number
    retain_turnover: number
    retain_active_days: number

    // 一次性升級獎勵（透過 BonusCard 發放）
    upgrade_reward_currency?: UpgradeRewardCurrency
    upgrade_reward_amount?: number
    upgrade_reward_turnover_multiplier?: number // 僅 SILVER，預設 1
    upgrade_reward_conversion_cap?: number      // 僅 SILVER，預設 = amount

    // 權益
    gift_fee_rate: number
    rebate_rate: number

    // 文案（三語系）
    promotion_desc: string
    retention_desc: string
    promotion_desc_zh_tw?: string; promotion_desc_zh_cn?: string; promotion_desc_en?: string
    retention_desc_zh_tw?: string; retention_desc_zh_cn?: string; retention_desc_en?: string

    // 稽核
    updated_by: string
    updated_at: string // ISO datetime
}
```

**與現行 [src/types/vip.ts](../../src/types/vip.ts) 的差異**：
- 新增 `status`、`updated_by`、`updated_at`
- 移除 `promo_special`、`bind_data`（業務規格書 §5 已說明拿掉特殊晉升條件的理由）

### 2.2 `Player` 新增欄位

追加於 [src/types/player.ts](../../src/types/player.ts) 的 `Player` interface：

```typescript
vip_lifetime_deposit: number
vip_lifetime_turnover: number
vip_current_month_deposit: number
vip_current_month_turnover: number
vip_current_month_active_days: number
vip_historical_max_level: number
vip_retention_grace: boolean
vip_reward_claimed_levels: number[]
```

字碼與業務規格書「名詞解釋」的對應：`vip_lifetime_*` = 終生累積、`vip_current_month_*` = 當月累積、`vip_historical_max_level` = 歷史最高等級、`vip_retention_grace` = 是否在保護期、`vip_reward_claimed_levels` = 已領過一次性獎勵的等級清單（防重複領獎判斷）。

### 2.3 `VIPAuditLog`（新增型別，對應 OPE-1004）

```typescript
export type VIPAuditActionType = 'AUTO_PROMOTE' | 'AUTO_DEMOTE' | 'RETAIN_SUCCESS' | 'MANUAL_ADJUST'

export interface VIPAuditLog {
    id: string
    player_id: string
    player_username: string
    old_level: number
    new_level: number
    action_type: VIPAuditActionType
    trigger_reason: string
    snapshot: {
        lifetime_deposit: number
        lifetime_turnover: number
        month_deposit: number
        month_turnover: number
        month_active_days: number
    }
    reward_reissued: boolean
    operator: string // 'SYSTEM' 或管理員帳號
    remark?: string  // 手動調整時必填
    created_at: string
}
```

### 2.4 `vipApi` 擴充（[src/api/vip.ts](../../src/api/vip.ts)）

```typescript
export const vipApi = {
    getVIPLevels: async (): Promise<ApiResponse<VIPLevel[]>> => { ... },
    updateVIPLevel: async (level: VIPLevel): Promise<ApiResponse<void>> => {
        // 需新增：儲存前檢查 rank 唯一性（目前完全沒有檢查，見落差報告問題7）
        // 需新增：寫入 updated_by / updated_at
    },
    getVIPAuditLogs: async (params: { player_id?: string }): Promise<ApiResponse<PaginatedResponse<VIPAuditLog>>> => {
        // 新增 API，OPE-1004 用
    }
}
```

---

## 3. 業務邏輯（供工程實作參考的演算法描述，非最終程式碼）

### 3.1 晉升判斷

```
function checkPromotion(player):
    current = player.vip_level
    target = current
    for level in VIPLevels where level.rank > current, sorted by rank ascending:
        if player.vip_lifetime_deposit >= level.promo_deposit
           and player.vip_lifetime_turnover >= level.promo_turnover:
            target = level.rank
        else:
            break  // 門檻沒過就不用再往上檢查

    if target > current:
        player.vip_level = target
        if target > player.vip_historical_max_level:
            player.vip_historical_max_level = target
        player.vip_retention_grace = true

        for rank in current+1 .. target:
            if rank not in player.vip_reward_claimed_levels:
                issueUpgradeReward(player, VIPLevels[rank])  // 透過 BonusCard/RolloverEngine 發放
                player.vip_reward_claimed_levels.push(rank)

        writeAuditLog(player, old=current, new=target, action='AUTO_PROMOTE', ...)
```

### 3.2 保級/降級結算（月底批次）

```
function monthlySettlement(player):
    level = VIPLevels[player.vip_level]

    if player.vip_retention_grace:
        player.vip_retention_grace = false
        // 等級不變，本月跳過考核
        return

    if level.is_perpetual:
        return  // VIP0~2，永不降級

    achieved = player.vip_current_month_deposit >= level.retain_deposit
           and player.vip_current_month_turnover >= level.retain_turnover
           and player.vip_current_month_active_days >= level.retain_active_days

    if achieved:
        writeAuditLog(player, action='RETAIN_SUCCESS', ...)
    else:
        old = player.vip_level
        player.vip_level = max(0, old - 1)  // 固定降 1 級，不影響 lifetime/historical_max
        writeAuditLog(player, old=old, new=player.vip_level, action='AUTO_DEMOTE', snapshot=當月數據, ...)

    // 月結束後歸零
    player.vip_current_month_deposit = 0
    player.vip_current_month_turnover = 0
    player.vip_current_month_active_days = 0
```

### 3.3 手動調級

```
function manualAdjust(player, targetLevel, reason, reissueReward, operator):
    require reason is not empty  // 前端表單需擋空值

    old = player.vip_level
    player.vip_level = targetLevel
    player.vip_historical_max_level = max(player.vip_historical_max_level, targetLevel)
    // 不修改 vip_lifetime_deposit / vip_lifetime_turnover

    if reissueReward:
        for rank in old+1 .. targetLevel:  // 僅處理往上調的情況
            if rank not in player.vip_reward_claimed_levels:
                issueUpgradeReward(player, VIPLevels[rank])
                player.vip_reward_claimed_levels.push(rank)

    writeAuditLog(player, old=old, new=targetLevel, action='MANUAL_ADJUST',
                  operator=operator, remark=reason, reward_reissued=reissueReward, ...)
```

---

## 4. 前端原型改動範圍（這一輪，純設定介面，不含批次邏輯）

| 檔案 | 改動內容 |
|---|---|
| [src/types/vip.ts](../../src/types/vip.ts) | 依 §2.1 重寫 `VIPLevel`，移除 `promo_special`/`bind_data` |
| [src/types/player.ts](../../src/types/player.ts) | 依 §2.2 新增欄位 |
| 新增 `src/types/vipAudit.ts` | 依 §2.3 定義 `VIPAuditLog` |
| [src/api/vip.ts](../../src/api/vip.ts) | 依 §2.4 補上 rank 唯一性檢查、`updated_by`/`updated_at` 寫入、新增 `getVIPAuditLogs` |
| [src/views/VIPManagement/VIPSettings.vue](../../src/views/VIPManagement/VIPSettings.vue) | 補狀態欄位、排序唯一性檢查提示、最後編輯者/時間顯示、`NUpload` 加上 `accept` 與 5MB 大小限制、移除 `bind_data` 表單、移除「V1 隱藏」的獎勵欄位並改為完整可編輯 |
| 新增 `src/views/VIPManagement/VIPAuditLog.vue` | OPE-1004 稽核日誌列表頁，欄位對照業務規格書 §4.3 |
| [src/views/DataCenter/VIPStats.vue](../../src/views/DataCenter/VIPStats.vue) | 補「分母為 0 顯示 N/A」防呆、補「編輯」跳轉到 VIPSettings 對應等級；統計數字本輪仍為靜態假資料（無真正月結引擎），需在頁面加註明顯的示意資料標示 |
| [src/views/Master/PlayerDetail.vue](../../src/views/Master/PlayerDetail.vue) | 手動調級彈窗加上必填異動原因欄位、是否補發跨級獎勵選項，串接寫入 `VIPAuditLog`（mock 層級） |
| [src/router/index.ts](../../src/router/index.ts) | 新增 VIP 稽核日誌頁面路由 |

## 5. 已知的技術債與待後端排期項目

以下項目需要真正的後端（資料庫 + 排程系統）才能實作，本輪原型只做資料結構與畫面，不做真正會執行的邏輯：

- 每小時同步玩家終生累積數據的快照機制
- 月底自動結算批次（3.2 節邏輯目前只存在於本文件的虛擬碼，尚未有任何排程觸發它）
- `RolloverEngine`（[src/mocks/engine.ts](../../src/mocks/engine.ts)）目前完全沒有串接 VIP 相關欄位（`gift_fee_rate`、`rebate_rate`），若要讓 P2P 手續費折扣與投注返水真正生效，需要在該引擎的 `p2pTransfer()`、`processBet()`/`processWin()` 中加入查表邏輯
