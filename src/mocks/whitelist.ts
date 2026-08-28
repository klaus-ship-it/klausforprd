import { WhitelistEntry } from '@/types/whitelist'

const now = () => new Date().toISOString()
const pastDate = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

export const mockWhitelist: WhitelistEntry[] = [
  {
    id: 'W1',
    cidr: '127.0.0.1',
    remark: 'Localhost (dev)',
    enabled: true,
    creator: 'system',
    created_at: now()
  },
  {
    id: 'W2',
    cidr: '192.168.1.0/24',
    remark: '台北總部辦公室',
    enabled: true,
    creator: 'admin',
    created_at: pastDate(30)
  },
  {
    id: 'W3',
    cidr: '10.0.0.0/8',
    remark: '公司內部網路',
    enabled: true,
    creator: 'admin',
    created_at: pastDate(60)
  },
  {
    id: 'W4',
    cidr: '203.70.50.100',
    remark: '維運工程師 A (李先生)',
    enabled: true,
    creator: 'admin',
    created_at: pastDate(14)
  },
  {
    id: 'W5',
    cidr: '211.20.1.50',
    remark: '維運工程師 B (王小姐)',
    enabled: true,
    creator: 'admin',
    created_at: pastDate(14)
  },
  {
    id: 'W6',
    cidr: '172.16.0.0/12',
    remark: '新竹分公司 VPN',
    enabled: true,
    creator: 'manager',
    created_at: pastDate(21)
  },
  {
    id: 'W7',
    cidr: '1.2.3.4',
    remark: '臨時訪客 IP（已過期，停用中）',
    enabled: false,
    creator: 'admin',
    created_at: pastDate(45)
  },
  {
    id: 'W8',
    cidr: '8.8.8.8',
    remark: '測試 IP（暫未啟用）',
    enabled: false,
    creator: 'admin',
    created_at: pastDate(3)
  }
]
