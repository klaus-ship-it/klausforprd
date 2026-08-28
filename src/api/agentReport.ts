import type { ApiResponse, PaginatedResponse } from '@/types'
import type {
  AgentReportRecord,
  AgentPlayerDetailRecord,
  AgentReportQuery,
  AgentPlayerDetailQuery,
  ExportAgentReportParams
} from '@/types/agentReport'
import { mockAgentReportRecords, mockAgentPlayerDetails } from '@/mocks/agentReport'

const SIMULATE_DELAY = 600
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const agentReportApi = {
  /**
   * GET /agent-reports
   * 取得代理報表主列表
   */
  async getAgentReports(params: AgentReportQuery): Promise<ApiResponse<PaginatedResponse<AgentReportRecord>>> {
    await delay(SIMULATE_DELAY)

    // 預設全站總人數
    let totalAgentsCount = mockAgentReportRecords.length
    let filtered = [...mockAgentReportRecords]

    // 搜尋條件過濾
    if (params.q) {
      const q = params.q.toLowerCase().trim()
      let matchedAgents: AgentReportRecord[] = []
      
      switch (params.searchType) {
        case 'username':
          matchedAgents = filtered.filter(r => r.agentUsername.toLowerCase().includes(q))
          break
        case 'uid':
          matchedAgents = filtered.filter(r => r.agentUid.toLowerCase().includes(q))
          break
        case 'promo_code':
          // Mock: 模擬推廣碼搜尋
          matchedAgents = filtered.filter(r => r.agentId.toLowerCase().includes(q))
          break
        case 'agentId':
          matchedAgents = filtered.filter(r => r.agentId.toLowerCase() === q)
          break
      }
      
      // 計算目前搜尋代理底下的所有代理總人數 (含自己與所有下線)
      if (matchedAgents.length > 0) {
        const allDescendants = new Set<string>()
        const getDescendants = (parentId: string) => {
          const children = mockAgentReportRecords.filter(a => a.parentAgentId === parentId)
          children.forEach(child => {
            if (!allDescendants.has(child.agentId)) {
              allDescendants.add(child.agentId)
              getDescendants(child.agentId)
            }
          })
        }
        matchedAgents.forEach(a => getDescendants(a.agentId))
        totalAgentsCount = matchedAgents.length + allDescendants.size
      }
      
      // 撈取其直屬下一級的子代理
      const matchedAgentIds = new Set(matchedAgents.map(a => a.agentId))
      const directChildren = mockAgentReportRecords.filter(r => r.parentAgentId && matchedAgentIds.has(r.parentAgentId))
      
      // 合併並去重
      const combined = [...matchedAgents, ...directChildren]
      const uniqueIds = new Set()
      filtered = combined.filter(a => {
        if (uniqueIds.has(a.agentId)) return false
        uniqueIds.add(a.agentId)
        return true
      })
    } else {
      // 代理層級過濾
      if (params.agentLevel) {
        filtered = filtered.filter(r => r.agentLevel === params.agentLevel)
      }
    }

    const total = filtered.length
    
    // 計算總計 (基於所有過濾後的資料，而非單頁資料)
    const summary = {
      totalAgents: totalAgentsCount,
      totalDeposit: filtered.reduce((sum, r) => sum + r.totalDepositAmount, 0),
      totalNGR: filtered.reduce((sum, r) => sum + r.ngr, 0),
      totalCPA: filtered.reduce((sum, r) => sum + r.cpaQualifiedCount, 0)
    }

    const startIdx = (params.page - 1) * params.pageSize
    const items = filtered.slice(startIdx, startIdx + params.pageSize)

    return {
      code: 0,
      msg: 'success',
      data: { items, total, page: params.page, pageSize: params.pageSize, summary }
    }
  },

  /**
   * GET /agent-reports/:agentId/players
   * 取得代理旗下玩家對帳明細（「了解詳情」子列表）
   */
  async getAgentPlayerDetails(params: AgentPlayerDetailQuery): Promise<ApiResponse<PaginatedResponse<AgentPlayerDetailRecord>>> {
    await delay(SIMULATE_DELAY)

    let allPlayers = mockAgentPlayerDetails[params.agentId] || []

    // 玩家帳號關鍵字搜尋
    if (params.keyword) {
      const kw = params.keyword.toLowerCase()
      allPlayers = allPlayers.filter(p =>
        p.playerUsername.toLowerCase().includes(kw) ||
        p.playerId.toLowerCase().includes(kw)
      )
    }

    const total = allPlayers.length
    const startIdx = (params.page - 1) * params.pageSize
    const items = allPlayers.slice(startIdx, startIdx + params.pageSize)

    return {
      code: 0,
      msg: 'success',
      data: { items, total, page: params.page, pageSize: params.pageSize }
    }
  },

  /**
   * POST /agent-reports/export
   * 非同步產出 Excel 報表
   */
  async exportAgentReport(params: ExportAgentReportParams): Promise<ApiResponse<{ taskId: string }>> {
    await delay(800)
    const taskId = `AGENT_RPT_${Date.now()}`
    console.log('[AgentReport] Export task created:', taskId, params)
    return {
      code: 0,
      msg: 'success',
      data: { taskId }
    }
  },

  /**
   * POST /agent-reports/export-players
   * 非同步產出玩家明細 Excel 報表
   */
  async exportAgentPlayerDetails(agentId: string, startTime: number, endTime: number): Promise<ApiResponse<{ taskId: string }>> {
    await delay(800)
    const taskId = `AGENT_PLAYER_RPT_${Date.now()}`
    console.log('[AgentReport] Player detail export task created:', taskId, { agentId, startTime, endTime })
    return {
      code: 0,
      msg: 'success',
      data: { taskId }
    }
  }
}
