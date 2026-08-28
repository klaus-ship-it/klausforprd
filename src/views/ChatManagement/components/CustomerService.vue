<template>
  <div class="mt-4 flex flex-col h-[600px] animate-fade-in-up">
    <!-- 頂部工具列 -->
    <div class="flex flex-wrap gap-4 mb-4 items-center justify-between">
      <div class="flex flex-wrap gap-4 items-center flex-1">
        <div class="w-full md:w-60">
          <n-input v-model:value="searchQuery" :placeholder="t('chatManagement.roomManagement.searchCsPlaceholder')" clearable>
            <template #prefix>
              <div class="i-heroicons-magnifying-glass-20-solid" />
            </template>
          </n-input>
        </div>
        <div class="w-full md:w-32">
          <n-select v-model:value="searchStatus" :options="statusOptions" placeholder="工單狀態" clearable />
        </div>
        <div class="w-full md:w-48">
          <n-select v-model:value="searchCategory" :options="categoryOptions" placeholder="工單分類" clearable />
        </div>
        <div class="w-full md:w-64">
          <n-date-picker v-model:value="searchDateRange" type="daterange" clearable placeholder="建單日期範圍" />
        </div>
        <n-button type="primary" secondary @click="handleSearch">
          <template #icon><div class="i-heroicons-magnifying-glass-20-solid" /></template>
          {{ t('chatManagement.roomManagement.search') }}
        </n-button>
      </div>
      
      <!-- 派發按鈕 (從系統隊列接取新工單) -->
      <div>
        <n-button type="primary" class="shadow-md shadow-sky-500/20" @click="handleDispatch" :loading="isDispatching">
          <template #icon><div class="i-heroicons-arrow-down-tray-20-solid" /></template>
          派發工單 ({{ unassignedQueueCount }})
        </n-button>
      </div>
    </div>

    <div class="flex flex-1 min-h-0 gap-4">
      <!-- 客服單列表 (已分配給此客服的) -->
      <div class="w-1/4 bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col premium-glass overflow-hidden shadow-sm">
        <div class="p-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 relative">
          <span class="font-bold text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            我的工作清單
          </span>
          <div class="flex items-center gap-1">
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-badge :value="myPendingCount" type="error" class="scale-90" />
              </template>
              待處理數量
            </n-tooltip>
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-badge :value="myProcessingCount" type="warning" class="scale-90" />
              </template>
              處理中數量
            </n-tooltip>
          </div>
        </div>
        <n-scrollbar class="flex-1">
          <n-list hoverable clickable :bordered="false" class="bg-transparent">
            <n-list-item
              v-for="ticket in mockTickets"
              :key="ticket.id"
              :class="{ 'bg-sky-50/70 border-l-2 border-sky-500 dark:bg-sky-900/20': selectedTicketId === ticket.id, 'border-l-2 border-transparent': selectedTicketId !== ticket.id }"
              @click="selectedTicketId = ticket.id"
              class="!px-4 !py-4 transition-all"
            >
              <div class="flex flex-col gap-1.5">
                <div class="flex justify-between items-start">
                  <span class="font-bold text-sm truncate pr-2 text-slate-800 dark:text-slate-200">{{ ticket.user }}</span>
                  <span :class="['inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border', getStatusStyle(ticket.status)]">
                    {{ ticket.statusText }}
                  </span>
                </div>
                <div class="text-[11px] font-mono text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400 self-start px-1.5 py-0.5 rounded">TKT-{{ ticket.id }}</div>
                <div class="text-xs text-gray-500 truncate mt-0.5">{{ ticket.subject }}</div>
                <div class="text-[10px] text-gray-400 font-mono mt-1 flex items-center gap-1">
                  <div class="i-heroicons-clock-20-solid text-[10px]"></div>
                  {{ ticket.time }}
                </div>
              </div>
            </n-list-item>
            
            <div v-if="mockTickets.length === 0" class="flex flex-col items-center justify-center p-8 text-gray-400">
              <div class="i-heroicons-inbox-20-solid text-3xl mb-2 opacity-30" />
              <span class="text-xs">目前沒有分配到的工單</span>
            </div>
          </n-list>
        </n-scrollbar>
      </div>
      
      <!-- 工單處理區 -->
      <div class="flex-1 bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden premium-glass shadow-sm">
        <div v-if="selectedTicket" class="flex-1 flex flex-col min-h-0 relative">
          <!-- 會話頂部資訊列 -->
          <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
            <div class="flex flex-col">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 uppercase border border-slate-300">
                  {{ selectedTicket.user.charAt(0) }}
                </div>
                <div class="flex flex-col">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-lg text-slate-800 dark:text-slate-100 leading-none">{{ selectedTicket.user }}</span>
                    <span :class="['inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border', getStatusStyle(selectedTicket.status)]">
                      {{ selectedTicket.statusText }}
                    </span>
                    <n-tag v-if="selectedTicket.category === 'finance'" size="small" type="error" round class="ml-1 font-bold">高優先</n-tag>
                  </div>
                  <span class="text-xs text-slate-500 mt-1 font-mono flex items-center gap-2">
                    TKT-{{ selectedTicket.id }}
                    <n-tag size="small" :bordered="false" class="text-[10px]">{{ getCategoryLabel(selectedTicket.category) }}</n-tag>
                    <span>問題類型: {{ selectedTicket.subject }}</span>
                  </span>
                </div>
              </div>
            </div>
            
            <!-- 操作按鈕 -->
            <div class="flex gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
              <n-button 
                v-if="selectedTicket.status === 'pending'"
                size="small" 
                type="info"
                class="font-bold tracking-wider"
                @click="handleStatusAction"
              >
                <template #icon><div class="i-heroicons-play-circle-20-solid" /></template>
                接單
              </n-button>
              
              <template v-if="selectedTicket.status === 'processing'">
                <n-button size="small" type="warning" secondary @click="showTransferModal = true">
                  <template #icon><div class="i-heroicons-arrow-path-rounded-square-20-solid" /></template>
                  轉交專員
                </n-button>
                <n-button size="small" type="success" @click="handleStatusAction">
                  <template #icon><div class="i-heroicons-check-circle-20-solid" /></template>
                  結案
                </n-button>
              </template>
              
              <n-button size="small" secondary @click="message.info('開發中')">
                <template #icon><div class="i-heroicons-information-circle-20-solid" /></template>
                詳細
              </n-button>
            </div>
          </div>

          <n-scrollbar ref="csScrollbarInst" class="flex-1 p-6 bg-slate-50 dark:bg-slate-900/50 opacity-95">
            <div v-for="msg in mockCsHistory" :key="msg.id" class="flex flex-col mb-6" :class="msg.sender === 'agent' ? 'items-end' : 'items-start'">
              <div class="flex items-center gap-2 mb-1.5" :class="msg.sender === 'agent' ? 'flex-row-reverse' : 'flex-row'">
                <span class="text-xs font-bold text-slate-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 px-1.5 py-0.5 rounded">{{ msg.senderName }}</span>
                <span class="text-[10px] text-gray-400 font-mono">{{ msg.time }}</span>
              </div>
              <div class="max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-md backdrop-blur-sm" 
                   :class="msg.sender === 'agent' 
                    ? 'bg-sky-500 dark:bg-sky-600 text-white rounded-tr-none' 
                    : 'bg-white/95 dark:bg-gray-800/95 text-slate-800 dark:text-slate-200 rounded-tl-none border border-gray-100 dark:border-gray-700'">
                {{ msg.content }}
              </div>
            </div>
            
            <div v-if="selectedTicket.status === 'closed'" class="my-6 flex justify-center">
              <span class="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold rounded-full border border-slate-200 dark:border-slate-700">
                此工單已經結案，無法繼續對話
              </span>
            </div>
          </n-scrollbar>

          <!-- 輸入區 -->
          <div class="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 relative" :class="{ 'opacity-50 pointer-events-none': selectedTicket.status === 'closed' || selectedTicket.status === 'pending' }">
            <div v-if="selectedTicket.status === 'pending'" class="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-[1px]">
              <span class="px-4 py-2 bg-sky-100 text-sky-700 text-sm font-bold rounded-lg border border-sky-200 shadow-sm animate-pulse">請先點擊「接單」後才能回覆玩家</span>
            </div>
            <n-input
              v-model:value="csInput"
              type="textarea"
              :rows="3"
              :placeholder="selectedTicket.status === 'closed' ? '已結案' : t('chatManagement.roomManagement.replyPlaceholder')"
              class="mb-3 bg-gray-50 font-medium"
              :disabled="selectedTicket.status === 'closed' || selectedTicket.status === 'pending'"
            />
            <div class="flex justify-between items-center">
              <div class="flex gap-2">
                <n-button size="small" quaternary circle>
                  <template #icon><div class="i-heroicons-paper-clip-20-solid" /></template>
                </n-button>
                <n-button size="small" quaternary circle>
                  <template #icon><div class="i-heroicons-face-smile-20-solid" /></template>
                </n-button>
              </div>
              <n-button type="primary" class="w-24 shadow-md shadow-sky-500/30" @click="handleSend" :disabled="selectedTicket.status === 'closed' || selectedTicket.status === 'pending' || !csInput.trim()">
                <template #icon><div class="i-heroicons-paper-airplane-20-solid -rotate-45" /></template>
                {{ t('chatManagement.roomManagement.send') }}
              </n-button>
            </div>
          </div>
        </div>
        <div v-else class="flex-1 flex flex-col items-center justify-center text-gray-400 italic bg-gray-50/50 dark:bg-gray-800/30">
          <div class="i-heroicons-chat-bubble-left-ellipsis-20-solid text-5xl mb-4 opacity-20 text-sky-500" />
          <span class="text-sm font-medium">請從左側選擇或「派發」新工單以開始處理</span>
        </div>
      </div>
    </div>

    <!-- 轉交專員彈窗 -->
    <n-modal
      v-model:show="showTransferModal"
      preset="card"
      title="轉交專員"
      class="w-[450px] premium-glass"
      :segmented="{ content: 'soft', footer: 'soft' }"
    >
      <div class="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400">
        轉交後，此工單將從您的清單中移除，並交由指定管理員接手處理。
      </div>
      <n-form :model="transferForm" label-placement="top" ref="transferFormRef">
        <n-form-item label="目標管理員 ID" path="adminId" required>
          <n-input v-model:value="transferForm.adminId" placeholder="輸入後台人員 ID (例如: admin_123)" />
        </n-form-item>
        <n-form-item label="交接備註 (選填)">
          <n-input
            v-model:value="transferForm.content"
            type="textarea"
            placeholder="請簡單說明目前處理進度或需注意事項..."
            :rows="3"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showTransferModal = false">取消</n-button>
          <n-button type="warning" @click="handleTransfer" :loading="isTransferring">確認轉交</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { 
  NInput, NButton, NList, NListItem, NScrollbar, NBadge, 
  NSelect, NDatePicker, NModal, NForm, NFormItem, useDialog, useMessage, 
  NTooltip
} from 'naive-ui'

