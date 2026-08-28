import { BonusCard, RolloverContainer } from './bonus'

export type PlayerStatus = 'ACTIVE' | 'LOCKED' | 'FROZEN' | 'SUSPENDED'
export type WalletType = 'CASH' | 'BONUS' | 'GAME' | 'SAFE' // 金幣 | 銀幣 | 銅幣 | 保險箱
export type PlayerTagType = 'SYSTEM' | 'CUSTOM'

export interface MemberTag {
    id: number
    name: string
    type: PlayerTagType
    remark: string
    status: 'ACTIVE' | 'INACTIVE'
    member_count: number // Mock
    is_system_default?: boolean // helper to block delete/rename
}

// Deprecated union, switching to string for dynamic tags
export type PlayerTag = string


export interface Wallet {
    type: WalletType
    currency: 'GOLD' | 'SILVER' | 'BRONZE'
    balance: number
    is_locked?: boolean // For SAFE
}

export interface Player {
    id: string
    username: string // 帳號
    display_name: string // 顯示名稱
    phone: string
    status: PlayerStatus
    tags: PlayerTag[]
    vip_level: number
    vip_historical_max_level?: number
    vip_lifetime_deposit?: number
    vip_lifetime_turnover?: number
    vip_current_month_deposit?: number
    vip_current_month_turnover?: number
    vip_current_month_active_days?: number
    vip_reward_claimed_levels?: number[]
    vip_monthly_protection?: boolean
    promo_code?: string // 推廣碼
    agent_id?: string // 歸屬代理 ID
    agent_name?: string // 代理帳號 (所屬)
    invite_code?: string // 邀請碼
    invited_by_code?: string // 註冊時所填寫的邀請碼
    rtp?: number // RPT (Return To Player)
    register_source: string // 註冊來源 (e.g., SEO, Admin_Manual)
    register_ip: string
    register_at: string
    last_login_at?: string
    last_login_ip?: string

    // Extended Profile
    gender?: 'MALE' | 'FEMALE' | 'UNKNOWN'
    birthday?: string
    email?: string
    is_retention_active?: boolean // 保級判定

    wallets: Wallet[]
    is_online: boolean

    // OPE-202 Bonus Engine
    bonus_queue?: BonusCard[]
    active_bonus_card?: BonusCard
    rollover_container?: RolloverContainer
    consecutive_check_in_days?: number

    // Permissions
    is_muted: string // 禁言 (NONE, 15M, 1H, 1D, PERMANENT)
    is_gift_disabled: boolean // 禁止贈禮
    is_deposit_disabled: boolean // 禁止儲值
    is_play_disabled: boolean // 禁止遊玩

    // Computed/Helper fields for UI
    total_assets?: number // Sum of CASH + SAFE
}

export interface PlayerSearchParams {
    search_type?: 'id' | 'username' | 'phone'
    q?: string // ID / Phone / Username
    affiliation_type?: 'invite_code' | 'promo_code'
    affiliation_query?: string
    status?: PlayerStatus
    tags?: PlayerTag[]
    register_date_start?: string
    register_date_end?: string
    promo_code?: string
    register_ip?: string
    page: number
    page_size: number
}

export interface PlayerAuditLog {
    id: string
    player_id: string
    operator: string
    action: string // 'UPDATE_STATUS', 'UPDATE_INFO', 'ABANDON_BONUS'
    old_value?: any
    new_value?: any
    reason: string
    created_at: string
}

export interface CreatePlayerRequest {
    username: string
    display_name: string
    password?: string // Optional, system generated if empty? Spec says fillable.
    phone?: string
    gender?: 'MALE' | 'FEMALE' | 'UNKNOWN'
    birthday?: string
    email?: string
    vip_level?: number
    reissue_past_vip_rewards?: boolean // Apply configured VIP rewards on admin-created player
    is_muted?: string
    is_gift_disabled?: boolean
    is_deposit_disabled?: boolean
    is_play_disabled?: boolean
    is_retention_active?: boolean
    promo_code?: string
    tags: PlayerTag[] // Usually ['TEST'] for admin created
}

export interface UpdatePlayerRequest {
    display_name?: string
    phone?: string
    password?: string
    tags?: PlayerTag[]
    vip_level?: number
    is_muted?: string
    is_gift_disabled?: boolean
    is_deposit_disabled?: boolean
    is_play_disabled?: boolean
    gender?: 'MALE' | 'FEMALE' | 'UNKNOWN'
    birthday?: string
    email?: string
    is_retention_active?: boolean
    reissue_past_vip_rewards?: boolean // Manual VIP promotion only
    vip_history_max_action?: 'SAVE' | 'DONT_SAVE' | 'CANCEL'
    vip_reward_action?: 'ISSUE' | 'NO_ISSUE' | 'CANCEL'
    vip_monthly_protection?: boolean
    vip_adjust_reason?: string
}
