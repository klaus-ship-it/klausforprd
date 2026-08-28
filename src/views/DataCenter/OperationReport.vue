<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, nextTick, onBeforeUnmount, h } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NCard, NSpace, NGrid, NGridItem, NFormItem, NSelect, NRadioGroup, NRadioButton,
  NDatePicker, NInput, NButton, NDataTable, NCheckbox, useMessage, NIcon, NSpin,
  NCollapseTransition
} from 'naive-ui'
import { SearchOutline, DownloadOutline, ChevronDownOutline, ChevronUpOutline } from '@vicons/ionicons5'
import type { ReportType, TargetType, OperationReportQuery, Granularity } from '@/types/operationReport'
import { operationReportApi } from '@/api/operationReport'
import * as echarts from 'echarts'

const { t } = useI18n()
const message = useMessage()

// 搜尋條件
const searchModel = ref<{
  reportType: ReportType
  granularity: Granularity
  timeRange: [number, number] | null
  targetType: TargetType
  targetId: string
  excludeTesting: boolean
  currency?: string
}>({
  reportType: 'ggr',
  granularity: 'hour',
  timeRange: null,
  targetType: 'all',
  targetId: '',
  excludeTesting: true,
  currency: 'all'
})

const loading = ref(false)
const showAdvancedSearch = ref(false)
const exporting = ref(false)
const tableData = ref<any[]>([])

const pagination = reactive({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  onChange: (page: number) => {
    pagination.page = page
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize
    pagination.page = 1
  }
})

// Echarts 實例
const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

// 選項資料
const reportTypeOptions = computed(() => [
  { label: t('operationReport.reportTypes.ggr'), value: 'ggr' },
  { label: t('operationReport.reportTypes.deposit'), value: 'deposit' },
  { label: t('operationReport.reportTypes.activity'), value: 'activity' },
  { label: t('operationReport.reportTypes.activity_bonus'), value: 'activity_bonus' }
])

const targetTypeOptions = computed(() => [
  { label: t('operationReport.targetTypes.all'), value: 'all' },
  { label: t('operationReport.targetTypes.agent'), value: 'agent' },
  { label: t('operationReport.targetTypes.player'), value: 'player' }
])

const currencyOptions = [
  { label: '全部', value: 'all' },
  { label: '金幣', value: 'gold' },
  { label: '銀幣', value: 'silver' },
  { label: '銅幣', value: 'bronze' }
]

const granularityOptions = computed(() => [
  { label: t('operationReport.granularities.hour'), value: 'hour' },
  { label: t('operationReport.granularities.day'), value: 'day' },
  { label: t('operationReport.granularities.month'), value: 'month' }
])

// 初始化預設時間 (根據粒度)
const setTimeRangeByGranularity = () => {
  const now = new Date()
  let start = new Date()
  let end = new Date()
  
  switch (searchModel.value.granularity) {
    case 'hour':
      // 預設昨日 00:00 - 23:59 (24小時)
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999)
      break
    case 'day':
      // 預設過去 7 天
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      end = now
      break
    case 'month':
      // 預設過去 3 個月
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      end = now
      break
  }
  searchModel.value.timeRange = [start.getTime(), end.getTime()]
}

// 快速選擇時間
const handleQuickSelect = (type: string) => {
  const now = new Date()
  let start = new Date()
  let end = new Date()

  switch (type) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      end = now
      break
    case 'yesterday':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999)
      break
    case 'thisWeek':
      // 週一為一週開始
      const day = now.getDay() || 7
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1, 0, 0, 0, 0)
      end = now
      break
    case 'lastWeek':
      const day2 = now.getDay() || 7
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day2 - 6, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day2, 23, 59, 59, 999)
      break
    case 'thisMonth':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      end = now
      break
    case 'lastMonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      break
  }
  searchModel.value.timeRange = [start.getTime(), end.getTime()]
}

