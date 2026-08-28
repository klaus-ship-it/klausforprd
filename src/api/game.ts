import { GameLog, GameSearchParams, GameReportStatus } from '@/types/game'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helpers to generate mock data
const providers = ['PG', 'JILI', 'EVOLUTION', 'PP', 'JDB']
const games = {
    'PG': ['Mahjong Ways 2', 'Lucky Neko', 'Treasures of Aztec'],
    'JILI': ['Super Ace', 'Golden Empire', 'Boxing King'],
    'EVOLUTION': ['Crazy Time', 'Lightning Roulette', 'Baccarat A'],
    'PP': ['Gates of Olympus', 'Sweet Bonanza'],
    'JDB': ['Birds Party', 'Dragon Master']
}

const mockGameLogs: GameLog[] = []

const generateMockLogs = () => {
    // Generate 200 logs
    const now = new Date()
    for (let i = 0; i < 200; i++) {
        const provider = providers[Math.floor(Math.random() * providers.length)]
        // @ts-ignore
        const gameList = games[provider]
        const gameName = gameList[Math.floor(Math.random() * gameList.length)]

        const isVoid = Math.random() < 0.05 // 5% Void
        const isFreeSpin = Math.random() < 0.1 // 10% Free Spin

        const bet = isFreeSpin ? 0 : Math.floor(Math.random() * 1000) + 10
        // Win amount logic
        let win = 0
        if (Math.random() > 0.6) { // 40% win rate
            win = Math.floor(bet * (Math.random() * 5)) // Up to 5x win
        }

        // Status
        let status: GameReportStatus = 'SETTLED'
        if (isVoid) status = 'void'

        // Amounts
        let net = win - bet
        let validTurnover = bet

        if (status === 'void') {
            validTurnover = 0
            win = 0
            net = 0 // Void returns bet? Usually yes. Simplification: Mock data assumes resolved void (0 impact)
        }

        // Time
        const timeOffset = Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000) // Last 7 days
        const settleTime = new Date(now.getTime() - timeOffset)
        // Simulate cross-day: create time is 1-5 mins before settle
        const createTime = new Date(settleTime.getTime() - (Math.floor(Math.random() * 300000) + 1000))

        const uid = `GID_${Math.random().toString(36).substr(2, 9).toUpperCase()}`

        // Raw JSON Mock
        const raw = {
            transaction_id: uid,
            vendor: provider,
            game: gameName,
            user: `P${10000 + Math.floor(Math.random() * 20)}`,
            amount_bet: bet,
            amount_win: win,
            status: status,
            ts: settleTime.getTime()
        }

        mockGameLogs.push({
            id: uid,
            provider_id: provider,
            provider_round_id: `R_${Math.random().toString(36).substr(2, 12)}`,
            game_name: gameName,
            player_id: `P${10000 + Math.floor(Math.random() * 20)}`, // P10000 - P10019
            bet_amount: bet,
            win_amount: win,
            net_amount: net,
            valid_turnover: validTurnover,
            settle_time: settleTime.toISOString(),
            create_time: createTime.toISOString(),
            status: status,
            raw_json: JSON.stringify(raw),
            currency: ['GOLD', 'SILVER', 'BRONZE'][Math.floor(Math.random() * 3)] // Mocking multiple currencies
        })
    }
    // Sort by settle time desc
    mockGameLogs.sort((a, b) => new Date(b.settle_time).getTime() - new Date(a.settle_time).getTime())
}

generateMockLogs()

export const gameApi = {
    getLogs: async (params: GameSearchParams): Promise<{ code: number; msg: string; data: { list: GameLog[]; total: number } }> => {
        await delay(300)

        let logs = [...mockGameLogs]

        // Filtering
        if (params.player_id) {
            logs = logs.filter(l => l.player_id.includes(params.player_id!))
        }
        if (params.provider) {
            logs = logs.filter(l => l.provider_id === params.provider)
        }
        if (params.game_name) {
            logs = logs.filter(l => l.game_name.toLowerCase().includes(params.game_name!.toLowerCase()))
        }
        if (params.round_id) {
            logs = logs.filter(l => l.provider_round_id.includes(params.round_id!))
        }
        if (params.date_start && params.date_end) {
            const start = new Date(params.date_start).getTime()
            const end = new Date(params.date_end).getTime()
            logs = logs.filter(l => {
                const t = new Date(l.settle_time).getTime()
                return t >= start && t <= end
            })
        }
        if (params.currency && params.currency !== 'all') {
            logs = logs.filter(l => l.currency === params.currency)
        }

        const total = logs.length
        const start = (params.page - 1) * params.page_size
        const end = start + params.page_size
        const list = logs.slice(start, end)

        return {
            code: 0,
            msg: 'success',
            data: {
                list,
                total
            }
        }
    }
}

