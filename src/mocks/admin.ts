import type {
  PermissionGroup,
  AdminAccount,
  OperationLog,
  Permission
} from '@/types'

// 权限定义 - 模块树结构
export const mockPermissions: Permission[] = [
  // OPE 模块
  {
    id: 'ope-101',
    name: '系統設定',
    code: 'OPE-101',
    module: '1. 系統設定',
    level: 'NONE',
    description: '系統參數設置'
  },
  {
    id: 'ope-102',
    name: '群組管理',
    code: 'OPE-102',
    module: '2. 帳號管理',
    level: 'NONE',
    description: '權限群組管理'
  },
  {
    id: 'ope-103',
    name: '管理員列表',
    code: 'OPE-103',
    module: '2. 帳號管理',
    level: 'NONE',
    description: '帳號與權限管理'
  },
  {
    id: 'ope-104',
    name: '後台操作日誌',
    code: 'OPE-104',
    module: '3. 日誌審計',
    level: 'NONE',
    description: '操作日誌查詢'
  },
  {
    id: 'ope-105',
    name: '個人帳號管理',
    code: 'OPE-105',
    module: '2. 帳號管理',
    level: 'NONE',
    description: '個人資訊修改'
  },
  {
    id: 'ope-1002',
    name: 'VIP 等級配置',
    code: 'OPE-1002',
    module: '5. VIP 管理',
    level: 'NONE',
    description: 'VIP 等級新增、編輯與狀態管理'
  },
  {
    id: 'ope-1003',
    name: 'VIP 統計分析',
    code: 'OPE-1003',
    module: '5. VIP 管理',
    level: 'NONE',
    description: 'VIP 分佈、升級、保級與降級統計'
  },
  // 其他功能示例
  {
    id: 'ops-601',
    name: '玩家管理',
    code: 'OPS-601',
    module: '4. 玩家與財務',
    level: 'NONE',
    description: '玩家數據管理'
  },
  {
    id: 'ops-602',
    name: '流水管理',
    code: 'OPS-602',
    module: '4. 玩家與財務',
    level: 'NONE',
    description: '玩家流水查詢'
  },
  {
    id: 'ops-603',
    name: '人工存提',
    code: 'OPS-603',
    module: '4. 玩家與財務',
    level: 'NONE',
    description: '存提單審核'
  },
  {
    id: 'sys-801',
    name: '系統監控',
    code: 'SYS-801',
    module: '1. 系統設定',
    level: 'NONE',
    description: '系統運行監控'
  },
  {
    id: 'sys-802',
    name: 'API金鑰管理',
    code: 'SYS-802',
    module: '1. 系統設定',
    level: 'NONE',
    description: 'API金鑰配置'
  }
]