// 動態表格欄位
const columns = computed(() => {
  const type = searchModel.value.reportType
  const common: any[] = [
    { title: t('operationReport.columns.playerId'), key: 'playerId', width: 150 }
  ]

  if (type === 'ggr') {
    return [
      ...common,
      { title: t('operationReport.columns.betAmount'), key: 'betAmount', align: 'right' as const },
      { title: t('operationReport.columns.rollingAmount'), key: 'rollingAmount', align: 'right' as const },
      { title: t('operationReport.columns.payoutAmount'), key: 'payoutAmount', align: 'right' as const },
      { 
        title: t('operationReport.columns.ggr'), 
        key: 'ggr', 
        align: 'right' as const,
        render: (row: any) => h('span', { 
          style: { 
            color: row.ggr > 0 ? '#ef4444' : (row.ggr < 0 ? '#10b981' : 'inherit'),
            fontWeight: 'bold'
          } 
        }, `$${row.ggr.toLocaleString()}`)
      },
      {
        title: t('operationReport.columns.rtp'),
        key: 'rtp',
        align: 'right' as const,
        render: (row: any) => {
          const rtp = row.betAmount > 0 ? (row.payoutAmount / row.betAmount) * 100 : 0
          return `${rtp.toFixed(2)}%`
        }
      },
      { title: t('operationReport.columns.betCount'), key: 'betCount', align: 'right' as const },
      { title: t('operationReport.columns.maxBet'), key: 'maxBet', align: 'right' as const },
      { title: t('operationReport.columns.maxWinRate'), key: 'maxWinRate', align: 'right' as const }
    ]
  } else if (type === 'deposit') {
    return [
      ...common,
      { title: t('operationReport.columns.totalDeposit'), key: 'totalDepositAmount', align: 'right' as const },
      { title: t('operationReport.columns.depositCount'), key: 'depositCount', align: 'right' as const },
      { title: t('operationReport.columns.maxDeposit'), key: 'maxDepositAmount', align: 'right' as const },
      { title: t('operationReport.columns.averageDeposit'), key: 'averageDeposit', align: 'right' as const },
      // Split channels
      { title: 'Bank Card', key: 'chan_bank', align: 'right' as const, render: (row: any) => `$${row.channelDeposits?.find((c: any) => c.name === 'Bank Card')?.amount?.toLocaleString() || 0}` },
      { title: 'USDT', key: 'chan_usdt', align: 'right' as const, render: (row: any) => `$${row.channelDeposits?.find((c: any) => c.name === 'USDT')?.amount?.toLocaleString() || 0}` },
      { title: 'Manual', key: 'chan_manual', align: 'right' as const, render: (row: any) => `$${row.channelDeposits?.find((c: any) => c.name === 'Manual')?.amount?.toLocaleString() || 0}` }
    ]
  } else if (type === 'activity') {
    const activeLabel = searchModel.value.granularity === 'hour' 
        ? t('operationReport.columns.activeHours') 
        : t('operationReport.columns.activeDays')
    return [
      ...common,
      { title: activeLabel, key: 'activeDays', align: 'right' as const },
      { title: t('operationReport.columns.rollingAmount'), key: 'rollingAmount', align: 'right' as const },
      { title: t('operationReport.columns.totalDeposit'), key: 'totalDepositAmount', align: 'right' as const },
      { title: t('operationReport.columns.betCount'), key: 'betCount', align: 'right' as const },
      { 
        title: t('operationReport.columns.ggr'), 
        key: 'ggr', 
        align: 'right' as const,
        render: (row: any) => h('span', { 
          style: { 
            color: row.ggr > 0 ? '#ef4444' : (row.ggr < 0 ? '#10b981' : 'inherit'),
            fontWeight: 'bold'
          } 
        }, `$${row.ggr.toLocaleString()}`)
      }
    ]
  } else {
    return [
      ...common,
      { title: t('operationReport.columns.distributedAmount'), key: 'distributedAmount', align: 'right' as const },
      { title: t('operationReport.columns.recalledAmount'), key: 'recalledAmount', align: 'right' as const },
      { title: t('operationReport.columns.convertedAmount'), key: 'convertedAmount', align: 'right' as const },
      { 
        title: t('operationReport.columns.conversionRate'), 
        key: 'conversionRate', 
        align: 'right' as const,
        render: (row: any) => `${row.conversionRate}%`
      }
    ]
  }
})

