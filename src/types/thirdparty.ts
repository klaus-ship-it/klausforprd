export type ThirdPartyCategory = 'GAME' | 'PAYMENT' | 'SMS' | 'AUTH'

export interface ThirdPartyKey {
  id: string
  category: ThirdPartyCategory
  provider: string
  endpoint: string
  merchant_id: string
  api_key: string
  secret_key_encrypted?: string // stored encrypted in real system
  secret_masked?: string // for UI display (****123)
  ip_whitelist?: string
  proxy?: string
  error?: string
  enabled: boolean
  created_at: string
  updated_at?: string
}

export interface CreateThirdPartyKeyRequest {
  category: ThirdPartyCategory
  provider: string
  endpoint: string
  merchant_id: string
  api_key: string
  secret_key?: string
  ip_whitelist?: string
  proxy?: string
  enabled?: boolean
}

export interface UpdateThirdPartyKeyRequest extends Partial<CreateThirdPartyKeyRequest> { }
