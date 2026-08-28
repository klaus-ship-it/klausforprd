import { ApiResponse, PaginatedResponse } from '@/types'
import { PromoEvent } from '@/types/promoEvent'
import { mockPromoEvents } from '@/mocks/promoEvent'

const SIMULATE_DELAY = 500
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const promoEventApi = {
    async getEvents(params: { page: number, pageSize: number }): Promise<ApiResponse<PaginatedResponse<PromoEvent>>> {
        await delay(SIMULATE_DELAY)
        const total = mockPromoEvents.length
        const startIdx = (params.page - 1) * params.pageSize
        const endIdx = startIdx + params.pageSize
        const items = [...mockPromoEvents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(startIdx, endIdx)

        return {
            code: 0,
            msg: 'success',
            data: {
                items,
                total,
                page: params.page,
                pageSize: params.pageSize
            }
        }
    },
    async createEvent(data: Omit<PromoEvent, 'id' | 'status' | 'created_at'>): Promise<ApiResponse<PromoEvent>> {
        await delay(SIMULATE_DELAY)
        const newEvent: PromoEvent = {
            ...data,
            id: `PE_${Date.now()}`,
            status: 'ACTIVE',
            created_at: new Date().toISOString()
        }
        mockPromoEvents.unshift(newEvent)
        return {
            code: 0,
            msg: 'success',
            data: newEvent
        }
    }
}
