import { ApiResponse, PaginatedResponse } from '@/types'
import { Agent, AgentSearchParams, UpdateAgentParams, CreateAgentParams, AgentGroup, CreateAgentGroupParams, UpdateAgentGroupParams } from '@/types/agent'
import { mockAgents } from '@/mocks/agent'

const SIMULATE_DELAY = 500
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const agentApi = {
  async getAgents(params: AgentSearchParams): Promise<ApiResponse<PaginatedResponse<Agent>>> {
    await delay(SIMULATE_DELAY)

    let filtered = [...mockAgents]

    if (params.q) {
      const q = params.q.toLowerCase()
      switch (params.search_type) {
        case 'uid':
          filtered = filtered.filter(a => a.uid.toLowerCase().includes(q))
          break
        case 'username':
          filtered = filtered.filter(a => a.username.toLowerCase().includes(q))
          break
        case 'promo_code':
          filtered = filtered.filter(a => a.promo_code.toLowerCase().includes(q))
          break
      }
    }

    if (params.identity) {
      filtered = filtered.filter(a => a.identity === params.identity)
    }

    if (params.status) {
      filtered = filtered.filter(a => a.status === params.status)
    }

    if (params.start_time) {
      const start = new Date(params.start_time).getTime()
      filtered = filtered.filter(a => new Date(a.created_at).getTime() >= start)
    }

    if (params.end_time) {
      const end = new Date(params.end_time).getTime()
      filtered = filtered.filter(a => new Date(a.created_at).getTime() <= end)
    }

    const total = filtered.length
    const startIdx = (params.page - 1) * params.page_size
    const endIdx = startIdx + params.page_size
    const items = filtered.slice(startIdx, endIdx)

    return {
      code: 0,
      msg: 'success',
      data: {
        items,
        total,
        page: params.page,
        pageSize: params.page_size
      }
    }
  },

  async createAgent(params: CreateAgentParams): Promise<ApiResponse<Agent>> {
    await delay(SIMULATE_DELAY)
    
    let path = `平台 > ${params.username}`
    if ((params.identity === 'SUB' || params.identity === 'ASSISTANT') && params.parent_id) {
        const parent = mockAgents.find(a => a.id === params.parent_id || a.uid === params.parent_id)
        if (parent) {
            path = `${parent.path} > ${params.username}`
        } else {
            return { code: 400, msg: '找不到指定的上級代理' }
        }
    }

    const newAgent: Agent = {
        ...params,
        id: (mockAgents.length + 1).toString(),
        uid: (10000 + mockAgents.length + 1).toString(),
        path,
        commission_wallet: 0,
        promo_wallet: 0,
        sub_agent_count: 0,
        direct_player_count: 0,
        created_at: new Date().toISOString()
    }
    mockAgents.unshift(newAgent)
    return { code: 0, msg: 'success', data: newAgent }
  },

  async updateAgent(params: UpdateAgentParams): Promise<ApiResponse<void>> {
    await delay(SIMULATE_DELAY)
    const index = mockAgents.findIndex(a => a.id === params.id)
    if (index === -1) return { code: 404, msg: 'Agent not found' }

    console.log(`[Audit] Update Agent ${params.id}:`, params, `Reason: ${params.change_reason}`)
    
    let updatedPath = mockAgents[index].path
    if (params.identity === 'MASTER' && mockAgents[index].identity !== 'MASTER') {
        updatedPath = `平台 > ${mockAgents[index].username}`
    } else if (params.identity === 'SUB' && params.parent_id) {
        const parent = mockAgents.find(a => a.id === params.parent_id || a.uid === params.parent_id)
        if (parent) {
            updatedPath = `${parent.path} > ${mockAgents[index].username}`
        } else {
            return { code: 400, msg: '找不到指定的上級代理' }
        }
    }

    mockAgents[index] = { ...mockAgents[index], ...params, path: updatedPath }
    return { code: 0, msg: 'success' }
  },

  async toggleStatus(id: string, status: string): Promise<ApiResponse<void>> {
    await delay(SIMULATE_DELAY)
    const agent = mockAgents.find(a => a.id === id)
    if (!agent) return { code: 404, msg: 'Agent not found' }

    agent.status = status as any
    console.log(`[Audit] Toggle Status ${id} -> ${status}`)
    return { code: 0, msg: 'success' }
  },

  async adjustPromoWallet(id: string, amount: number, reason: string): Promise<ApiResponse<void>> {
    await delay(SIMULATE_DELAY)
    const agent = mockAgents.find(a => a.id === id)
    if (!agent) return { code: 404, msg: 'Agent not found' }

    agent.promo_wallet += amount
    console.log(`[Audit] Adjust Promo Wallet ${id}: ${amount}. Reason: ${reason}`)
    return { code: 0, msg: 'success' }
  },

  async getWithdrawalRequests(params: AgentWithdrawalSearchParams): Promise<ApiResponse<AgentWithdrawalRequest[]>> {
    await delay(SIMULATE_DELAY)
    const { mockWithdrawals } = await import('@/mocks/agentWithdrawal')
    let filtered = [...mockWithdrawals]
    if (params.status && params.status !== 'ALL') {
      filtered = filtered.filter(r => r.status === params.status)
    }
    if (params.start_time) {
      filtered = filtered.filter(r => new Date(r.created_at).getTime() >= params.start_time!)
    }
    if (params.end_time) {
      filtered = filtered.filter(r => new Date(r.created_at).getTime() <= params.end_time!)
    }
    return { code: 0, msg: 'success', data: filtered }
  },

  async processWithdrawal(id: string, action: 'APPROVE' | 'REJECT'): Promise<ApiResponse<void>> {
    await delay(SIMULATE_DELAY)
    const { mockWithdrawals } = await import('@/mocks/agentWithdrawal')
    const req = mockWithdrawals.find(r => r.id === id)
    if (!req) return { code: 404, msg: 'Request not found' }
    req.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
    console.log(`[Audit] Process Withdrawal ${id}: ${action}`)
    return { code: 0, msg: 'success' }
  },

  async searchAgent(keyword: string): Promise<ApiResponse<Agent | null>> {
    await delay(SIMULATE_DELAY)
    const agent = mockAgents.find(a => a.uid === keyword || a.username === keyword)
    if (!agent) return { code: 404, msg: '找不到該代理', data: null }
    return { code: 0, msg: 'success', data: agent }
  },

  async submitTransfer(params: import('@/types/agent').TransferAgentParams): Promise<ApiResponse<void>> {
    await delay(SIMULATE_DELAY)
    const agent = mockAgents.find(a => a.id === params.agent_id)
    const newParent = mockAgents.find(a => a.id === params.new_parent_id)
    if (!agent || !newParent) return { code: 404, msg: '找不到代理或新上級' }
    
    // First Lock: CPA Check
    if (newParent.cpa_price < agent.cpa_price) {
      return { code: 400, msg: '風控阻斷：新上級的 CPA 單價不可低於目標代理的 CPA 單價！' }
    }
    
    // Recursive Tree Check (Mock simplified)
    if (newParent.path.includes(agent.username)) {
       return { code: 400, msg: '風控阻斷：目標新上級不可為被轉線代理的下線！' }
    }

    const { mockTransferSchedules } = await import('@/mocks/agentTransfer')

    // Pending lock check
    const existingPending = mockTransferSchedules.find(s => s.agent_id === agent.id && s.status === 'PENDING')
    if (existingPending) {
        return { code: 400, msg: '該代理已存在進行中的預約轉線任務，請先取消前案。' }
    }

    if (params.execution_type === 'IMMEDIATE') {
      agent.deposit_commission_rate = 0
      const oldPathParts = agent.path.split(' > ')
      oldPathParts.pop() // remove self
      const oldParentUsername = oldPathParts.pop() || '平台'
      agent.path = `${newParent.path} > ${agent.username}`
      
      console.log(`[Audit] Agent ${agent.username} transferred immediately to ${newParent.username}. Reason: ${params.reason}`)
      
      // Still log to schedule as SUCCESS
      mockTransferSchedules.unshift({
        id: `T-${Date.now()}`,
        agent_id: agent.id,
        agent_name: agent.name || agent.username,
        agent_uid: agent.uid,
        original_parent_id: 'unknown', // Mock simplified
        original_parent_name: oldParentUsername,
        new_parent_id: newParent.id,
        new_parent_name: newParent.name || newParent.username,
        execute_at: new Date().toISOString(),
        reason: params.reason,
        status: 'SUCCESS',
        created_at: new Date().toISOString()
      })
    } else {
      mockTransferSchedules.unshift({
        id: `T-${Date.now()}`,
        agent_id: agent.id,
        agent_name: agent.name || agent.username,
        agent_uid: agent.uid,
        original_parent_id: 'unknown',
        original_parent_name: 'unknown',
        new_parent_id: newParent.id,
        new_parent_name: newParent.name || newParent.username,
        execute_at: params.execute_at!,
        reason: params.reason,
        status: 'PENDING',
        created_at: new Date().toISOString()
      })
    }
    return { code: 0, msg: 'success' }
  },

  async getTransferSchedules(params: import('@/types/agent').AgentTransferSearchParams): Promise<ApiResponse<PaginatedResponse<import('@/types/agent').AgentTransferSchedule>>> {
    await delay(SIMULATE_DELAY)
    const { mockTransferSchedules } = await import('@/mocks/agentTransfer')
    let filtered = [...mockTransferSchedules]
    if (params.status && params.status !== 'ALL') {
      filtered = filtered.filter(s => s.status === params.status)
    }
    const total = filtered.length
    const startIdx = (params.page - 1) * params.page_size
    const endIdx = startIdx + params.page_size
    const items = filtered.slice(startIdx, endIdx)

    return {
      code: 0,
      msg: 'success',
      data: {
        items,
        total,
        page: params.page,
        pageSize: params.page_size
      }
    }
  },

  async cancelTransferSchedule(id: string): Promise<ApiResponse<void>> {
    await delay(SIMULATE_DELAY)
    const { mockTransferSchedules } = await import('@/mocks/agentTransfer')
    const req = mockTransferSchedules.find(r => r.id === id)
    if (!req) return { code: 404, msg: '找不到排程' }
    if (req.status !== 'PENDING') return { code: 400, msg: '只能取消待執行狀態的排程' }
    req.status = 'CANCELED'
    console.log(`[Audit] Cancel Transfer Schedule ${id}`)
    return { code: 0, msg: 'success' }
  }
}

