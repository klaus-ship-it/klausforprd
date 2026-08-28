export interface WhitelistEntry {
  id: string
  cidr: string // single IP or CIDR
  remark: string
  enabled: boolean
  creator?: string
  created_at: string
  updated_at?: string
}

export interface CreateWhitelistRequest {
  cidr: string
  remark: string
  enabled?: boolean
}

export interface UpdateWhitelistRequest extends Partial<CreateWhitelistRequest> { }
