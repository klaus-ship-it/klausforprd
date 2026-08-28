export interface VIPLevel {
    rank: number // VIP0 固定存在；VIP1 以上由營運新增，無上限
    name: string
    status?: 'ACTIVE' | 'INACTIVE'
    level_source?: 'DEFAULT' | 'OPERATOR_CREATED'
    updated_by?: string
    updated_at?: string
    promotion_desc: string // 文字說明 (fallback/default)
    retention_desc: string // 文字說明 (fallback/default)
    promotion_desc_zh_tw?: string
    promotion_desc_zh_cn?: string
    promotion_desc_en?: string
    retention_desc_zh_tw?: string
    retention_desc_zh_cn?: string
    retention_desc_en?: string

    // Promotion Criteria
    promo_deposit: number // 選填：歷史總儲值
    promo_turnover: number // 選填：當月總投注額（晉級判定用）
    promo_special?: string // 特殊晉升條件 (e.g. 綁定手機號碼)
    bind_data?: 'none' | 'phone' | 'email' | 'phone_email' // 綁定資料

    // First-time promotion reward
    upgrade_reward_currency?: 'SILVER' | 'BRONZE'
    upgrade_reward_amount?: number
    upgrade_reward_turnover_multiplier?: number // Silver reward only
    upgrade_reward_conversion_cap?: number // Silver reward only
    upgrade_reward_desc?: string // Default/fallback copy
    upgrade_reward_desc_zh_tw?: string
    upgrade_reward_desc_zh_cn?: string
    upgrade_reward_desc_en?: string

    // Retention Criteria
    is_perpetual: boolean // 無條件保級
    retain_deposit: number // 當月儲值（保級判定用）
    retain_turnover: number // 當月投注額（保級判定用）
    retain_active_days: number // 當月活躍天數（可啟用的保級判定條件）

    // Rewards
    gift_fee_rate: number // P2P贈禮手續費 %

    // Assets
    icon_url?: string
    avatar_frame_url?: string
}

export interface VIPGlobalConfig {
    demotion_limit_months: number // 全域 N，合法範圍 1-15
    settlement_timezone: 'SYSTEM'
    settlement_time: '00:00:00'
    updated_by?: string
    updated_at?: string
}

export interface VIPAuditLog {
    id: string
    player_id: string
    player_username: string
    old_level: number
    new_level: number
    action_type: 'AUTO_PROMOTE' | 'AUTO_DEMOTE' | 'RETAIN_SUCCESS' | 'MANUAL_ADJUST' | 'RESTORE' | 'UPGRADE_PROTECTED' | 'DEMOTION_LIMIT_REACHED'
    trigger_reason: string
    snapshot: {
        lifetime_deposit?: number
        month_deposit?: number
        month_turnover?: number
        month_active_days?: number
    }
    reward_result?: 'ISSUED' | 'NOT_ISSUED' | 'ALREADY_RECEIVED' | 'DEMOTION_NOT_APPLICABLE' | 'RETAIN_NOT_APPLICABLE' | 'NOT_APPLICABLE'
    operator: string
    remark?: string
    created_at: string
}
