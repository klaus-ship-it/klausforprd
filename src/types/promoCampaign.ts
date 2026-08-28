// ── 優惠活動（PromoCampaign）型別定義 ────────────────────────────

export type CampaignStatus = 'Draft' | 'Active' | 'Inactive' | 'Force Closed'

export interface CampaignTag {
  id: string
  name: string
  color?: string
}

export interface CampaignParticipantInfo {
  joined: number
  limit: number | null // null = 不限
}

export interface CampaignCreatorInfo {
  creator: string
  createdAt: string    // YYYY-MM-DD HH:mm:ss
  updatedBy: string
  updatedAt: string    // YYYY-MM-DD HH:mm:ss
}

// ── Step 2: 參加條件 ──────────────────────────────────────────
export type DeductionMode = 'FIXED' | 'INPUT'
export type FreqCalcMode = '24H' | '1D'
export type FreqPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SPECIFIC_WEEKDAY' | 'SPECIFIC_DATE'
export type DepositSourceType = 'MAIN_WALLET' | 'DEPOSIT_24H' | 'DEPOSIT_TODAY'
export type DepositConditionType =
  | 'TOTAL_DEPOSIT'
  | 'TODAY_DEPOSIT'
  | 'FIRST_DEPOSIT'
  | 'TODAY_FIRST_DEPOSIT'
  | 'WEEKLY_FIRST_DEPOSIT'
  | 'LAST_WEEK_TOTAL'
  | 'THIS_WEEK_TOTAL'
  | 'THIS_MONTH_TOTAL'

export interface TimeRange {
  start: string  // 'HH:mm:ss'
  end: string    // 'HH:mm:ss'
}

export interface CampaignConditions {
  // ─ 先前流水 & 標籤排他
  requirePreviousTurnover: boolean
  excludeTags: string[]
  // ─ 先決活動
  requiredCampaigns: string[]
  requiredCampaignsLogic: 'ALL' | 'ANY'
  // ─ 參加金額來源
  depositSource: DepositSourceType
  allowedPaymentMethods: string[]   // 僅 DEPOSIT_24H / DEPOSIT_TODAY 時啟用
  // ─ 扣款模式與門檻
  deductionMode: DeductionMode      // FIXED | INPUT
  participationAmount: number       // 固定金額或輸入門檻值
  // ─ 存款條件
  depositConditionType: DepositConditionType | null
  firstDepositWithin24h: boolean    // 僅 FIRST_DEPOSIT 時啟用
  depositAmountThreshold: number | null  // 配合 depositConditionType 的門檻
  // ─ 當月存款次數
  monthlyDepositCount: number
  // ─ APP 限定
  appOnly: boolean
  // ─ 次數限制
  maxParticipantsPerUser: number
  maxParticipantsPerIp: number
  maxParticipantsPerDevice: number
  // ─ 頻率
  freqCalcMode: FreqCalcMode        // 24H | 1D
  freqPeriod: FreqPeriod
  freqSpecificWeekdays: number[]    // 0=週日, 1=週一 ~ 6=週六
  freqSpecificDates: number[]       // 1 ~ 31
  // ─ 時段限制
  timeRanges: TimeRange[]
}

// ── Step 3: 玩家篩選 ──────────────────────────────────────────
export interface CampaignTargetAudience {
  totalLimit: number
  dailyLimit: number
  vipLevels: string[]
  memberTags: string[]
  agents: string[]
  registerDateStart: string | null
  registerDateEnd: string | null
}

// ── Step 4: 遊戲設定 ──────────────────────────────────────────
export interface CampaignGameSettings {
  allowedGameTypes: string[] // Tree nodes e.g. 'JDB', 'JDB_SLOT'
  blockStrategy: 'BLOCK' | 'ALLOW_NO_TURNOVER'
}

// ── Step 5: 獎勵設定 ──────────────────────────────────────────
export type RewardType = 'FIXED' | 'MULTIPLY'

export interface CampaignRewardSettings {
  rewardType: RewardType
  rewardValue: number
  maxReward: number
  maxWithdrawal: number // 帶出上限
}

// ── Step 6: 達成與解除條件 ──────────────────────────────────────
export type TurnoverCalcMode = 'FIXED' | 'MULTIPLY'
export type AchieveConditionMode = 'TURNOVER' | 'NETWIN' | 'BALANCE'

export interface GameTypeWeight {
  gameType: string
  ratioA: number
  ratioB: number
  weight: number // ratioA / ratioB
}

export interface CampaignReleaseConditions {
  loseThreshold: number // 解除條件 (輸光門檻)
  netwinCheck: boolean // Netwin 風控查核
  achieveModes: AchieveConditionMode[] // 過招條件
  turnoverMode: TurnoverCalcMode | null
  turnoverValue: number | null
  gameWeights: GameTypeWeight[]
  netwinThreshold: number | null
  balanceThreshold: number | null
  autoNextCampaign: boolean
  nextCampaignId: string | null
}

// ── 主活動型別 ──────────────────────────────────────────────
export interface PromoCampaign {
  id: string                       // PRM-20260708-001
  name: string                     // 活動名稱
  tags: CampaignTag[]              // 活動標籤（Pill format）
  systemTags?: string[]            // 保留系統標籤
  status: CampaignStatus           // 活動狀態
  frontendVisible: boolean         // 前台顯示
  frontendApply: boolean           // 前台申請
  applyBlockMessage?: string       // 文案阻擋提示
  joinStart: string                // 參加時間起
  joinEnd: string                  // 參加時間迄
  settlementDeadline: string       // 最後結算時間
  description?: string             // 活動描述 (Rich Text)
  
  participants: CampaignParticipantInfo
  creatorInfo: CampaignCreatorInfo
  agentChannel?: string            // 代理商/渠道
  
  // 圖片
  listImage?: string
  bannerImage?: string

  // Step 2~6 資料 (如果是舊活動或是建立中，可能為 undefined)
  conditions?: CampaignConditions
  targetAudience?: CampaignTargetAudience
  gameSettings?: CampaignGameSettings
  rewardSettings?: CampaignRewardSettings
  releaseConditions?: CampaignReleaseConditions
}

/** 查詢參數 */
export interface CampaignQueryParams {
  page: number
  pageSize: number
  keyword?: string
  tags?: string[]
  statuses?: CampaignStatus[]
  frontendVisible?: boolean | null
  frontendApply?: boolean | null
  joinTimeStart?: string
  joinTimeEnd?: string
  agentChannel?: string
}

/** 新增/編輯時使用的表單資料 */
export type CreateCampaignPayload = Omit<PromoCampaign, 'id' | 'participants' | 'creatorInfo'>
