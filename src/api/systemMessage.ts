import { 
    MessageRecord, 
    MessageQuery, 
    MessageListResponse, 
    CreateMessagePayload, 
    UpdateMessagePayload 
} from '@/types/systemMessage'

// Generate some mock data
const generateMockMessages = (count: number): MessageRecord[] => {
    const types: MessageRecord['type'][] = ['SYSTEM', 'PROMOTION', 'COMPENSATION', 'PERSONAL']
    const targets: MessageRecord['targetType'][] = ['ALL', 'TAGS', 'SPECIFIC_IDS']
    const statuses: MessageRecord['status'][] = ['SCHEDULED', 'SENT', 'RECALLED']
    const methods: MessageRecord['sendMethod'][] = ['IMMEDIATE', 'SCHEDULED']

    return Array.from({ length: count }, (_, i) => {
        const type = types[Math.floor(Math.random() * types.length)]
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        const method = methods[Math.floor(Math.random() * methods.length)]
        const isSent = status === 'SENT' || status === 'RECALLED'
        
        let targetType = targets[Math.floor(Math.random() * targets.length)]
        const total = isSent ? Math.floor(Math.random() * 5000) + 100 : 0
        const reads = isSent ? Math.floor(Math.random() * total) : 0
        const bonusAmount = Math.random() > 0.5 ? Math.floor(Math.random() * 1000) + 100 : 0
        const claims = isSent && bonusAmount > 0 ? Math.floor(Math.random() * reads) : 0

        const now = new Date()
        const createDate = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        let actualSendTime: string | undefined = undefined
        let scheduledTime: string | undefined = undefined

        if (status === 'SENT') {
            actualSendTime = new Date(createDate.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString()
        }

        if (method === 'SCHEDULED') {
            scheduledTime = new Date(createDate.getTime() + 48 * 60 * 60 * 1000).toISOString()
        }

        return {
            id: `MSG-${10000 + i}`,
            title: `測試信件 - ${type} #${i + 1}`,
            type,
            targetType,
            targetIds: targetType === 'SPECIFIC_IDS' ? ['player1', 'player2'] : undefined,
            targetTags: targetType === 'TAGS' ? ['VIP', 'WHALE'] : undefined,
            content: `<p>這是一封系統生成的測試信件內容。你好 <strong>{nickname}</strong>！</p>`,
            attachmentBonusAmount: bonusAmount,
            status,
            sendMethod: method,
            createTime: createDate.toISOString(),
            scheduledTime,
            actualSendTime,
            totalRecipients: total,
            readCount: reads,
            readRate: total > 0 ? reads / total : 0,
            claimedCount: claims,
            claimRate: total > 0 ? claims / total : 0
        }
    }).sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
}

let mockMessages = generateMockMessages(35)

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const systemMessageApi = {
    async getMessages(query: MessageQuery): Promise<{ code: number; data: MessageListResponse; msg: string }> {
        await delay(500)
        
        let result = [...mockMessages]

        // Filters
        if (query.type) {
            result = result.filter(m => m.type === query.type)
        }
        
        if (query.keyword) {
            const keyword = query.keyword.toLowerCase()
            result = result.filter(m => m.title.toLowerCase().includes(keyword))
        }

        if (query.dateRange && query.dateRange.length === 2 && query.dateRange[0]) {
            const startDate = new Date(query.dateRange[0]).getTime()
            const endDate = new Date(query.dateRange[1]).getTime() + (24 * 60 * 60 * 1000) - 1 // end of day
            
            result = result.filter(m => {
                // Check against actualSendTime, then scheduledTime, then createTime
                const timeStr = m.actualSendTime || m.scheduledTime || m.createTime
                const time = new Date(timeStr).getTime()
                return time >= startDate && time <= endDate
            })
        }

        // Pagination
        const total = result.length
        const start = (query.page - 1) * query.pageSize
        const end = start + query.pageSize
        const items = result.slice(start, end)

        return {
            code: 0,
            data: {
                items,
                total
            },
            msg: 'success'
        }
    },

    async createMessage(payload: CreateMessagePayload): Promise<{ code: number; data: MessageRecord; msg: string }> {
        await delay(600)
        
        const isScheduled = payload.sendMethod === 'SCHEDULED'
        const newMsg: MessageRecord = {
            id: `MSG-${Date.now()}`,
            title: payload.title,
            type: payload.type,
            targetType: payload.targetType,
            targetIds: payload.targetIds,
            targetTags: payload.targetTags,
            content: payload.content,
            attachmentBonusAmount: payload.attachmentBonusAmount || 0,
            status: isScheduled ? 'SCHEDULED' : 'SENT',
            sendMethod: payload.sendMethod,
            scheduledTime: payload.scheduledTime,
            actualSendTime: !isScheduled ? new Date().toISOString() : undefined,
            createTime: new Date().toISOString(),
            totalRecipients: isScheduled ? 0 : Math.floor(Math.random() * 100) + 1,
            readCount: 0,
            readRate: 0,
            claimedCount: 0,
            claimRate: 0
        }

        mockMessages.unshift(newMsg)

        return {
            code: 0,
            data: newMsg,
            msg: '建立成功'
        }
    },

    async updateMessage(payload: UpdateMessagePayload): Promise<{ code: number; msg: string }> {
        await delay(500)
        
        const index = mockMessages.findIndex(m => m.id === payload.id)
        if (index === -1) {
            throw new Error('Message not found')
        }

        const currentMsg = mockMessages[index]
        if (currentMsg.status !== 'SCHEDULED') {
             throw new Error('Only scheduled messages can be updated')
        }

        mockMessages[index] = {
            ...currentMsg,
            ...payload,
            // Keep original ID and creation data
            id: currentMsg.id,
            createTime: currentMsg.createTime
        }

        return {
            code: 0,
            msg: '更新成功'
        }
    },

    async recallMessage(id: string): Promise<{ code: number; msg: string }> {
        await delay(600)
        
        const msg = mockMessages.find(m => m.id === id)
        if (!msg) {
            throw new Error('Message not found')
        }

        // Technically, you could recall a SENDING message to stop the batch,
        // or a SENT message to prevent claiming the attachment. Let's allow recalling anything not already RECALLED.
        if (msg.status === 'RECALLED') {
             throw new Error('Message is already recalled')
        }

        msg.status = 'RECALLED'

        return {
            code: 0,
            msg: '信件撤回成功'
        }
    },

    async getMessageStats(id: string): Promise<{ code: number; data: { readRate: number; claimRate: number }; msg: string }> {
        await delay(200)
        
        const msg = mockMessages.find(m => m.id === id)
        if (!msg) {
            throw new Error('Message not found')
        }

        return {
            code: 0,
            data: {
                readRate: msg.readRate,
                claimRate: msg.claimRate
            },
            msg: 'success'
        }
    }
}
