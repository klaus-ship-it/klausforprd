import type { AgentTransferSchedule } from '@/types/agent'

export const mockTransferSchedules: AgentTransferSchedule[] = [
  {
    id: 'T-10001',
    agent_id: '2',
    agent_name: '陳小華',
    agent_uid: '10002',
    original_parent_id: '1',
    original_parent_name: '王大明',
    new_parent_id: '3',
    new_parent_name: '林管理',
    execute_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    reason: '代理表現優異，直屬管理',
    status: 'PENDING',
    created_at: new Date().toISOString()
  }
]
