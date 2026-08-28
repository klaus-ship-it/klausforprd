// ==========================================
// 代理報表 Types
// ==========================================

export type AgentReportSearchType = 'username' | 'uid' | 'promo_code' | 'agentId'
export type AgentIdentityType = 'MASTER' | 'SUB'

// 主列表 - 代理報表記錄
export interface AgentReportRecord {
  agentId: string
  agentUsername: string
  agentUid: string
  identityType: AgentIdentityType
  agentPath: string               // 代理路徑，e.g. 平台 > A總代 > B子代
  agentLevel: number              // 代理層級 (1:總代理, 2:一級代理, 3:二級代理...)
  parentAgentId: string | null    // 直屬上級代理 ID

  // 推廣數據
  totalRegistrations: number      // 總註冊人數
  totalFirstDepositors: number    // 首儲人數
  cpaQualifiedCount: number       // CPA 達標人數

  // 財務數據
  totalDepositAmount: number      // 總儲值金額
  totalTurnoverAmount: number     // 總流水金額

  // 佣金成本
  totalCommissionCost: number     // 總佣金成本 (CPA + 儲值抽成)
  totalPromoDistributed: number   // 總派發推廣金

  // 計算欄位
  ggr: number                     // 平台 GGR
  ngr: number                     // 淨獲利 NGR = GGR - 佣金成本 - 推廣金
}

// 子列表 - 玩家對帳明細
export interface AgentPlayerDetailRecord {
  playerId: string
  playerUsername: string
  agentId: string

  firstDepositAmount: number      // 首次儲值金額
  secondDepositAmount: number     // 二次儲值金額
  totalDepositAmount: number      // 總儲值金額
  totalBetAmount: number          // 總投注
  totalValidBetAmount: number     // 有效投注
  totalPayoutAmount: number       // 總派彩
  p2pTransactionAmount: number    // P2P 交易額
  activityBonusUsed: number       // 使用優惠 (活動銀幣)
  promoReceived: number           // 獲得推廣金
}

// 查詢條件 - 主列表
export interface AgentReportQuery {
  q?: string                          // 搜尋關鍵字
  searchType: AgentReportSearchType   // 搜尋類型
  agentLevel?: number                 // 代理層級篩選
  startTime: number                   // 開始時間戳 (ms)
  endTime: number                     // 結束時間戳 (ms)
  page: number
  pageSize: number
}

// 查詢條件 - 玩家明細子列表
export interface AgentPlayerDetailQuery {
  agentId: string
  startTime: number
  endTime: number
  keyword?: string                    // 玩家帳號關鍵字搜尋
  page: number
  pageSize: number
}

// 匯出報表任務
export interface ExportAgentReportParams {
  q?: string
  searchType: AgentReportSearchType
  startTime: number
  endTime: number
}
