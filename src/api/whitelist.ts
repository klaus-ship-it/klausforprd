import { ApiResponse } from '@/types'
import { WhitelistEntry, CreateWhitelistRequest, UpdateWhitelistRequest } from '@/types/whitelist'
import { mockWhitelist } from '@/mocks/whitelist'
import { mockFrontendBlacklist } from '@/mocks/frontendBlacklist'

const delay = (ms = 200) => new Promise(res => setTimeout(res, ms))

// Very small IPv4 CIDR helper (supports single IP or a.b.c.d/n)
function ipToInt(ip: string) {
  if (typeof ip !== 'string') return null
  const parts = ip.split('.').map(s => parseInt(s, 10))
  if (parts.length !== 4 || parts.some(isNaN)) return null
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
}

function cidrContains(cidr: string, ip: string) {
  if (!cidr) return false
  if (cidr.indexOf('/') === -1) {
    return cidr === ip
  }
  const [net, prefixStr] = cidr.split('/')
  const prefix = parseInt(prefixStr || '32', 10)
  const ipInt = ipToInt(ip)
  const netInt = ipToInt(net)
  if (ipInt === null || netInt === null) return false
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  return (ipInt & mask) === (netInt & mask)
}

function createWhitelistApi(store: WhitelistEntry[], idPrefix: string) {
  return {
    async list(): Promise<ApiResponse<WhitelistEntry[]>> {
      await delay()
      return { code: 0, msg: 'success', data: store }
    },

    async create(req: CreateWhitelistRequest): Promise<ApiResponse<WhitelistEntry>> {
      await delay()
      const id = `${idPrefix}${Math.floor(Math.random() * 100000)}`
      const now = new Date().toISOString()
      const entry: WhitelistEntry = {
        id,
        cidr: req.cidr,
        remark: req.remark,
        enabled: req.enabled === undefined ? true : req.enabled,
        created_at: now,
        updated_at: now
      }
      store.unshift(entry)
      return { code: 0, msg: 'success', data: entry }
    },

    async update(id: string, req: UpdateWhitelistRequest, currentClientIp?: string): Promise<ApiResponse<void>> {
      await delay()
      const idx = store.findIndex(x => x.id === id)
      if (idx === -1) return { code: 404, msg: 'Not found' }

      if (currentClientIp && req.enabled === false) {
        const simulated = store.map((e, i) => ({ ...e, ...(i === idx ? { ...e, ...req } : e) }))
        const matched = simulated.some(e => e.enabled && cidrContains(e.cidr, currentClientIp))
        if (!matched) return { code: 403, msg: 'Operation would lock out current IP' }
      }

      store[idx] = { ...store[idx], ...req, updated_at: new Date().toISOString() }
      return { code: 0, msg: 'success' }
    },

    async remove(id: string, currentClientIp?: string): Promise<ApiResponse<void>> {
      await delay()
      const idx = store.findIndex(x => x.id === id)
      if (idx === -1) return { code: 404, msg: 'Not found' }

      if (currentClientIp && cidrContains(store[idx].cidr, currentClientIp) && store[idx].enabled) {
        const others = store.filter((e, i) => i !== idx && e.enabled)
        const matchedOther = others.some(e => cidrContains(e.cidr, currentClientIp))
        if (!matchedOther) return { code: 403, msg: 'Cannot remove last rule matching your current IP' }
      }

      store.splice(idx, 1)
      return { code: 0, msg: 'success' }
    },

    async isAllowed(ip: string): Promise<ApiResponse<{ allowed: boolean }>> {
      await delay()
      const allowed = store.some(e => e.enabled && cidrContains(e.cidr, ip))
      return { code: 0, msg: 'success', data: { allowed } }
    }
  }
}

export const whitelistApi = createWhitelistApi(mockWhitelist, 'W')
export const frontendBlacklistApi = createWhitelistApi(mockFrontendBlacklist, 'FB')
