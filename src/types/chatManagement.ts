export type KeywordAction = 'REPLACE' | 'BLOCK' | 'MONITOR'
export type KeywordStatus = 'ACTIVE' | 'INACTIVE'
export type TriggerStatus = 'PENDING' | 'BANNED' | 'IGNORED' | 'AUTO_RESOLVED'

export interface KeywordRecord {
    id: string
    keyword: string
    action: KeywordAction
    weight: number
    status: KeywordStatus
    createTime: string
    updateTime: string
}

export interface KeywordQuery {
    page: number
    pageSize: number
    keyword?: string
    status?: KeywordStatus | null
}

export interface KeywordListResponse {
    items: KeywordRecord[]
    total: number
}

export interface CreateKeywordPayload {
    keyword: string
    action: KeywordAction
    weight: number
    status: KeywordStatus
}

export interface UpdateKeywordPayload extends CreateKeywordPayload {
    id: string
}

export interface TriggerRecord {
    id: string
    playerId: string
    content: string
    matchedKeyword: string
    frequency: number // Frequency in 1 hour
    actionTaken: KeywordAction // The action that was taken at the time
    triggerTime: string
    status: TriggerStatus
}

export interface TriggerQuery {
    page: number
    pageSize: number
    playerId?: string
    status?: TriggerStatus | null
    timeRange?: [string, string] | null
}

export interface TriggerListResponse {
    items: TriggerRecord[]
    total: number
}

export interface ProcessTriggerPayload {
    id: string
    playerId: string
    action: 'BAN' | 'IGNORE'
    syncAllPending: boolean
    deleteAllMessages: boolean
}

export interface BatchProcessTriggerPayload {
    ids: string[]
    action: 'BAN' | 'IGNORE'
}