const { t } = useI18n()
const dialog = useDialog()
const message = useMessage()

// 搜尋
const searchQuery = ref('')
const searchStatus = ref(null)
const searchCategory = ref(null)
const searchDateRange = ref<[number, number] | null>(null)

// 佇列與派發
const unassignedQueueCount = ref(5)
const isDispatching = ref(false)

// 工單狀態
const selectedTicketId = ref<number | null>(10024)
const csInput = ref('')
const csScrollbarInst = ref<any>(null)

// 轉交專員
const showTransferModal = ref(false)
const isTransferring = ref(false)
const transferForm = ref({ adminId: '', content: '' })

const statusOptions = [
  { label: '全部狀態', value: 'all' },
  { label: '待處理', value: 'pending' },
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
  return categoryOptions.find(c => c.value === cat)?.label || '其他'
}

type TicketStatus = 'pending' | 'processing' | 'closed'

interface Ticket {
  id: number
  user: string
  category: string
  subject: string
  status: TicketStatus
  statusText: string
  time: string
}

interface CsMsg {
  id: number
  sender: 'agent' | 'user'
  senderName: string
  content: string
  time: string
}

// 模擬當前客服的工單清單
const mockTickets = ref<Ticket[]>([
  { id: 10024, user: 'User_9921', category: 'finance', subject: '儲值未到帳', status: 'pending', statusText: '待處理', time: '16:45' },
  { id: 10023, user: 'Ace_Gamer', category: 'tech', subject: '遊戲異常閃退', status: 'processing', statusText: '處理中', time: '16:30' },
  { id: 10022, user: 'Lucky_Luke', category: 'account', subject: 'VIP等級晉升問題', status: 'closed', statusText: '已結案', time: '15:20' }
])