// OPE-302: Game List Management
import { Game, GameListSearchParams, GameUpdateRequest } from '@/types/game'

// Calculate final rate based on priority: manual tag > tag rate > type rate
const calculateFinalRate = (typeRate: number, tagRate: number): number => {
    return tagRate > 0 ? tagRate : typeRate
}

let mockGames: Game[] = [
    // PG Games
    { id: 'G001', provider_id: 'PV-001', provider_game_id: 'PG_MAHJONG2', type_id: 'T001', name: '麻將胡了2', name_en: 'Mahjong Ways 2', cumulative_turnover: 1250000, total_bet: 1250000, total_payout: 1187500, marketing_tag: 'HOT', tag_source: 'AUTO', type_rate: 100, tag_rate: 150, final_rate: 150, allowed_currencies: ['GOLD', 'SILVER'], min_vip_level: 0, min_seat_vip_level: 0, image_url: 'https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp', sort_order: 1, status: 'ACTIVE', updated_at: '2026-01-29T10:00:00Z', profit_rate: 5.0 },
    { id: 'G002', provider_id: 'PV-001', provider_game_id: 'PG_NEKO', type_id: 'T001', name: '招財貓', name_en: 'Lucky Neko', cumulative_turnover: 850000, total_bet: 850000, total_payout: 807500, marketing_tag: 'RECOMMENDED', tag_source: 'MANUAL', type_rate: 100, tag_rate: 120, final_rate: 120, allowed_currencies: ['GOLD'], min_vip_level: 0, min_seat_vip_level: 0, image_url: 'https://img.daisyui.com/images/stock/photo-1625895197185-efeba012e661.webp', sort_order: 3, status: 'ACTIVE', updated_at: '2026-01-28T14:00:00Z', profit_rate: 5.0 },
    { id: 'G003', provider_id: 'PV-001', provider_game_id: 'PG_AZTEC', type_id: 'T001', name: '阿茲特克寶藏', name_en: 'Treasures of Aztec', cumulative_turnover: 450000, total_bet: 450000, total_payout: 427500, marketing_tag: null, tag_source: 'AUTO', type_rate: 100, tag_rate: 0, final_rate: 100, allowed_currencies: ['GOLD', 'SILVER'], min_vip_level: 0, min_seat_vip_level: 0, image_url: 'https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp', sort_order: 10, status: 'ACTIVE', updated_at: '2026-01-20T10:00:00Z', profit_rate: 5.0 },

    // JILI Games
    { id: 'G004', provider_id: 'PV-003', provider_game_id: 'JILI_SUPERACE', type_id: 'T001', name: '超級王牌', name_en: 'Super Ace', cumulative_turnover: 2100000, total_bet: 2100000, total_payout: 1995000, marketing_tag: 'DOUBLE_TURNOVER', tag_source: 'MANUAL', type_rate: 100, tag_rate: 200, final_rate: 200, allowed_currencies: ['GOLD', 'SILVER'], min_vip_level: 0, min_seat_vip_level: 0, image_url: null, sort_order: 2, status: 'ACTIVE', updated_at: '2026-01-27T16:00:00Z', profit_rate: 5.0 },
    { id: 'G005', provider_id: 'PV-003', provider_game_id: 'JILI_EMPIRE', type_id: 'T001', name: '黃金帝國', name_en: 'Golden Empire', cumulative_turnover: 680000, total_bet: 680000, total_payout: 646000, marketing_tag: null, tag_source: 'AUTO', type_rate: 100, tag_rate: 0, final_rate: 100, allowed_currencies: ['GOLD'], min_vip_level: 1, min_seat_vip_level: 1, image_url: null, sort_order: 8, status: 'ACTIVE', updated_at: '2026-01-25T10:00:00Z', profit_rate: 5.0 },
    { id: 'G006', provider_id: 'PV-003', provider_game_id: 'JILI_BOXING', type_id: 'T001', name: '拳擊之王', name_en: 'Boxing King', cumulative_turnover: 120000, total_bet: 120000, total_payout: 114000, marketing_tag: null, tag_source: 'AUTO', type_rate: 100, tag_rate: 0, final_rate: 100, allowed_currencies: ['SILVER'], min_vip_level: 0, min_seat_vip_level: 0, image_url: null, sort_order: 20, status: 'MAINTENANCE', updated_at: '2026-01-15T09:00:00Z', profit_rate: 5.0 },

    // Evolution Games
    { id: 'G007', provider_id: 'PV-002', provider_game_id: 'EVO_CRAZYTIME', type_id: 'T002', name: '瘋狂時刻', name_en: 'Crazy Time', cumulative_turnover: 3500000, total_bet: 3500000, total_payout: 3325000, marketing_tag: 'HOT', tag_source: 'AUTO', type_rate: 80, tag_rate: 150, final_rate: 150, allowed_currencies: ['GOLD'], min_vip_level: 0, min_seat_vip_level: 0, image_url: null, sort_order: 1, status: 'ACTIVE', updated_at: '2026-01-29T08:00:00Z', profit_rate: 5.0 },
    { id: 'G008', provider_id: 'PV-002', provider_game_id: 'EVO_LIGHTNING', type_id: 'T002', name: '閃電輪盤', name_en: 'Lightning Roulette', cumulative_turnover: 1800000, total_bet: 1800000, total_payout: 1710000, marketing_tag: 'RECOMMENDED', tag_source: 'AUTO', type_rate: 80, tag_rate: 120, final_rate: 120, allowed_currencies: ['GOLD'], min_vip_level: 2, min_seat_vip_level: 2, image_url: null, sort_order: 5, status: 'ACTIVE', updated_at: '2026-01-28T10:00:00Z', profit_rate: 5.0 },
    { id: 'G009', provider_id: 'PV-002', provider_game_id: 'EVO_BACCARAT_A', type_id: 'T002', name: '百家樂 A', name_en: 'Baccarat A', cumulative_turnover: 5200000, total_bet: 5200000, total_payout: 4940000, marketing_tag: null, tag_source: 'AUTO', type_rate: 80, tag_rate: 0, final_rate: 80, allowed_currencies: ['GOLD'], min_vip_level: 3, min_seat_vip_level: 3, image_url: null, sort_order: 4, status: 'ACTIVE', updated_at: '2026-01-26T14:00:00Z', profit_rate: 5.0 },

    // PP Games
    { id: 'G010', provider_id: 'PV-004', provider_game_id: 'PP_GATES', type_id: 'T001', name: '眾神之門', name_en: 'Gates of Olympus', cumulative_turnover: 980000, total_bet: 980000, total_payout: 931000, marketing_tag: 'HOT', tag_source: 'MANUAL', type_rate: 100, tag_rate: 150, final_rate: 150, allowed_currencies: ['GOLD', 'SILVER'], min_vip_level: 0, min_seat_vip_level: 0, image_url: null, sort_order: 6, status: 'ACTIVE', updated_at: '2026-01-28T12:00:00Z', profit_rate: 5.0 },
    { id: 'G011', provider_id: 'PV-004', provider_game_id: 'PP_BONANZA', type_id: 'T001', name: '甜蜜糖果', name_en: 'Sweet Bonanza', cumulative_turnover: 620000, total_bet: 620000, total_payout: 589000, marketing_tag: null, tag_source: 'AUTO', type_rate: 100, tag_rate: 0, final_rate: 100, allowed_currencies: ['GOLD'], min_vip_level: 0, min_seat_vip_level: 0, image_url: null, sort_order: 12, status: 'ACTIVE', updated_at: '2026-01-22T10:00:00Z', profit_rate: 5.0 },

    // KY Games
    { id: 'G012', provider_id: 'PV-006', provider_game_id: 'KY_BIRD', type_id: 'T001', name: '捕鳥達人', name_en: 'Birds Party', cumulative_turnover: 350000, total_bet: 350000, total_payout: 332500, marketing_tag: null, tag_source: 'AUTO', type_rate: 100, tag_rate: 0, final_rate: 100, allowed_currencies: ['SILVER', 'BRONZE'], min_vip_level: 0, min_seat_vip_level: 0, image_url: null, sort_order: 15, status: 'MAINTENANCE', updated_at: '2026-01-20T08:00:00Z', profit_rate: 5.0 },
    { id: 'G013', provider_id: 'PV-006', provider_game_id: 'KY_DRAGON', type_id: 'T001', name: '神龍寶藏', name_en: 'Dragon Master', cumulative_turnover: 180000, total_bet: 180000, total_payout: 171000, marketing_tag: null, tag_source: 'AUTO', type_rate: 100, tag_rate: 0, final_rate: 100, allowed_currencies: ['GOLD', 'BRONZE', 'SILVER'], min_vip_level: 1, min_seat_vip_level: 1, image_url: null, sort_order: 18, status: 'ACTIVE', updated_at: '2026-01-18T10:00:00Z', profit_rate: 5.0 }
]