// 計算統計列
const summary = () => {
  if (tableData.value.length === 0) return []
  
  const type = searchModel.value.reportType
  const rangeText = 'Total'

  const sum = (key: string) => tableData.value.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0)
  const avg = (key: string) => tableData.value.length > 0 ? sum(key) / tableData.value.length : 0
  const max = (key: string) => Math.max(...tableData.value.map(row => Number(row[key]) || 0), 0)

  let summaryRow: any = {}

  if (type === 'ggr') {
    const totalBet = sum('betAmount')
    const totalPayout = sum('payoutAmount')
    const totalRtp = totalBet > 0 ? (totalPayout / totalBet) * 100 : 0

    summaryRow = {
      playerId: { value: h('span', { class: 'font-bold' }, rangeText), colSpan: 1 },
      betAmount: { value: h('span', { class: 'font-bold text-blue-600' }, `$${totalBet.toLocaleString()}`), align: 'right' },
      rollingAmount: { value: h('span', { class: 'font-bold text-blue-600' }, `$${sum('rollingAmount').toLocaleString()}`), align: 'right' },
      payoutAmount: { value: h('span', { class: 'font-bold text-blue-600' }, `$${totalPayout.toLocaleString()}`), align: 'right' },
      ggr: { 
        value: h('span', { 
          class: 'font-bold',
          style: { color: sum('ggr') > 0 ? '#ef4444' : (sum('ggr') < 0 ? '#10b981' : 'inherit') }
        }, `$${sum('ggr').toLocaleString()}`), 
        align: 'right' 
      },
      rtp: {
        value: h('span', { class: 'font-bold text-blue-600' }, `${totalRtp.toFixed(2)}%`),
        align: 'right'
      },
      betCount: { value: h('span', { class: 'font-bold text-blue-600' }, sum('betCount').toLocaleString()), align: 'right' },
      maxBet: { value: h('span', { class: 'font-bold text-orange-600' }, `$${max('maxBet').toLocaleString()}`), align: 'right' },
      maxWinRate: { value: h('span', { class: 'font-bold text-orange-600' }, `${max('maxWinRate').toLocaleString()}x`), align: 'right' }
    }
  } else if (type === 'deposit') {
    const bankSum = tableData.value.reduce((acc, curr) => acc + (curr.channelDeposits?.find((c: any) => c.name === 'Bank Card')?.amount || 0), 0)
    const usdtSum = tableData.value.reduce((acc, curr) => acc + (curr.channelDeposits?.find((c: any) => c.name === 'USDT')?.amount || 0), 0)
    const manualSum = tableData.value.reduce((acc, curr) => acc + (curr.channelDeposits?.find((c: any) => c.name === 'Manual')?.amount || 0), 0)

    summaryRow = {
      playerId: { value: h('span', { class: 'font-bold' }, rangeText) },
      totalDepositAmount: { value: h('span', { class: 'font-bold text-blue-600' }, `$${sum('totalDepositAmount').toLocaleString()}`), align: 'right' },
      depositCount: { value: h('span', { class: 'font-bold text-blue-600' }, sum('depositCount').toLocaleString()), align: 'right' },
      maxDepositAmount: { value: h('span', { class: 'font-bold text-orange-600' }, `$${max('maxDepositAmount').toLocaleString()}`), align: 'right' },
      averageDeposit: { value: h('span', { class: 'font-bold text-purple-600' }, `$${avg('averageDeposit').toLocaleString(undefined, { maximumFractionDigits: 0 })}`), align: 'right' },
      chan_bank: { value: h('span', { class: 'font-bold text-blue-600' }, `$${bankSum.toLocaleString()}`), align: 'right' },
      chan_usdt: { value: h('span', { class: 'font-bold text-blue-600' }, `$${usdtSum.toLocaleString()}`), align: 'right' },
      chan_manual: { value: h('span', { class: 'font-bold text-blue-600' }, `$${manualSum.toLocaleString()}`), align: 'right' }
    }
  } else if (type === 'activity') {
    summaryRow = {
      playerId: { value: h('span', { class: 'font-bold' }, rangeText) },
      activeDays: { value: h('span', { class: 'font-bold text-purple-600' }, avg('activeDays').toFixed(1)), align: 'right' },
      rollingAmount: { value: h('span', { class: 'font-bold text-purple-600' }, `$${avg('rollingAmount').toLocaleString(undefined, { maximumFractionDigits: 0 })}`), align: 'right' },
      totalDepositAmount: { value: h('span', { class: 'font-bold text-purple-600' }, `$${avg('totalDepositAmount').toLocaleString(undefined, { maximumFractionDigits: 0 })}`), align: 'right' },
      betCount: { value: h('span', { class: 'font-bold text-purple-600' }, avg('betCount').toFixed(1)), align: 'right' },
      ggr: { value: h('span', { class: 'font-bold text-purple-600' }, `$${avg('ggr').toLocaleString(undefined, { maximumFractionDigits: 0 })}`), align: 'right' }
    }
  } else {
    summaryRow = {
      playerId: { value: h('span', { class: 'font-bold' }, rangeText) },
      distributedAmount: { value: h('span', { class: 'font-bold text-blue-600' }, `$${sum('distributedAmount').toLocaleString()}`), align: 'right' },
      recalledAmount: { value: h('span', { class: 'font-bold text-blue-600' }, `$${sum('recalledAmount').toLocaleString()}`), align: 'right' },
      convertedAmount: { value: h('span', { class: 'font-bold text-blue-600' }, `$${sum('convertedAmount').toLocaleString()}`), align: 'right' },
      conversionRate: { value: h('span', { class: 'font-bold text-purple-600' }, `${avg('conversionRate').toFixed(2)}%`), align: 'right' }
    }
  }
  
  return summaryRow
}

