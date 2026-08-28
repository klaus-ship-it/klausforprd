<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useMessage } from 'naive-ui'
import {
  NCard,
  NButton,
  NSpace,
  NTag,
  NInput,
  NModal,
  NForm,
  NFormItem,
  NSelect,
  NIcon,
  NPopconfirm,
  NDrawer,
  NDrawerContent,
  NGrid,
  NGridItem,
  NAlert,
  NSpin,
  NPagination,
  NCheckbox,
  NCheckboxGroup
} from 'naive-ui'
import {
  EditOutlined as EditIcon,
  DeleteOutlined as DeleteIcon,
  SearchOutlined as SearchIcon,
  AddOutlined as AddIcon,
  SecurityOutlined as ShieldIcon
} from '@vicons/material'

const Edit = EditIcon
const Trash = DeleteIcon
const Search = SearchIcon
const Add = AddIcon
const ShieldCheckmark = ShieldIcon

import { useAuthStore } from '@/stores/useAuthStore'
import {
  mockAdminAccounts,
  mockPermissionGroups,
  mockPermissions,
  delay
} from '@/mocks/admin'
import type { AdminAccount } from '@/types'

const message = useMessage()
const authStore = useAuthStore()

// 數據狀態
const accounts = ref<AdminAccount[]>([...mockAdminAccounts])
const loading = ref(false)
const searchText = ref('')
const showDeletedAccounts = ref(false)
const pagination = reactive({
  page: 1,
  pageSize: 10
})

// 彈窗狀態
const showAccountModal = ref(false)
const showAuditDrawer = ref(false)
const editingAccountId = ref<string | null>(null)
const auditingAccount = ref<AdminAccount | null>(null)

// 新增/編輯表單
const accountForm = reactive({
  username: '',
  display_name: '',
  role: 'USER' as 'DEVELOPER' | 'MANAGER' | 'USER',
  groups: [] as string[],
  password: '',
  confirmPassword: '',
  status: 'ENABLED' as 'ENABLED' | 'DISABLED' | 'LOCKED',
  reason: ''
})

// 可見的角色選項（依據當前用戶）
const visibleRoles = computed(() => {
  const allRoles = [
    { label: '技術開發', value: 'DEVELOPER' },
    { label: '營運主管', value: 'MANAGER' },
    { label: '一般職員', value: 'USER' }
  ]

  if (authStore.user?.role === 'DEVELOPER') {
    return allRoles
  } else if (authStore.user?.role === 'MANAGER') {
    return allRoles.filter(r => r.value !== 'DEVELOPER')
  } else {
    return allRoles.filter(r => r.value === 'USER')
  }
})

// 可見的群組選項
const visibleGroups = computed(() => {
  return mockPermissionGroups.filter(g => g.status === 'ENABLED')
})

// 過濾後的帳號列表
const filteredAccounts = computed(() => {
  let result = accounts.value

  // 根據是否顯示已刪除帳號
  if (!showDeletedAccounts.value) {
    result = result.filter(a => !a.deleted_at)
  }

  // 根據當前用戶角色進行隔離
  if (authStore.user?.role === 'MANAGER') {
    // 營運管理者看不到開發者
    result = result.filter(a => a.role !== 'DEVELOPER')
  } else if (authStore.user?.role === 'USER') {
    // 一般使用者只能看到同群組的成員
    const myGroups = mockAdminAccounts
      .find(a => a.id === authStore.user!.user_id)
      ?.groups || []
    result = result.filter(
      a =>
        a.role !== 'DEVELOPER' &&
        a.role !== 'MANAGER' &&
        a.groups?.some(g => myGroups.includes(g))
    )
  }

  // 搜尋
  if (searchText.value) {
    const text = searchText.value.toLowerCase()
    result = result.filter(
      a =>
        a.username.toLowerCase().includes(text) ||
        a.display_name.toLowerCase().includes(text)
    )
  }

  return result
})

// 分頁後的數據
const paginatedAccounts = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize
  return filteredAccounts.value.slice(start, start + pagination.pageSize)
})

