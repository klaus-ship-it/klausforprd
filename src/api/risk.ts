import { ApiResponse } from '@/types'

export interface RiskAlert {
    id: string
    playerId: string
    playerName: string // Mock display name
    type: 'IP_CONFLICT' | 'DEVICE_CONFLICT' | 'BIG_WIN' | 'HIGH_FREQ_TRANSFER' | 'ARBITRAGE'
    level: 'LOW' | 'MEDIUM' | 'HIGH'
    description: string
    triggerTime: string
    status: 'PENDING' | 'PROCESSING' | 'RESOLVED' | 'DISMISSED'
    operator?: string
}

export interface RiskSearchParams {
    status?: string
    type?: string
    level?: string
    page: number
    pageSize: number
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Mock Store
let mockAlerts: RiskAlert[] = [
    {
        id: 'R_20260204_0001',
        playerId: '10086',
        playerName: 'player888',
        type: 'IP_CONFLICT',
        level: 'HIGH',
        description: 'Linked with 4 diff accounts on same IP (192.168.1.10)',
        triggerTime: new Date(Date.now() - 3600000).toISOString(),
        status: 'PENDING'
    },
    {
        id: 'R_20260204_0002',
        playerId: '10099',
        playerName: 'winner99',
        type: 'BIG_WIN',
        level: 'MEDIUM',
        description: 'Single win 5000x bet amount in Slot Game',
        triggerTime: new Date(Date.now() - 7200000).toISOString(),
        status: 'PENDING'
    },
    {
        id: 'R_20260204_0003',
        playerId: '10101',
        playerName: 'tester01',
        type: 'DEVICE_CONFLICT',
        level: 'LOW',
        description: 'Device ID matched with previous banned user',
        triggerTime: new Date(Date.now() - 86400000).toISOString(),
        status: 'RESOLVED',
        operator: 'admin'
    }
]

export const riskApi = {
    async getAlerts(params: RiskSearchParams): Promise<ApiResponse<{ list: RiskAlert[], total: number }>> {
        await delay(500)

        let list = [...mockAlerts]

        if (params.status) {
            list = list.filter(item => item.status === params.status)
        }
        if (params.type) {
            list = list.filter(item => item.type === params.type)
        }
        if (params.level) {
            list = list.filter(item => item.level === params.level)
        }

        // Sort by time desc
        list.sort((a, b) => new Date(b.triggerTime).getTime() - new Date(a.triggerTime).getTime())

        return {
            code: 0,
            msg: 'success',
            data: {
                list,
                total: list.length
            }
        }
    },

    async updateAlertStatus(id: string, status: RiskAlert['status'], operator: string): Promise<ApiResponse<null>> {
        await delay(300)
        const target = mockAlerts.find(a => a.id === id)
        if (target) {
            target.status = status
            target.operator = operator
        }
        return { code: 0, msg: 'success', data: null }
    }
}
