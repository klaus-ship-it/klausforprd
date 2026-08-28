<template>
  <main class="flex-1 p-4 md:p-6 animate-fade-in-up">
    <div class="max-w-[1400px] mx-auto flex flex-col gap-4">

      <!-- Page Title (normal flow, scrolls away naturally) -->
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{{ t('navigation.chatTicketManagement') }}</h1>
        <p class="text-sm text-slate-500 mt-1">統一監控全站客服工單分配狀態及處理進度</p>
      </div>

      <!-- Sticky Toolbar -->
      <div class="sticky top-0 z-30 transition-all duration-300" :class="{ 'pt-1': isSticky }">
        <div
          class="rounded-2xl border transition-all duration-300"
          :class="isSticky
            ? 'sticky-glass shadow-xl mx-2 border-slate-200/60 px-5 py-3'
            : 'bg-white dark:bg-gray-800 shadow-sm border-slate-200 dark:border-gray-700 px-6 py-4'"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div class="w-full sm:w-64">
                <n-input v-model:value="searchQuery" placeholder="搜尋工單號 / 玩家 ID / 客服 ID" clearable>
                  <template #prefix>
                    <div class="i-heroicons-magnifying-glass-20-solid relative top-[1px]" />
                  </template>
                </n-input>
              </div>
              <div class="w-full sm:w-40">
                <n-select v-model:value="searchStatus" :options="statusOptions" placeholder="所有狀態" clearable />
              </div>
              <div class="w-full sm:w-48">
                <n-select v-model:value="searchCategory" :options="categoryOptions" placeholder="問題分類" clearable />
              </div>
              <div class="relative group">
                <n-date-picker
                  v-model:value="dateRange"
                  type="daterange"
                  clearable
                  placeholder="建單日期範圍"
                  class="w-full sm:w-64"
                />
              </div>
              <n-button type="primary" secondary @click="fetchData">
                <template #icon><div class="i-heroicons-magnifying-glass-20-solid" /></template>
                搜尋
              </n-button>
            </div>
            <div class="flex gap-2">
              <n-button secondary type="primary">
                <template #icon><div class="i-heroicons-arrow-down-tray-20-solid" /></template>
                匯出報表
              </n-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Table Card -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700 overflow-x-auto p-4">
        <n-data-table
          :columns="columns"
          :data="filteredTickets"
          :loading="loading"
          :pagination="pagination"
          :bordered="false"
          :single-line="false"
          class="min-w-[1000px]"
        />
      </div>
    </div>

    <!-- 強制轉派彈窗 -->
    <n-modal
      v-model:show="showAssignModal"
      preset="card"
      title="強制轉派工單"
      class="w-[450px] premium-glass"
      :segmented="{ content: 'soft', footer: 'soft' }"
    >
      <div class="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400">
        強制轉派將立即轉移此工單的處理權限，無論當前負責人是否在線。
      </div>
      <n-form :model="assignForm" label-placement="top">
        <n-form-item label="目標管理員 ID" path="adminId" required>
          <n-input v-model:value="assignForm.adminId" placeholder="輸入後台人員 ID (例如: admin_123)" />
        </n-form-item>
        <n-form-item label="強制轉派備註 (選填)">
          <n-input
            v-model:value="assignForm.content"
            type="textarea"
            placeholder="請輸入轉派原因..."
            :rows="3"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showAssignModal = false">取消</n-button>
          <n-button type="warning" @click="confirmAssign" :loading="isAssigning">確認轉派</n-button>
        </div>
      </template>
    </n-modal>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted, onBeforeUnmount } from 'vue'
import { NInput, NButton, NTag, NSelect, NDatePicker, NModal, NForm, NFormItem, NDataTable, useMessage, useDialog, DataTableColumns, NDropdown, NIcon } from 'naive-ui'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

// 搜尋
const searchQuery = ref('')
const searchStatus = ref(null)
const searchCategory = ref(null)
const dateRange = ref<[number, number] | null>(null)
const loading = ref(false)

// 轉派
const showAssignModal = ref(false)
const isAssigning = ref(false)
const selectedTicketId = ref<number | null>(null)
const assignForm = ref({ adminId: '', content: '' })

const statusOptions = [
  { label: '全部狀態', value: 'all' },
  { label: '未派發 (佇列中)', value: 'unassigned' },
  { label: '待處理 (已派發)', value: 'pending' },
  { label: '處理中', value: 'processing' },
  { label: '已結案', value: 'closed' }
]

const categoryOptions = [
  { label: '金流與帳務類', value: 'finance' },
  { label: '帳號與安全類', value: 'security' },
  { label: '遊戲與技術支援類', value: 'tech' },
  { label: '檢舉與申訴類', value: 'report' },
  { label: '建議與其他', value: 'other' }
]