// 取得帳號的所有權限（聯集計算）
const getAccountPermissions = (account: AdminAccount) => {
  if (account.role === 'DEVELOPER') {
    // 開發者有全部權限
    return mockPermissions.reduce(
      (acc, p) => {
        acc[p.code] = 'WRITE'
        return acc
      },
      {} as Record<string, 'NONE' | 'READ' | 'WRITE'>
    )
  }

  const permissions: Record<string, 'NONE' | 'READ' | 'WRITE'> = {}
  mockPermissions.forEach(p => {
    permissions[p.code] = 'NONE'
  })

  // 聯集計算：操作 > 唯讀 > 無權限
  if (account.groups) {
    account.groups.forEach(groupId => {
      const group = mockPermissionGroups.find(g => g.id === groupId)
      if (group) {
        Object.entries(group.permissions).forEach(([code, level]) => {
          if (level === 'WRITE') {
            permissions[code] = 'WRITE'
          } else if (level === 'READ' && permissions[code] === 'NONE') {
            permissions[code] = 'READ'
          }
        })
      }
    })
  }

  return permissions
}

// 角色標籤顏色
const getRoleColor = (role: string) => {
  switch (role) {
    case 'DEVELOPER':
      return 'error'
    case 'MANAGER':
      return 'warning'
    case 'USER':
      return 'default'
    default:
      return 'default'
  }
}

// 狀態標籤顏色
const getStatusColor = (status: string) => {
  switch (status) {
    case 'ENABLED':
      return 'success'
    case 'DISABLED':
      return 'error'
    case 'LOCKED':
      return 'warning'
    default:
      return 'default'
  }
}

// 狀態標籤文本
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'ENABLED':
      return '啟用'
    case 'DISABLED':
      return '停用'
    case 'LOCKED':
      return '鎖定'
    default:
      return '-'
  }
}

// 打開新增對話框
const handleAddAccount = () => {
  editingAccountId.value = null
  accountForm.username = ''
  accountForm.display_name = ''
  accountForm.role = 'USER'
  accountForm.groups = []
  accountForm.password = ''
  accountForm.confirmPassword = ''
  accountForm.status = 'ENABLED'
  accountForm.reason = ''
  showAccountModal.value = true
}

// 打開編輯對話框
const handleEditAccount = (account: AdminAccount) => {
  editingAccountId.value = account.id
  accountForm.username = account.username
  accountForm.display_name = account.display_name
  accountForm.role = account.role
  accountForm.groups = account.groups || []
  accountForm.password = ''
  accountForm.confirmPassword = ''
  accountForm.status = account.status
  accountForm.reason = ''
  showAccountModal.value = true
}

// 保存帳號
const handleSaveAccount = async () => {
  try {
    // 驗證必填字段
    if (!accountForm.username.trim()) {
      message.error('帳號不可為空')
      return
    }
    if (!accountForm.display_name.trim()) {
      message.error('顯示名稱不可為空')
      return
    }

    // 編輯時必須填寫異動原因
    if (editingAccountId.value && !accountForm.reason.trim()) {
      message.error('請輸入異動原因')
      return
    }

    // 編輯時帳號為唯讀，新增時檢查唯一性
    if (!editingAccountId.value) {
      const isDuplicate = accounts.value.some(
        a => a.username === accountForm.username && !a.deleted_at
      )
      if (isDuplicate) {
        message.error('帳號已存在')
        return
      }

      // 新增時必須輸入密碼
      if (!accountForm.password) {
        message.error('請輸入密碼')
        return
      }
      if (accountForm.password !== accountForm.confirmPassword) {
        message.error('密碼不一致')
        return
      }
      if (!validatePassword(accountForm.password)) {
        message.error('密碼需為 6-16 位元英數字')
        return
      }
    }

    // 一般使用者群組驗證
    if (accountForm.role === 'USER' && accountForm.groups.length === 0) {
      message.error('一般使用者必須分配至少一個群組')
      return
    }

    loading.value = true
    await delay()

    if (editingAccountId.value) {
      // 編輯現有帳號
      const index = accounts.value.findIndex(a => a.id === editingAccountId.value)
      if (index !== -1) {
        accounts.value[index] = {
          ...accounts.value[index],
          display_name: accountForm.display_name,
          role: accountForm.role,
          groups: accountForm.role === 'USER' ? accountForm.groups : undefined,
          status: accountForm.status,
          updated_at: new Date().toLocaleString()
        }
        message.success('帳號更新成功')
      }
    } else {
      // 新增帳號
      const newAccount: AdminAccount = {
        id: `admin-${Date.now()}`,
        username: accountForm.username,
        display_name: accountForm.display_name,
        role: accountForm.role,
        groups: accountForm.role === 'USER' ? accountForm.groups : undefined,
        status: accountForm.status,
        two_fa_enabled: false,
        created_at: new Date().toLocaleString(),
        updated_at: new Date().toLocaleString()
      }
      accounts.value.push(newAccount)
      message.success('帳號建立成功')
    }

    showAccountModal.value = false
  } catch (error) {
    message.error('保存失敗')
  } finally {
    loading.value = false
  }
}

