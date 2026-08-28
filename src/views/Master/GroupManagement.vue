<script setup lang="ts">
import { ref, reactive, computed, h } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import {
  NCard,
  NButton,
  NSpace,
  NTag,
  NInput,
  NModal,
  NForm,
  NFormItem,
  NSwitch,
  NIcon,
  NPopconfirm,
  NDrawer,
  NDrawerContent,
  NGrid,
  NGridItem,
  NSpin,
  NEmpty,
  NCheckbox,
  NRadioGroup,
  NRadioButton
} from 'naive-ui'
import {
  EditOutlined as EditIcon,
  DeleteOutlined as DeleteIcon,
  GroupOutlined as PeopleIcon,
  AddOutlined as AddIcon,
  SearchOutlined
} from '@vicons/material'

// 为了兼容简化，我们重新指定一些图标名称
const Edit = EditIcon
const Trash = DeleteIcon
const People = PeopleIcon
const Add = AddIcon
const Search = SearchOutlined
import { useAuthStore } from '@/stores/useAuthStore'
import {
  mockPermissionGroups,
  mockPermissions,
  mockAdminAccounts,
  delay
} from '@/mocks/admin'
import type { PermissionGroup } from '@/types'

const message = useMessage()
const dialog = useDialog()
const authStore = useAuthStore()

// 數據狀態
const groups = ref<PermissionGroup[]>([...mockPermissionGroups])
const loading = ref(false)
const searchText = ref('')

// 彈窗狀態
const showGroupModal = ref(false)
const showMemberDrawer = ref(false)
const editingGroupId = ref<string | null>(null)
const currentGroup = ref<PermissionGroup | null>(null)

// 新增/編輯表單
const groupForm = reactive({
  name: '',
  description: '',
  permissions: {} as Record<string, 'NONE' | 'READ' | 'WRITE'>,
  sensitivePermissions: {} as Record<string, boolean>
})

// 計算可見的權限（營運管理者看不到系統設定）
const visiblePermissions = computed(() => {
  if (authStore.user?.role === 'MANAGER') {
    return mockPermissions.filter(p => p.module !== '1. 系統設定')
  }
  return mockPermissions
})

// 權限樹結構
const permissionTreeData = computed(() => {
  const modules = new Map<string, any>()

  visiblePermissions.value.forEach(perm => {
    if (!modules.has(perm.module)) {
      modules.set(perm.module, {
        label: perm.module,
        key: perm.module,
        disabled: true,
        children: []
      })
    }
    modules.get(perm.module)!.children.push({
      label: `${perm.code} - ${perm.name}`,
      key: perm.code,
      prefix: () => h(
        NTag,
        { size: 'small', type: 'info' },
        { default: () => perm.level }
      )
    })
  })

  return Array.from(modules.values())
})

// 過濾後的群組列表
const filteredGroups = computed(() => {
  if (!searchText.value) return groups.value
  const text = searchText.value.toLowerCase()
  return groups.value.filter(
    g =>
      g.name.toLowerCase().includes(text) ||
      g.description?.toLowerCase().includes(text)
  )
})

// 打開新增對話框
const handleAddGroup = () => {
  editingGroupId.value = null
  groupForm.name = ''
  groupForm.description = ''
  visiblePermissions.value.forEach(p => {
    groupForm.permissions[p.code] = 'NONE'
  })
  groupForm.sensitivePermissions = {}
  permissionTreeData.value.forEach(m => {
    groupForm.sensitivePermissions[m.key] = false
  })
  showGroupModal.value = true
}

// 打開編輯對話框
const handleEditGroup = (group: PermissionGroup) => {
  editingGroupId.value = group.id
  groupForm.name = group.name
  groupForm.description = group.description || ''
  groupForm.permissions = { ...group.permissions }
  groupForm.sensitivePermissions = { ...(group.sensitive_permissions || {}) }
  
  // 確保所有顯示的模組都有對應的敏感資料設定（預設為 false）
  permissionTreeData.value.forEach(m => {
    if (groupForm.sensitivePermissions[m.key] === undefined) {
      groupForm.sensitivePermissions[m.key] = false
    }
  })
  showGroupModal.value = true
}

