// OPE-501: Operation Config Types
export interface OperationConfig {
  // 營運與維護
  maintenance_enabled: boolean
  maintenance_message: Record<string, string> // i18n
  maintenance_kickout_delay_seconds: number
  allow_test_login: boolean
  registration_enabled: boolean

  // 網站基礎設定
  site_title: string
  default_language: string
  timezone: string

  // 推廣與財務參數
  p2p_transaction_fee: number // %
  bonus_rollover_multiplier: number // M
  registration_bonus_amount: number
  rollover_settlement_threshold: number // 流水結算極小值

  // 安全性設定
  login_error_limit: number
  captcha_enabled: boolean
  force_phone_binding: boolean
  whitelist_ips: string

  // 其他/舊有 (保留或依需求調整)
  payout_threshold_multiplier?: number
  password_reset_cooldown_hours?: number
  session_timeout_minutes?: number

  // 審核資訊
  updated_at: string
  updated_by: string
}

export type UpdateOperationConfigRequest = Partial<Omit<OperationConfig, 'updated_at' | 'updated_by'>>

export interface ConfigAuditLog {
  id: string
  updated_by: string
  change_reason: string
  updated_at: string
  before_value: Record<string, any>
  after_value: Record<string, any>
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
}
