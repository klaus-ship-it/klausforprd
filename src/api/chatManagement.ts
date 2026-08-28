import {
    KeywordRecord,
    KeywordQuery,
    KeywordListResponse,
    CreateKeywordPayload,
    UpdateKeywordPayload,
    TriggerRecord,
    TriggerQuery,
    TriggerListResponse,
    ProcessTriggerPayload,
    BatchProcessTriggerPayload
} from '@/types/chatManagement'

// --- MOCK DATA FOR KEYWORDS ---
const generateMockKeywords = (): KeywordRecord[] => {
    return [
        { id: 'KW-001', keyword: '代操', action: 'BLOCK', weight: 5, status: 'ACTIVE', createTime: new Date(Date.now() - 10000000).toISOString(), updateTime: new Date(Date.now() - 10000000).toISOString() },
        { id: 'KW-002', keyword: '外掛', action: 'BLOCK', weight: 10, status: 'ACTIVE', createTime: new Date(Date.now() - 20000000).toISOString(), updateTime: new Date(Date.now() - 20000000).toISOString() },
        { id: 'KW-003', keyword: '保本', action: 'REPLACE', weight: 2, status: 'ACTIVE', createTime: new Date(Date.now() - 30000000).toISOString(), updateTime: new Date(Date.now() - 30000000).toISOString() },
        { id: 'KW-004', keyword: '加賴', action: 'MONITOR', weight: 1, status: 'ACTIVE', createTime: new Date(Date.now() - 40000000).toISOString(), updateTime: new Date(Date.now() - 40000000).toISOString() },
        { id: 'KW-005', keyword: '帶牌', action: 'REPLACE', weight: 3, status: 'INACTIVE', createTime: new Date(Date.now() - 50000000).toISOString(), updateTime: new Date(Date.now() - 50000000).toISOString() }
    ]
}
let mockKeywords = generateMockKeywords()

