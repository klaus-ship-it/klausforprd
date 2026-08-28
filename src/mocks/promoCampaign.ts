import { PromoCampaign, CampaignTag, CampaignConditions, CampaignTargetAudience, CampaignGameSettings, CampaignRewardSettings, CampaignReleaseConditions } from '@/types/promoCampaign'

// ── 預置標籤清單 ───────────────────────────────────────────────────
export const mockCampaignTags: CampaignTag[] = [
  { id: 'TAG_REGISTER', name: 'Register', color: '#6366f1' },
  { id: 'TAG_VIP', name: 'VIP', color: '#f59e0b' },
  { id: 'TAG_DEPOSIT', name: 'Deposit', color: '#10b981' },
  { id: 'TAG_TURNOVER', name: 'Turnover', color: '#3b82f6' },
  { id: 'TAG_NEWBIE', name: 'Newbie', color: '#8b5cf6' },
  { id: 'TAG_SEASONAL', name: 'Seasonal', color: '#ef4444' },
  { id: 'TAG_REFERRAL', name: 'Referral', color: '#14b8a6' },
]

// ── 預設擴充設定 (Step 2 ~ Step 6) ──────────────────────────────────
const defaultConditions: CampaignConditions = {
  requirePreviousTurnover: false,
  excludeTags: [],
  requiredCampaigns: [],
  requiredCampaignsLogic: 'ALL',
  depositSource: 'MAIN_WALLET',
  allowedPaymentMethods: [],
  deductionMode: 'FIXED',
  depositConditionType: 'TOTAL',
  depositAmountCondition: null,
  appOnly: false,
  maxParticipantsPerUser: 1,
  maxParticipantsPerIp: 1,
  maxParticipantsPerDevice: 1,
  monthlyDepositCount: 0,
  freqCalcMode: '1D',
  freqPeriod: 'DAILY',
  timeRanges: []
}

const defaultTargetAudience: CampaignTargetAudience = {
  totalLimit: 0,
  dailyLimit: 0,
  vipLevels: ['VIP1', 'VIP2', 'VIP3', 'VIP4', 'VIP5'],
  memberTags: [],
  agents: [],
  registerDateStart: null,
  registerDateEnd: null
}

const defaultGameSettings: CampaignGameSettings = {
  allowedGameTypes: ['JDB_SLOT', 'PG_SLOT'], // Mock tree nodes
  blockStrategy: 'BLOCK'
}

const defaultRewardSettings: CampaignRewardSettings = {
  rewardType: 'FIXED',
  rewardValue: 100,
  maxReward: 100,
  maxWithdrawal: 0
}

const defaultReleaseConditions: CampaignReleaseConditions = {
  loseThreshold: 5,
  netwinCheck: true,
  achieveModes: ['TURNOVER'],
  turnoverMode: 'FIXED',
  turnoverValue: 1000,
  gameWeights: [{ gameType: 'SLOT', weight: 1.0 }],
  netwinThreshold: null,
  balanceThreshold: null,
  autoNextCampaign: false,
  nextCampaignId: null
}

const appendDefaults = (campaign: Partial<PromoCampaign>): PromoCampaign => {
  return {
    ...campaign,
    conditions: { ...defaultConditions, ...campaign.conditions },
    targetAudience: { ...defaultTargetAudience, ...campaign.targetAudience },
    gameSettings: { ...defaultGameSettings, ...campaign.gameSettings },
    rewardSettings: { ...defaultRewardSettings, ...campaign.rewardSettings },
    releaseConditions: { ...defaultReleaseConditions, ...campaign.releaseConditions },
  } as PromoCampaign
}

