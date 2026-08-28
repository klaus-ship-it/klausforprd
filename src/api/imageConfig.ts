import { ApiResponse, PaginatedResponse } from '@/types'
import {
    ImageConfig,
    ImageType,
    PopupFrequency,
    CreateImageConfigData,
    UpdateImageConfigData,
    ImageConfigQueryParams
} from '@/types/imageConfig'

const SIMULATE_DELAY = 500
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helpers to generate dates
const now = new Date()
const oneYearLater = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString()
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

// Mock Data
export const mockImageConfigs: ImageConfig[] = [
    // APP Banners
    {
        id: '1',
        type: ImageType.BANNER,
        platform: 'APP',
        title: '4月熱門活動',
        imageUrl: 'https://picsum.photos/seed/banner1/800/450',
        jumpUrl: '/promotion/event1',
        startTime: yesterday,
        endTime: oneYearLater,
        weight: 1,
        statusTest: true,
        statusLive: true,
        lastModifiedAt: yesterday,
        lastModifiedBy: 'admin'
    },
    {
        id: '2',
        type: ImageType.BANNER,
        platform: 'APP',
        title: '週末儲值加碼',
        imageUrl: 'https://picsum.photos/seed/banner2/800/450',
        jumpUrl: '/deposit',
        startTime: yesterday,
        endTime: oneYearLater,
        weight: 2,
        statusTest: true,
        statusLive: true,
        lastModifiedAt: yesterday,
        lastModifiedBy: 'admin'
    },
    {
        id: '3',
        type: ImageType.BANNER,
        platform: 'APP',
        title: '新手禮包',
        imageUrl: 'https://picsum.photos/seed/banner3/800/450',
        jumpUrl: '/guide',
        startTime: yesterday,
        endTime: oneYearLater,
        weight: 3,
        statusTest: true,
        statusLive: true,
        lastModifiedAt: yesterday,
        lastModifiedBy: 'admin'
    },
    // Lobby Backgrounds
    {
        id: '4',
        type: ImageType.LOBBY_BACKGROUND,
        platform: 'APP',
        title: '春季大廳底圖',
        imageUrl: 'https://picsum.photos/seed/lobby1/375/812',
        jumpUrl: '',
        startTime: yesterday,
        endTime: oneYearLater,
        weight: 1,
        statusTest: true,
        statusLive: true,
        lastModifiedAt: yesterday,
        lastModifiedBy: 'admin'
    },
    // Event Thumbnails
    {
        id: '5',
        type: ImageType.EVENT_THUMBNAIL,
        platform: 'APP',
        title: '登入送禮',
        imageUrl: 'https://picsum.photos/seed/event1/400/300',
        jumpUrl: '/event/daily',
        startTime: yesterday,
        endTime: oneYearLater,
        weight: 1,
        statusTest: true,
        statusLive: true,
        lastModifiedAt: yesterday,
        lastModifiedBy: 'admin'
    },
    {
        id: '6',
        type: ImageType.EVENT_THUMBNAIL,
        platform: 'APP',
        title: '好友邀請活動',
        imageUrl: 'https://picsum.photos/seed/event2/400/300',
        jumpUrl: '/referral',
        startTime: yesterday,
        endTime: oneYearLater,
        weight: 2,
        statusTest: true,
        statusLive: true,
        lastModifiedAt: yesterday,
        lastModifiedBy: 'admin'
    },
    // Popups
    {
        id: '7',
        type: ImageType.POPUP,
        platform: 'APP',
        title: '4月彈窗公告',
        imageUrl: 'https://picsum.photos/seed/popup1/600/800',
        jumpUrl: '',
        startTime: yesterday,
        endTime: oneYearLater,
        weight: 1,
        frequency: PopupFrequency.DAILY_ONCE,
        statusTest: true,
        statusLive: true,
        lastModifiedAt: yesterday,
        lastModifiedBy: 'admin'
    },
    // Splash
    {
        id: '8',
        type: ImageType.SPLASH,
        platform: 'APP',
        title: '春季啟動頁',
        imageUrl: 'https://picsum.photos/seed/splash1/375/812',
        jumpUrl: '',
        startTime: yesterday,
        endTime: oneYearLater,
        weight: 1,
        statusTest: true,
        statusLive: true,
        lastModifiedAt: yesterday,
        lastModifiedBy: 'admin'
    },
    // Deposit Promo
    {
        id: '9',
        type: ImageType.DEPOSIT_PROMO,
        platform: 'APP',
        title: '首儲雙倍',
        imageUrl: 'https://picsum.photos/seed/deposit1/600/300',
        jumpUrl: '/deposit/first',
        startTime: yesterday,
        endTime: oneYearLater,
        weight: 1,
        statusTest: true,
        statusLive: true,
        lastModifiedAt: yesterday,
        lastModifiedBy: 'admin'
    },
    {
        id: '10',
        type: ImageType.DEPOSIT_PROMO,
        platform: 'APP',
        title: '週末加碼50%',
        imageUrl: 'https://picsum.photos/seed/deposit2/600/300',
        jumpUrl: '/deposit/weekend',
        startTime: yesterday,
        endTime: oneYearLater,
        weight: 2,
        statusTest: true,
        statusLive: true,
        lastModifiedAt: yesterday,
        lastModifiedBy: 'admin'
    },
    // WEB Banners
    {
        id: '11',
        type: ImageType.BANNER,
        platform: 'WEB',
        title: '官網春季盛典',
        imageUrl: 'https://picsum.photos/seed/web_banner1/1920/450',
        jumpUrl: '/web/event1',
        startTime: yesterday,
        endTime: oneYearLater,
        weight: 1,
        statusTest: true,
        statusLive: true,
        lastModifiedAt: yesterday,
        lastModifiedBy: 'admin'
    }
]

