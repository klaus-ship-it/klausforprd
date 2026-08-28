import { ApiResponse } from '@/types'
import { GameStatsQuery, GameStatsRecord, Granularity } from '@/types/gameStats'

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
        const count = granularity === 'day' ? 7 : 6;
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
    return Array.from(new Set(dates));
}

export const gameStatsApi = {
    async getGameStatsReport(params: GameStatsQuery): Promise<ApiResponse<GameStatsRecord[]>> {
        await delay(SIMULATE_DELAY)
        const dates = getMockDates(params.startTime, params.endTime, params.granularity)

        const mockData: GameStatsRecord[] = dates.map(date => {
            const betCount = Math.floor(Math.random() * 50000) + 1000
            const betAmount = Math.floor(Math.random() * 1000000) + 50000
            const payoutAmount = Math.floor(betAmount * (Math.random() * 0.4 + 0.5)) // 50-90% payout
            const ggr = betAmount - payoutAmount
            const ggrRatio = betAmount > 0 ? (ggr / betAmount) * 100 : 0
            const activePlayers = Math.floor(Math.random() * 5000) + 100
            const arpu = activePlayers > 0 ? ggr / activePlayers : 0

            return {
                date,
                providerName: ['PG Soft', 'JILI', 'Evolution', 'Pragmatic Play', 'FC'][Math.floor(Math.random() * 5)],
                gameType: ['電子', '真人', '體育', '棋牌', '彩票'][Math.floor(Math.random() * 5)],
                gameId: 'G' + Math.floor(Math.random() * 10000),
                gameName: ['財神到', '瘋狂時間', '麻將胡了', '魔龍傳奇', '百家樂'][Math.floor(Math.random() * 5)],
                betCount,
                betAmount,
                payoutAmount,
                ggr,
                ggrRatio: Number(ggrRatio.toFixed(2)),
                maxBet: Math.floor(Math.random() * 10000) + 1000,
                maxWinRate: Number((Math.random() * 1000 + 10).toFixed(2)),
                activePlayers,
                arpu: Number(arpu.toFixed(2))
            }
        })

        return { code: 0, msg: 'success', data: mockData }
    },

    exportGameStatsReport(_params: GameStatsQuery): Promise<{ code: number; msg: string }> {
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