// ── Mock 優惠活動資料 ─────────────────────────────────────────────
export const mockCampaigns: PromoCampaign[] = [
  appendDefaults({
    id: 'PRM-20260708-001',
    name: 'Free(2026_May) 新手儲值加倍',
    tags: [
      { id: 'TAG_REGISTER', name: 'Register', color: '#6366f1' },
      { id: 'TAG_NEWBIE', name: 'Newbie', color: '#8b5cf6' },
      { id: 'TAG_DEPOSIT', name: 'Deposit', color: '#10b981' },
    ],
    status: 'Active',
    frontendVisible: true,
    frontendApply: true,
    joinStart: '2026-05-01 00:00:00',
    joinEnd: '2026-05-31 23:59:59',
    settlementDeadline: '2026-06-07 23:59:59',
    participants: { joined: 120, limit: 500 },
    creatorInfo: {
      creator: 'admin_alice',
      createdAt: '2026-04-28 10:23:45',
      updatedBy: 'admin_alice',
      updatedAt: '2026-05-01 08:00:00',
    },
    agentChannel: 'AG_PRIME',
    rewardSettings: { rewardType: 'MULTIPLY', rewardValue: 1.5, maxReward: 5000, maxWithdrawal: 10000 },
    conditions: { ...defaultConditions, deductionMode: 'INPUT' }
  }),
  appendDefaults({
    id: 'PRM-20260708-002',
    name: 'VIP Summer Bonus 2026',
    tags: [
      { id: 'TAG_VIP', name: 'VIP', color: '#f59e0b' },
      { id: 'TAG_SEASONAL', name: 'Seasonal', color: '#ef4444' },
    ],
    status: 'Active',
    frontendVisible: true,
    frontendApply: false,
    joinStart: '2026-06-01 00:00:00',
    joinEnd: '2026-08-31 23:59:59',
    settlementDeadline: '2026-09-07 23:59:59',
    participants: { joined: 88, limit: 200 },
    creatorInfo: {
      creator: 'admin_bob',
      createdAt: '2026-05-20 15:44:10',
      updatedBy: 'admin_alice',
      updatedAt: '2026-06-01 00:05:00',
    },
    agentChannel: 'AG_GOLD',
  }),
  appendDefaults({
    id: 'PRM-20260615-003',
    name: 'Referral Cashback Q2',
    tags: [
      { id: 'TAG_REFERRAL', name: 'Referral', color: '#14b8a6' },
      { id: 'TAG_TURNOVER', name: 'Turnover', color: '#3b82f6' },
    ],
    status: 'Inactive',
    frontendVisible: false,
    frontendApply: false,
    joinStart: '2026-04-01 00:00:00',
    joinEnd: '2026-06-30 23:59:59',
    settlementDeadline: '2026-07-07 23:59:59',
    participants: { joined: 340, limit: null },
    creatorInfo: {
      creator: 'admin_charlie',
      createdAt: '2026-03-25 09:12:00',
      updatedBy: 'admin_charlie',
      updatedAt: '2026-06-30 23:00:00',
    },
    agentChannel: 'AG_PRIME',
  }),
  appendDefaults({
    id: 'PRM-20260520-004',
    name: 'Dragon Boat Festival Special',
    tags: [
      { id: 'TAG_SEASONAL', name: 'Seasonal', color: '#ef4444' },
      { id: 'TAG_DEPOSIT', name: 'Deposit', color: '#10b981' },
      { id: 'TAG_VIP', name: 'VIP', color: '#f59e0b' },
      { id: 'TAG_NEWBIE', name: 'Newbie', color: '#8b5cf6' },
    ],
    status: 'Force Closed',
    frontendVisible: false,
    frontendApply: false,
    joinStart: '2026-06-10 00:00:00',
    joinEnd: '2026-06-12 23:59:59',
    settlementDeadline: '2026-06-19 23:59:59',
    participants: { joined: 512, limit: 600 },
    creatorInfo: {
      creator: 'admin_alice',
      createdAt: '2026-05-20 11:00:00',
      updatedBy: 'admin_bob',
      updatedAt: '2026-06-11 14:22:33',
    },
    agentChannel: 'AG_SILVER',
  }),
  appendDefaults({
    id: 'PRM-20260701-005',
    name: 'July Independence Reload',
    tags: [
      { id: 'TAG_DEPOSIT', name: 'Deposit', color: '#10b981' },
    ],
    status: 'Draft',
    frontendVisible: false,
    frontendApply: false,
    joinStart: '2026-07-04 00:00:00',
    joinEnd: '2026-07-31 23:59:59',
    settlementDeadline: '2026-08-07 23:59:59',
    participants: { joined: 0, limit: 300 },
    creatorInfo: {
      creator: 'admin_dave',
      createdAt: '2026-07-01 16:00:00',
      updatedBy: 'admin_dave',
      updatedAt: '2026-07-01 16:00:00',
    },
  }),
  appendDefaults({
    id: 'PRM-20260625-006',
    name: 'Weekly Cashback Loyalty',
    tags: [
      { id: 'TAG_TURNOVER', name: 'Turnover', color: '#3b82f6' },
      { id: 'TAG_VIP', name: 'VIP', color: '#f59e0b' },
    ],
    status: 'Active',
    frontendVisible: true,
    frontendApply: true,
    joinStart: '2026-07-07 00:00:00',
    joinEnd: '2026-12-31 23:59:59',
    settlementDeadline: '2027-01-07 23:59:59',
    participants: { joined: 77, limit: null },
    creatorInfo: {
      creator: 'admin_alice',
      createdAt: '2026-06-25 08:30:00',
      updatedBy: 'admin_alice',
      updatedAt: '2026-07-07 00:01:00',
    },
    agentChannel: 'AG_GOLD',
  }),
  appendDefaults({
    id: 'PRM-20260610-007',
    name: 'Register & Win 2026 Summer',
    tags: [
      { id: 'TAG_REGISTER', name: 'Register', color: '#6366f1' },
      { id: 'TAG_NEWBIE', name: 'Newbie', color: '#8b5cf6' },
      { id: 'TAG_REFERRAL', name: 'Referral', color: '#14b8a6' },
    ],
    status: 'Inactive',
    frontendVisible: true,
    frontendApply: false,
    joinStart: '2026-06-01 00:00:00',
    joinEnd: '2026-06-30 23:59:59',
    settlementDeadline: '2026-07-14 23:59:59',
    participants: { joined: 1205, limit: null },
    creatorInfo: {
      creator: 'admin_charlie',
      createdAt: '2026-06-10 10:00:00',
      updatedBy: 'admin_bob',
      updatedAt: '2026-07-01 00:01:00',
    },
    agentChannel: 'AG_PRIME',
  }),
]

// 代理商渠道清單（僅顯示總代理）
export const mockAgentChannels = [
  { id: 'AG_PRIME', name: 'AG_PRIME (旗艦總代)' },
  { id: 'AG_GOLD', name: 'AG_GOLD (黃金總代)' },
  { id: 'AG_SILVER', name: 'AG_SILVER (白銀總代)' },
]
