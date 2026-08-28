import { WhitelistEntry } from '@/types/whitelist'

const now = () => new Date().toISOString()
const pastDate = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

export const mockFrontendBlacklist: WhitelistEntry[] = [
  {
    id: 'FB1',
    cidr: '202.1.2.3',
    remark: '已知惡意 IP',
    enabled: true,
    creator: 'admin',
    created_at: now()
  },
  {
    id: 'FB2',
    cidr: '168.95.1.1',
    remark: '測試黑名單 IP',
    enabled: true,
    creator: 'admin',
    created_at: pastDate(24)
  },
  {
    id: 'FB3',
    cidr: '1.1.1.1',
    remark: '封鎖測試 (目前停用)',
    enabled: false,
    creator: 'manager',
    created_at: pastDate(48)
  }
]