export const gameListApi = {
    getGames: async (params: GameListSearchParams): Promise<{ code: number; msg: string; data: { list: Game[]; total: number } }> => {
        await delay(300)

        let games = [...mockGames]

        // Filtering
        if (params.provider_id) {
            games = games.filter(g => g.provider_id === params.provider_id)
        }
        if (params.type_id) {
            games = games.filter(g => g.type_id === params.type_id)
        }
        if (params.game_id) {
            games = games.filter(g => g.id.includes(params.game_id!) || g.provider_game_id.toLowerCase().includes(params.game_id!.toLowerCase()))
        }
        if (params.name) {
            games = games.filter(g => g.name.includes(params.name!) || g.name_en.toLowerCase().includes(params.name!.toLowerCase()))
        }
        if (params.status) {
            games = games.filter(g => g.status === params.status)
        }
        if (params.marketing_tag !== undefined) {
            games = games.filter(g => g.marketing_tag === params.marketing_tag)
        }
        if (params.tag_source) {
            games = games.filter(g => g.tag_source === params.tag_source)
        }

        if (params.date_start || params.date_end) {
            // Simulate cumulative logic by scaling values
            games = games.map(g => ({
                ...g,
                cumulative_turnover: g.cumulative_turnover * (0.8 + Math.random() * 0.4),
                total_bet: g.total_bet * (0.8 + Math.random() * 0.4),
                total_payout: g.total_payout * (0.8 + Math.random() * 0.4)
            }))
        }

        const total = games.length
        const start = (params.page - 1) * params.page_size
        const end = start + params.page_size
        const list = games.slice(start, end)

        return { code: 0, msg: 'success', data: { list, total } }
    },

    updateGame: async (id: string, updates: GameUpdateRequest): Promise<{ code: number; msg: string }> => {
        await delay(300)

        const game = mockGames.find(g => g.id === id)
        if (!game) {
            return { code: 404, msg: '遊戲不存在' }
        }

        // Update fields
        if (updates.marketing_tag !== undefined) {
            game.marketing_tag = updates.marketing_tag
            game.tag_source = 'MANUAL' // Setting tag_source to MANUAL if marketing_tag is updated

            // Update tag_rate based on new tag
            // const tagConfig = configApi.mockMarketingTags.find(t => t.id === updates.marketing_tag) // Wait, configApi is not imported here?
            // Simplified mock logic:
            if (updates.marketing_tag === 'HOT') game.tag_rate = 150
            else if (updates.marketing_tag === 'RECOMMENDED') game.tag_rate = 120
            else if (updates.marketing_tag === 'DOUBLE_TURNOVER') game.tag_rate = 200
            else game.tag_rate = 0

            // Only recalculate if final_rate is NOT being manually set in this request
            if (updates.final_rate === undefined) {
                game.final_rate = calculateFinalRate(game.type_rate, game.tag_rate)
            }
        }

        if (updates.final_rate !== undefined) {
            game.final_rate = updates.final_rate
        }

        if (updates.allowed_currencies) {
            game.allowed_currencies = updates.allowed_currencies
        }
        if (updates.min_vip_level !== undefined) {
            game.min_vip_level = updates.min_vip_level
        }
        if (updates.min_seat_vip_level !== undefined) {
            game.min_seat_vip_level = updates.min_seat_vip_level
        }
        if (updates.image_url !== undefined) {
            game.image_url = updates.image_url
        }
        if (updates.sort_order !== undefined) {
            game.sort_order = updates.sort_order
        }
        if (updates.status) {
            game.status = updates.status
        }
        if (updates.profit_rate !== undefined) {
            game.profit_rate = updates.profit_rate
        }

        game.updated_at = new Date().toISOString()

        return { code: 0, msg: 'success' }
    },

    // Mock API for syncing with third-party providers
    fetchLatestProviderGames: async (): Promise<{ code: number; msg: string; data: import('@/types/game').ThirdPartyGame[] }> => {
        await delay(500)
        
        // Simulating the fetched list where some games exist, some are new, and some old are missing
        const list: import('@/types/game').ThirdPartyGame[] = [
            // Existing ones
            { provider_game_id: 'PG_MAHJONG2', name: '麻將胡了2', name_en: 'Mahjong Ways 2', provider_id: 'PV-001', type_id: 'T001' },
            { provider_game_id: 'PG_NEKO', name: '招財貓', name_en: 'Lucky Neko', provider_id: 'PV-001', type_id: 'T001' },
            { provider_game_id: 'JILI_SUPERACE', name: '超級王牌', name_en: 'Super Ace', provider_id: 'PV-003', type_id: 'T001' },
            { provider_game_id: 'JILI_EMPIRE', name: '黃金帝國', name_en: 'Golden Empire', provider_id: 'PV-003', type_id: 'T001' },
            { provider_game_id: 'EVO_CRAZYTIME', name: '瘋狂時刻', name_en: 'Crazy Time', provider_id: 'PV-002', type_id: 'T002' },
            { provider_game_id: 'EVO_LIGHTNING', name: '閃電輪盤', name_en: 'Lightning Roulette', provider_id: 'PV-002', type_id: 'T002' },
            { provider_game_id: 'PP_GATES', name: '眾神之門', name_en: 'Gates of Olympus', provider_id: 'PV-004', type_id: 'T001' },
            { provider_game_id: 'PP_BONANZA', name: '甜蜜糖果', name_en: 'Sweet Bonanza', provider_id: 'PV-004', type_id: 'T001' },
            { provider_game_id: 'KY_BIRD', name: '捕鳥達人', name_en: 'Birds Party', provider_id: 'PV-006', type_id: 'T001' },
            
            // New ones to appear as "Unpublished"
            { provider_game_id: 'PG_DRAGON', name: '神龍傳說', name_en: 'Dragon Legend', provider_id: 'PV-001', type_id: 'T001' },
            { provider_game_id: 'JILI_RICH', name: '財神到', name_en: 'God of Wealth', provider_id: 'PV-003', type_id: 'T001' },
            { provider_game_id: 'EVO_BLACKJACK', name: '無極黑傑克', name_en: 'Infinite Blackjack', provider_id: 'PV-002', type_id: 'T002' }

            // Note: 'PG_AZTEC', 'JILI_BOXING', 'EVO_BACCARAT_A', 'KY_DRAGON' are intentionally missing from this new list
        ]

        return { code: 0, msg: 'success', data: list }
    },

    // Batch insert new games
    batchAddGames: async (newGames: Partial<Game>[]): Promise<{ code: number; msg: string }> => {
        await delay(300)
        
        for (const g of newGames) {
            mockGames.unshift({
                ...g,
                id: `G0${Math.floor(Math.random() * 1000) + 100}`,
                cumulative_turnover: 0,
                total_bet: 0,
                total_payout: 0,
                marketing_tag: null,
                tag_source: 'AUTO',
                type_rate: 100,
                tag_rate: 0,
                final_rate: 100,
                allowed_currencies: ['SILVER'],
                min_vip_level: 0,
                min_seat_vip_level: 0,
                image_url: null,
                sort_order: 99,
                updated_at: new Date().toISOString(),
                profit_rate: 5.0
            } as Game)
        }

        return { code: 0, msg: 'success' }
    }
}

