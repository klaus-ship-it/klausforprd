import { VIPAuditLog, VIPGlobalConfig, VIPLevel } from '../types/vip'

// V3 不預先建立 VIP0～VIP15 的營運設定。VIP0 是系統固定基礎等級，
// VIP1 以上由營運新增，設定完成後再啟用，且新增數量不設上限。
const mockVIPLevels: VIPLevel[] = [
    {
        rank: 0,
        name: 'VIP0',
        status: 'ACTIVE',
        level_source: 'DEFAULT',
        promotion_desc: '系統基礎等級',
        retention_desc: '無條件保留',
        promo_deposit: 0,
        promo_turnover: 0,
        bind_data: 'none',
        is_perpetual: true,
        retention_deadline: null,
        retain_deposit: 0,
        retain_turnover: 0,
        retain_active_days: 0,
        gift_fee_rate: 0
    }
]

const mockVIPConfig: VIPGlobalConfig = {
    demotion_limit_months: 6,
    settlement_timezone: 'SYSTEM',
    settlement_time: '00:00:00',
    updated_by: 'system',
    updated_at: new Date().toISOString()
}

const mockVIPAuditLogs: VIPAuditLog[] = [
    {
        id: 'VIP-AUDIT-001', player_id: 'P10001', player_username: 'user_10001', old_level: 1, new_level: 3,
        action_type: 'MANUAL_ADJUST', trigger_reason: '營運補償調整',
        snapshot: { lifetime_deposit: 3000, month_deposit: 500, month_turnover: 5000, month_active_days: 4 },
        reward_result: 'ISSUED', operator: 'operator_demo', remark: 'VIP 手動調整，當月保級', created_at: new Date().toISOString()
    },
    {
        id: 'VIP-AUDIT-002', player_id: 'P10002', player_username: 'user_10002', old_level: 3, new_level: 4,
        action_type: 'AUTO_PROMOTE', trigger_reason: '歷史總儲值、當月總投注額與手機綁定條件達成',
        snapshot: { lifetime_deposit: 12000, month_deposit: 3000, month_turnover: 30000, month_active_days: 10 },
        reward_result: 'ISSUED', operator: 'SYSTEM', created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
        id: 'VIP-AUDIT-003', player_id: 'P10003', player_username: 'user_10003', old_level: 5, new_level: 4,
        action_type: 'AUTO_DEMOTE', trigger_reason: '每月 1 日保級條件未達成',
        snapshot: { lifetime_deposit: 22000, month_deposit: 400, month_turnover: 2000, month_active_days: 2 },
        reward_result: 'DEMOTION_NOT_APPLICABLE', operator: 'SYSTEM', created_at: new Date(Date.now() - 172800000).toISOString()
    }
]

export const vipApi = {
    getVIPLevels: async () => ({ code: 0, data: mockVIPLevels.map(level => ({ ...level })), msg: 'success' }),

    updateVIPLevel: async (level: VIPLevel) => {
        const index = mockVIPLevels.findIndex(item => item.rank === level.rank)
        if (index === -1) return { code: 404, msg: 'VIP 等級不存在' }
        mockVIPLevels[index] = {
            ...mockVIPLevels[index],
            ...level,
            updated_by: 'operator_demo',
            updated_at: new Date().toISOString()
        }
        return { code: 0, msg: 'success' }
    },

    createVIPLevel: async (level: VIPLevel) => {
        if (mockVIPLevels.some(item => item.rank === level.rank)) return { code: 409, msg: '等級排序重複' }
        const created: VIPLevel = {
            ...level,
            status: 'INACTIVE',
            level_source: 'OPERATOR_CREATED',
            updated_by: 'operator_demo',
            updated_at: new Date().toISOString()
        }
        mockVIPLevels.push(created)
        mockVIPLevels.sort((a, b) => a.rank - b.rank)
        return { code: 0, msg: 'success', data: { ...created } }
    },

    toggleVIPLevel: async (rank: number, status: 'ACTIVE' | 'INACTIVE') => {
        const level = mockVIPLevels.find(item => item.rank === rank)
        if (!level) return { code: 404, msg: 'VIP 等級不存在' }
        level.status = status
        level.updated_by = 'operator_demo'
        level.updated_at = new Date().toISOString()
        return { code: 0, msg: 'success' }
    },

    getVIPConfig: async () => ({ code: 0, data: { ...mockVIPConfig }, msg: 'success' }),

    updateVIPConfig: async (config: Partial<VIPGlobalConfig>) => {
        const next = config.demotion_limit_months
        if (next !== undefined && (next < 1 || next > 15)) return { code: 400, msg: 'N 必須介於 1 到 15' }
        Object.assign(mockVIPConfig, config, {
            settlement_timezone: 'SYSTEM',
            settlement_time: '00:00:00',
            updated_by: 'operator_demo',
            updated_at: new Date().toISOString()
        })
        return { code: 0, msg: 'success' }
    },

    getVIPAuditLogs: async (keyword = '') => {
        const q = keyword.trim().toLowerCase()
        const data = q
            ? mockVIPAuditLogs.filter(log => log.player_username.toLowerCase().includes(q) || log.player_id.toLowerCase().includes(q))
            : mockVIPAuditLogs
        return { code: 0, data: [...data], msg: 'success' }
    }
}
