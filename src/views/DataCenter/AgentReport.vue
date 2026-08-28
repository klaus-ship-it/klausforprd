<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, h, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NCard, NSpace, NFormItem, NSelect, NDatePicker, NInput, NButton, NDataTable,
  useMessage, NIcon, NTag, NTooltip, NModal, NEmpty
} from 'naive-ui'
import {
  SearchOutline, DownloadOutline, PersonOutline, InformationCircleOutline,
  PeopleOutline, TrendingUpOutline, CashOutline, BarChartOutline, LayersOutline
} from '@vicons/ionicons5'
import type { AgentReportRecord, AgentPlayerDetailRecord, AgentReportSearchType } from '@/types/agentReport'
import { agentReportApi } from '@/api/agentReport'
import { masterAgentOptions } from '@/mocks/agentReport'

const message = useMessage()
const { t } = useI18n()

// ==========================================
// 搜尋條件狀態
// ==========================================
const searchKeyword = ref('')
const searchType = ref<AgentReportSearchType>('username')
const masterAgentFilter = ref('')
const agentLevelFilter = ref<number | null>(1)
const timeRange = ref<[number, number] | null>(null)
const loading = ref(false)
const exporting = ref(false)
const isSticky = ref(false)
const showAdvanced = ref(false)

// 主列表分頁
const pagination = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [20, 50, 100],
  prefix: (info: any) => `${t('common.total')} ${info.itemCount} 筆`,
  onChange: (page: number) => {
    pagination.page = page
    loadAgentReports()
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize
    pagination.page = 1
    loadAgentReports()
  }
})

const tableData = ref<AgentReportRecord[]>([])

// 搜尋類型選項
const searchTypeOptions = [
  { label: '代理帳號', value: 'username' },
  { label: 'UID', value: 'uid' },
  { label: '推廣碼', value: 'promo_code' }
]

// 代理層級選項
const agentLevelOptions = [
  { label: '總代理', value: 1 },
  { label: '一級代理', value: 2 },
  { label: '二級代理', value: 3 },
  { label: '三級代理', value: 4 }
]

// ==========================================
// 快捷時間選擇 (GMT+8 基準)
// ==========================================
const handleQuickSelect = (type: string) => {
  const now = new Date()
  let start: Date
  let end: Date

  switch (type) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      break
    case 'yesterday':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999)
      break
    case 'thisWeek': {
      const day = now.getDay() || 7
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 7, 23, 59, 59, 999)
      break
    }
    case 'lastWeek': {
      const day2 = now.getDay() || 7
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day2 - 6, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day2, 23, 59, 59, 999)
      break
    }
    case 'thisMonth':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      break
    case 'lastMonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      break
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  }

  timeRange.value = [start.getTime(), end.getTime()]
}

