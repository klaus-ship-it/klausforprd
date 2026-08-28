import { ApiResponse } from '@/types'
import { VersionRecord, CreateVersionRequest, UpdateVersionRequest, Platform } from '@/types/version'
import { mockVersions } from '@/mocks/version'

const delay = (ms = 300) => new Promise(res => setTimeout(res, ms))

// Compare semantic versions. Return 1 if a>b, -1 if a<b, 0 if equal
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(n => parseInt(n || '0', 10))
  const pb = b.split('.').map(n => parseInt(n || '0', 10))
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}

export const versionApi = {
  async list(): Promise<ApiResponse<VersionRecord[]>> {
    await delay()
    return { code: 0, msg: 'success', data: mockVersions }
  },

  async get(id: string): Promise<ApiResponse<VersionRecord>> {
    await delay()
    const it = mockVersions.find(v => v.id === id)
    if (!it) return { code: 404, msg: 'Not found' }
    return { code: 0, msg: 'success', data: it }
  },

  async create(req: CreateVersionRequest): Promise<ApiResponse<VersionRecord>> {
    await delay()
    const id = `V${Math.floor(Math.random() * 100000)}`
    const now = new Date().toISOString()
    const rec: VersionRecord = { id, ...req, enabled: req.enabled === undefined ? true : req.enabled, created_at: now, updated_at: now }
    mockVersions.unshift(rec)
    return { code: 0, msg: 'success', data: rec }
  },

  async update(id: string, req: UpdateVersionRequest): Promise<ApiResponse<void>> {
    await delay()
    const idx = mockVersions.findIndex(v => v.id === id)
    if (idx === -1) return { code: 404, msg: 'Not found' }
    mockVersions[idx] = { ...mockVersions[idx], ...req, updated_at: new Date().toISOString() }
    return { code: 0, msg: 'success' }
  },

  async remove(id: string): Promise<ApiResponse<void>> {
    await delay()
    const idx = mockVersions.findIndex(v => v.id === id)
    if (idx === -1) return { code: 404, msg: 'Not found' }
    mockVersions.splice(idx, 1)
    return { code: 0, msg: 'success' }
  },

  // Given platform and currentVersion, return applicable update info (if any)
  async checkForUpdate(platform: Platform, currentVersion: string): Promise<ApiResponse<{ shouldUpdate: boolean; force: boolean; latest?: VersionRecord }>> {
    await delay(50)
    // find enabled records for platform
    const candidates = mockVersions.filter(v => v.enabled && v.platforms.includes(platform))
    if (!candidates.length) return { code: 0, msg: 'success', data: { shouldUpdate: false, force: false } }
    // sort by version desc
    candidates.sort((a, b) => compareVersions(b.version, a.version))
    const latest = candidates[0]
    const cmp = compareVersions(latest.version, currentVersion)
    if (cmp <= 0) return { code: 0, msg: 'up-to-date', data: { shouldUpdate: false, force: false } }

    // If any intermediate version between current and latest has FORCE, treat as force
    const intermediateForce = candidates.some(v => compareVersions(v.version, currentVersion) === 1 && compareVersions(latest.version, v.version) !== -1 && v.update_type === 'FORCE')

    return { code: 0, msg: 'update available', data: { shouldUpdate: true, force: intermediateForce || latest.update_type === 'FORCE', latest } }
  }
}
