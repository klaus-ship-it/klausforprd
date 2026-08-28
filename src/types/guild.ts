export interface Guild {
    id: string
    name: string
    leader_id: string
    member_count: number
    total_turnover: number
    level: number
    created_at: string
    status: 'NORMAL' | 'DISSOLVED' | 'MUTED'
}

export interface GuildGlobalConfig {
    creation_cost: number
    creation_level_threshold: number
    fee_reduction_percentage: number
}

export interface GuildQuery {
    guild_id_or_name?: string
    leader_id?: string
    page: number
    pageSize: number
}

export interface GuildMember {
    player_id: string
    username: string
    rank: 'LEADER' | 'ELDER' | 'MEMBER'
    join_time: string
    total_contribution: number
    last_active: string
}