// 搜尋驗證 (後置校驗跨度)
const validateTimeRange = (): boolean => {
  if (!searchModel.value.timeRange) return false
  const [start, end] = searchModel.value.timeRange
  const diffMs = end - start
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  switch (searchModel.value.granularity) {
    case 'hour':
      if (diffMs > 24 * 60 * 60 * 1000) {
        message.error(t('operationReport.messages.granularityHourError'))
        return false
      }
      break
    case 'day':
      if (diffDays > 30) {
        message.error(t('operationReport.messages.granularityDayError'))
        return false
      }
      break
    case 'month':
      if (diffDays > 6 * 31) { // roughly 6 months
        message.error(t('operationReport.messages.granularityMonthError'))
        return false
      }
      break
  }
  return true
}

const handleSearch = async () => {
  if (!searchModel.value.timeRange) {
    message.warning(t('common.fillRequired'))
    return
  }
  
  if (!validateTimeRange()) return

  const typeSelected = searchModel.value.targetType
  if ((typeSelected === 'agent' || typeSelected === 'player') && !searchModel.value.targetId) {
    message.warning(t('operationReport.targetIdPlaceholder'))
    return
  }

  loading.value = true
  tableData.value = []
  
  try {
    const params: OperationReportQuery = {
      reportType: searchModel.value.reportType,
      startTime: searchModel.value.timeRange[0],
      endTime: searchModel.value.timeRange[1],
      granularity: searchModel.value.granularity,
      targetType: searchModel.value.targetType,
      targetId: searchModel.value.targetId,
      excludeTesting: searchModel.value.excludeTesting,
      currency: searchModel.value.reportType === 'ggr' ? searchModel.value.currency : undefined
    }

    let response;
    const type = params.reportType
    if (type === 'ggr') response = await operationReportApi.getGGRReport(params)
    else if (type === 'deposit') response = await operationReportApi.getDepositReport(params)
    else if (type === 'activity') response = await operationReportApi.getPlayerActivityReport(params)
    else response = await operationReportApi.getActivityBonusReport(params)
    
    if (response?.code === 0 && response.data) {
      tableData.value = response.data
      pagination.page = 1 // 重置分頁
      nextTick(() => {
        renderChart()
      })
    } else {
      message.error(response?.msg || t('common.error'))
      if (chartInstance) chartInstance.clear()
    }
  } catch (error) {
    message.error(t('common.error'))
    if (chartInstance) chartInstance.clear()
  } finally {
    loading.value = false
  }
}

