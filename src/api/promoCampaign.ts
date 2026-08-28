import { ApiResponse, PaginatedResponse } from '@/types'
import { PromoCampaign, CampaignQueryParams } from '@/types/promoCampaign'
import { mockCampaigns, mockCampaignTags, mockAgentChannels } from '@/mocks/promoCampaign'

const SIMULATE_DELAY = 400
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// ── 格式化日期工具 ─────────────────────────────────────────────────
const parseDate = (str: string) => new Date(str.replace(' ', 'T'))

export const promoCampaignApi = {
  /** 取得活動清單（含搜尋、篩選、分頁） */
  async getCampaigns(
    params: CampaignQueryParams
  ): Promise<ApiResponse<PaginatedResponse<PromoCampaign>>> {
    await delay(SIMULATE_DELAY)

    let filtered = [...mockCampaigns]

    // 關鍵字模糊搜尋（活動 ID 或名稱）
    if (params.keyword) {
      const kw = params.keyword.toLowerCase()
      filtered = filtered.filter(
        c => c.id.toLowerCase().includes(kw) || c.name.toLowerCase().includes(kw)
      )
    }

    // 活動標籤篩選
    if (params.tags && params.tags.length > 0) {
      filtered = filtered.filter(c =>
        params.tags!.some(tagId => c.tags.some(t => t.id === tagId))
      )
    }

    // 活動狀態篩選
    if (params.statuses && params.statuses.length > 0) {
      filtered = filtered.filter(c => params.statuses!.includes(c.status))
    }

    // 前台顯示篩選
    if (params.frontendVisible !== null && params.frontendVisible !== undefined) {
      filtered = filtered.filter(c => c.frontendVisible === params.frontendVisible)
    }

    // 前台申請篩選
    if (params.frontendApply !== null && params.frontendApply !== undefined) {
      filtered = filtered.filter(c => c.frontendApply === params.frontendApply)
    }

    // 參加時間區間篩選（交集）
    if (params.joinTimeStart) {
      const filterStart = parseDate(params.joinTimeStart)
      filtered = filtered.filter(c => parseDate(c.joinEnd) >= filterStart)
    }
    if (params.joinTimeEnd) {
      const filterEnd = parseDate(params.joinTimeEnd)
      filtered = filtered.filter(c => parseDate(c.joinStart) <= filterEnd)
    }

    // 代理商篩選
    if (params.agentChannel) {
      filtered = filtered.filter(c => c.agentChannel === params.agentChannel)
    }

    // 預設按建立時間倒序（AC1）
    filtered.sort(
      (a, b) =>
        parseDate(b.creatorInfo.createdAt).getTime() -
        parseDate(a.creatorInfo.createdAt).getTime()
    )

    const total = filtered.length
    const startIdx = (params.page - 1) * params.pageSize
    const items = filtered.slice(startIdx, startIdx + params.pageSize)

    return {
      code: 0,
      msg: 'success',
      data: { items, total, page: params.page, pageSize: params.pageSize }
    }
  },

  /** 複製活動 */
  async copyCampaign(id: string): Promise<ApiResponse<PromoCampaign>> {
    await delay(SIMULATE_DELAY)
    const src = mockCampaigns.find(c => c.id === id)
    if (!src) return { code: 404, msg: 'Not found' }

    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

    const newId = `PRM-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${String(mockCampaigns.length + 1).padStart(3, '0')}`

    const copied: PromoCampaign = {
      ...JSON.parse(JSON.stringify(src)),
      id: newId,
      name: src.name + '_Copy',
      status: 'Draft',
      participants: { joined: 0, limit: src.participants.limit },
      creatorInfo: {
        ...src.creatorInfo,
        createdAt: nowStr,
        updatedAt: nowStr,
      }
    }

    mockCampaigns.unshift(copied)
    return { code: 0, msg: 'success', data: copied }
  },

  /** 切換前台顯示開關 */
  async toggleFrontendVisible(id: string, value: boolean): Promise<ApiResponse<void>> {
    await delay(200)
    const c = mockCampaigns.find(x => x.id === id)
    if (!c) return { code: 404, msg: 'Not found' }
    c.frontendVisible = value
    return { code: 0, msg: 'success' }
  },

  /** 切換前台申請開關 */
  async toggleFrontendApply(id: string, value: boolean): Promise<ApiResponse<void>> {
    await delay(200)
    const c = mockCampaigns.find(x => x.id === id)
    if (!c) return { code: 404, msg: 'Not found' }
    c.frontendApply = value
    return { code: 0, msg: 'success' }
  },

  /** 強制關閉活動 */
  async forceClose(id: string): Promise<ApiResponse<void>> {
    await delay(800)
    const c = mockCampaigns.find(x => x.id === id)
    if (!c) return { code: 404, msg: 'Not found' }
    if (c.status !== 'Active' && c.status !== 'Inactive') {
      return { code: 400, msg: '只有 Active / Inactive 狀態可以強制關閉' }
    }
    c.status = 'Force Closed'
    c.frontendVisible = false
    c.frontendApply = false
    return { code: 0, msg: 'success' }
  },

  /** 更新活動圖片 */
  async updateImages(id: string, images: { listImage?: string; bannerImage?: string }): Promise<ApiResponse<void>> {
    await delay(300)
    const c = mockCampaigns.find(x => x.id === id)
    if (!c) return { code: 404, msg: 'Not found' }
    if (images.listImage !== undefined) c.listImage = images.listImage
    if (images.bannerImage !== undefined) c.bannerImage = images.bannerImage
    return { code: 0, msg: 'success' }
  },

  /** 取得標籤清單 */
  async getTags() {
    await delay(100)
    return { code: 0, msg: 'success', data: mockCampaignTags }
  },

  /** 取得代理商渠道清單 */
  async getAgentChannels() {
    await delay(100)
    return { code: 0, msg: 'success', data: mockAgentChannels }
  },

  /** 取得單一活動詳情 (給 Wizard 編輯使用) */
  async getCampaign(id: string): Promise<ApiResponse<PromoCampaign>> {
    await delay(SIMULATE_DELAY)
    const c = mockCampaigns.find(x => x.id === id)
    if (!c) return { code: 404, msg: 'Not found' }
    return { code: 0, msg: 'success', data: JSON.parse(JSON.stringify(c)) }
  },

  /** 儲存草稿 (AC4: 略過嚴格必填，僅存入狀態 Draft) */
  async saveDraft(data: Partial<PromoCampaign>): Promise<ApiResponse<string>> {
    await delay(SIMULATE_DELAY)
    const nowStr = parseDate(new Date().toISOString()).toISOString().replace('T', ' ').substring(0, 19)
    if (data.id) {
      const idx = mockCampaigns.findIndex(c => c.id === data.id)
      if (idx !== -1) {
        mockCampaigns[idx] = { 
          ...mockCampaigns[idx], 
          ...data,
          status: 'Draft',
          creatorInfo: { ...mockCampaigns[idx].creatorInfo, updatedAt: nowStr }
        } as PromoCampaign
        return { code: 0, msg: 'success', data: data.id }
      }
    }
    // 新增
    const newId = `PRM-DRAFT-${Date.now()}`
    const newDraft = {
      ...data,
      id: newId,
      status: 'Draft',
      participants: { joined: 0, limit: data.targetAudience?.totalLimit || 0 },
      creatorInfo: { creator: 'admin', createdAt: nowStr, updatedBy: 'admin', updatedAt: nowStr }
    } as PromoCampaign
    mockCampaigns.unshift(newDraft)
    return { code: 0, msg: 'success', data: newId }
  },

  /** 提交活動 (驗證與正式儲存) */
  async submitCampaign(data: Partial<PromoCampaign>): Promise<ApiResponse<string>> {
    await delay(SIMULATE_DELAY)
    const nowStr = parseDate(new Date().toISOString()).toISOString().replace('T', ' ').substring(0, 19)
    if (data.id && data.id.startsWith('PRM-')) {
      const idx = mockCampaigns.findIndex(c => c.id === data.id)
      if (idx !== -1) {
        mockCampaigns[idx] = {
          ...mockCampaigns[idx],
          ...data,
          status: data.status || 'Active', // 從表單取狀態，預設Active
          creatorInfo: { ...mockCampaigns[idx].creatorInfo, updatedAt: nowStr }
        } as PromoCampaign
        return { code: 0, msg: 'success', data: data.id }
      }
    }
    
    // 新增
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const newId = `PRM-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${String(mockCampaigns.length + 1).padStart(3, '0')}`
    
    const newCampaign = {
      ...data,
      id: newId,
      status: data.status || 'Active',
      participants: { joined: 0, limit: data.targetAudience?.totalLimit || 0 },
      creatorInfo: { creator: 'admin', createdAt: nowStr, updatedBy: 'admin', updatedAt: nowStr }
    } as PromoCampaign
    mockCampaigns.unshift(newCampaign)
    return { code: 0, msg: 'success', data: newId }
  }
}
