export type Platform = 'IOS' | 'ANDROID' | 'H5'
export type UpdateType = 'NONE' | 'OPTION' | 'FORCE'

export interface VersionRecord {
  id: string
  platforms: Platform[]
  version: string // semantic version e.g. 1.2.0
  build: number // internal incremental build code
  update_type: UpdateType
  download_link: string
  title: string
  changelog: Record<string, string> // locale -> text
  enabled: boolean
  created_at: string
  updated_at?: string
}

export interface CreateVersionRequest {
  platforms: Platform[]
  version: string
  build: number
  update_type: UpdateType
  download_link: string
  title: string
  changelog: Record<string, string>
  enabled?: boolean
}

export interface UpdateVersionRequest extends Partial<CreateVersionRequest> { }
