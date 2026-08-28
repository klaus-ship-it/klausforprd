import { ApiResponse } from '@/types'

export interface AdjustmentRequest {
    playerId: string
    type: 'DEPOSIT' | 'WITHDRAW'
    walletType: 'CASH' | 'BONUS' | 'SAFE' | 'GAME'
    currency: 'GOLD' | 'SILVER' | 'BRONZE'
    amount: number
    reason: string
    note: string
    evidence?: File | null // In real app this might be a URL string after upload, but for mock we just handle object or string
    isRollover?: boolean
    rolloverMultiplier?: number
    playerName?: string
}

export interface AdjustmentRecord {
    id: string
    createdAt: string
    playerId: string
    playerName: string
    type: 'DEPOSIT' | 'WITHDRAW'
    walletType: 'CASH' | 'BONUS' | 'SAFE' | 'GAME'
    currency: 'GOLD' | 'SILVER' | 'BRONZE'
    amount: number
    reason: string
    note: string
}

export interface AdjustmentQuery {
    startAt?: number
    endAt?: number
    type?: 'DEPOSIT' | 'WITHDRAW'
    playerId?: string
}

// Mock reasons
export const ADJUSTMENT_REASONS = [
    { label: '活動獎勵 (Event Reward)', value: 'EVENT_REWARD' },
    { label: '系統補償 (System Compensation)', value: 'SYSTEM_COMPENSATION' },
    { label: '線下充值 (Offline Deposit)', value: 'OFFLINE_DEPOSIT' },
    { label: '錯誤扣回 (Correction/Rollback)', value: 'CORRECTION' },
    { label: '其他 (Other)', value: 'OTHER' }
]

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const adjustmentRecords: AdjustmentRecord[] = [
    { id: 'MA-10006', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), playerId: '100086', playerName: 'player_86', type: 'DEPOSIT', walletType: 'CASH', currency: 'GOLD', amount: 500, reason: 'EVENT_REWARD', note: '活動獎勵補發' },
    { id: 'MA-10005', createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(), playerId: '100128', playerName: 'player_128', type: 'WITHDRAW', walletType: 'SAFE', currency: 'GOLD', amount: 200, reason: 'CORRECTION', note: '人工更正扣點' },
    { id: 'MA-10004', createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), playerId: '100086', playerName: 'player_86', type: 'DEPOSIT', walletType: 'BONUS', currency: 'SILVER', amount: 88, reason: 'SYSTEM_COMPENSATION', note: '系統補償' },
    { id: 'MA-10003', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), playerId: '100256', playerName: 'player_256', type: 'DEPOSIT', walletType: 'GAME', currency: 'BRONZE', amount: 1000, reason: 'EVENT_REWARD', note: '遊戲活動獎勵' },
    { id: 'MA-10002', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), playerId: '100128', playerName: 'player_128', type: 'WITHDRAW', walletType: 'CASH', currency: 'SILVER', amount: 50, reason: 'CORRECTION', note: '重複入點扣回' },
    { id: 'MA-10001', createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), playerId: '100512', playerName: 'player_512', type: 'DEPOSIT', walletType: 'SAFE', currency: 'GOLD', amount: 300, reason: 'OFFLINE_DEPOSIT', note: '線下充值入帳' }
]

export const adjustmentApi = {
    async createAdjustment(data: AdjustmentRequest): Promise<ApiResponse<void>> {
        await delay(800) // Simulate network latency

        // Basic validation simulation
        if (data.amount <= 0) {
            return { code: 400, msg: '金額必須大於 0' }
        }

        if (data.reason === 'OFFLINE_DEPOSIT' && !data.evidence) {
            return { code: 400, msg: '線下充值必須上傳憑證' }
        }

        adjustmentRecords.unshift({
            id: `MA-${String(10000 + adjustmentRecords.length + 1).padStart(5, '0')}`,
            createdAt: new Date().toISOString(),
            playerId: data.playerId,
            playerName: data.playerName || data.playerId,
            type: data.type,
            walletType: data.walletType,
            currency: data.currency,
            amount: data.amount,
            reason: data.reason,
            note: data.note
        })
        return { code: 0, msg: 'success' }
    },

    async getAdjustments(query: AdjustmentQuery): Promise<ApiResponse<{ list: AdjustmentRecord[], total: number }>> {
        await delay(300)
        const list = adjustmentRecords.filter(record => {
            const createdAt = new Date(record.createdAt).getTime()
            return (!query.startAt || createdAt >= query.startAt)
                && (!query.endAt || createdAt <= query.endAt)
                && (!query.type || record.type === query.type)
                && (!query.playerId || record.playerId.includes(query.playerId))
        })
        return { code: 0, msg: 'success', data: { list, total: list.length } }
    },

    async getReasons(): Promise<ApiResponse<{ label: string, value: string }[]>> {
        await delay(200)
        return { code: 0, msg: 'success', data: ADJUSTMENT_REASONS }
    }
}
