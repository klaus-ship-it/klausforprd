import { AgentWithdrawalRequest } from '@/types/agent'

export const mockWithdrawals: AgentWithdrawalRequest[] = [
  {
    id: '1',
    order_no: 'WD-A26031201',
    agent_id: 'AG-201',
    agent_name: '王大明',
    amount: 20000,
    frozen_balance: 20000,
    method: 'BANK',
    account_info: '國泰世華 (013) ****9912',
    status: 'PENDING',
    created_at: '2026-03-12T09:30:00Z'
  },
  {
    id: '2',
    order_no: 'WD-A26031145',
    agent_id: 'AG-205',
    agent_name: '李阿姨',
    amount: 45000,
    frozen_balance: 45000,
    method: 'OFFLINE',
    account_info: '現場領取 / 線下對接',
    status: 'PENDING',
    created_at: '2026-03-11T16:45:00Z'
  }
]