// 保存群組
const handleSaveGroup = async () => {
  try {
    // 驗證群組名稱
    if (!groupForm.name.trim()) {
      message.error('群組名稱不可為空')
      return
    }

    // 檢查群組名稱是否重複
    const isDuplicate = groups.value.some(
      g =>
        g.name === groupForm.name &&
        g.id !== editingGroupId.value
    )
    if (isDuplicate) {
      message.error('群組名稱已存在')
      return
    }

    loading.value = true
    await delay()

    if (editingGroupId.value) {
      // 編輯現有群組
      const index = groups.value.findIndex(g => g.id === editingGroupId.value)
      if (index !== -1) {
        groups.value[index] = {
          ...groups.value[index],
          name: groupForm.name,
          description: groupForm.description,
          permissions: groupForm.permissions,
          sensitive_permissions: groupForm.sensitivePermissions,
          updated_by: authStore.user?.user_id || 'admin',
          updated_at: new Date().toLocaleString()
        }
        message.success('群組更新成功')
      }
    } else {
      // 新增群組
      const newGroup: PermissionGroup = {
        id: `group-${Date.now()}`,
        name: groupForm.name,
        description: groupForm.description,
        permissions: groupForm.permissions,
        sensitive_permissions: groupForm.sensitivePermissions,
        member_count: 0,
        status: 'ENABLED',
        created_by: authStore.user?.user_id || 'admin',
        created_at: new Date().toLocaleString(),
        updated_by: authStore.user?.user_id || 'admin',
        updated_at: new Date().toLocaleString()
      }
      groups.value.push(newGroup)
      message.success('群組建立成功')
    }

    showGroupModal.value = false
  } catch (error) {
    message.error('保存失敗')
  } finally {
    loading.value = false
  }
}

// 刪除群組
const handleDeleteGroup = async (group: PermissionGroup) => {
  if (group.member_count > 0) {
    dialog.warning({
      title: '無法刪除',
      content: `該群組尚有 ${group.member_count} 個管理員使用中，無法刪除`,
      positiveText: '確定',
      onPositiveClick: () => {}
    })
    return
  }

  try {
    loading.value = true
    await delay()

    // 軟刪除
    const index = groups.value.findIndex(g => g.id === group.id)
    if (index !== -1) {
      groups.value[index].deleted_at = new Date().toLocaleString()
      groups.value[index].deleted_by = authStore.user?.user_id || 'admin'
      groups.value.splice(index, 1)
    }

    message.success('群組已刪除')
  } catch (error) {
    message.error('刪除失敗')
  } finally {
    loading.value = false
  }
}

// 打開成員管理
const handleManageMembers = (group: PermissionGroup) => {
  currentGroup.value = group
  showMemberDrawer.value = true
}

// 切換群組狀態
const handleToggleStatus = async (group: PermissionGroup) => {
  try {
    loading.value = true
    await delay()

    const index = groups.value.findIndex(g => g.id === group.id)
    if (index !== -1) {
      const newStatus = group.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'
      groups.value[index].status = newStatus
      message.success(
        newStatus === 'ENABLED' ? '群組已啟用' : '群組已停用'
      )
    }
  } catch (error) {
    message.error('狀態更新失敗')
  } finally {
    loading.value = false
  }
}

// 取得群組的成員（從 mockAdminAccounts）
const getGroupMembers = () => {
  if (!currentGroup.value) return []
  return mockAdminAccounts.filter(
    acc => acc.groups?.includes(currentGroup.value!.id)
  )
}

// 取得待選成員（不在該群組中的一般職員）
const getAvailableMembers = () => {
  if (!currentGroup.value) return []
  const groupMemberIds = mockAdminAccounts
    .filter(acc => acc.groups?.includes(currentGroup.value!.id))
    .map(acc => acc.id)

  return mockAdminAccounts.filter(
    acc =>
      acc.role === 'USER' &&
      !groupMemberIds.includes(acc.id) &&
      !acc.deleted_at &&
      acc.status !== 'DISABLED'
  )
}

const availableMembers = computed(() => getAvailableMembers())
const groupMembers = computed(() => getGroupMembers())

// 移除成員
const handleRemoveMember = async (memberId: string) => {
  try {
    loading.value = true
    await delay()

    if (currentGroup.value) {
      const memberIndex = mockAdminAccounts.findIndex(a => a.id === memberId)
      if (memberIndex !== -1 && mockAdminAccounts[memberIndex].groups) {
        mockAdminAccounts[memberIndex].groups = mockAdminAccounts[
          memberIndex
        ].groups!.filter(gid => gid !== currentGroup.value!.id)
      }

      // 更新群組成員數
      const groupIndex = groups.value.findIndex(
        g => g.id === currentGroup.value!.id
      )
      if (groupIndex !== -1) {
        groups.value[groupIndex].member_count = Math.max(
          0,
          groups.value[groupIndex].member_count - 1
        )
      }

      message.success('成員已移除')
    }
  } catch (error) {
    message.error('移除失敗')
  } finally {
    loading.value = false
  }
}