const renderChart = () => {
  if (!chartRef.value || tableData.value.length === 0) {
    if (chartInstance) {
      chartInstance.clear()
    }
    return
  }

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  const type = searchModel.value.reportType
  const xAxisData = tableData.value.map(row => row.date)
  
  let series: any[] = []
  let yAxis: any[] = []

  if (type === 'ggr') {
    yAxis = [
        { type: 'value', name: t('operationReport.columns.betAmount'), position: 'left' },
        { type: 'value', name: t('operationReport.columns.ggr'), position: 'right' }
    ]
    series = [
      {
        name: t('operationReport.columns.betAmount'),
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        data: tableData.value.map((row: any) => row.betAmount),
        itemStyle: { color: '#10b981' }
      },
      {
        name: t('operationReport.columns.payoutAmount'),
        type: 'line',
        smooth: false,
        yAxisIndex: 0,
        data: tableData.value.map((row: any) => row.payoutAmount),
        itemStyle: { color: '#f59e0b' }
      },
      {
        name: t('operationReport.columns.ggr'),
        type: 'bar',
        yAxisIndex: 1,
        data: tableData.value.map((row: any) => row.ggr),
        itemStyle: { color: '#93c5fd' }
      }
    ]
  }
 else if (type === 'deposit') {
    yAxis = [
        { type: 'value', name: t('operationReport.columns.totalDeposit'), position: 'left' },
        { type: 'value', name: t('operationReport.columns.depositCount'), position: 'right' }
    ]
    series = [
      {
        name: t('operationReport.columns.totalDeposit'),
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        data: tableData.value.map((row: any) => row.totalDepositAmount),
        itemStyle: { color: '#10b981' }
      },
      {
        name: t('operationReport.columns.maxDeposit'),
        type: 'line',
        smooth: false,
        yAxisIndex: 0,
        data: tableData.value.map((row: any) => row.maxDepositAmount),
        itemStyle: { color: '#f59e0b' }
      },
      {
        name: t('operationReport.columns.depositCount'),
        type: 'bar',
        yAxisIndex: 1,
        data: tableData.value.map((row: any) => row.depositCount),
        itemStyle: { color: '#93c5fd' }
      }
    ]
  } else if (type === 'activity') {
    yAxis = [
        { type: 'value', name: t('operationReport.columns.rollingAmount'), position: 'left' },
        { type: 'value', name: t('operationReport.columns.activeUsers'), position: 'right' }
    ]
    series = [
      {
        name: t('operationReport.columns.rollingAmount'),
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        data: tableData.value.map((row: any) => row.rollingAmount),
        itemStyle: { color: '#10b981' }
      },
      {
        name: t('operationReport.columns.totalDeposit'),
        type: 'line',
        smooth: false,
        yAxisIndex: 0,
        data: tableData.value.map((row: any) => row.totalDepositAmount),
        itemStyle: { color: '#f59e0b' }
      },
      {
        name: t('operationReport.columns.activeUsers'),
        type: 'bar',
        yAxisIndex: 1,
        data: tableData.value.map((row: any) => row.activeUsers),
        itemStyle: { color: '#93c5fd' }
      }
    ]
  } else {
    yAxis = [
        { type: 'value', name: t('operationReport.columns.distributedAmount'), position: 'left' },
        { type: 'value', name: t('operationReport.columns.recalledAmount'), position: 'right' }
    ]
    series = [
      {
        name: t('operationReport.columns.distributedAmount'),
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        data: tableData.value.map((row: any) => row.distributedAmount),
        itemStyle: { color: '#10b981' }
      },
      {
        name: t('operationReport.columns.convertedAmount'),
        type: 'line',
        smooth: false,
        yAxisIndex: 0,
        data: tableData.value.map((row: any) => row.convertedAmount),
        itemStyle: { color: '#f59e0b' }
      },
      {
        name: t('operationReport.columns.recalledAmount'),
        type: 'bar',
        yAxisIndex: 1,
        data: tableData.value.map((row: any) => row.recalledAmount),
        itemStyle: { color: '#93c5fd' }
      }
    ]
  }

  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: {
      data: series.map(s => s.name),
      top: '5%'
    },
    grid: { 
      left: '5%', 
      right: '8%', 
      bottom: '15%', 
      top: '18%',
      containLabel: true 
    },
    xAxis: { 
      type: 'category', 
      data: xAxisData,
      axisLabel: {
        rotate: 30,
        interval: 0
      }
    },
    yAxis: yAxis,
    series: series as echarts.SeriesOption[]
  }

  chartInstance.setOption(option, true)
}

