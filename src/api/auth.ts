import apiClient from './client'
import { delay } from '@/mocks/admin'
import type { UserInfo } from '@/types'

// Mock 用戶資料
const mockUsers: Record<string, { password: string; user: UserInfo }> = {
  dev_admin: {
    password: 'dev123456',
    user: {
      user_id: 'admin-001',
      name: '技術開發',
      role: 'DEVELOPER',
      permissions: ['*'],
      email: 'dev@example.com'
    }
  },
  manager_admin: {
    password: 'manager123456',
    user: {
      user_id: 'admin-002',
      name: '營運主管',
      role: 'MANAGER',
      permissions: ['OPE-102', 'OPE-103', 'OPE-104', 'OPE-105', 'OPS-601', 'OPS-602', 'OPS-603'],
      email: 'manager@example.com'
    }
  },
  service_user1: {
    password: 'user123456',
    user: {
      user_id: 'admin-003',
      name: '李小美',
      role: 'USER',
      permissions: ['OPE-104', 'OPE-105', 'OPS-601', 'OPS-602'],
      groups: ['group-001'],
      email: 'lee@example.com'
    }
  },
  finance_user1: {
    password: 'user123456',
    user: {
      user_id: 'admin-004',
      name: '王大財',
      role: 'USER',
      permissions: ['OPE-104', 'OPE-105', 'OPS-601', 'OPS-602', 'OPS-603'],
      groups: ['group-002'],
      email: 'wang@example.com'
    }
  },
  ops_user1: {
    password: 'user123456',
    user: {
      user_id: 'admin-005',
      name: '陳營運',
      role: 'USER',
      permissions: ['OPE-102', 'OPE-103', 'OPE-104', 'OPE-105', 'OPS-601', 'OPS-602', 'OPS-603'],
      groups: ['group-003'],
      email: 'chen@example.com'
    }
  }
}

export const authApi = {
  async login(username: string, password: string) {
    // 模擬 API 延遲
    await delay(500)

    const userCredentials = mockUsers[username]

    if (!userCredentials || userCredentials.password !== password) {
      throw new Error('Invalid credentials')
    }

    // 生成 mock token
    const token = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      token,
      user: userCredentials.user
    }
  },

  logout() {
    return apiClient.post('/v2/auth/logout')
  },

  refreshToken() {
    return apiClient.post<{ token: string }>('/v2/auth/refresh-token')
  }
}

