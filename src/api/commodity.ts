import { ApiResponse } from '@/types'

export interface PlatformContent {
    contentType: 'RECHARGE_COIN' | 'ACTIVITY_COIN'
    contentAmount: number
    contentTurnoverMultiplier?: number
    contentConversionLimit?: number
}

export interface PlatformBonus {
    bonusType: 'ACTIVITY_COIN' | 'ACTIVITY_SILVER'
    bonusAmount: number
    bonusTurnoverMultiplier?: number
    bonusConversionLimit?: number
}

export interface PlatformConfig {
    isEnabled: boolean
    productId?: string // for iOS/Android
    content: PlatformContent
    bonus: PlatformBonus
}

export interface Commodity {
    id: string // Internal System ID
    name: string
    imageUrl: string
    badgeId?: string | null
    type: 'REGULAR' | 'MONTHLY' | 'LIMITED' | 'FIRST_DEPOSIT'
    sortOrder: number

    price: number // 統一定價

    // Platform Configs
    web: PlatformConfig
    ios: PlatformConfig
    android: PlatformConfig

    // Rules
    limitRule: 'NONE' | 'LIFETIME_ONCE' | 'DAILY_ONCE' | 'WEEKLY_ONCE' | 'YEARLY_ONCE'
    startTime?: string
    endTime?: string
    vipLevels: number[] // e.g. [0, 1, 2, 3]
}

export const defaultPlatformConfig = (): PlatformConfig => ({
    isEnabled: true,
    content: {
        contentType: 'RECHARGE_COIN',
        contentAmount: 0
    },
    bonus: {
        bonusType: 'ACTIVITY_COIN',
        bonusAmount: 0,
        bonusTurnoverMultiplier: 0,
        bonusConversionLimit: 0
    }
})

const mockCommodities: Commodity[] = [
    {
        id: 'SKU_COIN_100',
        name: '100 金幣包',
        imageUrl: 'https://via.placeholder.com/512?text=Coin100',
        badgeId: '2', // HOT
        type: 'REGULAR',
        sortOrder: 100,
        price: 100,
        web: { ...defaultPlatformConfig(), content: { contentType: 'RECHARGE_COIN', contentAmount: 100 } },
        ios: { ...defaultPlatformConfig(), productId: 'com.game.coin100', content: { contentType: 'RECHARGE_COIN', contentAmount: 100 } },
        android: { ...defaultPlatformConfig(), productId: 'com.game.coin100', content: { contentType: 'RECHARGE_COIN', contentAmount: 100 } },
        limitRule: 'NONE',
        vipLevels: [0, 1, 2, 3, 4, 5]
    },
    {
        id: 'SKU_FIRST_DEP_1',
        name: '首儲雙倍大禮包',
        imageUrl: 'https://via.placeholder.com/512?text=FirstDeposit',
        badgeId: '1', // NEW
        type: 'FIRST_DEPOSIT',
        sortOrder: 10,
        price: 490,
        web: defaultPlatformConfig(),
        ios: { ...defaultPlatformConfig(), productId: 'com.game.first500' },
        android: { ...defaultPlatformConfig(), productId: 'com.game.first500' },
        limitRule: 'LIFETIME_ONCE',
        vipLevels: [0, 1, 2, 3, 4, 5]
    }
]

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const commodityApi = {
    async list(): Promise<ApiResponse<Commodity[]>> {
        await delay(400)
        return { code: 0, msg: 'success', data: [...mockCommodities] }
    },

    async create(data: Commodity): Promise<ApiResponse<void>> {
        await delay(600)
        if (mockCommodities.some(c => c.id === data.id)) {
            return { code: 400, msg: '商品 ID 已存在' }
        }
        mockCommodities.push(data)
        return { code: 0, msg: 'success' }
    },

    async update(id: string, data: Commodity): Promise<ApiResponse<void>> {
        await delay(600)
        const index = mockCommodities.findIndex(c => c.id === id)
        if (index > -1) {
            mockCommodities[index] = data
            return { code: 0, msg: 'success' }
        }
        return { code: 404, msg: 'Commodity not found' }
    },

    async delete(id: string): Promise<ApiResponse<void>> {
        await delay(400)
        const index = mockCommodities.findIndex(c => c.id === id)
        if (index > -1) {
            mockCommodities.splice(index, 1)
            return { code: 0, msg: 'success' }
        }
        return { code: 404, msg: 'Commodity not found' }
    }
}
