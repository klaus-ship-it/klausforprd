// OPE-1201: Message Settings Types

export interface MessageEvent {
    id: string
    eventCode: string
    eventName: string // translation key
    siteMessageEnabled: boolean
    emailEnabled: boolean
    smsEnabled: boolean
    templateContent: string
    subject?: string
    bonusAmount?: number
    availableVariables: string[]
}

export interface TestMessagePayload {
    playerId: string
    eventCode: string
}
