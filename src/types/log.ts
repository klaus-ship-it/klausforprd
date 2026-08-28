export type AssetLogChangeType = 'BET' | 'WIN' | 'CLAIM' | 'UNLOCK' | 'WIPE' | 'EXCHANGE' | 'P2P_OUT' | 'P2P_IN' | 'DEPOSIT' | 'WITHDRAW'

export interface AssetLog {
    log_id: string
    timestamp: string
    player_id: string
    username: string
    currency: 'GOLD' | 'SILVER' | 'BRONZE'
    wallet_type: 'CASH' | 'BONUS' | 'SAFE' | 'GAME'
    change_type: AssetLogChangeType
    amount: number
    post_balance: number
    valid_turnover: number
    remain_target: number
    related_id?: string
}

export interface LogSearchParams {
    player_id?: string
    currency?: string
    change_type?: string
    date_start?: string
    date_end?: string
    page: number
    page_size: number
}