// 权限组 - 群組管理
export const mockPermissionGroups: PermissionGroup[] = [
  {
    id: 'group-001',
    name: '客服組',
    description: '客服人員權限組，負責玩家服務',
    member_count: 3,
    status: 'ENABLED',
    created_by: 'admin',
    created_at: '2025-01-20 10:30:00',
    updated_by: 'admin',
    updated_at: '2025-01-28 14:22:00',
    permissions: {
      'OPE-101': 'NONE',
      'OPE-102': 'NONE',
      'OPE-103': 'NONE',
      'OPE-104': 'READ',
      'OPE-105': 'WRITE',
      'OPS-601': 'READ',
      'OPS-602': 'READ',
      'OPS-603': 'NONE',
      'SYS-801': 'NONE',
      'SYS-802': 'NONE'
    },
    sensitive_permissions: {}
  },
  {
    id: 'group-002',
    name: '財務組',
    description: '財務人員權限組，負責資金管理',
    member_count: 2,
    status: 'ENABLED',
    created_by: 'admin',
    created_at: '2025-01-20 10:35:00',
    updated_by: 'manager',
    updated_at: '2025-01-27 09:15:00',
    permissions: {
      'OPE-101': 'NONE',
      'OPE-102': 'NONE',
      'OPE-103': 'NONE',
      'OPE-104': 'READ',
      'OPE-105': 'WRITE',
      'OPS-601': 'READ',
      'OPS-602': 'WRITE',
      'OPS-603': 'WRITE',
      'SYS-801': 'NONE',
      'SYS-802': 'NONE'
    },
    sensitive_permissions: {}
  },
  {
    id: 'group-003',
    name: '運營組',
    description: '運營人員權限組，負責平台營運',
    member_count: 1,
    status: 'ENABLED',
    created_by: 'admin',
    created_at: '2025-01-21 11:00:00',
    updated_by: 'admin',
    updated_at: '2025-01-28 16:45:00',
    permissions: {
      'OPE-101': 'NONE',
      'OPE-102': 'WRITE',
      'OPE-103': 'WRITE',
      'OPE-104': 'READ',
      'OPE-105': 'WRITE',
      'OPS-601': 'WRITE',
      'OPS-602': 'WRITE',
      'OPS-603': 'WRITE',
      'SYS-801': 'READ',
      'SYS-802': 'NONE'
    },
    sensitive_permissions: {}
  },
  {
    id: 'group-004',
    name: '已停用組',
    description: '已停用的權限組',
    member_count: 0,
    status: 'DISABLED',
    created_by: 'admin',
    created_at: '2024-12-01 08:00:00',
    updated_by: 'admin',
    updated_at: '2025-01-15 10:00:00',
    permissions: {
      'OPE-101': 'NONE',
      'OPE-102': 'NONE',
      'OPE-103': 'NONE',
      'OPE-104': 'NONE',
      'OPE-105': 'READ',
      'OPS-601': 'NONE',
      'OPS-602': 'NONE',
      'OPS-603': 'NONE',
      'SYS-801': 'NONE',
      'SYS-802': 'NONE'
    },
    sensitive_permissions: {}
  }
]

// VIP 權限：營運組可新增、編輯與狀態管理；其他群組預設唯讀或無權限。
mockPermissionGroups.forEach(group => {
  group.permissions['OPE-1002'] = group.name === '運營組' ? 'WRITE' : (group.name === '客服組' ? 'READ' : 'NONE')
  group.permissions['OPE-1003'] = group.name === '運營組' || group.name === '財務組' ? 'READ' : 'NONE'
})

// 管理員帳號
export const mockAdminAccounts: AdminAccount[] = [
  {
    id: 'admin-001',
    username: 'dev_admin',
    display_name: '技術開發',
    role: 'DEVELOPER',
    status: 'ENABLED',
    email: 'dev@example.com',
    two_fa_enabled: false,
    last_login: '2025-01-29 08:30:00',
    last_login_ip: '192.168.1.100',
    created_at: '2025-01-01 10:00:00',
    updated_at: '2025-01-28 15:22:00'
  },
  {
    id: 'admin-002',
    username: 'manager_admin',
    display_name: '營運主管',
    role: 'MANAGER',
    status: 'ENABLED',
    email: 'manager@example.com',
    two_fa_enabled: true,
    last_login: '2025-01-29 09:15:00',
    last_login_ip: '192.168.1.105',
    created_at: '2025-01-05 14:00:00',
    updated_at: '2025-01-26 11:30:00'
  },
  {
    id: 'admin-003',
    username: 'service_user1',
    display_name: '李小美',
    role: 'USER',
    groups: ['group-001'],
    status: 'ENABLED',
    email: 'lee@example.com',
    two_fa_enabled: false,
    last_login: '2025-01-29 08:45:00',
    last_login_ip: '192.168.1.110',
    created_at: '2025-01-10 09:30:00',
    updated_at: '2025-01-28 14:00:00'
  },
  {
    id: 'admin-004',
    username: 'finance_user1',
    display_name: '王大財',
    role: 'USER',
    groups: ['group-002'],
    status: 'ENABLED',
    email: 'wang@example.com',
    two_fa_enabled: false,
    last_login: '2025-01-28 16:20:00',
    last_login_ip: '192.168.1.115',
    created_at: '2025-01-12 10:00:00',
    updated_at: '2025-01-27 09:40:00'
  },
  {
    id: 'admin-005',
    username: 'ops_user1',
    display_name: '陳營運',
    role: 'USER',
    groups: ['group-003'],
    status: 'ENABLED',
    email: 'chen@example.com',
    two_fa_enabled: true,
    last_login: '2025-01-29 07:30:00',
    last_login_ip: '192.168.1.120',
    created_at: '2025-01-15 13:15:00',
    updated_at: '2025-01-28 16:50:00'
  },
  {
    id: 'admin-006',
    username: 'locked_user',
    display_name: '禁用帳號',
    role: 'USER',
    groups: ['group-001'],
    status: 'LOCKED',
    email: 'locked@example.com',
    two_fa_enabled: false,
    created_at: '2025-01-18 11:00:00',
    updated_at: '2025-01-25 10:30:00'
  },
  {
    id: 'admin-007',
    username: 'disabled_user',
    display_name: '停用帳號',
    role: 'USER',
    groups: ['group-002'],
    status: 'DISABLED',
    email: 'disabled@example.com',
    two_fa_enabled: false,
    last_login: '2025-01-20 14:00:00',
    last_login_ip: '192.168.1.125',
    created_at: '2025-01-08 08:45:00',
    updated_at: '2025-01-24 12:00:00'
  }
]

