<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, h } from 'vue'
import { NCard, NForm, NFormItem, NInput, NSelect, NButton, NDataTable, NTag, NModal, NTimeline, NTimelineItem, useMessage, DataTableColumns, NRadioGroup, NRadio, NDatePicker } from 'naive-ui'
import { SearchOutline, DocumentTextOutline } from '@vicons/ionicons5'
import { bonusHistoryApi } from '@/api/bonus'
import type { BonusHistoryLog, BonusHistorySearchParams } from '@/types/bonus'

const message = useMessage()
const loading = ref(false)
const historyLogs = ref<BonusHistoryLog[]>([])

const dateRange = ref<[number, number] | null>(null)

const searchForm = reactive<BonusHistorySearchParams>({
    card_id: '',
    search_type: 'id',
    q: '',
    status: undefined,
    date_start: undefined,
    date_end: undefined,
    page: 1,
    page_size: 10
})

const statusOptions = [
  { label: '進行中', value: 'ACTIVE' },
  { label: '成功', value: 'SUCCESS' },
  { label: '失敗', value: 'FAIL' }
]

const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  onChange: (page: number) => {
    pagination.page = page
    searchForm.page = page
    fetchData()
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize
    pagination.page = 1
    searchForm.page_size = pageSize
    searchForm.page = 1
    fetchData()
  }
})

const columns: DataTableColumns<BonusHistoryLog> = [
  { title: 'Card ID', key: 'card_id', width: 160, ellipsis: { tooltip: true } },
  { title: '玩家 ID', key: 'player_id', width: 100 },
  { title: '獎勵類型', key: 'type', width: 120 },
  { 
    title: '初始金額', 
    key: 'start_amount',
    width: 100,
    render: (row) => row.start_amount.toFixed(2)
  },
  { 
    title: '剩餘金額', 
    key: 'lave_balance',
    width: 100,
    render: (row) => row.lave_balance.toFixed(2)
  },
  { 
    title: '目標流水', 
    key: 'target_wagering',
    width: 100,
    render: (row) => row.target_wagering.toFixed(2)
  },
  { 
    title: '達成流水', 
    key: 'current_wagering',
    width: 100,
    render: (row) => row.current_wagering.toFixed(2)
  },
  { 
    title: 'Cap 上限', 
    key: 'cap',
    width: 100,
    render: (row) => row.cap.toFixed(2)
  },
  { 
    title: '實際轉換', 
    key: 'realized_amount',
    width: 100,
    render: (row) => {
      const val = row.realized_amount.toFixed(2)
      return row.status === 'SUCCESS' 
        ? h('span', { class: 'text-green-600 font-semibold' }, val)
        : h('span', { class: 'text-gray-400' }, val)
    }
  },
  {
    title: '狀態',
    key: 'status',
    width: 100,
    render(row) {
      const typeMap: Record<string, 'success' | 'warning' | 'error'> = {
        'SUCCESS': 'success',
        'ACTIVE': 'warning',
        'FAIL': 'error'
      }
      const labelMap: Record<string, string> = {
        'SUCCESS': '成功',
        'ACTIVE': '進行中',
        'FAIL': '失敗'
      }
      return h(NTag, { type: typeMap[row.status] || 'default', bordered: false }, { default: () => labelMap[row.status] || row.status })
    }
  },
  {
    title: '失敗原因',
    key: 'fail_reason',
    width: 150,
    ellipsis: { tooltip: true },
    render: (row) => row.fail_reason || '-'
  },
  { title: '建立時間', key: 'create_time', width: 160, render: (row) => row.create_time.replace('T', ' ').replace('Z', '') },
  { title: '結算時間', key: 'settle_time', width: 160, render: (row) => row.settle_time ? row.settle_time.replace('T', ' ').replace('Z', '') : '-' },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    fixed: 'right',
    render(row) {
      return h(NButton, { size: 'small', secondary: true, onClick: () => showDetailModal(row) }, { icon: () => h(DocumentTextOutline) })
    }
  }
]