// 刪除帳號
const handleDeleteAccount = async (account: AdminAccount) => {
  try {
    loading.value = true
    await delay()

    // 軟刪除
    const index = accounts.value.findIndex(a => a.id === account.id)
    if (index !== -1) {
      accounts.value[index].deleted_at = new Date().toLocaleString()
      accounts.value[index].deleted_by = authStore.user?.user_id || 'admin'
    }

    message.success('帳號已刪除')
  } catch (error) {
    message.error('刪除失敗')
  } finally {
    loading.value = false
  }
}

// 打開權限稽核抽屜
const handleOpenAudit = (account: AdminAccount) => {
  auditingAccount.value = account
  showAuditDrawer.value = true
}

// 驗證密碼格式
const validatePassword = (pwd: string): boolean => {
  const regex = /^[a-zA-Z0-9]{6,16}$/
  return regex.test(pwd)
}
</script>

<template>
  <div class="p-6 space-y-4">
    <!-- 頁面標題 -->
    <div>
      <h1 class="text-3xl font-bold text-gray-900">
        管理員列表
      </h1>
      <p class="text-gray-600 mt-1">
        管理後台帳號、分配權限群組、進行權限稽核
      </p>
    </div>

    <!-- 權限提示 -->
    <NAlert type="info">
      當前用戶角色：
      <NTag :type="getRoleColor(authStore.user?.role || 'USER')">
        {{
          authStore.user?.role === 'DEVELOPER'
            ? '技術開發'
            : authStore.user?.role === 'MANAGER'
              ? '營運主管'
              : '一般職員'
        }}
      </NTag>
    </NAlert>

    <!-- 操作欄 -->
    <div class="flex justify-between items-center">
      <NSpace>
        <NInput
          v-model:value="searchText"
          type="text"
          placeholder="搜尋帳號或名稱..."
          clearable
          style="max-width: 300px"
        >
          <template #prefix>
            <NIcon>
              <Search />
            </NIcon>
          </template>
        </NInput>
        <div class="flex items-center gap-2">
          <input type="checkbox" v-model="showDeletedAccounts" />
          <label class="text-sm text-gray-700">顯示已刪除</label>
        </div>
      </NSpace>
      <NButton
        type="primary"
        :disabled="authStore.user?.role === 'USER'"
        @click="handleAddAccount"
      >
        <template #icon>
          <NIcon>
            <Add />
          </NIcon>
        </template>
        新增帳號
      </NButton>
    </div>

    <!-- 帳號列表 -->
    <NCard :bordered="false">
      <NSpin :show="loading">
        <table class="min-w-full border-collapse border border-gray-300">
          <thead class="bg-gray-50">
            <tr>
              <th class="border border-gray-300 px-4 py-2 text-left w-28">管理員帳號</th>
              <th class="border border-gray-300 px-4 py-2 text-left w-28">顯示名稱</th>
              <th class="border border-gray-300 px-4 py-2 text-left w-24">身份階級</th>
              <th class="border border-gray-300 px-4 py-2 text-left w-36">所屬群組</th>
              <th class="border border-gray-300 px-4 py-2 text-left w-24">帳號狀態</th>
              <th class="border border-gray-300 px-4 py-2 text-left w-32">最後登入</th>
              <th class="border border-gray-300 px-4 py-2 text-center w-40">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in paginatedAccounts" :key="row.id" class="border border-gray-300 hover:bg-gray-50">
              <td class="border border-gray-300 px-4 py-2">
                <span class="font-semibold">{{ row.username }}</span>
                <span v-if="row.deleted_at" class="text-red-500"> (已刪除)</span>
              </td>
              <td class="border border-gray-300 px-4 py-2">{{ row.display_name }}</td>
              <td class="border border-gray-300 px-4 py-2">
                <NTag :type="getRoleColor(row.role)">
                  {{
                    row.role === 'DEVELOPER'
                      ? '技術開發'
                      : row.role === 'MANAGER'
                        ? '營運主管'
                        : '一般職員'
                  }}
                </NTag>
              </td>
              <td class="border border-gray-300 px-4 py-2">
                <NSpace v-if="row.groups && row.groups.length > 0" :size="8">
                  <NTag
                    v-for="groupId in row.groups"
                    :key="groupId"
                    type="info"
                    size="small"
                  >
                    {{
                      mockPermissionGroups.find(g => g.id === groupId)?.name ||
                      groupId
                    }}
                  </NTag>
                </NSpace>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="border border-gray-300 px-4 py-2">
                <NTag :type="getStatusColor(row.status)">
                  {{ getStatusLabel(row.status) }}
                </NTag>
              </td>
              <td class="border border-gray-300 px-4 py-2">{{ row.last_login || '-' }}</td>
              <td class="border border-gray-300 px-4 py-2">
                <NSpace justify="center" :size="8">
                  <NButton
                    text
                    type="primary"
                    size="small"
                    :disabled="authStore.user?.role === 'USER' || !!row.deleted_at"
                    @click="handleEditAccount(row)"
                  >
                    <template #icon>
                      <NIcon size="18">
                        <Edit />
                      </NIcon>
                    </template>
                  </NButton>
                  <NButton
                    text
                    type="info"
                    size="small"
                    :disabled="row.role === 'DEVELOPER' && authStore.user?.role !== 'DEVELOPER'"
                    @click="handleOpenAudit(row)"
                  >
                    <template #icon>
                      <NIcon size="18">
                        <ShieldCheckmark />
                      </NIcon>
                    </template>
                  </NButton>
                  <NPopconfirm
                    :disabled="authStore.user?.role === 'USER' || !!row.deleted_at"
                    @positive-click="() => handleDeleteAccount(row)"
                  >
                    <template #trigger>
                      <NButton
                        text
                        type="error"
                        size="small"
                        :disabled="authStore.user?.role === 'USER'"
                      >
                        <template #icon>
                          <NIcon size="18">
                            <Trash />
                          </NIcon>
                        </template>
                      </NButton>
                    </template>
                    確定要刪除此帳號嗎？
                  </NPopconfirm>
                </NSpace>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 分頁 -->
        <div class="flex justify-end mt-4">
          <NPagination
            v-model:page="pagination.page"
            :page-size="pagination.pageSize"
            :page-count="Math.ceil(filteredAccounts.length / pagination.pageSize)"
          />
        </div>
      </NSpin>
    </NCard>

    <!-- 新增/編輯帳號彈窗 -->
    <NModal
      v-model:show="showAccountModal"
      :title="editingAccountId ? '編輯帳號' : '新增帳號'"
      preset="dialog"
      size="large"
    >
      <NSpin :show="loading">
        <NForm
          ref="accountFormRef"
          :model="accountForm"
          label-placement="top"
          label-width="auto"
        >
          <NFormItem label="管理員帳號" path="username" required>
            <NInput
              v-model:value="accountForm.username"
              placeholder="請輸入帳號"
              :disabled="!!editingAccountId"
            />
          </NFormItem>

          <NFormItem label="顯示名稱" path="display_name" required>
            <NInput
              v-model:value="accountForm.display_name"
              placeholder="請輸入顯示名稱 (2-20 字)"
              maxlength="20"
            />
          </NFormItem>

          <NFormItem label="身份階級" path="role" required>
            <NSelect
              v-model:value="accountForm.role"
              :options="visibleRoles"
              :disabled="authStore.user?.role === 'USER'"
            />
          </NFormItem>

          <!-- 一般使用者群組選擇 -->
          <NFormItem
            v-if="accountForm.role === 'USER'"
            label="所屬群組"
            path="groups"
            required
          >
            <NCheckboxGroup v-model:value="accountForm.groups">
              <NSpace vertical>
                <NCheckbox
                  v-for="group in visibleGroups"
                  :key="group.id"
                  :value="group.id"
                  :label="group.name"
                  :disabled="!editingAccountId && mockAdminAccounts.some(a => a.id === authStore.user?.user_id && a.groups?.includes(group.id)) === false"
                />
              </NSpace>
            </NCheckboxGroup>
          </NFormItem>

          <!-- 密碼欄位 -->
          <template v-if="!editingAccountId">
            <NFormItem label="登入密碼" path="password" required>
              <NInput
                v-model:value="accountForm.password"
                type="password"
                placeholder="6-16 位元英數字"
                show-password-on="click"
              />
            </NFormItem>

            <NFormItem label="確認密碼" path="confirmPassword" required>
              <NInput
                v-model:value="accountForm.confirmPassword"
                type="password"
                placeholder="請再次輸入密碼"
                show-password-on="click"
              />
            </NFormItem>
          </template>

          <NFormItem label="帳號狀態" path="status" required>
            <NSelect
              v-model:value="accountForm.status"
              :options="[
                { label: '啟用', value: 'ENABLED' },
                { label: '停用', value: 'DISABLED' },
                { label: '鎖定', value: 'LOCKED' }
              ]"
            />
          </NFormItem>

          <NFormItem v-if="editingAccountId" label="異動原因" path="reason" required>
            <NInput
              v-model:value="accountForm.reason"
              type="textarea"
              placeholder="請輸入此次修改的原因"
              maxlength="200"
              :rows="2"
            />
          </NFormItem>
        </NForm>
      </NSpin>

      <template #action>
        <NSpace>
          <NButton @click="() => (showAccountModal = false)">取消</NButton>
          <NButton type="primary" :loading="loading" @click="handleSaveAccount">
            保存
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- 權限稽核抽屜 -->
    <NDrawer
      v-model:show="showAuditDrawer"
      title="權限稽核"
      width="600"
      placement="right"
    >
      <NDrawerContent v-if="auditingAccount">
        <NSpin :show="loading">
          <NGrid :cols="1" responsive="screen" :x-gap="12" :y-gap="16">
            <!-- 帳號資訊 -->
            <NGridItem>
              <div class="space-y-2">
                <p>
                  <span class="font-semibold">帳號：</span>
                  {{ auditingAccount.username }}
                </p>
                <p>
                  <span class="font-semibold">名稱：</span>
                  {{ auditingAccount.display_name }}
                </p>
                <p>
                  <span class="font-semibold">身份：</span>
                  <NTag :type="getRoleColor(auditingAccount.role)">
                    {{
                      auditingAccount.role === 'DEVELOPER'
                        ? '技術開發'
                        : auditingAccount.role === 'MANAGER'
                          ? '營運主管'
                          : '一般職員'
                    }}
                  </NTag>
                </p>
              </div>
            </NGridItem>

            <!-- 生效權限列表 -->
            <NGridItem>
              <NCard title="生效權限清單" size="small">
                <div class="space-y-2 max-h-96 overflow-y-auto">
                  <div
                    v-for="perm in mockPermissions"
                    :key="perm.code"
                    class="p-3 border rounded bg-gray-50 hover:bg-blue-50"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="font-semibold text-sm">{{ perm.code }}</p>
                        <p class="text-xs text-gray-600">{{ perm.name }}</p>
                      </div>
                      <div class="text-right">
                        <NTag
                          :type="
                            getAccountPermissions(auditingAccount)[perm.code] ===
                            'WRITE'
                              ? 'success'
                              : getAccountPermissions(auditingAccount)[
                                  perm.code
                                ] === 'READ'
                                ? 'warning'
                                : 'default'
                          "
                        >
                          {{
                            getAccountPermissions(auditingAccount)[perm.code] ===
                            'WRITE'
                              ? '操作'
                              : getAccountPermissions(auditingAccount)[
                                  perm.code
                                ] === 'READ'
                                ? '唯讀'
                                : '無'
                          }}
                        </NTag>
                        <p
                          v-if="
                            auditingAccount.role !== 'DEVELOPER' &&
                            getAccountPermissions(auditingAccount)[perm.code] !==
                              'NONE'
                          "
                          class="text-xs text-gray-600 mt-1"
                        >
                          來源：{{
                            auditingAccount.groups
                              ?.map(
                                gid =>
                                  mockPermissionGroups.find(g => g.id === gid)
                                    ?.name
                              )
                              .join(', ')
                          }}
                        </p>
                        <p
                          v-else-if="auditingAccount.role === 'DEVELOPER'"
                          class="text-xs text-gray-600 mt-1"
                        >
                          來源：系統預設全域權限
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </NCard>
            </NGridItem>
          </NGrid>
        </NSpin>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style scoped>
:deep(.n-card) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

:deep(.n-modal) {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
}
</style>
