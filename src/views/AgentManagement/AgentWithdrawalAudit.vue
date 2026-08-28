<template>
  <div class="p-6 flex flex-col gap-4">
    <!-- 搜尋條件區塊 -->
    <div class="sticky top-0 z-30 transition-all duration-300" :class="{ 'pt-2': isSticky }">
      <NCard 
        title="提領審核過濾" 
        class="rounded-xl shadow-sm border-0 premium-card transition-all duration-300" 
        :class="{ 'premium-glass shadow-xl mx-2': isSticky }"
        size="small"
      >
      <template #header-extra>
        <NSpace align="center">
          <NIcon :component="CheckmarkDoneOutline" class="text-sky-500" size="18" />
          <span class="text-xs font-bold text-slate-500">審核清單</span>
        </NSpace>
      </template>

      <div class="flex flex-wrap items-center gap-4">
        <NFormItem label="日期範圍" :show-feedback="false">
          <NDatePicker 
            v-model:value="dateRange" 
            type="daterange" 
            clearable 
            placeholder="選擇日期範圍" 
            class="w-64"
          />
        </NFormItem>

        <NFormItem label="狀態篩選" :show-feedback="false">
          <NRadioGroup v-model:value="filterStatus" name="statusFilter" size="medium">
            <NRadioButton value="ALL">全部</NRadioButton>
            <NRadioButton value="PENDING">
              待處理
              <NBadge v-if="pendingCount > 0" :value="pendingCount" :max="99" class="ml-1" />
            </NRadioButton>
            <NRadioButton value="APPROVED">已核發</NRadioButton>
            <NRadioButton value="REJECTED">已駁回</NRadioButton>
          </NRadioGroup>
        </NFormItem>

        <div class="flex-1 flex justify-end">
          <NButton secondary type="primary" @click="fetchData">
            <template #icon><NIcon :component="SearchOutline" /></template>
            重新整理
          </NButton>
        </div>
      </div>
    </NCard>
  </div>

    <!-- Table Card -->
    <NCard :bordered="false" size="small" class="premium-glass overflow-hidden">
      <NDataTable
        remote
        :loading="loading"
        :columns="columns"
        :data="filteredRequests"
        :pagination="pagination"
        :bordered="false"
        :single-line="false"
      />
    </NCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, h } from 'vue'
import { 
  NCard, NSpace, NIcon, NDatePicker, NRadioGroup, NRadioButton, 
  NDataTable, NButton, NBadge, NAvatar, NTag, useMessage, useDialog,
  DataTableColumns
} from 'naive-ui'
import { 
  CheckmarkDoneOutline, CheckmarkOutline, CloseOutline, 
  SearchOutline, TimeOutline, WalletOutline, PersonOutline
} from '@vicons/ionicons5'
import { agentApi } from '@/api/agent'
import { AgentWithdrawalRequest, AgentWithdrawalStatus } from '@/types/agent'

const message = useMessage()
const dialog = useDialog()

const requests = ref<AgentWithdrawalRequest[]>([])
const loading = ref(false)
const filterStatus = ref<AgentWithdrawalStatus | 'ALL'>('PENDING')
const dateRange = ref<[number, number] | null>(null)

const pendingCount = computed(() => requests.value.filter(r => r.status === 'PENDING').length)

const pagination = ref({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  onChange: (page: number) => {
    pagination.value.page = page
  }
})