const myPendingCount = computed(() => mockTickets.value.filter(t => t.status === 'pending').length)
const myProcessingCount = computed(() => mockTickets.value.filter(t => t.status === 'processing').length)

// 模擬聊天紀錄字典
const mockHistories: Record<number, CsMsg[]> = {
  10024: [
    { id: 1, sender: 'user', senderName: 'User_9921', content: '您好，我剛才使用超商代碼儲值了 3000 元，但過了 20 分鐘還沒入帳。', time: '16:45:05' }
  ],
  10023: [
    { id: 1, sender: 'user', senderName: 'Ace_Gamer', content: '我玩捕魚機一直閃退！', time: '16:30:12' },
    { id: 2, sender: 'agent', senderName: 'CS_Support_03', content: '您好，請問您的手機型號是？我們幫您排查。', time: '16:32:00' }
  ],
  10022: [
    { id: 1, sender: 'user', senderName: 'Lucky_Luke', content: '為何我儲值滿額卻沒有升級 VIP？', time: '15:20:00' },
    { id: 2, sender: 'agent', senderName: 'CS_Support_03', content: '您好，系統每小時結算一次，請稍等片刻。', time: '15:25:00' },
    { id: 3, sender: 'user', senderName: 'Lucky_Luke', content: '好的，我看到了，謝謝。', time: '15:50:00' }
  ]
}