const getCategoryLabel = (cat: string) => {
  return categoryOptions.find(c => c.value === cat)?.label || '未知'
}

interface AdminTicket {
  id: number
  userId: string
  category: string
  subject: string
  agentId: string | null
  status: 'unassigned' | 'pending' | 'processing' | 'closed'
  createdTime: string
  lastUpdateTime: string
}

// 模擬全站工單資料
const mockAllTickets = ref<AdminTicket[]>([
  { id: 10030, userId: 'Player_4021', category: 'report', subject: '系統詢問', agentId: null, status: 'unassigned', createdTime: '2026-04-24 10:15:00', lastUpdateTime: '2026-04-24 10:15:00' },
  { id: 10029, userId: 'Player_8812', category: 'security', subject: '帳號無法登入', agentId: null, status: 'unassigned', createdTime: '2026-04-24 10:10:00', lastUpdateTime: '2026-04-24 10:10:00' },
  { id: 10028, userId: 'User_5533', category: 'security', subject: '密碼重置', agentId: null, status: 'unassigned', createdTime: '2026-04-24 10:05:00', lastUpdateTime: '2026-04-24 10:05:00' },
  { id: 10024, userId: 'User_9921', category: 'finance', subject: '金流加值未到帳', agentId: 'CS_Support_03', status: 'pending', createdTime: '2026-04-24 09:45:00', lastUpdateTime: '2026-04-24 09:45:00' },
  { id: 10023, userId: 'Ace_Gamer', category: 'tech', subject: '遊戲異常閃退', agentId: 'CS_Support_03', status: 'processing', createdTime: '2026-04-24 09:30:00', lastUpdateTime: '2026-04-24 09:35:00' },
  { id: 10022, userId: 'Lucky_Luke', category: 'account', subject: 'VIP等級晉升問題', agentId: 'CS_Support_03', status: 'closed', createdTime: '2026-04-24 08:20:00', lastUpdateTime: '2026-04-24 08:50:00' },
  { id: 10021, userId: 'Star_Lord', category: 'tech', subject: '任務獎勵未發放', agentId: 'CS_Support_01', status: 'processing', createdTime: '2026-04-24 08:10:00', lastUpdateTime: '2026-04-24 08:45:00' },
  { id: 10020, userId: 'GamblerXXX', category: 'finance', subject: '出款失敗', agentId: 'CS_Support_02', status: 'closed', createdTime: '2026-04-23 15:10:00', lastUpdateTime: '2026-04-23 16:00:00' }
])

const filteredTickets = computed(() => {
  let result = mockAllTickets.value
  
  if (searchStatus.value && searchStatus.value !== 'all') {
    result = result.filter(t => t.status === searchStatus.value)
  }
  
  if (searchCategory.value) {
    result = result.filter(t => t.category === searchCategory.value)
  }
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(t => 
      t.id.toString().includes(q) || 
      t.userId.toLowerCase().includes(q) || 
      (t.agentId && t.agentId.toLowerCase().includes(q))
    )
  }
  
  return result
})

const pagination = ref({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50]
})

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'unassigned': return { label: '未派發 (佇列中)', type: 'error', dot: 'bg-rose-500 animate-pulse' }
    case 'pending': return { label: '待處理 (已派發)', type: 'warning', dot: 'bg-amber-500' }
    case 'processing': return { label: '處理中', type: 'info', dot: 'bg-sky-500' }
    case 'closed': return { label: '已結案', type: 'success', dot: 'bg-emerald-500' }
    default: return { label: '未知', type: 'default', dot: 'bg-slate-500' }
  }
}

const handleForceAssign = (ticket: AdminTicket) => {
  selectedTicketId.value = ticket.id
  assignForm.value.adminId = ticket.agentId || ''
  showAssignModal.value = true
}

const handleForceClose = (ticket: AdminTicket) => {
  dialog.warning({
    title: '強制結案',
    content: `確定要強制結案工單 #${ticket.id} 嗎？`,
    positiveText: '確認結案',
    negativeText: '取消',
    onPositiveClick: () => {
      const idx = mockAllTickets.value.findIndex(t => t.id === ticket.id)
      if (idx !== -1) {
        mockAllTickets.value[idx].status = 'closed'
        mockAllTickets.value[idx].lastUpdateTime = new Date().toLocaleString()
        message.success(`工單 #${ticket.id} 已強制結案`)
      }
    }
  })
}

