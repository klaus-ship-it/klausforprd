import { BonusHistoryLog, BonusHistorySearchParams, BonusCurrency } from '@/types/bonus'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Mock history data
const mockHistory: BonusHistoryLog[] = [
    {
        id: 'HIST_001',
        card_id: 'CARD_SUCCESS_001',
        player_id: 'P10001',
        type: 'RECHARGE_BONUS',
        start_amount: 500,
        current_wagering: 2500,
        target_wagering: 2500,
        cap: 500,
        lave_balance: 700,
        realized_amount: 500,
        status: 'SUCCESS',
        create_time: '2026-01-25T10:00:00Z',
        settle_time: '2026-01-25T14:30:00Z',
        currency: BonusCurrency.SILVER,
        events: [
            { time: '2026-01-25T10:00:00Z', action: 'CREATED', detail: 'Card generated from recharge bonus' },
            { time: '2026-01-25T10:05:00Z', action: 'ACTIVATED', detail: 'Player claimed and activated' },
            { time: '2026-01-25T14:30:00Z', action: 'SETTLED', detail: 'Wagering completed: 2500/2500. Transferred 500 (Cap limit), Burned overflow: 200' }
        ]
    },
    {
        id: 'HIST_002',
        card_id: 'CARD_EXPIRE_001',
        player_id: 'P10002',
        type: 'GIFT_CODE',
        start_amount: 200,
        current_wagering: 0,
        target_wagering: 1000,
        cap: 200,
        lave_balance: 200,
        realized_amount: 0,
        status: 'FAIL',
        fail_reason: '已過期 (Expired)',
        create_time: '2026-01-20T08:00:00Z',
        settle_time: '2026-01-27T08:00:00Z',
        currency: BonusCurrency.SILVER,
        events: [
            { time: '2026-01-20T08:00:00Z', action: 'CREATED', detail: 'Card generated from gift code redemption' },
            { time: '2026-01-27T08:00:00Z', action: 'EXPIRED', detail: 'Card expired in queue without being claimed' }
        ]
    },
    {
        id: 'HIST_003',
        card_id: 'CARD_ABANDON_001',
        player_id: 'P10003',
        type: 'MANUAL',
        start_amount: 300,
        current_wagering: 450,
        target_wagering: 1500,
        cap: 300,
        lave_balance: 180,
        realized_amount: 0,
        status: 'FAIL',
        fail_reason: '玩家手動放棄 (Player Abandoned)',
        create_time: '2026-01-28T12:00:00Z',
        settle_time: '2026-01-28T18:00:00Z',
        currency: BonusCurrency.SILVER,
        events: [
            { time: '2026-01-28T12:00:00Z', action: 'CREATED', detail: 'Manually issued by admin' },
            { time: '2026-01-28T12:10:00Z', action: 'ACTIVATED', detail: 'Player claimed' },
            { time: '2026-01-28T18:00:00Z', action: 'ABANDONED', detail: 'Player manually abandoned the card. Wagering progress: 450/1500' }
        ]
    },
    {
        id: 'HIST_004',
        card_id: 'CARD_BANKRUPT_001',
        player_id: 'P10004',
        type: 'RECHARGE_BONUS',
        start_amount: 100,
        current_wagering: 120,
        target_wagering: 500,
        cap: 100,
        lave_balance: 0,
        realized_amount: 0,
        status: 'FAIL',
        fail_reason: '餘額不足/破產歸零 (Bankruptcy)',
        create_time: '2026-01-29T09:00:00Z',
        settle_time: '2026-01-29T10:30:00Z',
        currency: BonusCurrency.SILVER,
        events: [
            { time: '2026-01-29T09:00:00Z', action: 'CREATED', detail: 'Card generated' },
            { time: '2026-01-29T09:05:00Z', action: 'ACTIVATED', detail: 'Player claimed' },
            { time: '2026-01-29T10:30:00Z', action: 'BANKRUPTED', detail: 'Bonus wallet balance dropped below 1. Wagering: 120/500. Protection triggered.' }
        ]
    },
    {
        id: 'HIST_005',
        card_id: 'CARD_ACTIVE_001',
        player_id: 'P10005',
        type: 'RECHARGE_BONUS',
        start_amount: 400,
        current_wagering: 800,
        target_wagering: 2000,
        cap: 400,
        lave_balance: 350,
        realized_amount: 0,
        status: 'ACTIVE',
        create_time: '2026-01-29T14:00:00Z',
        currency: BonusCurrency.SILVER,
        events: [
            { time: '2026-01-29T14:00:00Z', action: 'CREATED', detail: 'Card generated' },
            { time: '2026-01-29T14:05:00Z', action: 'ACTIVATED', detail: 'Player claimed and started wagering' }
        ]
    }
]

export const bonusHistoryApi = {
    getHistory: async (params: BonusHistorySearchParams): Promise<{ code: number; msg: string; data: { list: BonusHistoryLog[]; total: number } }> => {
        await delay(300)

        let logs = [...mockHistory]

        // Filtering
        if (params.card_id) {
            logs = logs.filter(l => l.card_id.includes(params.card_id!))
        }
        if (params.player_id) {
            logs = logs.filter(l => l.player_id.includes(params.player_id!))
        }
        if (params.status) {
            logs = logs.filter(l => l.status === params.status)
        }
        if (params.date_start && params.date_end) {
            const start = new Date(params.date_start).getTime()
            const end = new Date(params.date_end).getTime()
            logs = logs.filter(l => {
                const t = new Date(l.create_time).getTime()
                return t >= start && t <= end
            })
        }

        const total = logs.length
        const start = (params.page - 1) * params.page_size
        const end = start + params.page_size
        const list = logs.slice(start, end)

        return {
            code: 0,
            msg: 'success',
            data: { list, total }
        }
    }
}
