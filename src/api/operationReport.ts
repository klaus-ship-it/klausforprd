import { ApiResponse } from '@/types'
import {
    OperationReportQuery,
    GGRReportRecord,
    DepositReportRecord,
    PlayerActivityRecord,
    ActivityBonusRecord,
    Granularity
} from '@/types/operationReport'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const SIMULATE_DELAY = 600

// Generate mock dates based on range
const getMockDates = (start: number, end: number, granularity: Granularity) => {
    const dates = [];
    const startD = new Date(start)
    const endD = new Date(end)

    if (granularity === 'hour') {
        const diffHours = Math.floor((end - start) / (3600 * 1000))
        const count = Math.max(1, diffHours)
        for (let i = 0; i <= count; i++) {
            const d = new Date(start + i * 3600 * 1000)
            dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`)
        }
    } else {
        const count = granularity === 'day' ? 7 : 6; // Default counts if not specified
        const diff = (endD.getTime() - startD.getTime()) / (count - 1 > 0 ? count - 1 : 1)

        for (let i = 0; i < count; i++) {
            const d = new Date(startD.getTime() + diff * i)
            if (granularity === 'month') {
                dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
            } else {
                dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
            }
        }
    }
    return dates;
}

export const operationReportApi = {
    async getGGRReport(params: OperationReportQuery): Promise<ApiResponse<GGRReportRecord[]>> {
        await delay(SIMULATE_DELAY)
        const dates = getMockDates(params.startTime, params.endTime, params.granularity)

        const mockData: GGRReportRecord[] = dates.map(date => {
            const bet = Math.floor(Math.random() * 100000) + 10000
            const rolling = bet * (Math.random() * 0.1 + 0.85) // 85-95% rolling
            const payout = Math.floor(bet * (Math.random() * 0.4 + 0.5)) // 50-90% payout

            return {
                date,
                playerId: params.targetType === 'player' ? params.targetId : 'P' + Math.floor(Math.random() * 1000000),
                currency: 'USD',
                betAmount: bet,
                rollingAmount: Math.floor(rolling),
                payoutAmount: payout,
                ggr: bet - payout,
                betCount: Math.floor(bet / (Math.random() * 50 + 10)),
                maxBet: Math.floor(Math.random() * 5000) + 500,
                maxWinRate: Number((Math.random() * 50 + 2).toFixed(2))
            }
        })

        return { code: 0, msg: 'success', data: mockData }
    },

    async getDepositReport(params: OperationReportQuery): Promise<ApiResponse<DepositReportRecord[]>> {
        await delay(SIMULATE_DELAY)
        const dates = getMockDates(params.startTime, params.endTime, params.granularity)

        const mockData: DepositReportRecord[] = dates.map(date => {
            const count = Math.floor(Math.random() * 500) + 50
            const total = count * (Math.floor(Math.random() * 500) + 100)
            
            // Mock channel breakdown
            const bankAmount = Math.floor(total * 0.6)
            const usdtAmount = Math.floor(total * 0.3)
            const otherAmount = total - bankAmount - usdtAmount

            return {
                date,
                playerId: params.targetType === 'player' ? params.targetId : 'P' + Math.floor(Math.random() * 1000000),
                totalDepositAmount: total,
                depositCount: count,
                maxDepositAmount: Math.floor(total / (Math.random() * 5 + 2)),
                averageDeposit: Math.floor(total / count),
                channelDeposits: [
                    { name: 'Bank Card', amount: bankAmount },
                    { name: 'USDT', amount: usdtAmount },
                    { name: 'Manual', amount: otherAmount }
                ]
            }
        })

        return { code: 0, msg: 'success', data: mockData }
    },

    async getPlayerActivityReport(params: OperationReportQuery): Promise<ApiResponse<PlayerActivityRecord[]>> {
        await delay(SIMULATE_DELAY)
        const dates = getMockDates(params.startTime, params.endTime, params.granularity)

        const mockData: PlayerActivityRecord[] = dates.map(date => {
            const rolling = Math.floor(Math.random() * 50000) + 5000
            return {
                date,
                playerId: (params.targetType === 'player' && params.targetId) ? params.targetId : 'P' + Math.floor(Math.random() * 1000000),
                activeDays: params.granularity === 'hour' ? Math.floor(Math.random() * 1) + 1 : Math.floor(Math.random() * 30) + 1,
                activeUsers: Math.floor(Math.random() * 5000) + 500,
                rollingAmount: rolling,
                totalDepositAmount: Math.floor(Math.random() * 20000) + 2000,
                betCount: Math.floor(rolling / (Math.random() * 10 + 5)),
                ggr: Math.floor(rolling * (Math.random() * 0.1 - 0.05)) // -5% to 5% GGR
            }
        })

        return { code: 0, msg: 'success', data: mockData }
    },

    async getActivityBonusReport(params: OperationReportQuery): Promise<ApiResponse<ActivityBonusRecord[]>> {
        await delay(SIMULATE_DELAY)
        const dates = getMockDates(params.startTime, params.endTime, params.granularity)

        const mockData: ActivityBonusRecord[] = dates.map(date => {
            const distributed = Math.floor(Math.random() * 50000) + 5000
            const converted = Math.floor(distributed * (Math.random() * 0.3 + 0.1))
            return {
                date,
                playerId: (params.targetType === 'player' && params.targetId) ? params.targetId : 'P' + Math.floor(Math.random() * 1000000),
                distributedAmount: distributed,
                recalledAmount: Math.floor(distributed * Math.random() * 0.1),
                convertedAmount: converted,
                conversionRate: Number(((converted / distributed) * 100).toFixed(2))
            }
        })

        return { code: 0, msg: 'success', data: mockData }
    },

    exportOperationReport(_params: OperationReportQuery): Promise<{ code: number; msg: string }> {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    code: 0,
                    msg: '報表已加入排隊，請至報表中心下載'
                })
            }, 500)
        })
    }
}
