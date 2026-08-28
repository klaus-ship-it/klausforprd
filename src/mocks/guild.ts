import { Guild, GuildGlobalConfig } from '@/types/guild'

export const mockGuildGlobalConfig: GuildGlobalConfig = {
    creation_cost: 1000,
    creation_level_threshold: 5,
    fee_reduction_percentage: 2
}

export const mockGuilds: Guild[] = [
    {
        id: 'G001',
        name: '星際第一軍團',
        leader_id: 'P9901',
        member_count: 156,
        total_turnover: 1568800.50,
        level: 5,
        created_at: '2025-10-01T10:00:00Z',
        status: 'NORMAL'
    },
    {
        id: 'G002',
        name: '暗黑騎士團',
        leader_id: 'P8722',
        member_count: 85,
        total_turnover: 987600.00,
        level: 3,
        created_at: '2025-11-15T14:30:00Z',
        status: 'NORMAL'
    },
    {
        id: 'G003',
        name: '作弊測試公會',
        leader_id: 'P0001',
        member_count: 5,
        total_turnover: 1200.00,
        level: 1,
        created_at: '2026-01-20T09:15:00Z',
        status: 'MUTED'
    }
]
