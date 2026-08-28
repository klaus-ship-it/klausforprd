import { AgentGroup } from '@/types/agent'

export let mockAgentGroups: AgentGroup[] = [
  {
    id: 'GRP001',
    name: '標準代理',
    description: '適用於一般合作代理，提供基本 CPA 與儲值抽成。',
    cpa_enabled: true,
    cpa_price: 500,
    deposit_commission_enabled: true,
    deposit_commission_rate: 3,
    data_binding_threshold: { phone: false, google: false },
    deposit_threshold: 1000,
    flow_threshold: 5000,
    created_at: '2026-01-01T00:00:00Z',
    agent_count: 8
  },
  {
    id: 'GRP002',
    name: '高級代理',
    description: '適用於大型合作夥伴，CPA 單價較高且要求手機綁定。',
    cpa_enabled: true,
    cpa_price: 800,
    deposit_commission_enabled: true,
    deposit_commission_rate: 5,
    data_binding_threshold: { phone: true, google: true },
    deposit_threshold: 3000,
    flow_threshold: 15000,
    created_at: '2026-01-15T00:00:00Z',
    agent_count: 4
  },
  {
    id: 'GRP003',
    name: '純抽成合作',
    description: '不啟用 CPA，僅採儲值抽成模式，適合流量型合作夥伴。',
    cpa_enabled: false,
    cpa_price: 0,
    deposit_commission_enabled: true,
    deposit_commission_rate: 8,
    data_binding_threshold: { phone: false, google: false },
    deposit_threshold: 0,
    flow_threshold: 0,
    created_at: '2026-02-10T00:00:00Z',
    agent_count: 2
  },
  {
    id: 'GRP004',
    name: '試用代理',
    description: '新合作初期試用期間使用，條件較寬鬆。',
    cpa_enabled: true,
    cpa_price: 300,
    deposit_commission_enabled: false,
    deposit_commission_rate: 0,
    data_binding_threshold: { phone: false, google: false },
    deposit_threshold: 500,
    flow_threshold: 2000,
    created_at: '2026-03-01T00:00:00Z',
    agent_count: 3
  }
]
