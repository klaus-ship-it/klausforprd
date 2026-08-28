export type MessageStatus = 'SCHEDULED' | 'SENT' | 'RECALLED'
export type MessageType = 'SYSTEM' | 'PROMOTION' | 'COMPENSATION' | 'PERSONAL'
export type MessageTarget = 'ALL' | 'TAGS' | 'SPECIFIC_IDS'
export type SendMethod = 'IMMEDIATE' | 'SCHEDULED'

export interface MessageRecord {
    id: string
    title: string
    type: MessageType
    targetType: MessageTarget
    targetIds?: string[]      // If targetType is SPECIFIC_IDS, stores the list of IDs
    targetTags?: string[]     // If targetType is TAGS, stores the list of tags
    content: string
    attachmentBonusAmount: number // 0 means no attachment
    status: MessageStatus
    sendMethod: SendMethod
    scheduledTime?: string    // ISO string for scheduled dispatch
    actualSendTime?: string   // ISO string when actually dispatched
    createTime: string
    
    // Stats tracking
    totalRecipients: number
    readCount: number
    readRate: number          // readCount / totalRecipients
    claimedCount: number
    claimRate: number         // claimedCount / totalRecipients
}

export interface MessageQuery {
    page: number
    pageSize: number
    dateRange?: [string, string] // Start and End dates (ISO or YYYY-MM-DD)
    type?: MessageType | null
    keyword?: string // Fuzzy search on title
}

export interface MessageListResponse {
    items: MessageRecord[]
    total: number
}

export interface CreateMessagePayload {
    title: string
    type: MessageType
    targetType: MessageTarget
    targetIds?: string[]
    targetTags?: string[]
    content: string
    attachmentBonusAmount: number
    sendMethod: SendMethod
    scheduledTime?: string // required if sendMethod === 'SCHEDULED'
}

export interface UpdateMessagePayload extends Partial<CreateMessagePayload> {
    id: string
}
