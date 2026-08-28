export enum BonusCurrency {
    SILVER = 'SILVER'
}

export enum ContainerStatus {
    IDLE = 'IDLE',
    ACTIVE = 'ACTIVE'
}

export interface BonusCard {
    id: string
    currency: BonusCurrency
    start_amount: number
    lave_amount: number
    multiplier: number
    target_current: number
    current_wagering?: number
    cap: number
    end_time: string
    created_at: string
    status?: 'PENDING' | 'ACTIVE' | 'DISABLED'
}

export interface RolloverContainer {
    status: ContainerStatus
    active_card_id?: string
    start_balance: number
    lave_balance: number // Current Bonus Wallet Balance
    current_wagering: number
    target_wagering: number
    cap: number
}

export interface BonusHistoryEvent {
    time: string
    action: string
    detail: string
}

export interface BonusHistoryLog {
    id: string
    card_id: string
    player_id: string
    type: string
    start_amount: number
    current_wagering: number
    target_wagering: number
    cap: number
    lave_balance: number
    realized_amount: number
    status: 'ACTIVE' | 'SUCCESS' | 'FAIL'
    fail_reason?: string
    create_time: string
    settle_time?: string
    currency: BonusCurrency
    events: BonusHistoryEvent[]
}

export interface BonusHistorySearchParams {
    card_id?: string
    search_type?: 'id' | 'username' | 'phone'
    q?: string // Player search query
    status?: string
    date_start?: string
    date_end?: string
    page: number
    page_size: number
}
