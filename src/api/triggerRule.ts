import type { ApiResponse, PaginatedResponse } from '@/types'
import type { TriggerRule, TriggerRuleFormData, TriggerHistoryRecord, TriggerEventType } from '@/types/triggerRule'
import { mockTriggerRules, mockTriggerHistory } from '@/mocks/triggerRule'
import { mockCampaigns } from '@/mocks/promoCampaign'

const SIMULATE_DELAY = 350
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const genId = () => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `TRG-${now.getFullYear()}${pad(now.getMonth() + 1)}-${String(mockTriggerRules.length + 1).padStart(3, '0')}`
}

const nowStr = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export const triggerRuleApi = {
  // ── 取得觸發規則清單 ──────────────────────────────────────────────
  async getRules(params: { page: number; pageSize: number }): Promise<ApiResponse<PaginatedResponse<TriggerRule>>> {
    await delay(SIMULATE_DELAY)

    // 即時同步活動狀態
    const synced = mockTriggerRules.map(rule => {
      const campaign = mockCampaigns.find(c => c.id === rule.boundCampaignId)
      return campaign ? { ...rule, campaignStatus: campaign.status } : { ...rule }
    })

    const total = synced.length
    const startIdx = (params.page - 1) * params.pageSize
    const items = synced.slice(startIdx, startIdx + params.pageSize)

    return {
      code: 0,
      msg: 'success',
      data: { items, total, page: params.page, pageSize: params.pageSize }
    }
  },

  // ── 搜尋可綁定活動（AC1：只列出 Active + 含 Register 標籤的活動，排除已建規則者）──
  async searchEligibleCampaigns(keyword: string): Promise<ApiResponse<{ id: string; name: string; tags: string[] }[]>> {
    await delay(200)

    // 已被建立規則的活動 ID 集合
    const boundIds = new Set(mockTriggerRules.map(r => r.boundCampaignId))

    const eligible = mockCampaigns
      .filter(c =>
        c.status === 'Active' &&
        c.tags.some(t => t.id === 'TAG_REGISTER') &&
        !boundIds.has(c.id)
      )
      .filter(c =>
        !keyword ||
        c.id.toLowerCase().includes(keyword.toLowerCase()) ||
        c.name.toLowerCase().includes(keyword.toLowerCase())
      )
      .map(c => ({
        id: c.id,
        name: c.name,
        tags: c.tags.map(t => t.name),
      }))

    return { code: 0, msg: 'success', data: eligible }
  },

  // ── 新增觸發規則 ───────────────────────────────────────────────────
  async createRule(data: TriggerRuleFormData): Promise<ApiResponse<TriggerRule>> {
    await delay(SIMULATE_DELAY)

    // 檢查是否重複綁定同一活動
    const dup = mockTriggerRules.find(r => r.boundCampaignId === data.boundCampaignId)
    if (dup) {
      return { code: 400, msg: `活動 ${data.boundCampaignId} 已建立觸發規則 ${dup.id}，同一活動不可重複建立規則` }
    }

    const now = nowStr()
    const newRule: TriggerRule = {
      id: genId(),
      triggerEvent: data.triggerEvent as TriggerEventType,
      boundCampaignId: data.boundCampaignId,
      boundCampaignName: data.boundCampaignName,
      campaignStatus: 'Active',
      isEnabled: data.isEnabled,
      creatorInfo: {
        creator: 'admin_current',
        createdAt: now,
      },
    }

    mockTriggerRules.unshift(newRule)
    return { code: 0, msg: 'success', data: newRule }
  },

  // ── 編輯觸發規則 ───────────────────────────────────────────────────
  async updateRule(id: string, data: Partial<TriggerRuleFormData>): Promise<ApiResponse<void>> {
    await delay(SIMULATE_DELAY)

    const idx = mockTriggerRules.findIndex(r => r.id === id)
    if (idx === -1) return { code: 404, msg: 'Not found' }

    // 若更換活動，檢查重複
    if (data.boundCampaignId && data.boundCampaignId !== mockTriggerRules[idx].boundCampaignId) {
      const dup = mockTriggerRules.find(r => r.boundCampaignId === data.boundCampaignId && r.id !== id)
      if (dup) return { code: 400, msg: `活動 ${data.boundCampaignId} 已建立觸發規則，不可重複` }
    }

    Object.assign(mockTriggerRules[idx], {
      ...(data.triggerEvent !== undefined && { triggerEvent: data.triggerEvent }),
      ...(data.boundCampaignId !== undefined && { boundCampaignId: data.boundCampaignId }),
      ...(data.boundCampaignName !== undefined && { boundCampaignName: data.boundCampaignName }),
      ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
    })

    return { code: 0, msg: 'success' }
  },

  // ── 切換規則開關 ───────────────────────────────────────────────────
  async toggleRule(id: string, isEnabled: boolean): Promise<ApiResponse<void>> {
    await delay(200)

    const rule = mockTriggerRules.find(r => r.id === id)
    if (!rule) return { code: 404, msg: 'Not found' }
    rule.isEnabled = isEnabled
    return { code: 0, msg: 'success' }
  },

  // ── 刪除觸發規則（AC4：不影響歷史綁定）─────────────────────────────
  async deleteRule(id: string): Promise<ApiResponse<void>> {
    await delay(SIMULATE_DELAY)

    const idx = mockTriggerRules.findIndex(r => r.id === id)
    if (idx === -1) return { code: 404, msg: 'Not found' }

    // 注意：歷史 Log 保留，不級聯刪除
    mockTriggerRules.splice(idx, 1)
    return { code: 0, msg: 'success' }
  },

  // ── 取得觸發歷史記錄 ────────────────────────────────────────────────
  async getHistory(params: {
    page: number
    pageSize: number
    ruleId?: string
    result?: string
    memberKeyword?: string
  }): Promise<ApiResponse<PaginatedResponse<TriggerHistoryRecord>>> {
    await delay(SIMULATE_DELAY)

    let filtered = [...mockTriggerHistory]

    if (params.ruleId) {
      filtered = filtered.filter(h => h.ruleId === params.ruleId)
    }
    if (params.result) {
      filtered = filtered.filter(h => h.result === params.result)
    }
    if (params.memberKeyword) {
      const kw = params.memberKeyword.toLowerCase()
      filtered = filtered.filter(h =>
        h.memberId.toLowerCase().includes(kw) || h.memberName.toLowerCase().includes(kw)
      )
    }

    // 預設時間倒序
    filtered.sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt))

    const total = filtered.length
    const startIdx = (params.page - 1) * params.pageSize
    const items = filtered.slice(startIdx, startIdx + params.pageSize)

    return {
      code: 0,
      msg: 'success',
      data: { items, total, page: params.page, pageSize: params.pageSize }
    }
  },
}