const columns = computed<DataTableColumns<AgentWithdrawalRequest>>(() => [
  {
    title: '申請時間 / 單號',
    key: 'created_at',
    width: 180,
    render(row) {
      return h('div', { class: 'flex flex-col gap-1' }, [
        h('div', { class: 'flex items-center gap-1 text-xs text-slate-600 font-bold' }, [
          h(NIcon, { component: TimeOutline, size: 14, class: 'text-slate-400' }),
          formatDate(row.created_at)
        ]),
        h('span', { class: 'font-mono text-[10px] text-sky-500 bg-sky-50 dark:bg-sky-900/20 self-start px-2 py-0.5 rounded border border-sky-100 dark:border-sky-800' }, row.order_no)
      ])
    }
  },
  {
    title: '代理商 (下線)',
    key: 'agent_name',
    width: 200,
    render(row) {
      return h('div', { class: 'flex items-center gap-3' }, [
        h(NAvatar, { round: true, size: 'small', color: '#f1f5f9' }, { 
          default: () => h('span', { class: 'text-slate-500 font-bold' }, row.agent_name[0]) 
        }),
        h('div', { class: 'flex flex-col' }, [
          h('span', { class: 'font-bold text-slate-700 dark:text-slate-200' }, row.agent_name),
          h('span', { class: 'text-[10px] text-slate-400 font-mono' }, `UID: ${row.agent_id}`)
        ])
      ])
    }
  },
  {
    title: '提領金額',
    key: 'amount',
    align: 'right',
    width: 150,
    render(row) {
      return h('div', { class: 'flex flex-col items-end' }, [
        h('span', { class: 'font-black text-rose-500 tracking-tight text-base' }, `$ ${formatAmount(row.amount)}`),
        h('span', { class: 'text-[10px] text-slate-400' }, `(凍結: $${formatAmount(row.frozen_balance)})`)
      ])
    }
  },
  {
    title: '提領方式 / 帳戶資訊',
    key: 'account_info',
    render(row) {
      return h('div', { class: 'flex flex-col' }, [
        h('div', { class: 'flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300' }, [
          h(NIcon, { component: WalletOutline, size: 14 }),
          row.method === 'BANK' ? '銀行轉帳' : '線下提領'
        ]),
        h('span', { class: 'text-[11px] text-slate-500 font-mono mt-1 p-1 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700' }, row.account_info)
      ])
    }
  },
  {
    title: '狀態',
    key: 'status',
    align: 'center',
    width: 100,
    render(row) {
      const config = getStatusConfig(row.status)
      return h(NTag, { type: config.type as any, bordered: false, round: true, size: 'small' }, {
        default: () => h('div', { class: 'flex items-center gap-1' }, [
          h('span', { class: ['w-1.5 h-1.5 rounded-full', config.dotClass] }),
          config.label
        ])
      })
    }
  },
  {
    title: '管理操作',
    key: 'actions',
    align: 'center',
    width: 180,
    render(row) {
      if (row.status !== 'PENDING') return h('span', { class: 'text-slate-400 text-xs' }, '已結案')
      
      return h(NSpace, { justify: 'center' }, {
        default: () => [
          h(NButton, {
            size: 'small',
            type: 'primary',
            ghost: true,
            onClick: () => handleAction(row.id, 'APPROVE')
          }, {
            icon: () => h(NIcon, { component: CheckmarkOutline }),
            default: () => '給付'
          }),
          h(NButton, {
            size: 'small',
            type: 'error',
            ghost: true,
            onClick: () => handleAction(row.id, 'REJECT')
          }, {
            icon: () => h(NIcon, { component: CloseOutline }),
            default: () => '駁回'
          })
        ]
      })
    }
  }
])

const filteredRequests = computed(() => {
  let result = requests.value
  if (filterStatus.value !== 'ALL') {
    result = result.filter(r => r.status === filterStatus.value)
  }
  if (dateRange.value) {
    const [start, end] = dateRange.value
    result = result.filter(r => {
      const time = new Date(r.created_at).getTime()
      return time >= start && time <= end
    })
  }
  return result
})

const fetchData = async () => {
  loading.value = true
  try {
    const res = await agentApi.getWithdrawalRequests({})
    if (res.code === 0) {
      requests.value = res.data
    }
  } catch (err) {
    message.error('載入資料失敗')
  } finally {
    loading.value = false
  }
}

const handleAction = (id: string, action: 'APPROVE' | 'REJECT') => {
  const title = action === 'APPROVE' ? '確認給付' : '駁回申請'
  const content = action === 'APPROVE' ? '確定要執行此筆提領給付嗎？' : '確定要駁回此筆提領申請嗎？'
  
  dialog.warning({
    title,
    content,
    positiveText: '確定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const res = await agentApi.processWithdrawal(id, action)
        if (res.code === 0) {
          message.success('操作成功')
          fetchData()
        } else {
          message.error(res.msg)
        }
      } catch (err) {
        message.error('操作失敗')
      }
    }
  })
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const formatAmount = (num: number) => {
  return new Intl.NumberFormat().format(num)
}

const getStatusConfig = (status: AgentWithdrawalStatus) => {
  switch (status) {
    case 'PENDING': return { label: '待處理', type: 'warning', dotClass: 'bg-amber-500 animate-pulse' }
    case 'APPROVED': return { label: '已核發', type: 'success', dotClass: 'bg-emerald-500' }
    case 'REJECTED': return { label: '已駁回', type: 'error', dotClass: 'bg-rose-500' }
    default: return { label: '未知', type: 'default', dotClass: 'bg-slate-500' }
  }
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

<style scoped>
.premium-glass {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--card-shadow);
}
</style>
