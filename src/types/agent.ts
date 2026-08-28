export type AgentIdentity = 'ADMIN' | 'MASTER' | 'SUB' | 'ASSISTANT'
export type AgentStatus = 'NORMAL' | 'LOCKED' | 'FROZEN' | 'DISABLED'

export interface Agent {
  id: string
  uid: string
  username: string
  identity: AgentIdentity
  promo_code: string
  path: string
  cpa_enabled: boolean
  cpa_price: number
  deposit_commission_enabled: boolean
  deposit_commission_rate: number
  commission_wallet: number
  promo_wallet: number
  sub_agent_count: number
  direct_player_count: number
  created_at: string
  status: AgentStatus
  
  // Detail info
  name: string
  phone: string
  contact_info: string
  data_binding_threshold: {
    phone: boolean
    google: boolean
  }
  deposit_threshold: number
  flow_threshold: number
  sensitive_data_permission: boolean
  remark: string
  two_fa_enabled: boolean

  // Group
  group_id?: string
}

export interface AgentSearchParams {
  q?: string
  search_type: 'username' | 'uid' | 'promo_code'
  identity?: AgentIdentity
  status?: AgentStatus
  start_time?: string
  end_time?: string
  page: number
  page_size: number
}

export interface UpdateAgentParams extends Partial<Omit<Agent, 'id' | 'uid' | 'username' | 'promo_code' | 'path' | 'created_at'>> {
  id: string
  password?: string
  parent_id?: string
  change_reason: string
}

export interface CreateAgentParams extends Omit<Agent, 'id' | 'uid' | 'path' | 'created_at' | 'sub_agent_count' | 'direct_player_count' | 'commission_wallet' | 'promo_wallet'> {
  password: string
  parent_id?: string
}

export type AgentWithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface AgentWithdrawalRequest {
  id: string
  order_no: string
  agent_id: string
  agent_name: string
  amount: number
  frozen_balance: number
  method: 'BANK' | 'OFFLINE'
  account_info: string
  status: AgentWithdrawalStatus
  created_at: string
}

export interface AgentWithdrawalSearchParams {
  status?: AgentWithdrawalStatus | 'ALL'
  start_time?: number
  end_time?: number
}

export type TransferExecutionType = 'IMMEDIATE' | 'SCHEDULED'
export type TransferScheduleStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELED'

export interface TransferAgentParams {
  agent_id: string
  new_parent_id: string
  execution_type: TransferExecutionType
  execute_at?: string // ISO string, required if SCHEDULED
  reason: string
}

export interface AgentTransferSchedule {
  id: string
  agent_id: string
  agent_name: string
  agent_uid: string
  original_parent_id: string
  original_parent_name: string
  new_parent_id: string
  new_parent_name: string
  execute_at: string
  reason: string
  status: TransferScheduleStatus
  created_at: string
}

export interface AgentTransferSearchParams {
  status?: TransferScheduleStatus | 'ALL'
  page: number
  page_size: number
}

// ── Agent Group ───────────────────────────────────────────────────────────────

export interface AgentGroup {
  id: string
  name: string
  description: string
  cpa_enabled: boolean
  cpa_price: number
  deposit_commission_enabled: boolean
  deposit_commission_rate: number
  data_binding_threshold: { phone: boolean; google: boolean }
  deposit_threshold: number
  flow_threshold: number
  created_at: string
  agent_count: number
}

export interface CreateAgentGroupParams {
  name: string
  description: string
  cpa_enabled: boolean
  cpa_price: number
  deposit_commission_enabled: boolean
  deposit_commission_rate: number
  data_binding_threshold: { phone: boolean; google: boolean }
  deposit_threshold: number
  flow_threshold: number
}

export interface UpdateAgentGroupParams extends CreateAgentGroupParams {
  id: string
}
