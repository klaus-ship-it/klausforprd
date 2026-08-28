// User & Auth Types
export type UserRole = 'DEVELOPER' | 'MANAGER' | 'USER' | 'MERCHANT'
export type UserStatus = 'ENABLED' | 'DISABLED' | 'LOCKED'

export interface UserInfo {
  user_id: string
  name: string
  role: UserRole
  permissions: string[]
  email?: string
  avatar?: string
  groups?: string[] // 一般用户所属的群组 ID
}

export interface AuthState {
  token: string | null
  user: UserInfo | null
  isAuthenticated: boolean
}

// Permission & Group Types (OPE-102/103)
export interface Permission {
  id: string
  name: string
  code: string
  module: string
  level: 'NONE' | 'READ' | 'WRITE'
  description?: string
  parent_id?: string
}

export interface PermissionGroup {
  id: string
  name: string
  description?: string
  permissions: Record<string, 'NONE' | 'READ' | 'WRITE'> // permission_code -> level
  member_count: number
  created_by?: string
  created_at?: string
  updated_by?: string
  updated_at?: string
  status?: 'ENABLED' | 'DISABLED'
  deleted_at?: string
  deleted_by?: string
  sensitive_permissions?: Record<string, boolean> // module_name -> boolean
}

export interface AdminAccount {
  id: string
  username: string
  display_name: string
  role: Exclude<UserRole, 'MERCHANT'> // 不包含商户角色
  groups?: string[] // 一般用户的群组 ID
  status: UserStatus
  email?: string
  two_fa_enabled?: boolean
  last_login?: string
  last_login_ip?: string
  created_at?: string
  updated_at?: string
  deleted_at?: string
  deleted_by?: string
}

export interface OperationLog {
  id: string | number
  timestamp: string
  operator_id: string
  operator_username: string
  operator_role: UserRole
  module: string
  operation_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIP_AUTO_PROMOTE' | 'VIP_AUTO_DEMOTE' | 'VIP_MANUAL_ADJUST'
  source_ip: string
  user_agent?: string
  old_value?: Record<string, any>
  new_value?: Record<string, any>
  result: 'SUCCESS' | 'FAILURE'
  error_reason?: string
}

// Merchant Types
export interface Merchant {
  id: number
  display_id: string
  name: string
  currency_type: string
  wallet_mode: 'transfer' | 'seamless'
  revenue_share: number
  ip_whitelist: string[]
  secret_key: string
  balance?: string
  credit_limit?: string
}

export interface MerchantConfig {
  id: number
  display_id: string
  name: string
  wallet_mode: 'transfer' | 'seamless'
  currency_type: string
}

// API Response Types
export interface ApiResponse<T = any> {
  code: number
  msg: string
  data?: T
}

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResponse<T = any> {
  items: T[]
  total: number
  page: number
  pageSize: number
  summary?: any
}

// Config Types
export interface ConfigState {
  locale: 'en' | 'zh-TW' | 'zh-CN'
  theme: 'light' | 'dark'
  serverTime: Date
}
