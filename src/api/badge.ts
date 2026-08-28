import { ApiResponse } from '@/types'

export interface MarketingBadge {
    id: string
    name: string
    imageUrl: string
    isActive: boolean
}

const mockBadges: MarketingBadge[] = [
    { id: '1', name: '春節限定', imageUrl: 'https://via.placeholder.com/128?text=CNY', isActive: true },
    { id: '2', name: '熱銷 (HOT)', imageUrl: 'https://via.placeholder.com/128?text=HOT', isActive: true },
    { id: '3', name: '新上架 (NEW)', imageUrl: 'https://via.placeholder.com/128?text=NEW', isActive: true }
]

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const badgeApi = {
    async getBadges(): Promise<ApiResponse<MarketingBadge[]>> {
        await delay(300)
        return { code: 0, msg: 'success', data: [...mockBadges] }
    },

    async createBadge(data: Omit<MarketingBadge, 'id'>): Promise<ApiResponse<MarketingBadge>> {
        await delay(500)
        const newBadge = { ...data, id: Date.now().toString() }
        mockBadges.push(newBadge)
        return { code: 0, msg: 'success', data: newBadge }
    },

    async updateBadge(id: string, data: Partial<MarketingBadge>): Promise<ApiResponse<void>> {
        await delay(500)
        const index = mockBadges.findIndex(b => b.id === id)
        if (index > -1) {
            mockBadges[index] = { ...mockBadges[index], ...data }
            return { code: 0, msg: 'success' }
        }
        return { code: 404, msg: 'Badge not found' }
    },

    async deleteBadge(id: string): Promise<ApiResponse<void>> {
        await delay(500)
        const index = mockBadges.findIndex(b => b.id === id)
        if (index > -1) {
            // Mock dependency check
            if (id === '2') { // Assume HOT is used
                return { code: 400, msg: '此角標正被商品引用，無法刪除' }
            }
            mockBadges.splice(index, 1)
            return { code: 0, msg: 'success' }
        }
        return { code: 404, msg: 'Badge not found' }
    }
}