const fetchData = async () => {
  loading.value = true
  try {
    const res = await bonusHistoryApi.getHistory(searchForm)
    if (res.code === 0) {
      historyLogs.value = res.data.list
      pagination.itemCount = res.data.total
    } else {
      message.error(res.msg)
    }
  } catch (err) {
    message.error('載入失敗')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  // Convert dateRange to date_start and date_end
  if (dateRange.value) {
    searchForm.date_start = new Date(dateRange.value[0]).toISOString().split('T')[0]
    searchForm.date_end = new Date(dateRange.value[1]).toISOString().split('T')[0]
  } else {
    searchForm.date_start = undefined
    searchForm.date_end = undefined
  }
  
  searchForm.page = 1
  pagination.page = 1
  fetchData()
}

// Detail Modal
const showDetail = ref(false)
const selectedLog = ref<BonusHistoryLog | null>(null)

const showDetailModal = (log: BonusHistoryLog) => {
  selectedLog.value = log
  showDetail.value = true
}

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

<template>
  <div class="p-6 flex flex-col gap-4">
    <!-- 搜尋條件區塊 -->
    <div class="sticky top-0 z-30 transition-all duration-300" :class="{ 'pt-2': isSticky }">
      <NCard 
        title="獎勵卡歷史紀錄" 
        class="rounded-xl shadow-sm border-0 premium-card transition-all duration-300" 
        :class="{ 'premium-glass shadow-xl mx-2': isSticky }"
        size="small"
      >
      <NForm inline :model="searchForm" label-placement="left" class="flex-wrap gap-4 mb-4">
        <NFormItem label="Card ID">
          <NInput v-model:value="searchForm.card_id" placeholder="精確搜尋" clearable style="width: 200px" />
        </NFormItem>
        
        <NFormItem label="玩家搜尋">
          <div class="relative">
            <NRadioGroup v-model:value="searchForm.search_type" size="small" class="absolute -top-7 left-0 whitespace-nowrap">
              <NRadio value="id">ID</NRadio>
              <NRadio value="username">使用者名稱</NRadio>
              <NRadio value="phone">手機</NRadio>
            </NRadioGroup>
            <NInput v-model:value="searchForm.q" placeholder="請輸入搜尋關鍵字" clearable style="width: 200px" />
          </div>
        </NFormItem>
        
        <NFormItem label="狀態">
          <NSelect v-model:value="searchForm.status" :options="statusOptions" placeholder="全部" clearable style="width: 140px" />
        </NFormItem>
        
        <NFormItem label="建立時間">
          <NDatePicker v-model:value="dateRange" type="daterange" clearable style="width: 280px" />
        </NFormItem>
        
        <NFormItem>
          <NButton type="primary" @click="handleSearch" :loading="loading">
            <template #icon><SearchOutline /></template>
            查詢
          </NButton>
        </NFormItem>
      </NForm>
    </NCard>
  </div>

  <NCard class="rounded-xl shadow-sm border-0 premium-card overflow-hidden" content-class="p-0">
    <div class="p-4 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-700 dark:text-gray-200">
      紀錄列表
    </div>
    <div class="p-4">

      <NDataTable
        :columns="columns"
        :data="historyLogs"
        :loading="loading"
        :pagination="pagination"
        :scroll-x="1600"
      />
    </div>
  </NCard>

    <!-- Detail Modal -->
    <NModal
      v-model:show="showDetail"
      preset="card"
      title="獎勵卡詳細資訊"
      style="width: 700px"
    >
      <div v-if="selectedLog">
        <!-- Summary Info -->
        <div class="grid grid-cols-2 gap-3 text-sm mb-4">
          <div><span class="text-gray-500">Card ID:</span> <span class="font-mono">{{ selectedLog.card_id }}</span></div>
          <div><span class="text-gray-500">玩家 ID:</span> {{ selectedLog.player_id }}</div>
          <div><span class="text-gray-500">獎勵類型:</span> {{ selectedLog.type }}</div>
          <div><span class="text-gray-500">狀態:</span> 
            <NTag :type="selectedLog.status === 'SUCCESS' ? 'success' : selectedLog.status === 'FAIL' ? 'error' : 'warning'" size="small">
              {{ selectedLog.status }}
            </NTag>
          </div>
          <div><span class="text-gray-500">初始金額:</span> {{ selectedLog.start_amount.toFixed(2) }}</div>
          <div><span class="text-gray-500">剩餘餘額:</span> {{ selectedLog.lave_balance.toFixed(2) }}</div>
          <div><span class="text-gray-500">目標流水:</span> {{ selectedLog.target_wagering.toFixed(2) }}</div>
          <div><span class="text-gray-500">達成流水:</span> {{ selectedLog.current_wagering.toFixed(2) }}</div>
          <div><span class="text-gray-500">Cap 上限:</span> {{ selectedLog.cap.toFixed(2) }}</div>
          <div><span class="text-gray-500">實際轉換:</span> 
            <span :class="selectedLog.realized_amount > 0 ? 'text-green-600 font-semibold' : 'text-gray-400'">
              {{ selectedLog.realized_amount.toFixed(2) }}
            </span>
          </div>
          <div v-if="selectedLog.fail_reason" class="col-span-2">
            <span class="text-gray-500">失敗原因:</span> <span class="text-red-600">{{ selectedLog.fail_reason }}</span>
          </div>
        </div>

        <!-- Event Timeline -->
        <div class="mt-6">
          <h4 class="font-semibold mb-3 text-base">異動日誌 (Timeline)</h4>
          <NTimeline>
            <NTimelineItem
              v-for="(event, idx) in selectedLog.events"
              :key="idx"
              :type="event.action === 'SETTLED' || event.action === 'CREATED' ? 'success' : event.action.includes('FAIL') || event.action.includes('ABANDON') || event.action.includes('EXPIRE') || event.action.includes('BANKRUPT') ? 'error' : 'info'"
              :title="event.action"
              :time="event.time.replace('T', ' ').replace('Z', '')"
            >
              {{ event.detail }}
            </NTimelineItem>
          </NTimeline>
        </div>
      </div>
    </NModal>
  </div>
</template>
