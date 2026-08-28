export type PromoModuleType = 'REGISTER' | 'DEPOSIT' | 'TURNOVER'

export interface PromoReward {
    gold?: number
    silver?: number
    copper?: number
}

export interface PromoModule {
    id: string
    type: PromoModuleType
    // REGISTER specific
    require_invite_code?: boolean
    invite_code?: string
    // DEPOSIT & TURNOVER specific
    target_amount?: number
    is_repeatable?: boolean
    
    // Module level dual-track rewards
    completer_reward?: PromoReward
    inviter_reward?: PromoReward
}

export interface PromoEvent {
    id: string
    title: string
    start_time: string
    end_time: string
    is_sequential: boolean
    modules: PromoModule[]
    // Final dual-track rewards
    final_completer_reward?: PromoReward
    final_inviter_reward?: PromoReward
    status: 'ACTIVE' | 'INACTIVE' | 'SCHEDULED' | 'EXPIRED'
    created_at: string
}
