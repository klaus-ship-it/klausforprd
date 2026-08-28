export type GameReportStatus = 'SETTLED' | 'void' | 'PENDING'

export interface GameLog {
    id: string // UID
    provider_id: string // PG, JILI, EVO
    provider_round_id: string // External ID
    game_name: string
    player_id: string
    bet_amount: number
    win_amount: number
    net_amount: number
    valid_turnover: number
    settle_time: string // ISO
    create_time: string // ISO
    status: GameReportStatus
    raw_json: string // JSON string
    currency: string
}

export interface GameSearchParams {
    player_id?: string
    provider?: string
    game_name?: string
    round_id?: string // provider_round_id
    date_start?: string
    date_end?: string
    currency?: string
    page: number
    page_size: number
}

export type ProviderType = 'SLOT' | 'LIVE' | 'SPORTS' | 'LOTTERY' | 'CARD'
export type ProviderStatus = 'ACTIVE' | 'DISABLED' | 'MAINTENANCE'
export type WalletSupport = 'CASH' | 'BONUS' | 'DUAL'

export interface GameProvider {
    id: string
    code: string
    name: string
    type: ProviderType
    status: ProviderStatus
    sort_order: number
    wallet_support: WalletSupport
    last_operator: string
    updated_at: string
    current_players: number
    total_bet: number
    total_payout: number
}

export interface ProviderSearchParams {
    code?: string
    type?: ProviderType
    status?: ProviderStatus
    date_start?: string
    date_end?: string
}

export interface ProviderUpdateRequest {
    status?: ProviderStatus
    sort_order?: number
    reason: string
}

export type MarketingTag = 'HOT' | 'RECOMMENDED' | 'DOUBLE_TURNOVER'
export type TagSource = 'AUTO' | 'MANUAL'
export type GameStatus = 'ACTIVE' | 'DISABLED' | 'MAINTENANCE' | 'UNPUBLISHED' | 'SOURCE_MISSING'

export interface ThirdPartyGame {
    provider_game_id: string
    name: string
    name_en: string
    provider_id: string
    type_id: string
}

export interface Game {
    id: string
    provider_id: string
    provider_game_id: string
    type_id: string
    name: string
    name_en: string
    cumulative_turnover: number
    marketing_tag: MarketingTag | null
    tag_source: TagSource
    type_rate: number
    tag_rate: number
    final_rate: number
    allowed_currencies: string[]
    min_vip_level: number
    min_seat_vip_level: number
    image_url: string | null
    sort_order: number
    status: GameStatus
    updated_at: string
    total_bet: number
    total_payout: number
    profit_rate: number
}

export interface GameListSearchParams {
    provider_id?: string
    type_id?: string
    game_id?: string
    name?: string
    status?: GameStatus
    marketing_tag?: MarketingTag | null
    tag_source?: TagSource
    date_start?: string
    date_end?: string
    currency?: string
    page: number
    page_size: number
}

export interface GameUpdateRequest {
    marketing_tag?: MarketingTag | null
    allowed_currencies?: string[]
    min_vip_level?: number
    min_seat_vip_level?: number
    image_url?: string | null
    sort_order?: number
    status?: GameStatus
    final_rate?: number
    profit_rate?: number
}


// OPE-303: Tag and Type Configuration
export type TagType = 'SYSTEM' | 'CUSTOM'
export type TagConfigStatus = 'ACTIVE' | 'DISABLED'

export interface GameType {
    id: string
    name: string
    code: string
    rate: number
    updated_at: string
}

export interface MarketingTagConfig {
    id: string
    name: string
    tag_type: TagType
    has_rate: boolean
    rate: number
    status: TagConfigStatus
    description: string
    games_using: number
    created_at: string
    updated_at: string
}

export interface GameTypeUpdateRequest {
    rate: number
}

export interface MarketingTagCreateRequest {
    name: string
    has_rate: boolean
    rate?: number
    description: string
}

export interface MarketingTagUpdateRequest {
    name?: string
    has_rate?: boolean
    rate?: number
    status?: TagConfigStatus
    description?: string
}

// Game Copywriting (multi-language)
export interface GameCopywritingLocale {
    game_name: string           // 遊戲在前台顯示的名稱
    game_introduce: string      // 簡短遊戲介紹(短文)
    game_volatility: string     // 波動性，例如：中高
    high_hit: string            // 最大倍率，例如：3000倍
    game_details: string        // 遊戲介紹詳情(長文)
}

export interface GameCopywriting {
    game_id: string
    lang_type: string[]                                    // 遊戲內提供的多語系種類
    game_banners: string[]                                 // 遊戲示範圖片 url 陣列（CDN）
    locales: Record<string, GameCopywritingLocale>          // key = lang code (e.g. 'zh-TW', 'en')
}