// ── Agent Group API ───────────────────────────────────────────────────────────

export const agentGroupApi = {
  async getGroups(): Promise<ApiResponse<AgentGroup[]>> {
    await delay(SIMULATE_DELAY)
    const { mockAgentGroups } = await import('@/mocks/agentGroup')
    return { code: 0, msg: 'success', data: [...mockAgentGroups] }
  },

  async createGroup(params: CreateAgentGroupParams): Promise<ApiResponse<AgentGroup>> {
    await delay(SIMULATE_DELAY)
    const { mockAgentGroups } = await import('@/mocks/agentGroup')
    const newGroup: AgentGroup = {
      ...params,
      id: `GRP${String(Date.now()).slice(-6)}`,
      created_at: new Date().toISOString(),
      agent_count: 0
    }
    mockAgentGroups.unshift(newGroup)
    return { code: 0, msg: 'success', data: newGroup }
  },

  async updateGroup(params: UpdateAgentGroupParams): Promise<ApiResponse<void>> {
    await delay(SIMULATE_DELAY)
    const { mockAgentGroups } = await import('@/mocks/agentGroup')
    const index = mockAgentGroups.findIndex(g => g.id === params.id)
    if (index === -1) return { code: 404, msg: '找不到群組' }
    mockAgentGroups[index] = { ...mockAgentGroups[index], ...params }
    return { code: 0, msg: 'success' }
  },

  async deleteGroup(id: string): Promise<ApiResponse<void>> {
    await delay(SIMULATE_DELAY)
    const { mockAgentGroups } = await import('@/mocks/agentGroup')
    const index = mockAgentGroups.findIndex(g => g.id === id)
    if (index === -1) return { code: 404, msg: '找不到群組' }
    if (mockAgentGroups[index].agent_count > 0) {
      return { code: 400, msg: `此群組尚有 ${mockAgentGroups[index].agent_count} 個代理使用中，無法刪除` }
    }
    mockAgentGroups.splice(index, 1)
    return { code: 0, msg: 'success' }
  }
}