// --- MOCK DATA FOR TRIGGERS ---
const generateMockTriggers = (): TriggerRecord[] => {
    const players = ['user123', 'guest999', 'pro_gamer', 'tester', 'whale01']
    const keywords = ['代操', '外掛', '保本', '加賴']
    const actions: ('REPLACE' | 'BLOCK' | 'MONITOR')[] = ['REPLACE', 'BLOCK', 'MONITOR']
    const statuses: ('PENDING' | 'BANNED' | 'IGNORED' | 'AUTO_RESOLVED')[] = ['PENDING', 'PENDING', 'BANNED', 'IGNORED', 'AUTO_RESOLVED']
    
    return Array.from({ length: 45 }, (_, i) => {
        const playerId = players[Math.floor(Math.random() * players.length)]
        const kw = keywords[Math.floor(Math.random() * keywords.length)]
        const action = actions[Math.floor(Math.random() * actions.length)]
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        
        let content = ''
        switch (kw) {
            case '代操': content = `有人需要${kw}服務嗎？包贏`; break;
            case '外掛': content = `這遊戲有${kw}可以買嗎？`; break;
            case '保本': content = `投資理財，保證${kw}高獲利`; break;
            case '加賴': content = `看美女${kw}：abc1234`; break;
        }

        return {
            id: `TRG-${1000 + i}`,
            playerId,
            content,
            matchedKeyword: kw,
            frequency: Math.floor(Math.random() * 5) + 1, // 1 to 5 times in an hour
            actionTaken: action,
            triggerTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            status
        }
    }).sort((a, b) => new Date(b.triggerTime).getTime() - new Date(a.triggerTime).getTime())
}
let mockTriggers = generateMockTriggers()

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const chatManagementApi = {
    // --- KEYWORD API ---
    async getKeywords(query: KeywordQuery): Promise<{ code: number; data: KeywordListResponse; msg: string }> {
        await delay(300)
        let result = [...mockKeywords]
        
        if (query.status) {
            result = result.filter(k => k.status === query.status)
        }
        if (query.keyword) {
            result = result.filter(k => k.keyword.includes(query.keyword!))
        }

        const total = result.length
        const start = (query.page - 1) * query.pageSize
        const end = start + query.pageSize
        const items = result.slice(start, end)

        return { code: 0, data: { items, total }, msg: 'success' }
    },

    async createKeyword(payload: CreateKeywordPayload): Promise<{ code: number; msg: string }> {
        await delay(400)
        const newKw: KeywordRecord = {
            id: `KW-00${mockKeywords.length + 1}`,
            ...payload,
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
        }
        mockKeywords.unshift(newKw)
        return { code: 0, msg: '新增成功' }
    },

    async updateKeyword(payload: UpdateKeywordPayload): Promise<{ code: number; msg: string }> {
        await delay(400)
        const idx = mockKeywords.findIndex(k => k.id === payload.id)
        if (idx === -1) throw new Error('Keyword not found')
        
        mockKeywords[idx] = {
            ...mockKeywords[idx],
            ...payload,
            updateTime: new Date().toISOString()
        }
        return { code: 0, msg: '更新成功' }
    },

    async deleteKeyword(id: string): Promise<{ code: number; msg: string }> {
        await delay(300)
        mockKeywords = mockKeywords.filter(k => k.id !== id)
        return { code: 0, msg: '刪除成功' }
    },

    // --- TRIGGER AUDIT API ---
    async getTriggers(query: TriggerQuery): Promise<{ code: number; data: TriggerListResponse; msg: string }> {
        await delay(300)
        let result = [...mockTriggers]

        if (query.status) {
            result = result.filter(t => t.status === query.status)
        }
        if (query.playerId) {
            result = result.filter(t => t.playerId.includes(query.playerId!))
        }
        if (query.timeRange && query.timeRange.length === 2 && query.timeRange[0]) {
             const start = new Date(query.timeRange[0]).getTime()
             const end = new Date(query.timeRange[1]).getTime() + 86400000 - 1
             result = result.filter(t => {
                 const time = new Date(t.triggerTime).getTime()
                 return time >= start && time <= end
             })
        }

        const total = result.length
        const start = (query.page - 1) * query.pageSize
        const end = start + query.pageSize
        const items = result.slice(start, end)

        return { code: 0, data: { items, total }, msg: 'success' }
    },

    async processTrigger(payload: ProcessTriggerPayload): Promise<{ code: number; msg: string; autoResolvedCount?: number }> {
        await delay(500)
        const target = mockTriggers.find(t => t.id === payload.id)
        if (!target) throw new Error('Record not found')

        let autoResolvedCount = 0

        if (payload.action === 'BAN') {
            target.status = 'BANNED'
            
            // Sync all pending records for this player
            if (payload.syncAllPending) {
                mockTriggers.forEach(t => {
                    if (t.playerId === target.playerId && t.status === 'PENDING' && t.id !== target.id) {
                        t.status = 'AUTO_RESOLVED'
                        autoResolvedCount++
                    }
                })
            }
        } else if (payload.action === 'IGNORE') {
            target.status = 'IGNORED'
        }

        let msg = payload.action === 'BAN' ? '玩家已禁言' : '已忽略該紀錄'
        if (autoResolvedCount > 0) {
            msg += `，並同步結案 ${autoResolvedCount} 筆相關紀錄`
        }

        return { code: 0, msg, autoResolvedCount }
    },

    async batchProcessTriggers(payload: BatchProcessTriggerPayload): Promise<{ code: number; msg: string }> {
        await delay(600)
        let processed = 0
        mockTriggers.forEach(t => {
            if (payload.ids.includes(t.id) && t.status === 'PENDING') {
                t.status = payload.action === 'BAN' ? 'BANNED' : 'IGNORED'
                processed++
            }
        })
        return { code: 0, msg: `已批次處理 ${processed} 筆紀錄` }
    }
}
