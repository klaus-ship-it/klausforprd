import { GameProvider, ProviderUpdateRequest, ProviderStatus, ProviderSearchParams } from '@/types/game'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

let mockProviders: GameProvider[] = [
    {
        id: 'PV-001',
        code: 'PG',
        name: 'PG Soft',
        type: 'SLOT',
        status: 'ACTIVE',
        sort_order: 1,
        wallet_support: 'DUAL',
        last_operator: 'admin',
        updated_at: '2026-01-20T10:00:00Z',
        current_players: 1250,
        total_bet: 5000000,
        total_payout: 4850000
    },
    {
        id: 'PV-002',
        code: 'EVO',
        name: 'Evolution Gaming',
        type: 'LIVE',
        status: 'ACTIVE',
        sort_order: 2,
        wallet_support: 'CASH',
        last_operator: 'admin',
        updated_at: '2026-01-20T10:00:00Z',
        current_players: 3500,
        total_bet: 12000000,
        total_payout: 11500000
    },
    {
        id: 'PV-003',
        code: 'JILI',
        name: 'JILI Games',
        type: 'SLOT',
        status: 'ACTIVE',
        sort_order: 3,
        wallet_support: 'DUAL',
        last_operator: 'admin',
        updated_at: '2026-01-25T14:00:00Z',
        current_players: 850,
        total_bet: 2500000,
        total_payout: 2300000
    },
    {
        id: 'PV-004',
        code: 'PP',
        name: 'Pragmatic Play',
        type: 'SLOT',
        status: 'MAINTENANCE',
        sort_order: 4,
        wallet_support: 'DUAL',
        last_operator: 'manager001',
        updated_at: '2026-01-28T16:00:00Z',
        current_players: 0,
        total_bet: 8000000,
        total_payout: 7800000
    },
    {
        id: 'PV-005',
        code: 'SABA',
        name: 'SABA Sports',
        type: 'SPORTS',
        status: 'DISABLED',
        sort_order: 10,
        wallet_support: 'CASH',
        last_operator: 'admin',
        updated_at: '2026-01-15T09:00:00Z',
        current_players: 0,
        total_bet: 1500000,
        total_payout: 1400000
    },
    {
        id: 'PV-006',
        code: 'KY',
        name: 'KY Fishing',
        type: 'SLOT',
        status: 'ACTIVE',
        sort_order: 5,
        wallet_support: 'CASH',
        last_operator: 'admin',
        updated_at: '2026-01-22T11:00:00Z',
        current_players: 420,
        total_bet: 1200000,
        total_payout: 1100000
    }
]

export const providerApi = {
    getProviders: async (params?: ProviderSearchParams): Promise<{ code: number; msg: string; data: GameProvider[] }> => {
        await delay(300)
        let filtered = [...mockProviders]

        if (params) {
            if (params.code) {
                filtered = filtered.filter(p => p.code.toLowerCase().includes(params.code!.toLowerCase()))
            }
            if (params.type) {
                filtered = filtered.filter(p => p.type === params.type)
            }
            if (params.status) {
                filtered = filtered.filter(p => p.status === params.status)
            }
            // Date range simulation: randomizes bet/payout slightly if range is provided
            if (params.date_start || params.date_end) {
                filtered = filtered.map(p => ({
                    ...p,
                    total_bet: p.total_bet * (0.8 + Math.random() * 0.4),
                    total_payout: p.total_payout * (0.8 + Math.random() * 0.4)
                }))
            }
        }

        // Sort by sort_order
        const sorted = filtered.sort((a, b) => a.sort_order - b.sort_order)
        return { code: 0, msg: 'success', data: sorted }
    },

    updateProvider: async (
        id: string,
        updates: ProviderUpdateRequest,
        operator: string = 'admin'
    ): Promise<{ code: number; msg: string }> => {
        await delay(300)

        const provider = mockProviders.find(p => p.id === id)
        if (!provider) {
            return { code: 404, msg: '供應商不存在' }
        }

        if (!updates.reason) {
            return { code: 400, msg: '請填寫異動原因' }
        }

        // Update fields
        if (updates.status) {
            provider.status = updates.status
        }
        if (updates.sort_order !== undefined) {
            provider.sort_order = updates.sort_order
        }

        provider.last_operator = operator
        provider.updated_at = new Date().toISOString()

        // In real system, this would log to OPE-104
        console.log(`[Provider Update] ${provider.name} by ${operator}: ${updates.reason}`)

        return { code: 0, msg: 'success' }
    }
}