// --- Game Copywriting API ---
import type { GameCopywriting } from '@/types/game'

const mockCopywritings: Record<string, GameCopywriting> = {
    'G001': {
        game_id: 'G001',
        lang_type: ['zh-TW', 'en', 'zh-CN'],
        game_banners: [
            'https://cdn.example.com/games/mahjong2/banner1.jpg',
            'https://cdn.example.com/games/mahjong2/banner2.jpg'
        ],
        locales: {
            'zh-TW': {
                game_name: '麻將胡了2',
                game_introduce: '最受歡迎的麻將主題老虎機，體驗東方魅力！',
                game_volatility: '中高',
                high_hit: '3000倍',
                game_details: '麻將胡了2是PG Soft旗下最具人氣的亞洲主題老虎機遊戲。結合傳統麻將元素與現代老虎機玩法，提供最高3000倍的驚人賠率。遊戲內含免費旋轉與乘數功能，讓您在東方美學的視覺饗宴中贏取豐厚獎金。'
            },
            'en': {
                game_name: 'Mahjong Ways 2',
                game_introduce: 'The most popular Mahjong-themed slot game, experience the charm of the East!',
                game_volatility: 'Medium-High',
                high_hit: '3000x',
                game_details: 'Mahjong Ways 2 is the most popular Asian-themed slot by PG Soft. Combining traditional mahjong elements with modern slot mechanics, it offers an astounding max multiplier of 3000x.'
            }
        }
    }
}

export const gameCopywritingApi = {
    async get(gameId: string): Promise<{ code: number; msg: string; data: GameCopywriting | null }> {
        await delay(200)
        const data = mockCopywritings[gameId] || null
        return { code: 0, msg: 'success', data: data ? JSON.parse(JSON.stringify(data)) : null }
    },

    async save(gameId: string, copywriting: GameCopywriting): Promise<{ code: number; msg: string }> {
        await delay(300)
        mockCopywritings[gameId] = JSON.parse(JSON.stringify(copywriting))
        return { code: 0, msg: 'success' }
    }
}