// 異步匯出報表
const handleExport = async () => {
  if (!searchModel.value.timeRange) {
    message.warning(t('common.fillRequired'))
    return
  }
  if (!validateTimeRange()) return

  exporting.value = true
  try {
    const params: OperationReportQuery = {
      reportType: searchModel.value.reportType,
      startTime: searchModel.value.timeRange[0],
      endTime: searchModel.value.timeRange[1],
      granularity: searchModel.value.granularity,
      targetType: searchModel.value.targetType,
      targetId: searchModel.value.targetId,
      excludeTesting: searchModel.value.excludeTesting,
      currency: searchModel.value.reportType === 'ggr' ? searchModel.value.currency : undefined
    }
    const response = await operationReportApi.exportOperationReport(params)
    if (response.code === 0) {
      message.success(t('operationReport.messages.exportSuccess'))
    }
  } catch(error) {
     message.error(t('common.error'))
  } finally {
    setTimeout(() => {
      exporting.value = false
    }, 5000)
  }
}

// 當粒度改變時，連動重設時間選擇器
watch(() => searchModel.value.granularity, () => {
  setTimeRangeByGranularity()
})

watch(() => searchModel.value.reportType, () => {
  tableData.value = []
  if (chartInstance) chartInstance.clear()
  handleSearch()
})

// Echarts Resize
const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

const isSticky = ref(false)
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  isSticky.value = target.scrollTop > 20
}

onMounted(() => {
  setTimeRangeByGranularity()
  handleSearch()
  window.addEventListener('resize', handleResize)
  
  const container = document.getElementById('main-scroll-container')
  if (container) {
    container.addEventListener('scroll', handleScroll)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
  }
  
  const container = document.getElementById('main-scroll-container')
  if (container) {
    container.removeEventListener('scroll', handleScroll)
  }
})
</script>