export const imageConfigApi = {
    async getImageConfigs(params: ImageConfigQueryParams & { page: number, pageSize: number }): Promise<ApiResponse<PaginatedResponse<ImageConfig>>> {
        await delay(SIMULATE_DELAY)

        let filtered = [...mockImageConfigs]

        if (params.types && params.types.length > 0) {
            filtered = filtered.filter(item => params.types!.includes(item.type))
        }

        if (params.startTime) {
            const start = new Date(params.startTime).getTime()
            filtered = filtered.filter(item => new Date(item.startTime).getTime() >= start)
        }

        if (params.endTime) {
            const end = new Date(params.endTime).getTime()
            filtered = filtered.filter(item => new Date(item.endTime).getTime() <= end)
        }

        // Sort by weight (asc) then id (desc)
        filtered.sort((a, b) => {
            if (a.weight !== b.weight) return a.weight - b.weight
            return b.id.localeCompare(a.id)
        })

        const total = filtered.length
        const startIdx = (params.page - 1) * params.pageSize
        const endIdx = startIdx + params.pageSize
        const items = filtered.slice(startIdx, endIdx)

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

    async createImageConfig(data: CreateImageConfigData): Promise<ApiResponse<ImageConfig>> {
        await delay(SIMULATE_DELAY)
        const newConfig: ImageConfig = {
            ...data,
            id: Math.random().toString(36).substr(2, 9),
            statusTest: false,
            statusLive: false,
            lastModifiedAt: new Date().toISOString(),
            lastModifiedBy: 'admin'
        }
        mockImageConfigs.unshift(newConfig)
        return { code: 0, msg: 'success', data: newConfig }
    },

    async updateImageConfig(id: string, data: UpdateImageConfigData): Promise<ApiResponse<void>> {
        await delay(SIMULATE_DELAY)
        const index = mockImageConfigs.findIndex(item => item.id === id)
        if (index === -1) return { code: 404, msg: 'Not found' }

        mockImageConfigs[index] = {
            ...mockImageConfigs[index],
            ...data,
            lastModifiedAt: new Date().toISOString(),
            lastModifiedBy: 'admin'
        }
        return { code: 0, msg: 'success' }
    },

    async deleteImageConfig(id: string): Promise<ApiResponse<void>> {
        await delay(SIMULATE_DELAY)
        const index = mockImageConfigs.findIndex(item => item.id === id)
        if (index === -1) return { code: 404, msg: 'Not found' }

        mockImageConfigs.splice(index, 1)
        return { code: 0, msg: 'success' }
    },

    async toggleStatus(id: string, site: 'test' | 'live', status: boolean): Promise<ApiResponse<void>> {
        await delay(SIMULATE_DELAY)
        const index = mockImageConfigs.findIndex(item => item.id === id)
        if (index === -1) return { code: 404, msg: 'Not found' }

        if (site === 'test') {
            mockImageConfigs[index].statusTest = status
        } else {
            mockImageConfigs[index].statusLive = status
        }

        mockImageConfigs[index].lastModifiedAt = new Date().toISOString()
        mockImageConfigs[index].lastModifiedBy = 'admin'

        console.log(`[Cache] Updating ImageConfig_Cache_Key for ${id} on ${site} to ${status}`)
        return { code: 0, msg: 'success' }
    },

    // Mock Upload API
    async uploadImage(file: File): Promise<ApiResponse<{ url: string }>> {
        await delay(1000) // Simulate upload time
        // In real app, this would upload to S3/OSS/MinIO
        // Here we just return a fake URL based on file name or a placeholder
        const fakeUrl = `https://via.placeholder.com/500x200?text=${encodeURIComponent(file.name)}`
        return {
            code: 0,
            msg: 'success',
            data: { url: fakeUrl }
        }
    }
}
