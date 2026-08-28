export type ReportType = 'ggr' | 'deposit' | 'activity' | 'activity_bonus'

export type TargetType = 'all' | 'agent' | 'player'
export type Granularity = 'hour' | 'day' | 'month'

export interface OperationReportQuery {
    reportType: ReportType
    startTime: number
    endTime: number
    granularity: Granularity
    targetType: TargetType
    targetId?: string
    excludeTesting?: boolean
    currency?: string
}

export interface GGRReportRecord {
    date: string
    playerId?: string
    currency: string
    betAmount: number      // 總投注額
    rollingAmount: number  // 有效投注額 (Rolling)
    payoutAmount: number   // 總派彩額 (Win)
    ggr: number            // 損益 (GGR)
    betCount: number       // 總投注次數
    maxBet: number         // 最大投注額
    maxWinRate: number     // 最大派彩倍率
}

export interface DepositReportRecord {
    date: string
    playerId?: string
    totalDepositAmount: number // 總儲值額
    depositCount: number       // 總儲值次數
    uniqueDepositors?: number
    maxDepositAmount: number   // 最大儲值額
    averageDeposit: number      // 平均儲值額
    channelDeposits: { name: string, amount: number }[] // 各儲值通道來源
}

export interface PlayerActivityRecord {
    date: string
    playerId: string
    activeDays: number      // 活躍天數 (or 活躍時數 if hourly)
    activeUsers: number     // 活躍人數
    rollingAmount: number   // 有效投注額
    totalDepositAmount: number // 總儲值額
    betCount: number        // 下注次數
    ggr: number             // GGR
}

export interface ActivityBonusRecord {
    date: string
    playerId: string
    distributedAmount: number // 總派發活動金
    recalledAmount: number    // 總回收活動金
    convertedAmount: number   // 總轉換活動金
    conversionRate: number    // 轉換率 (%)
}

export type OperationReportRecord = GGRReportRecord | DepositReportRecord | PlayerActivityRecord | ActivityBonusRecord;