// 新增成員
const handleAddMember = async (memberId: string) => {
  try {
    loading.value = true
    await delay()

    if (currentGroup.value) {
      const memberIndex = mockAdminAccounts.findIndex(a => a.id === memberId)
      if (memberIndex !== -1) {
        if (!mockAdminAccounts[memberIndex].groups) {
          mockAdminAccounts[memberIndex].groups = []
        }
        mockAdminAccounts[memberIndex].groups!.push(currentGroup.value.id)

        // 更新群組成員數
        const groupIndex = groups.value.findIndex(
          g => g.id === currentGroup.value!.id
        )
        if (groupIndex !== -1) {
          groups.value[groupIndex].member_count += 1
        }

        message.success('成員已加入')
      }
    }
  } catch (error) {
    message.error('加入失敗')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="p-6 space-y-4">
    <!-- 頁面標題 -->
    <div>
      <h1 class="text-3xl font-bold text-gray-900">群組管理</h1>
      <p class="text-gray-600 mt-1">管理權限群組，為一般職員分配功能權限</p>
    </div>

    <!-- 權限提示（營運管理者） -->
    <!-- <NAlert
      v-if="authStore.user?.role === 'MANAGER'"
      type="info"
    >
      您作為營運管理者，在編輯群組時無法看到「系統設定」模組下的功能。
    </NAlert> -->

    <!-- 操作欄 -->
    <div class="flex justify-between items-center">
      <NInput
        v-model:value="searchText"
        type="text"
        placeholder="搜尋群組名稱或描述..."
        clearable
        style="max-width: 300px"
      >
        <template #prefix>
          <NIcon>
            <Search />
          </NIcon>
        </template>
      </NInput>
      <NButton
        type="primary"
        :disabled="authStore.user?.role === 'USER'"
        @click="handleAddGroup"
      >
        <template #icon>
          <NIcon>
            <Add />
          </NIcon>
        </template>
        新增群組
      </NButton>
    </div>

    <!-- 群組列表 -->
    <NCard :bordered="false">
      <NSpin :show="loading">
        <div class="overflow-x-auto">
          <table class="min-w-full border-collapse border border-gray-300">
            <thead class="bg-gray-50">
              <tr>
                <th class="border border-gray-300 px-4 py-2 text-left">群組名稱</th>
                <th class="border border-gray-300 px-4 py-2 text-left">群組描述</th>
                <th class="border border-gray-300 px-4 py-2 text-center">成員數</th>
                <th class="border border-gray-300 px-4 py-2 text-left">操作人</th>
                <th class="border border-gray-300 px-4 py-2 text-center">狀態</th>
                <th class="border border-gray-300 px-4 py-2 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="group in filteredGroups" :key="group.id" class="border border-gray-300 hover:bg-gray-50">
                <td class="border border-gray-300 px-4 py-2">
                  <span class="font-semibold">{{ group.name }}</span>
                </td>
                <td class="border border-gray-300 px-4 py-2">{{ group.description || '-' }}</td>
                <td class="border border-gray-300 px-4 py-2 text-center">
                  <NTag type="info" round>{{ group.member_count }}</NTag>
                </td>
                <td class="border border-gray-300 px-4 py-2">{{ group.updated_by || '-' }}</td>
                <td class="border border-gray-300 px-4 py-2 text-center">
                  <NSwitch
                    :value="group.status === 'ENABLED'"
                    @update:value="() => handleToggleStatus(group)"
                    :disabled="authStore.user?.role === 'USER'"
                  />
                </td>
                <td class="border border-gray-300 px-4 py-2 text-center">
                  <NSpace justify="center" :size="8">
                    <NButton
                      text
                      type="primary"
                      size="small"
                      :disabled="authStore.user?.role === 'USER'"
                      @click="handleEditGroup(group)"
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
                      @click="handleManageMembers(group)"
                    >
                      <template #icon>
                        <NIcon size="18">
                          <People />
                        </NIcon>
                      </template>
                    </NButton>
                    <NPopconfirm
                      :disabled="authStore.user?.role === 'USER' || group.member_count > 0"
                      @positive-click="() => handleDeleteGroup(group)"
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
                      確定要刪除此群組嗎？
                    </NPopconfirm>
                  </NSpace>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </NSpin>
    </NCard>

    <!-- 新增/編輯群組彈窗 -->
    <NModal
      v-model:show="showGroupModal"
      title="群組設定"
      preset="dialog"
      size="large"
      :on-close="() => (showGroupModal = false)"
    >
      <NSpin :show="loading">
        <NForm
          ref="groupFormRef"
          :model="groupForm"
          label-placement="top"
          label-width="auto"
        >
          <NFormItem label="群組名稱" path="name" required>
            <NInput
              v-model:value="groupForm.name"
              placeholder="請輸入群組名稱"
              maxlength="50"
            />
          </NFormItem>

          <NFormItem label="群組描述" path="description">
            <NInput
              v-model:value="groupForm.description"
              type="textarea"
              placeholder="請輸入群組描述"
              maxlength="200"
              :rows="3"
            />
          </NFormItem>

          <NFormItem label="功能權限" required>
            <div class="space-y-3">
              <div
                v-for="module in permissionTreeData"
                :key="module.key"
                class="border rounded p-3 bg-gray-50"
              >
                <div class="flex justify-between items-center mb-2">
                  <p class="font-semibold text-gray-900">{{ module.label }}</p>
                  <NCheckbox v-model:checked="groupForm.sensitivePermissions[module.key]">
                    敏感資料
                  </NCheckbox>
                </div>
                <div class="space-y-2 ml-3">
                  <div
                    v-for="perm in module.children"
                    :key="perm.key"
                    class="flex items-center justify-between p-2 bg-white rounded border border-gray-200 hover:bg-blue-50"
                  >
                    <span class="text-sm">{{ perm.label }}</span>
                    <NRadioGroup v-model:value="groupForm.permissions[perm.key]" size="small">
                      <NRadioButton value="NONE">無</NRadioButton>
                      <NRadioButton value="READ">唯讀</NRadioButton>
                      <NRadioButton value="WRITE">操作</NRadioButton>
                    </NRadioGroup>
                  </div>
                </div>
              </div>
            </div>
          </NFormItem>
        </NForm>
      </NSpin>

      <template #action>
        <NSpace>
          <NButton @click="() => (showGroupModal = false)">取消</NButton>
          <NButton type="primary" :loading="loading" @click="handleSaveGroup">
            保存
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- 成員管理抽屜 -->
    <NDrawer
      v-model:show="showMemberDrawer"
      title="成員管理"
      width="500"
      placement="right"
    >
      <NDrawerContent>
        <NSpin :show="loading">
          <NGrid :cols="1" responsive="screen" :x-gap="12" :y-gap="12">
            <!-- 待選成員 -->
            <NGridItem>
              <NCard title="可加入成員" size="small">
                <div class="space-y-2">
                  <NInput
                    ref="searchMemberRef"
                    type="text"
                    placeholder="搜尋帳號或名稱..."
                    clearable
                  />
                  <div v-if="availableMembers.length === 0" class="p-4">
                    <NEmpty description="無可加入的成員" />
                  </div>
                  <div v-else class="space-y-2 max-h-60 overflow-y-auto">
                    <div
                      v-for="member in availableMembers"
                      :key="member.id"
                      class="flex items-center justify-between p-3 border rounded bg-gray-50 hover:bg-gray-100"
                    >
                      <div>
                        <p class="font-semibold text-sm">{{ member.display_name }}</p>
                        <p class="text-xs text-gray-600">@{{ member.username }}</p>
                      </div>
                      <NButton
                        type="primary"
                        size="small"
                        @click="handleAddMember(member.id)"
                      >
                        加入
                      </NButton>
                    </div>
                  </div>
                </div>
              </NCard>
            </NGridItem>

            <!-- 已加入成員 -->
            <NGridItem>
              <NCard title="已加入成員" size="small">
                <div v-if="groupMembers.length === 0" class="p-4">
                  <NEmpty description="暫無成員" />
                </div>
                <div v-else class="space-y-2 max-h-60 overflow-y-auto">
                  <div
                    v-for="member in groupMembers"
                    :key="member.id"
                    class="flex items-center justify-between p-3 border rounded bg-blue-50"
                  >
                    <div>
                      <p class="font-semibold text-sm">{{ member.display_name }}</p>
                      <p class="text-xs text-gray-600">
                        @{{ member.username }}
                      </p>
                    </div>
                    <NButton
                      type="error"
                      size="small"
                      @click="handleRemoveMember(member.id)"
                    >
                      移除
                    </NButton>
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