const confirmAssign = () => {
  if (!assignForm.value.adminId) {
    message.error('請輸入目標管理員 ID')
    return
  }
  
  isAssigning.value = true
  setTimeout(() => {
    const idx = mockAllTickets.value.findIndex(t => t.id === selectedTicketId.value)
    if (idx !== -1) {
       mockAllTickets.value[idx].agentId = assignForm.value.adminId
       // 如果本來是 unassigned，轉派後自動變成 pending
       if (mockAllTickets.value[idx].status === 'unassigned') {
         mockAllTickets.value[idx].status = 'pending'
       }
       mockAllTickets.value[idx].lastUpdateTime = new Date().toLocaleString()
    }
    message.success(`已將工單 #${selectedTicketId.value} 指派給 ${assignForm.value.adminId}`)
    showAssignModal.value = false
    isAssigning.value = false
    assignForm.value = { adminId: '', content: '' }
  }, 800)
}

const fetchData = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 500)
}

// Action Options for Dropdown
const createActionOptions = (row: AdminTicket) => {
  const options = []
  
  if (row.status !== 'closed') {
    options.push({ label: '強制指派/轉交', key: 'assign' })
    options.push({ label: '強制結案', key: 'close' })
  }
  options.push({ label: '查看對話紀錄', key: 'view' })
  
  return options
}

const handleActionSelect = (key: string, row: AdminTicket) => {
  switch (key) {
    case 'assign':
      handleForceAssign(row)
      break
    case 'close':
      handleForceClose(row)
      break
    case 'view':
      message.info(`查看工單 #${row.id} 對話紀錄 (開發中)`)
      break
  }
}

const columns = computed<DataTableColumns<AdminTicket>>(() => [
  {
    title: '問題分類與標題',
    key: 'id',
    width: 250,
    render(row) {
      return h('div', { class: 'flex flex-col gap-1.5' }, [
        h('div', { class: 'flex items-center gap-2' }, [
          h('span', { class: 'text-sm font-bold text-slate-800 dark:text-slate-200' }, `TKT-${row.id}`),
          h(NTag, { size: 'small', type: row.category === 'finance' ? 'error' : 'default', round: true, class: 'font-bold' }, { default: () => getCategoryLabel(row.category) })
        ]),
        h('span', { class: 'text-xs text-slate-500 truncate' }, row.subject)
      ])
    }
  },
  {
    title: '玩家資訊',
    key: 'userId',
    width: 150,
    render(row) {
       return h('span', { class: 'font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300' }, row.userId)
    }
  },
  {
    title: '處理人員',
    key: 'agentId',
    width: 150,
    render(row) {
      if (!row.agentId) {
         return h('span', { class: 'text-xs text-rose-500 italic font-bold' }, '尚未指派')
      }
      return h('div', { class: 'flex items-center gap-2' }, [
         h('div', { class: 'w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold text-[10px] uppercase border border-sky-200 dark:border-sky-800' }, row.agentId.charAt(0)),
         h('span', { class: 'text-sm font-bold text-slate-700 dark:text-slate-300' }, row.agentId)
      ])
    }
  },
  {
    title: '當前狀態',
    key: 'status',
    width: 150,
    render(row) {
      const config = getStatusConfig(row.status)
      return h(NTag, { type: config.type as any, bordered: false, round: true, size: 'small' }, {
        default: () => h('div', { class: 'flex items-center gap-1.5 px-1' }, [
          h('span', { class: ['w-1.5 h-1.5 rounded-full', config.dot] }),
          h('span', { class: 'font-bold' }, config.label)
        ])
      })
    }
  },
  {
    title: '建單 / 更新時間',
    key: 'time',
    width: 200,
    render(row) {
      return h('div', { class: 'flex flex-col gap-1 text-[11px] text-slate-500 font-mono' }, [
        h('span', {}, `建: ${row.createdTime}`),
        h('span', { class: 'text-slate-400' }, `更: ${row.lastUpdateTime}`)
      ])
    }
  },
  {
    title: '管理操作',
    key: 'actions',
    width: 120,
    fixed: 'right',
    align: 'center',
    render(row) {
      return h(NDropdown, {
        options: createActionOptions(row),
        onSelect: (key) => handleActionSelect(key as string, row),
        trigger: 'click'
      }, {
        default: () => h(NButton, { size: 'small', quaternary: true }, {
           default: () => '操作',
           icon: () => h('div', { class: 'i-heroicons-ellipsis-vertical-20-solid' })
        })
      })
    }
  }
])

const isSticky = ref(false)
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  isSticky.value = target.scrollTop > 20
}

onMounted(() => {
  fetchData()
  const container = document.getElementById('main-scroll-container')
  if (container) {
    container.addEventListener('scroll', handleScroll)
  }
})

onBeforeUnmount(() => {
  const container = document.getElementById('main-scroll-container')
  if (container) {
    container.removeEventListener('scroll', handleScroll)
  }
})
</script>

<style scoped>
.premium-glass {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--card-shadow);
}
.sticky-glass {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
</style>