// 操作日誌
export const mockOperationLogs: OperationLog[] = [
  {
    id: 'log-001',
    timestamp: '2025-01-29 14:30:22',
    operator_id: 'admin-002',
    operator_username: 'manager_admin',
    operator_role: 'MANAGER',
    module: 'OPE-102',
    operation_type: 'UPDATE',
    source_ip: '192.168.1.105',
    old_value: {
      permissions: {
        'OPS-603': 'NONE'
      }
    },
    new_value: {
      permissions: {
        'OPS-603': 'WRITE'
      }
    },
    result: 'SUCCESS'
  },
  {
    id: 'log-002',
    timestamp: '2025-01-29 13:15:45',
    operator_id: 'admin-001',
    operator_username: 'dev_admin',
    operator_role: 'DEVELOPER',
    module: 'OPE-103',
    operation_type: 'CREATE',
    source_ip: '192.168.1.100',
    new_value: {
      username: 'new_user',
      display_name: '新增用戶',
      role: 'USER',
      groups: ['group-001']
    },
    result: 'SUCCESS'
  },
  {
    id: 'log-003',
    timestamp: '2025-01-29 12:00:10',
    operator_id: 'admin-003',
    operator_username: 'service_user1',
    operator_role: 'USER',
    module: 'OPE-105',
    operation_type: 'UPDATE',
    source_ip: '192.168.1.110',
    old_value: {
      display_name: '李小美'
    },
    new_value: {
      display_name: '李美妤'
    },
    result: 'SUCCESS'
  },
  {
    id: 'log-004',
    timestamp: '2025-01-28 16:45:30',
    operator_id: 'admin-002',
    operator_username: 'manager_admin',
    operator_role: 'MANAGER',
    module: 'OPE-103',
    operation_type: 'DELETE',
    source_ip: '192.168.1.105',
    old_value: {
      id: 'admin-006',
      username: 'old_deleted_user'
    },
    result: 'SUCCESS'
  },
  {
    id: 'log-005',
    timestamp: '2025-01-28 15:20:15',
    operator_id: 'admin-001',
    operator_username: 'dev_admin',
    operator_role: 'DEVELOPER',
    module: 'OPE-102',
    operation_type: 'CREATE',
    source_ip: '192.168.1.100',
    new_value: {
      name: '新客服組',
      description: '新增的客服群組'
    },
    result: 'SUCCESS'
  },
  {
    id: 'log-006',
    timestamp: '2025-01-28 10:30:45',
    operator_id: 'admin-004',
    operator_username: 'finance_user1',
    operator_role: 'USER',
    module: 'OPS-603',
    operation_type: 'UPDATE',
    source_ip: '192.168.1.115',
    old_value: {
      status: 'PENDING'
    },
    new_value: {
      status: 'APPROVED'
    },
    result: 'SUCCESS'
  },
  {
    id: 'log-007',
    timestamp: '2025-01-27 09:45:20',
    operator_id: 'admin-002',
    operator_username: 'manager_admin',
    operator_role: 'MANAGER',
    module: 'OPE-103',
    operation_type: 'UPDATE',
    source_ip: '192.168.1.105',
    old_value: {
      status: 'ENABLED'
    },
    new_value: {
      status: 'DISABLED'
    },
    result: 'SUCCESS'
  }
]

// 模擬 API 延遲
export const delay = (ms: number = 500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
