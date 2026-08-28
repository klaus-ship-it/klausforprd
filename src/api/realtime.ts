import { ApiResponse } from '@/types'

export interface RealtimeStats {
    ccu: number
    dau: number
    ggr: number
    totalBet: number
    totalPlayers: number // 全站玩家總數
    providerStats: { name: string, value: number }[]
    deviceStats: { name: string, value: number }[]
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const realtimeApi = {
    async getRealtimeStats(excludeTest: boolean = false): Promise<ApiResponse<RealtimeStats>> {
        await delay(300)

        // Base values (simulated accumulation from 00:00)
        let ccu = 12500
        let dau = 45000
        let totalBet = 15000000
        let ggr = totalBet * 0.035 // Approx 3.5% hold

        // Fluctuation
        const variance = Math.random() * 0.05
        ccu = Math.floor(ccu * (1 + variance))
        totalBet = Math.floor(totalBet * (1 + (variance / 2))) // Bet grows slower
        ggr = Math.floor(totalBet * 0.035)

        // Test Account Impact (Mock)
        if (excludeTest) {
            ccu = Math.floor(ccu * 0.85) // 15% are test/internal
            dau = Math.floor(dau * 0.9)
            totalBet = Math.floor(totalBet * 0.95) // Test accounts bet less volume usually? Or more? Let's say less total volume but high frequency.
            ggr = Math.floor(totalBet * 0.04) // Higher hold on real players maybe?
        }

        return {
            code: 0,
            msg: 'success',
            data: {
                ccu,
                dau,
                ggr,
                totalBet,
                totalPlayers: 250000,
                providerStats: [
                    { name: 'Evolution', value: Math.floor(ccu * 0.4) },
                    { name: 'PG Soft', value: Math.floor(ccu * 0.3) },
                    { name: 'Pragmatic', value: Math.floor(ccu * 0.2) },
                    { name: 'Other', value: Math.floor(ccu * 0.1) }
                ],
                deviceStats: [
                    { name: 'Mobile App (iOS)', value: Math.floor(ccu * 0.45) },
                    { name: 'Mobile App (Android)', value: Math.floor(ccu * 0.35) },
                    { name: 'Mobile Web', value: Math.floor(ccu * 0.1) },
                    { name: 'Desktop', value: Math.floor(ccu * 0.1) }
                ]
            }
        }
    }
}