<template>
  <div class="h-full flex flex-col gap-4">
    <!-- 搜尋條件區塊 -->
    <div class="sticky top-0 z-30 transition-all duration-300" :class="{ 'pt-2': isSticky }">
      <NCard 
        class="rounded-xl shadow-sm border-0 premium-card transition-all duration-300" 
        :class="{ 'premium-glass shadow-xl mx-2': isSticky }"
        size="small"
      >
      <div class="flex flex-col gap-4">
        <!-- 第一排條件: 基礎搜尋條件 -->
        <NGrid x-gap="16" y-gap="8" cols="1 768:3 1024:8">
          <!-- 報表類型 -->
          <NGridItem span="1">
            <NFormItem :label="t('operationReport.reportType')" :show-feedback="false">
              <NSelect 
                v-model:value="searchModel.reportType"
                :options="reportTypeOptions"
                class="bg-white/50"
              />
            </NFormItem>
          </NGridItem>

          <!-- 統計對象 -->
          <NGridItem span="1">
            <NFormItem :label="t('operationReport.targetType')" :show-feedback="false">
              <NSelect 
                v-model:value="searchModel.targetType"
                :options="targetTypeOptions"
                class="bg-white/50"
              />
            </NFormItem>
          </NGridItem>
          
          <!-- 幣別 (僅損益表 GGR 顯示) -->
          <NGridItem v-if="searchModel.reportType === 'ggr'" span="1">
            <NFormItem label="幣別" :show-feedback="false">
              <NSelect 
                v-model:value="searchModel.currency"
                :options="currencyOptions"
                class="bg-white/50"
              />
            </NFormItem>
          </NGridItem>

          <!-- 快速切換時間 -->
          <NGridItem :span="searchModel.reportType === 'ggr' ? '1 768:3 1024:2' : '1 768:3 1024:3'">
            <NFormItem label="快速切換" :show-feedback="false">
              <NSpace wrap>
                <NButton size="small" @click="handleQuickSelect('today')">{{ t('operationReport.quickButtons.today') }}</NButton>
                <NButton size="small" @click="handleQuickSelect('yesterday')">{{ t('operationReport.quickButtons.yesterday') }}</NButton>
                <NButton size="small" @click="handleQuickSelect('thisWeek')">{{ t('operationReport.quickButtons.thisWeek') }}</NButton>
                <NButton size="small" @click="handleQuickSelect('lastWeek')">{{ t('operationReport.quickButtons.lastWeek') }}</NButton>
                <NButton size="small" @click="handleQuickSelect('thisMonth')">{{ t('operationReport.quickButtons.thisMonth') }}</NButton>
                <NButton size="small" @click="handleQuickSelect('lastMonth')">{{ t('operationReport.quickButtons.lastMonth') }}</NButton>
              </NSpace>
            </NFormItem>
          </NGridItem>

          <!-- 按鈕區 -->
          <NGridItem class="flex items-end justify-end gap-2" :span="searchModel.reportType === 'ggr' ? '1 768:3 1024:3' : '1 768:3 1024:3'">
            <NButton 
               type="primary" 
               size="medium" 
               @click="handleSearch" 
               :loading="loading"
               class="font-bold shadow-md shadow-sky-500/20"
             >
               <template #icon>
                 <NIcon><SearchOutline /></NIcon>
               </template>
               {{ t('operationReport.actions.search') }}
             </NButton>

             <NButton 
               type="info" 
               size="medium" 
               @click="handleExport" 
               :disabled="exporting"
               class="font-bold shadow-md shadow-blue-500/20"
             >
               <template #icon>
                 <NIcon><DownloadOutline /></NIcon>
               </template>
               {{ t('operationReport.actions.export') }}
             </NButton>

             <NButton text icon-placement="right" @click="showAdvancedSearch = !showAdvancedSearch" class="ml-2">
                <template #icon>
                    <NIcon>
                        <ChevronDownOutline v-if="!showAdvancedSearch" />
                        <ChevronUpOutline v-else />
                    </NIcon>
                </template>
                {{ showAdvancedSearch ? '收起' : '進階' }}
            </NButton>
          </NGridItem>
        </NGrid>

        <!-- 進階搜尋條件 (可折疊) -->
        <NCollapseTransition :show="showAdvancedSearch">
            <div class="pt-4 border-t border-dashed flex flex-col gap-4">
                <NGrid x-gap="16" y-gap="8" cols="1 768:3 1024:6">
                    <!-- 數據粒度 -->
                    <NGridItem span="1">
                        <NFormItem :label="t('operationReport.granularity')" :show-feedback="false">
                        <NSelect 
                            v-model:value="searchModel.granularity"
                            :options="granularityOptions"
                            class="bg-white/50"
                        />
                        </NFormItem>
                    </NGridItem>

                    <!-- 自訂時間區間 -->
                    <NGridItem span="1 768:3 1024:2">
                        <NFormItem :label="t('operationReport.timeRange')" :show-feedback="false">
                        <NDatePicker 
                            v-if="searchModel.granularity === 'hour'"
                            v-model:value="searchModel.timeRange" 
                            type="datetimerange" 
                            clearable 
                            format="yyyy-MM-dd HH:mm"
                            class="w-full bg-white/50"
                        />
                        <NDatePicker 
                            v-if="searchModel.granularity === 'day'"
                            v-model:value="searchModel.timeRange" 
                            type="daterange" 
                            clearable 
                            class="w-full bg-white/50"
                        />
                        <NDatePicker 
                            v-if="searchModel.granularity === 'month'"
                            v-model:value="searchModel.timeRange" 
                            type="monthrange" 
                            clearable 
                            class="w-full bg-white/50"
                        />
                        </NFormItem>
                    </NGridItem>

                    <!-- 指定 ID -->
                    <NGridItem v-if="searchModel.targetType !== 'all'" span="1">
                        <NFormItem :label="t('operationReport.targetTypes.' + searchModel.targetType)" :show-feedback="false">
                        <NInput 
                            v-model:value="searchModel.targetId"
                            :placeholder="t('operationReport.targetIdPlaceholder')"
                            clearable
                        />
                        </NFormItem>
                    </NGridItem>

                    <!-- 排除測試帳號 -->
                    <NGridItem class="flex items-center" span="1">
                        <NCheckbox v-model:checked="searchModel.excludeTesting" class="mt-6 font-medium">
                        {{ t('operationReport.excludeTesting') }}
                        </NCheckbox>
                    </NGridItem>
                </NGrid>
            </div>
        </NCollapseTransition>
      </div>
    </NCard>
  </div>

    <div class="flex flex-col gap-4">
      <!-- 數據圖表 -->
      <NCard class="rounded-xl shadow-sm border-0 premium-card flex flex-col overflow-hidden" content-class="p-4">
        <div class="font-bold text-gray-700 dark:text-gray-200 mb-4">分析圖表</div>
        <div class="relative w-full h-[500px]">
          <NSpin :show="loading" class="absolute inset-0 z-10 flex items-center justify-center" v-if="loading">
             <template #description>加載中...</template>
          </NSpin>
          <div v-else-if="tableData.length === 0" class="absolute inset-0 flex items-center justify-center text-gray-400">
             {{ t('operationReport.messages.noData') }}
          </div>
          <div ref="chartRef" class="w-full h-full min-h-[400px]" v-show="tableData.length > 0"></div>
        </div>
      </NCard>

      <!-- 數據表格 -->
      <NCard class="rounded-xl shadow-sm border-0 premium-card h-[600px] flex flex-col overflow-hidden" content-class="p-0 flex-1 min-h-0 flex flex-col">
        <div class="p-4 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-700 dark:text-gray-200">
          報表
        </div>
        <div class="flex-1 min-h-0 p-4">
          <NDataTable 
            :columns="columns" 
            :data="tableData" 
            :loading="loading"
            :pagination="pagination"
            :summary="summary"
            summary-placement="top"
            class="h-full custom-table"
            :bordered="false"
            :bottom-bordered="false"
            flex-height
            striped
          />
        </div>
      </NCard>
    </div>
  </div>
</template>

<style scoped>
.custom-table :deep(.n-data-table-th) {
  background-color: #f8fafc;
  font-weight: 700;
  color: #475569;
}
.dark .custom-table :deep(.n-data-table-th) {
  background-color: #1e293b;
  color: #e2e8f0;
}
</style>
