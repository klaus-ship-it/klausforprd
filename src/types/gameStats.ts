export type GameStatsTargetType = 'all' | 'provider' | 'type' | 'game'
export type Granularity = 'hour' | 'day' | 'month'

export interface GameStatsQuery {
    startTime: number
    endTime: number
    granularity: Granularity
    targetType: GameStatsTargetType
    targetProvider?: string
    targetGameType?: string
    targetId?: string
    excludeTesting?: boolean
    currency?: string
}

export interface GameStatsRecord {
    date: string
    providerName: string
    gameType: string
    gameId: string
    gameName: string
    betCount: number
    betAmount: number
    payoutAmount: number
    ggr: number
    ggrRatio: number // in percentage
    maxBet: number
    maxWinRate: number
    activePlayers: number
    arpu: number
}
