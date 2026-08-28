import { ApiResponse } from '@/types'
import { ThirdPartyKey, CreateThirdPartyKeyRequest, UpdateThirdPartyKeyRequest } from '@/types/thirdparty'
import { mockThirdPartyKeys } from '@/mocks/thirdparty'

const delay = (ms = 300) => new Promise(res => setTimeout(res, ms))

const maskSecret = (s?: string) => {
  if (!s) return undefined
  return '****' + s.slice(-4)
}

export const thirdpartyApi = {
  async list(): Promise<ApiResponse<ThirdPartyKey[]>> {
    await delay()
    return { code: 0, msg: 'success', data: mockThirdPartyKeys }
  },

  async get(id: string): Promise<ApiResponse<ThirdPartyKey>> {
    await delay()
    const item = mockThirdPartyKeys.find(x => x.id === id)
    if (!item) return { code: 404, msg: 'Not found' }
    return { code: 0, msg: 'success', data: item }
  },

  async create(req: CreateThirdPartyKeyRequest): Promise<ApiResponse<ThirdPartyKey>> {
    await delay()
    const id = `K${Math.floor(Math.random() * 100000)}`
    const now = new Date().toISOString()
    const item: ThirdPartyKey = {
      id,
      category: req.category,
      provider: req.provider,
      endpoint: req.endpoint,
      merchant_id: req.merchant_id,
      api_key: req.api_key,
      secret_key_encrypted: req.secret_key ? `enc(${req.secret_key})` : undefined,
      secret_masked: maskSecret(req.secret_key),
      ip_whitelist: req.ip_whitelist,
      proxy: req.proxy,
      enabled: req.enabled === undefined ? true : req.enabled,
      created_at: now
    }
    mockThirdPartyKeys.unshift(item)
    return { code: 0, msg: 'success', data: item }
  },

  async update(id: string, req: UpdateThirdPartyKeyRequest): Promise<ApiResponse<void>> {
    await delay()
    const idx = mockThirdPartyKeys.findIndex(x => x.id === id)
    if (idx === -1) return { code: 404, msg: 'Not found' }
    const old = mockThirdPartyKeys[idx]
    mockThirdPartyKeys[idx] = {
      ...old,
      ...req,
      secret_key_encrypted: req.secret_key ? `enc(${req.secret_key})` : old.secret_key_encrypted,
      secret_masked: req.secret_key ? maskSecret(req.secret_key) : old.secret_masked,
      updated_at: new Date().toISOString()
    }
    return { code: 0, msg: 'success' }
  },

  async testConnection(idOrReq: string | CreateThirdPartyKeyRequest, timeoutMs = 5000): Promise<ApiResponse<{ ok: boolean; code?: string }>> {
    // Simulate network call with timeout handling
    const controller = new AbortController()
    const p = new Promise<ApiResponse<{ ok: boolean; code?: string }>>(async (res) => {
      // If id passed, look up mock
      let endpoint = ''
      if (typeof idOrReq === 'string') {
        const it = mockThirdPartyKeys.find(x => x.id === idOrReq)
        if (!it) return res({ code: 404, msg: 'Not found' })
        endpoint = it.endpoint
      } else {
        endpoint = idOrReq.endpoint
      }

      // fake network latency
      const latency = Math.min(800, Math.random() * 1200)
      await delay(latency)

      // Simulate 401 if endpoint contains 'unauthorized'
      if (endpoint.includes('unauthorized')) {
        return res({ code: 401, msg: 'Unauthorized', data: { ok: false, code: '401' } })
      }

      return res({ code: 0, msg: 'success', data: { ok: true } })
    })

    const timeout = new Promise<ApiResponse<{ ok: boolean; code?: string }>>(r => setTimeout(() => r({ code: 408, msg: 'timeout' }), timeoutMs))

    return Promise.race([p, timeout]) as Promise<ApiResponse<{ ok: boolean; code?: string }>>
  }
}