// ==========================================
// 格式化工具
// ==========================================
const formatCurrency = (val: number) => {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`
  return val.toLocaleString()
}

const formatFullCurrency = (val: number) =>
  `$${val.toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

// ==========================================
// 主列表查詢
// ==========================================
const loadAgentReports = async () => {
  if (!timeRange.value) {
    message.warning('請設定查詢時間區間')
    return
  }

  loading.value = true
  try {
    const res = await agentReportApi.getAgentReports({
      q: searchKeyword.value || undefined,
      searchType: searchType.value,
      masterAgentId: masterAgentFilter.value || undefined,
      agentLevel: agentLevelFilter.value || undefined,
      startTime: timeRange.value[0],
      endTime: timeRange.value[1],
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    if (res.code === 0 && res.data) {
      tableData.value = res.data.items
      pagination.itemCount = res.data.total
      summaryStats.value = res.data.summary
    } else {
      message.error(res.msg || '查詢失敗')
    }
  } catch {
    message.error('查詢失敗，請稍後重試')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadAgentReports()
}

// 判斷目前查詢的特定代理與「返回上層」邏輯
const currentQueriedAgent = computed(() => {
  if (!searchKeyword.value) return null
  if (searchType.value === 'uid') {
    return tableData.value.find(a => a.agentUid === searchKeyword.value)
  }
  if (searchType.value === 'username') {
    return tableData.value.find(a => a.agentUsername === searchKeyword.value)
  }
  if (searchType.value === 'promo_code' || searchType.value === 'agentId') {
    return tableData.value.find(a => a.agentId === searchKeyword.value)
  }
  return null
})

const canGoBack = computed(() => {
  return currentQueriedAgent.value && currentQueriedAgent.value.agentLevel > 1 && currentQueriedAgent.value.parentAgentId
})

const handleGoBack = () => {
  const agent = currentQueriedAgent.value
  if (!agent || !agent.parentAgentUid) return
  
  searchType.value = 'uid'
  searchKeyword.value = agent.parentAgentUid
  agentLevelFilter.value = agent.agentLevel - 1 // 同步更新 UI 下拉至上層代理層級
  handleSearch()
}

// 匯出主報表
const handleExport = async () => {
  if (!timeRange.value) {
    message.warning('請設定查詢時間區間')
    return
  }
  exporting.value = true
  try {
    await agentReportApi.exportAgentReport({
      q: searchKeyword.value || undefined,
      searchType: searchType.value,
      masterAgentId: masterAgentFilter.value || undefined,
      startTime: timeRange.value[0],
      endTime: timeRange.value[1]
    })
    message.success('報表已加入排隊，請至報表管理中心下載')
  } catch {
    message.error('報表生成失敗')
  } finally {
    setTimeout(() => { exporting.value = false }, 5000)
  }
}

// ==========================================
// 主列表欄位定義
// ==========================================
const mainColumns = computed(() => [
  {
    title: '代理基本資訊',
    key: 'agentInfo',
    width: 200,
    fixed: 'left' as const,
    render: (row: AgentReportRecord) => h('div', { 
      class: 'flex flex-col gap-0.5 py-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded px-1 -mx-1 transition-colors',
      onClick: () => {
        searchType.value = 'uid'
        searchKeyword.value = row.agentUid
        agentLevelFilter.value = row.agentLevel
        handleSearch()
      }
    }, [
      h('div', { class: 'font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-sky-500' }, row.agentUsername),
      h('div', { class: 'text-xs text-slate-400 font-mono' }, `UID: ${row.agentUid}`)
    ])
  },
  {
    title: '身份類型',
    key: 'identityType',
    width: 100,
    align: 'center' as const,
    render: (row: AgentReportRecord) => h(NTag, {
      type: row.identityType === 'MASTER' ? 'info' : 'default',
      size: 'small',
      round: true,
      bordered: false
    }, { default: () => row.identityType === 'MASTER' ? '總代理' : '子代理' })
  },
  {
    title: '代理路徑',
    key: 'agentPath',
    minWidth: 200,
    render: (row: AgentReportRecord) => h('div', {
      class: 'text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-mono'
    }, row.agentPath)
  },
  {
    title: '總註冊 / 首儲人數',
    key: 'registrations',
    width: 150,
    align: 'center' as const,
    render: (row: AgentReportRecord) => h('div', { class: 'text-center' }, [
      h('span', { class: 'font-bold text-slate-700 dark:text-slate-200' }, row.totalRegistrations.toLocaleString()),
      h('span', { class: 'text-slate-400 mx-1' }, '/'),
      h('span', { class: 'font-bold text-emerald-600 dark:text-emerald-400' }, row.totalFirstDepositors.toLocaleString())
    ])
  },
  {
    title: 'CPA 達標人數',
    key: 'cpaQualifiedCount',
    width: 130,
    align: 'right' as const,
    render: (row: AgentReportRecord) => h('div', { class: 'text-right' }, [
      h('span', { class: 'font-bold text-violet-600 dark:text-violet-400' }, row.cpaQualifiedCount.toLocaleString()),
      h('span', { class: 'text-slate-400 text-xs ml-1' }, '人')
    ])
  },
  {
    title: '總儲值金額',
    key: 'totalDepositAmount',
    width: 140,
    align: 'right' as const,
    render: (row: AgentReportRecord) => h(NTooltip, { trigger: 'hover' }, {
      trigger: () => h('span', { class: 'font-mono font-bold text-blue-600 dark:text-blue-400 cursor-default' },
        `$${formatCurrency(row.totalDepositAmount)}`),
      default: () => formatFullCurrency(row.totalDepositAmount)
    })
  },
  {
    title: '總流水金額',
    key: 'totalTurnoverAmount',
    width: 140,
    align: 'right' as const,
    render: (row: AgentReportRecord) => h(NTooltip, { trigger: 'hover' }, {
      trigger: () => h('span', { class: 'font-mono font-bold text-sky-600 dark:text-sky-400 cursor-default' },
        `$${formatCurrency(row.totalTurnoverAmount)}`),
      default: () => formatFullCurrency(row.totalTurnoverAmount)
    })
  },
  {
    title: '總佣金成本',
    key: 'totalCommissionCost',
    width: 140,
    align: 'right' as const,
    render: (row: AgentReportRecord) => h(NTooltip, {
      trigger: 'hover',
      placement: 'top'
    }, {
      trigger: () => h('span', { class: 'font-mono font-bold text-orange-600 dark:text-orange-400 cursor-default' },
        `$${formatCurrency(row.totalCommissionCost)}`),
      default: () => h('div', { class: 'text-xs' }, [
        h('div', {}, `完整金額：${formatFullCurrency(row.totalCommissionCost)}`),
        h('div', { class: 'text-slate-400 mt-1' }, '包含：CPA 佣金 + 儲值抽成')
      ])
    })
  },
  {
    title: '總派發推廣金',
    key: 'totalPromoDistributed',
    width: 140,
    align: 'right' as const,
    render: (row: AgentReportRecord) => h(NTooltip, { trigger: 'hover' }, {
      trigger: () => h('span', { class: 'font-mono font-bold text-amber-600 dark:text-amber-400 cursor-default' },
        `$${formatCurrency(row.totalPromoDistributed)}`),
      default: () => formatFullCurrency(row.totalPromoDistributed)
    })
  },
  {
    title: '淨獲利 (NGR)',
    key: 'ngr',
    width: 140,
    align: 'right' as const,
    render: (row: AgentReportRecord) => {
      const isPositive = row.ngr >= 0
      return h(NTooltip, { trigger: 'hover' }, {
        trigger: () => h('div', { class: 'text-right' }, [
          h('span', {
            class: `font-mono font-black text-base ${isPositive
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'}`
          }, `${isPositive ? '' : '-'}$${formatCurrency(Math.abs(row.ngr))}`)
        ]),
        default: () => h('div', { class: 'text-xs space-y-1' }, [
          h('div', {}, `GGR：${formatFullCurrency(row.ggr)}`),
          h('div', {}, `佣金成本：-${formatFullCurrency(row.totalCommissionCost)}`),
          h('div', {}, `推廣金：-${formatFullCurrency(row.totalPromoDistributed)}`),
          h('div', { class: 'border-t border-slate-600 pt-1 mt-1 font-bold' }, `NGR：${formatFullCurrency(row.ngr)}`)
        ])
      })
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 110,
    fixed: 'right' as const,
    align: 'center' as const,
    render: (row: AgentReportRecord) => h(NButton, {
      size: 'small',
      type: 'primary',
      ghost: true,
      onClick: () => openDetailModal(row)
    }, {
      default: () => '了解詳情',
      icon: () => h(NIcon, {}, { default: () => h(InformationCircleOutline) })
    })
  }
])

// ==========================================
// 「了解詳情」Modal 狀態
// ==========================================
const showDetailModal = ref(false)
const selectedAgent = ref<AgentReportRecord | null>(null)
const detailLoading = ref(false)
const detailExporting = ref(false)
const detailKeyword = ref('')
const detailData = ref<AgentPlayerDetailRecord[]>([])
const detailPagination = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [20, 50, 100],
  prefix: (info: any) => `${t('common.total')} ${info.itemCount} 筆`,
  onChange: (page: number) => {
    detailPagination.page = page
    loadPlayerDetails()
  },
  onUpdatePageSize: (pageSize: number) => {
    detailPagination.pageSize = pageSize
    detailPagination.page = 1
    loadPlayerDetails()
  }
})

const openDetailModal = (agent: AgentReportRecord) => {
  selectedAgent.value = agent
  detailKeyword.value = ''
  detailPagination.page = 1
  detailData.value = []
  showDetailModal.value = true
  nextTick(() => loadPlayerDetails())
}

const loadPlayerDetails = async () => {
  if (!selectedAgent.value || !timeRange.value) return
  detailLoading.value = true
  try {
    const res = await agentReportApi.getAgentPlayerDetails({
      agentId: selectedAgent.value.agentId,
      startTime: timeRange.value[0],
      endTime: timeRange.value[1],
      keyword: detailKeyword.value || undefined,
      page: detailPagination.page,
      pageSize: detailPagination.pageSize
    })
    if (res.code === 0 && res.data) {
      detailData.value = res.data.items
      detailPagination.itemCount = res.data.total
    }
  } catch {
    message.error('載入玩家明細失敗')
  } finally {
    detailLoading.value = false
  }
}

// 玩家明細搜尋 (防抖)
let detailSearchTimer: number | null = null
const handleDetailKeywordSearch = () => {
  if (detailSearchTimer) clearTimeout(detailSearchTimer)
  detailSearchTimer = window.setTimeout(() => {
    detailPagination.page = 1
    loadPlayerDetails()
  }, 400)
}

watch(detailKeyword, handleDetailKeywordSearch)

// 匯出玩家明細報表
const handleDetailExport = async () => {
  if (!selectedAgent.value || !timeRange.value) return
  if (detailPagination.itemCount > 50000) {
    message.info('玩家筆數超過 50,000 筆，將以非同步排隊方式生成，請至報表管理中心下載')
  }
  detailExporting.value = true
  try {
    await agentReportApi.exportAgentPlayerDetails(
      selectedAgent.value.agentId,
      timeRange.value[0],
      timeRange.value[1]
    )
    message.success('玩家明細報表已加入排隊，請至報表管理中心下載')
  } catch {
    message.error('報表生成失敗')
  } finally {
    setTimeout(() => { detailExporting.value = false }, 5000)
  }
}

// 子列表欄位定義
const detailColumns = computed(() => [
  {
    title: '玩家帳號 / UID',
    key: 'playerInfo',
    width: 180,
    fixed: 'left' as const,
    render: (row: AgentPlayerDetailRecord) => h('div', { class: 'flex flex-col gap-0.5 py-1' }, [
      h('div', { class: 'font-bold text-slate-800 dark:text-slate-100 text-sm' }, row.playerUsername),
      h('div', { class: 'text-xs text-slate-400 font-mono' }, row.playerId)
    ])
  },
  {
    title: '首次儲值',
    key: 'firstDepositAmount',
    width: 120,
    align: 'right' as const,
    render: (row: AgentPlayerDetailRecord) => h('span', {
      class: 'font-mono text-emerald-600 dark:text-emerald-400 font-bold'
    }, row.firstDepositAmount > 0 ? formatFullCurrency(row.firstDepositAmount) : '-')
  },
  {
    title: '二次儲值',
    key: 'secondDepositAmount',
    width: 120,
    align: 'right' as const,
    render: (row: AgentPlayerDetailRecord) => h('span', {
      class: 'font-mono text-teal-600 dark:text-teal-400 font-bold'
    }, row.secondDepositAmount > 0 ? formatFullCurrency(row.secondDepositAmount) : '-')
  },
  {
    title: '總儲值',
    key: 'totalDepositAmount',
    width: 130,
    align: 'right' as const,
    render: (row: AgentPlayerDetailRecord) => h('span', {
      class: 'font-mono font-bold text-blue-600 dark:text-blue-400'
    }, formatFullCurrency(row.totalDepositAmount))
  },
  {
    title: '總投注 / 有效投注',
    key: 'betInfo',
    width: 170,
    align: 'right' as const,
    render: (row: AgentPlayerDetailRecord) => h('div', { class: 'text-right text-xs' }, [
      h('div', { class: 'font-mono font-bold text-slate-700 dark:text-slate-200' },
        formatFullCurrency(row.totalBetAmount)),
      h('div', { class: 'font-mono text-slate-400' },
        `有效: ${formatFullCurrency(row.totalValidBetAmount)}`)
    ])
  },
  {
    title: '總派彩',
    key: 'totalPayoutAmount',
    width: 130,
    align: 'right' as const,
    render: (row: AgentPlayerDetailRecord) => h('span', {
      class: 'font-mono font-bold text-orange-600 dark:text-orange-400'
    }, formatFullCurrency(row.totalPayoutAmount))
  },
  {
    title: 'P2P 交易額',
    key: 'p2pTransactionAmount',
    width: 130,
    align: 'right' as const,
    render: (row: AgentPlayerDetailRecord) => {
      if (row.p2pTransactionAmount === 0) return h('span', { class: 'text-slate-300' }, '-')
      const isPositive = row.p2pTransactionAmount > 0
      const amountStr = formatFullCurrency(Math.abs(row.p2pTransactionAmount))
      return h('span', {
        class: `font-mono font-bold ${isPositive ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`
      }, `${isPositive ? '+' : '-'}${amountStr}`)
    }
  },
  {
    title: '使用優惠 (活動銀幣)',
    key: 'activityBonusUsed',
    width: 160,
    align: 'right' as const,
    render: (row: AgentPlayerDetailRecord) => h('span', {
      class: 'font-mono font-bold text-violet-600 dark:text-violet-400'
    }, formatFullCurrency(row.activityBonusUsed))
  },
  {
    title: '獲得推廣金',
    key: 'promoReceived',
    width: 130,
    align: 'right' as const,
    render: (row: AgentPlayerDetailRecord) => h('span', {
      class: 'font-mono font-bold text-amber-600 dark:text-amber-400'
    }, formatFullCurrency(row.promoReceived))
  }
])

// 子列表匯總列
const detailSummary = computed(() => {
  if (detailData.value.length === 0) return undefined
  const sum = (key: keyof AgentPlayerDetailRecord) =>
    detailData.value.reduce((acc, row) => acc + (Number(row[key]) || 0), 0)

  const bold = (val: string, cls: string) => h('span', { class: `font-bold font-mono ${cls}` }, val)
  return {
    playerInfo: { value: h('span', { class: 'font-bold text-slate-700 dark:text-slate-200 text-sm' }, '本頁小計') },
    firstDepositAmount: { value: bold(formatFullCurrency(sum('firstDepositAmount')), 'text-emerald-600'), align: 'right' },
    secondDepositAmount: { value: bold(formatFullCurrency(sum('secondDepositAmount')), 'text-teal-600'), align: 'right' },
    totalDepositAmount: { value: bold(formatFullCurrency(sum('totalDepositAmount')), 'text-blue-600'), align: 'right' },
    betInfo: { 
      value: h('div', { class: 'text-right text-xs' }, [
        h('div', { class: 'font-mono font-bold text-slate-700 dark:text-slate-200' }, formatFullCurrency(sum('totalBetAmount'))),
        h('div', { class: 'font-mono text-slate-400' }, `有效: ${formatFullCurrency(sum('totalValidBetAmount'))}`)
      ]), 
      align: 'right' 
    },
    totalPayoutAmount: { value: bold(formatFullCurrency(sum('totalPayoutAmount')), 'text-orange-600'), align: 'right' },
    p2pTransactionAmount: { 
      value: (() => {
        const p2pSum = sum('p2pTransactionAmount')
        if (p2pSum === 0) return bold('-', 'text-slate-300')
        const isPositive = p2pSum > 0
        return bold(`${isPositive ? '+' : '-'}${formatFullCurrency(Math.abs(p2pSum))}`, isPositive ? 'text-rose-600' : 'text-emerald-600')
      })(), 
      align: 'right' 
    },
    activityBonusUsed: { value: bold(formatFullCurrency(sum('activityBonusUsed')), 'text-violet-600'), align: 'right' },
    promoReceived: { value: bold(formatFullCurrency(sum('promoReceived')), 'text-amber-600'), align: 'right' }
  }
})

// ==========================================
// 頂部統計卡片數值
// ==========================================
const summaryStats = ref<any>(null)

// ==========================================
// 捲動監聽
// ==========================================
const handleScroll = (e: Event) => {
  isSticky.value = (e.target as HTMLElement).scrollTop > 20
}

onMounted(() => {
  handleQuickSelect('thisMonth')
  const container = document.getElementById('main-scroll-container')
  if (container) container.addEventListener('scroll', handleScroll)
  nextTick(() => handleSearch())
})

onBeforeUnmount(() => {
  const container = document.getElementById('main-scroll-container')
  if (container) container.removeEventListener('scroll', handleScroll)
  if (detailSearchTimer) clearTimeout(detailSearchTimer)
})
</script>

<template>
  <div class="h-full flex flex-col gap-4">

    <!-- ==========================================
         搜尋條件區塊 (Sticky)
         ========================================== -->
    <div class="sticky top-0 z-30 transition-all duration-300" :class="{ 'pt-2': isSticky }">
      <NCard
        class="rounded-xl shadow-sm border-0 premium-card transition-all duration-300"
        :class="{ 'premium-glass shadow-xl mx-2': isSticky }"
        size="small"
      >
        <div class="flex flex-col gap-4">

          <!-- 第一排：主要篩選條件 -->
          <div class="flex flex-wrap items-end gap-x-6 gap-y-3">

            <!-- 代理搜尋欄位 + 搜尋類型 -->
            <NFormItem label="代理搜尋" :show-feedback="false" class="min-w-[300px]">
              <div class="flex gap-2 w-full">
                <!-- 搜尋類型 Checkbox 組 -->
                <div class="flex gap-1 items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-2">
                  <template v-for="opt in searchTypeOptions" :key="opt.value">
                    <label class="flex items-center gap-1 cursor-pointer px-1 py-0.5">
                      <input
                        type="radio"
                        :value="opt.value"
                        v-model="searchType"
                        class="accent-sky-500"
                      />
                      <span class="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">{{ opt.label }}</span>
                    </label>
                  </template>
                </div>
                <NInput
                  v-model:value="searchKeyword"
                  :placeholder="`請輸入${searchTypeOptions.find(o => o.value === searchType)?.label}`"
                  clearable
                  class="flex-1"
                  @keyup.enter="handleSearch"
                />
              </div>
            </NFormItem>

            <!-- 代理層級下拉 -->
            <NFormItem label="代理層級" :show-feedback="false" class="w-32">
              <NSelect
                v-model:value="agentLevelFilter"
                :options="agentLevelOptions"
              />
            </NFormItem>

            <!-- 快捷時間切換 -->
            <NFormItem label="快速切換" :show-feedback="false">
              <NSpace :wrap="false">
                <NButton size="small" :secondary="true" @click="handleQuickSelect('today')">本日</NButton>
                <NButton size="small" :secondary="true" @click="handleQuickSelect('yesterday')">昨日</NButton>
                <NButton size="small" :secondary="true" @click="handleQuickSelect('thisWeek')">本週</NButton>
                <NButton size="small" :secondary="true" @click="handleQuickSelect('lastWeek')">上週</NButton>
                <NButton size="small" :secondary="true" @click="handleQuickSelect('thisMonth')">本月</NButton>
                <NButton size="small" :secondary="true" @click="handleQuickSelect('lastMonth')">上個月</NButton>
              </NSpace>
            </NFormItem>

            <!-- 自訂時間區間 -->
            <NFormItem label="時間區間" :show-feedback="false" class="min-w-[340px]">
              <NDatePicker
                v-model:value="timeRange"
                type="datetimerange"
                clearable
                format="yyyy-MM-dd HH:mm"
                class="w-full"
                :default-time="['00:00:00', '23:59:59']"
              />
            </NFormItem>

            <!-- 操作按鈕 -->
            <div class="flex items-center gap-2 h-[34px] mb-[1px] ml-auto">
              <NButton
                type="primary"
                size="medium"
                :loading="loading"
                class="font-bold shadow-md shadow-sky-500/20"
                @click="handleSearch"
              >
                <template #icon><NIcon><SearchOutline /></NIcon></template>
                查詢
              </NButton>
              <NButton
                type="info"
                size="medium"
                :disabled="exporting || tableData.length === 0"
                class="font-bold shadow-md shadow-blue-500/20"
                @click="handleExport"
              >
                <template #icon><NIcon><DownloadOutline /></NIcon></template>
                生成報表
              </NButton>
            </div>
          </div>
        </div>
      </NCard>
    </div>

    <!-- ==========================================
         統計卡片區
         ========================================== -->
    <div v-if="summaryStats" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 代理數 -->
      <NCard class="rounded-xl border-0 premium-card" content-class="p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center flex-shrink-0">
            <NIcon size="20" color="#0ea5e9"><PeopleOutline /></NIcon>
          </div>
          <div>
            <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">代理數量</div>
            <div class="text-xl font-black text-slate-800 dark:text-slate-100">{{ summaryStats.totalAgents }}</div>
          </div>
        </div>
      </NCard>

      <!-- CPA 達標 -->
      <NCard class="rounded-xl border-0 premium-card" content-class="p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
            <NIcon size="20" color="#7c3aed"><PersonOutline /></NIcon>
          </div>
          <div>
            <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">CPA 達標</div>
            <div class="text-xl font-black text-violet-700 dark:text-violet-300">{{ summaryStats.totalCPA.toLocaleString() }}</div>
          </div>
        </div>
      </NCard>

      <!-- 總儲值 -->
      <NCard class="rounded-xl border-0 premium-card" content-class="p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <NIcon size="20" color="#2563eb"><CashOutline /></NIcon>
          </div>
          <div>
            <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">總儲值</div>
            <div class="text-xl font-black text-blue-700 dark:text-blue-300">${{ formatCurrency(summaryStats.totalDeposit) }}</div>
          </div>
        </div>
      </NCard>

      <!-- 總 NGR -->
      <NCard class="rounded-xl border-0 premium-card" content-class="p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
            <NIcon size="20" color="#059669"><TrendingUpOutline /></NIcon>
          </div>
          <div>
            <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">整體 NGR</div>
            <div
              class="text-xl font-black"
              :class="summaryStats.totalNGR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
            >
              ${{ formatCurrency(Math.abs(summaryStats.totalNGR)) }}
            </div>
          </div>
        </div>
      </NCard>
    </div>

    <!-- ==========================================
         主列表
         ========================================== -->
    <NCard
      class="rounded-xl shadow-sm border-0 premium-card flex flex-col min-h-[600px]"
      content-class="p-0 flex-1 min-h-0 flex flex-col"
    >
      <!-- 表頭 -->
      <div class="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <NIcon size="18" color="#0ea5e9"><BarChartOutline /></NIcon>
          <span class="font-bold text-slate-700 dark:text-slate-200">代理彙整列表</span>
          <NTag v-if="pagination.itemCount > 0" size="small" type="info" :bordered="false" round>
            {{ pagination.itemCount }} 筆
          </NTag>
          <NButton
            v-if="canGoBack"
            size="small"
            type="primary"
            secondary
            class="ml-2"
            @click="handleGoBack"
          >
            返回上層代理
          </NButton>
        </div>
        <div class="text-xs text-slate-400 flex items-center gap-1">
          <NIcon size="14"><InformationCircleOutline /></NIcon>
          數值 hover 可查看完整金額
        </div>
      </div>

      <!-- 表格 -->
      <div class="flex-1 min-h-0 p-4">
        <NDataTable
          :columns="mainColumns"
          :data="tableData"
          :loading="loading"
          :pagination="pagination"
          class="h-full agent-main-table"
          :bordered="false"
          :bottom-bordered="false"
          flex-height
          striped
          :scroll-x="1600"
        >
          <template #empty>
            <NEmpty
              v-if="!loading"
              description="暫無資料，請設定查詢條件後點擊查詢"
              class="py-16"
            />
          </template>
        </NDataTable>
      </div>
    </NCard>

    <!-- ==========================================
         「了解詳情」Modal
         ========================================== -->
    <NModal
      v-model:show="showDetailModal"
      :mask-closable="true"
      preset="card"
      style="width: 95vw; max-width: 1400px; max-height: 90vh"
      :title="selectedAgent ? `玩家對帳明細 — ${selectedAgent.agentUsername} (${selectedAgent.agentUid})` : '玩家對帳明細'"
      content-class="p-0 flex flex-col overflow-hidden"
      header-class="border-b border-slate-100 dark:border-slate-800"
    >
      <template #header-extra>
        <NTag v-if="selectedAgent" type="info" size="small" round :bordered="false">
          {{ selectedAgent.identityType === 'MASTER' ? '總代理' : '子代理' }}
        </NTag>
      </template>

      <div class="flex flex-col h-[75vh]">
        <!-- 代理路徑 & 時間區間資訊 -->
        <div class="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div class="flex items-center gap-2 text-sm">
            <NIcon size="14" color="#64748b"><LayersOutline /></NIcon>
            <span class="text-slate-500 dark:text-slate-400">代理路徑：</span>
            <span class="font-mono text-xs font-medium text-slate-700 dark:text-slate-200">{{ selectedAgent?.agentPath }}</span>
          </div>
          <div v-if="timeRange" class="flex items-center gap-2 text-sm">
            <span class="text-slate-400">查詢區間：</span>
            <span class="font-mono text-xs text-sky-600 dark:text-sky-400 font-bold">
              {{ new Date(timeRange[0]).toLocaleDateString('zh-TW') }}
              —
              {{ new Date(timeRange[1]).toLocaleDateString('zh-TW') }}
            </span>
          </div>
        </div>

        <!-- 子列表工具列 -->
        <div class="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <NInput
            v-model:value="detailKeyword"
            placeholder="搜尋玩家帳號 / UID..."
            clearable
            class="w-64"
            size="small"
          >
            <template #prefix><NIcon><SearchOutline /></NIcon></template>
          </NInput>
          <NTag v-if="detailPagination.itemCount > 0" size="small" :bordered="false" type="default" round>
            共 {{ detailPagination.itemCount }} 位玩家
          </NTag>
          <div class="ml-auto">
            <NButton
              size="small"
              type="info"
              :disabled="detailExporting || detailData.length === 0"
              @click="handleDetailExport"
            >
              <template #icon><NIcon><DownloadOutline /></NIcon></template>
              生成玩家明細報表
            </NButton>
          </div>
        </div>

        <!-- 子列表 -->
        <div class="flex-1 min-h-0 p-4">
          <NDataTable
            :columns="detailColumns"
            :data="detailData"
            :loading="detailLoading"
            :pagination="detailPagination"
            :summary="() => detailSummary"
            summary-placement="top"
            class="h-full agent-detail-table"
            :bordered="false"
            :bottom-bordered="false"
            flex-height
            striped
            :scroll-x="1400"
          >
            <template #empty>
              <NEmpty
                v-if="!detailLoading"
                description="暫無玩家資料"
                class="py-10"
              />
            </template>
          </NDataTable>
        </div>
      </div>
    </NModal>
  </div>
</template>

<style scoped>
/* 主列表表頭 */
.agent-main-table :deep(.n-data-table-th) {
  background-color: #f8fafc;
  font-weight: 700;
  color: #475569;
  font-size: 12px;
  white-space: nowrap;
}
.dark .agent-main-table :deep(.n-data-table-th) {
  background-color: #1e293b;
  color: #94a3b8;
}

/* 主列表 hover */
.agent-main-table :deep(.n-data-table-tr:hover .n-data-table-td) {
  background-color: rgba(14, 165, 233, 0.04);
}

/* 子列表表頭 */
.agent-detail-table :deep(.n-data-table-th) {
  background-color: #f1f5f9;
  font-weight: 700;
  color: #475569;
  font-size: 12px;
  white-space: nowrap;
}
.dark .agent-detail-table :deep(.n-data-table-th) {
  background-color: #1e293b;
  color: #94a3b8;
}

/* 匯總列 */
.agent-detail-table :deep(.n-data-table-tr--summary .n-data-table-td) {
  background-color: rgba(14, 165, 233, 0.06);
  border-top: 2px solid rgba(14, 165, 233, 0.2);
}
.dark .agent-detail-table :deep(.n-data-table-tr--summary .n-data-table-td) {
  background-color: rgba(14, 165, 233, 0.08);
}

/* NGR 正負值視覺強化 */
.agent-main-table :deep(.n-data-table-td:last-child) {
  font-size: 13px;
}

/* Modal 樣式調整 */
:deep(.n-modal .n-card) {
  border-radius: 16px;
}
:deep(.n-modal .n-card-header) {
  padding: 16px 20px;
}
</style>