const mockCsHistory = ref<CsMsg[]>([])

const selectedTicket = computed(() => mockTickets.value.find(t => t.id === selectedTicketId.value))

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
    case 'processing': return 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400'
    case 'closed': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
    default: return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

// 實作：派發機制
const handleDispatch = () => {
  if (unassignedQueueCount.value <= 0) {
    message.info('目前沒有待派發的工單！')
    return
  }
  
  isDispatching.value = true
  // 模擬 API 延遲
  setTimeout(() => {
    unassignedQueueCount.value--
    const newId = 10025 + Math.floor(Math.random() * 100)
    
    const newTicket: Ticket = {
      id: newId,
      user: `Player_${Math.floor(Math.random() * 9000) + 1000}`,
      category: 'report',
      subject: '檢舉玩家使用外掛',
      status: 'pending',
      statusText: '待處理',
      time: new Date().toTimeString().split(' ')[0].substring(0, 5)
    }
    
    mockHistories[newId] = [
      { id: 1, sender: 'user', senderName: newTicket.user, content: '你好，我有個問題想問...', time: new Date().toTimeString().split(' ')[0] }
    ]
    
    // 加到清單最上方
    mockTickets.value.unshift(newTicket)
    selectedTicketId.value = newId
    updateHistory(newId)
    
    message.success('已成功從隊列接取一張新工單！')
    isDispatching.value = false
  }, 800)
}

const handleSearch = () => {
  message.success('已套用搜尋條件')
}

// 實作：轉交專員機制
const handleTransfer = () => {
  if (!transferForm.value.adminId) {
    message.error('請輸入目標管理員 ID')
    return
  }
  
  isTransferring.value = true
  setTimeout(() => {
    // 模擬驗證失敗情況
    if (transferForm.value.adminId.toLowerCase() === 'test') {
      message.error('該管理員不存在或無客服權限，無法轉交')
      isTransferring.value = false
      return
    }

    message.success(`已成功將工單轉交給 ${transferForm.value.adminId}`)
    
    // 從本地列表中移除
    mockTickets.value = mockTickets.value.filter(t => t.id !== selectedTicketId.value)
    selectedTicketId.value = mockTickets.value.length > 0 ? mockTickets.value[0].id : null
    if (selectedTicketId.value) updateHistory(selectedTicketId.value)
    
    showTransferModal.value = false
    isTransferring.value = false
    transferForm.value = { adminId: '', content: '' }
  }, 1000)
}

const handleStatusAction = () => {
  if (!selectedTicket.value) return
  
  const isPending = selectedTicket.value.status === 'pending'
  
  if (isPending) {
    // 接單不需要二次確認，直接變更狀態
    selectedTicket.value.status = 'processing'
    selectedTicket.value.statusText = '處理中'
    message.success('已接單，現在可以開始對話')
    return
  }
  
  // 結案需要二次確認
  dialog.warning({
    title: '二次確認',
    content: '確定要結束此對話並結案嗎？結案後雙方將無法繼續發言。',
    positiveText: '確認結案',
    negativeText: '取消',
    onPositiveClick: () => {
      if (selectedTicket.value) {
        selectedTicket.value.status = 'closed'
        selectedTicket.value.statusText = '已結案'
        message.success('工單已結案')
      }
    }
  })
}

const handleSend = () => {
  if (!csInput.value.trim() || !selectedTicketId.value) return
  
  const hList = mockHistories[selectedTicketId.value]
  hList.push({
    id: Date.now(),
    sender: 'agent',
    senderName: 'Me',
    content: csInput.value,
    time: new Date().toTimeString().split(' ')[0]
  })
  
  csInput.value = ''
  nextTick(() => {
    csScrollbarInst.value?.scrollTo({ position: 'bottom', behavior: 'smooth' })
  })
}

const updateHistory = (id: number) => {
  mockCsHistory.value = mockHistories[id] || []
  nextTick(() => {
    csScrollbarInst.value?.scrollTo({ position: 'bottom', silent: true })
  })
}

import { watch } from 'vue'
watch(selectedTicketId, (newId) => {
  if (newId) updateHistory(newId)
}, { immediate: true })

onMounted(() => {
  if (selectedTicketId.value) {
    updateHistory(selectedTicketId.value)
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
</style>
