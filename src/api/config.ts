import { GameType, MarketingTagConfig, GameTypeUpdateRequest, MarketingTagCreateRequest, MarketingTagUpdateRequest } from '@/types/game'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Game Types (backend-defined, rate only editable)
let mockGameTypes: GameType[] = [
    { id: 'T001', name: '電子遊戲', code: 'SLOT', rate: 100, updated_at: '2026-01-20T10:00:00Z' },
    { id: 'T002', name: '真人遊戲', code: 'LIVE', rate: 80, updated_at: '2026-01-20T10:00:00Z' },
    { id: 'T003', name: '體育賽事', code: 'SPORTS', rate: 100, updated_at: '2026-01-20T10:00:00Z' },
    { id: 'T004', name: '捕魚遊戲', code: 'FISHING', rate: 100, updated_at: '2026-01-20T10:00:00Z' },
    { id: 'T005', name: '棋牌遊戲', code: 'CARD', rate: 100, updated_at: '2026-01-20T10:00:00Z' },
    { id: 'T006', name: '彩票遊戲', code: 'LOTTERY', rate: 100, updated_at: '2026-01-20T10:00:00Z' }
]

// Marketing Tags (system + custom)
let mockMarketingTags: MarketingTagConfig[] = [
    {
        id: 'TAG001',
        name: '熱門',
        tag_type: 'SYSTEM',
        has_rate: true,
        rate: 150,
        status: 'ACTIVE',
        description: '每月1號00:00統計上月流水前50名自動標記',
        games_using: 5,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-29T00:00:00Z'
    },
    {
        id: 'TAG002',
        name: '新上架',
        tag_type: 'SYSTEM',
        has_rate: false,
        rate: 0,
        status: 'ACTIVE',
        description: '當前時間 - 上架時間 < 60天',
        games_using: 2,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-29T00:00:00Z'
    },
    {
        id: 'TAG003',
        name: '推薦',
        tag_type: 'CUSTOM',
        has_rate: true,
        rate: 120,
        status: 'ACTIVE',
        description: '人工精選推薦遊戲',
        games_using: 3,
        created_at: '2026-01-15T10:00:00Z',
        updated_at: '2026-01-27T14:00:00Z'
    },
    {
        id: 'TAG004',
        name: '流水雙倍',
        tag_type: 'CUSTOM',
        has_rate: true,
        rate: 200,
        status: 'ACTIVE',
        description: '限時活動專用，流水計算加倍',
        games_using: 1,
        created_at: '2026-01-25T08:00:00Z',
        updated_at: '2026-01-27T16:00:00Z'
    },
    {
        id: 'TAG005',
        name: '節日特惠',
        tag_type: 'CUSTOM',
        has_rate: false,
        rate: 0,
        status: 'DISABLED',
        description: '春節/中秋等節日活動標籤',
        games_using: 0,
        created_at: '2026-01-10T10:00:00Z',
        updated_at: '2026-01-20T10:00:00Z'
    }
]

export const configApi = {
    // Game Types
    getGameTypes: async (): Promise<{ code: number; msg: string; data: GameType[] }> => {
        await delay(300)
        return { code: 0, msg: 'success', data: [...mockGameTypes] }
    },

    updateGameType: async (id: string, data: GameTypeUpdateRequest): Promise<{ code: number; msg: string }> => {
        await delay(300)

        const type = mockGameTypes.find(t => t.id === id)
        if (!type) {
            return { code: 404, msg: '類型不存在' }
        }

        if (data.rate < 0 || data.rate > 1000) {
            return { code: 400, msg: '比例範圍須在 0-1000% 之間' }
        }

        type.rate = data.rate
        type.updated_at = new Date().toISOString()

        return { code: 0, msg: 'success' }
    },

    // Marketing Tags
    getMarketingTags: async (): Promise<{ code: number; msg: string; data: MarketingTagConfig[] }> => {
        await delay(300)
        return { code: 0, msg: 'success', data: [...mockMarketingTags] }
    },

    createMarketingTag: async (data: MarketingTagCreateRequest): Promise<{ code: number; msg: string }> => {
        await delay(300)

        if (!data.name) {
            return { code: 400, msg: '標籤名稱不可為空' }
        }

        if (data.has_rate && (data.rate === undefined || data.rate < 0 || data.rate > 1000)) {
            return { code: 400, msg: '比例範圍須在 0-1000% 之間' }
        }

        const newTag: MarketingTagConfig = {
            id: `TAG${String(mockMarketingTags.length + 1).padStart(3, '0')}`,
            name: data.name,
            tag_type: 'CUSTOM',
            has_rate: data.has_rate,
            rate: data.rate || 0,
            status: 'ACTIVE',
            description: data.description,
            games_using: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }

        mockMarketingTags.push(newTag)
        return { code: 0, msg: 'success' }
    },

    updateMarketingTag: async (id: string, data: MarketingTagUpdateRequest): Promise<{ code: number; msg: string }> => {
        await delay(300)

        const tag = mockMarketingTags.find(t => t.id === id)
        if (!tag) {
            return { code: 404, msg: '標籤不存在' }
        }

        if (data.name) tag.name = data.name
        if (data.has_rate !== undefined) tag.has_rate = data.has_rate
        if (data.rate !== undefined) {
            if (data.rate < 0 || data.rate > 1000) {
                return { code: 400, msg: '比例範圍須在 0-1000% 之間' }
            }
            tag.rate = data.rate
        }
        if (data.status) tag.status = data.status
        if (data.description !== undefined) tag.description = data.description

        tag.updated_at = new Date().toISOString()

        return { code: 0, msg: 'success' }
    },

    deleteMarketingTag: async (id: string): Promise<{ code: number; msg: string }> => {
        await delay(300)

        const tag = mockMarketingTags.find(t => t.id === id)
        if (!tag) {
            return { code: 404, msg: '標籤不存在' }
        }

        if (tag.tag_type === 'SYSTEM') {
            return { code: 403, msg: '系統標籤不可刪除，僅可停用' }
        }

        if (tag.games_using > 0) {
            return { code: 400, msg: `此標籤仍有 ${tag.games_using} 款遊戲使用中，請先解除關聯` }
        }

        mockMarketingTags = mockMarketingTags.filter(t => t.id !== id)
        return { code: 0, msg: 'success' }
    }
}
