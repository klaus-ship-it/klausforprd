<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, nextTick, onBeforeUnmount, h } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NCard, NFormItem, NSelect, NSpace,
  NDatePicker, NInput, NButton, NDataTable, NCheckbox, useMessage, NIcon, NSpin,
  NCollapseTransition
} from 'naive-ui'
import { SearchOutline, DownloadOutline, ChevronDownOutline, ChevronUpOutline } from '@vicons/ionicons5'
import type { GameStatsTargetType, GameStatsQuery, Granularity, GameStatsRecord } from '@/types/gameStats'
import { gameStatsApi } from '@/api/gameStats'
import * as echarts from 'echarts'

const { t } = useI18n()
const message = useMessage()

// 搜尋條件
const searchModel = ref<{
  granularity: Granularity
  timeRange: [number, number] | null
  targetType: GameStatsTargetType
  targetProvider: string
  targetGameType: string
  targetId: string
  excludeTesting: boolean
  currency?: string
}>({
  granularity: 'hour',
  timeRange: null,
  targetType: 'all',
  targetProvider: '',
  targetGameType: '',
  targetId: '',
  excludeTesting: true,
  currency: 'all'
})

const loading = ref(false)
const showAdvancedSearch = ref(false)
const exporting = ref(false)
const tableData = ref<GameStatsRecord[]>([])

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
const targetTypeOptions = computed(() => [
  { label: t('gameStats.targetTypes.all'), value: 'all' },
  { label: t('gameStats.targetTypes.provider'), value: 'provider' },
  { label: t('gameStats.targetTypes.type'), value: 'type' },
  { label: t('gameStats.targetTypes.game'), value: 'game' }
])

const providerOptions = computed(() => [
  { label: t('gameStats.providers.pg'), value: 'pg' },
  { label: t('gameStats.providers.jili'), value: 'jili' },
  { label: t('gameStats.providers.evo'), value: 'evo' },
  { label: t('gameStats.providers.pp'), value: 'pp' },
  { label: t('gameStats.providers.fc'), value: 'fc' }
])

const gameTypeOptions = computed(() => [
  { label: t('gameStats.gameTypes.slot'), value: 'slot' },
  { label: t('gameStats.gameTypes.live'), value: 'live' },
  { label: t('gameStats.gameTypes.sport'), value: 'sport' },
  { label: t('gameStats.gameTypes.card'), value: 'card' },
  { label: t('gameStats.gameTypes.lottery'), value: 'lottery' }
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
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999)
      break
    case 'day':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      end = now
      break
    case 'month':
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
  return [
    { title: t('gameStats.columns.providerName'), key: 'providerName', width: 110 },
    { title: t('gameStats.columns.gameType'), key: 'gameType', width: 100 },
    { title: t('gameStats.columns.gameId'), key: 'gameName', width: 160, render: (row: GameStatsRecord) => `${row.gameName} (${row.gameId})` },
    { 
        title: t('gameStats.columns.ggr'), 
        key: 'ggr', 
        align: 'right' as const,
        render: (row: GameStatsRecord) => {
            return h(
                'span',
                { class: row.ggr >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold' },
                row.ggr.toLocaleString()
            )
        }
    },
    { title: t('gameStats.columns.betAmount'), key: 'betAmount', align: 'right' as const },
    { title: t('gameStats.columns.payoutAmount'), key: 'payoutAmount', align: 'right' as const },
    { 
        title: t('gameStats.columns.ggrRatio'), 
        key: 'ggrRatio', 
        align: 'right' as const,
        render: (row: GameStatsRecord) => `${row.ggrRatio.toFixed(2)}%`
    },
    { title: t('gameStats.columns.maxBet'), key: 'maxBet', align: 'right' as const },
    { title: t('gameStats.columns.maxWinRate'), key: 'maxWinRate', align: 'right' as const },
    { title: t('gameStats.columns.betCount'), key: 'betCount', align: 'right' as const },
    { title: t('gameStats.columns.activePlayers'), key: 'activePlayers', align: 'right' as const },
    { title: t('gameStats.columns.arpu'), key: 'arpu', align: 'right' as const }
  ]
})

// 搜尋驗證 (後置校驗跨度)
const validateTimeRange = (): boolean => {
  // same logic as operationReport
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
      if (diffDays > 6 * 31) {
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

  if (searchModel.value.targetType === 'provider' && !searchModel.value.targetProvider) {
    message.warning(t('gameStats.providerPlaceholder'))
    return
  }
  if (searchModel.value.targetType === 'type' && !searchModel.value.targetGameType) {
    message.warning(t('gameStats.typePlaceholder'))
    return
  }
  if (searchModel.value.targetType === 'game' && !searchModel.value.targetId) {
    message.warning(t('gameStats.targetIdPlaceholder'))
    return
  }

  loading.value = true
  tableData.value = []
  
  try {
    const params: GameStatsQuery = {
      startTime: searchModel.value.timeRange[0],
      endTime: searchModel.value.timeRange[1],
      granularity: searchModel.value.granularity,
      targetType: searchModel.value.targetType,
      targetProvider: searchModel.value.targetType === 'provider' ? searchModel.value.targetProvider : undefined,
      targetGameType: searchModel.value.targetType === 'type' ? searchModel.value.targetGameType : undefined,
      targetId: searchModel.value.targetType === 'game' ? searchModel.value.targetId : undefined,
      excludeTesting: searchModel.value.excludeTesting,
      currency: searchModel.value.currency
    }

    const response = await gameStatsApi.getGameStatsReport(params)
    
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

  // Aggregate by Date for ECharts because table can have multiple entries for one date
  // depending on provider/game types (mock data has one per date but just in case)
  
  const dateMap = new Map<string, { betAmount: number, payoutAmount: number, ggr: number }>()

  tableData.value.forEach(row => {
    const existing = dateMap.get(row.date) || { betAmount: 0, payoutAmount: 0, ggr: 0 }
    dateMap.set(row.date, {
      betAmount: existing.betAmount + row.betAmount,
      payoutAmount: existing.payoutAmount + row.payoutAmount,
      ggr: existing.ggr + row.ggr
    })
  })

  // sort dates
  const xAxisData = Array.from(dateMap.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  
  let yAxis: any[] = [
      { type: 'value', name: t('gameStats.columns.betAmount'), position: 'left' },
      { type: 'value', name: t('gameStats.columns.ggr'), position: 'right' }
  ]
  
  let series: any[] = [
    {
      name: t('gameStats.columns.betAmount'),
      type: 'line',
      smooth: true,
      yAxisIndex: 0,
      data: xAxisData.map(date => dateMap.get(date)?.betAmount || 0),
      itemStyle: { color: '#10b981' }
    },
    {
      name: t('gameStats.columns.payoutAmount'),
      type: 'bar',
      yAxisIndex: 0,
      data: xAxisData.map(date => dateMap.get(date)?.payoutAmount || 0),
      itemStyle: { color: '#f59e0b' }
    },
    {
      name: t('gameStats.columns.ggr'),
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      data: xAxisData.map(date => dateMap.get(date)?.ggr || 0),
      itemStyle: { color: '#93c5fd' }
    }
  ]

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
    const params: GameStatsQuery = {
      startTime: searchModel.value.timeRange[0],
      endTime: searchModel.value.timeRange[1],
      granularity: searchModel.value.granularity,
      targetType: searchModel.value.targetType,
      targetProvider: searchModel.value.targetType === 'provider' ? searchModel.value.targetProvider : undefined,
      targetGameType: searchModel.value.targetType === 'type' ? searchModel.value.targetGameType : undefined,
      targetId: searchModel.value.targetType === 'game' ? searchModel.value.targetId : undefined,
      excludeTesting: searchModel.value.excludeTesting,
      currency: searchModel.value.currency
    }
    const response = await gameStatsApi.exportGameStatsReport(params)
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

// For TS compatibility in template - redundant since h is imported from naive-ui above but kept for consistency if needed or removed
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
      <div class="flex flex-col gap-4 w-full">
        <!-- 基礎搜尋條件 -->
        <div class="flex flex-wrap items-end gap-x-6 gap-y-4 w-full">
            <!-- 快速切換時間 -->
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

            <!-- 統計對象 -->
            <NFormItem :label="t('gameStats.targetType')" :show-feedback="false" class="w-40">
                <NSelect 
                    v-model:value="searchModel.targetType"
                    :options="targetTypeOptions"
                    class="bg-white/50"
                />
            </NFormItem>

            <!-- 幣別 -->
            <NFormItem label="幣別" :show-feedback="false" class="w-32">
                <NSelect 
                    v-model:value="searchModel.currency"
                    :options="currencyOptions"
                    class="bg-white/50"
                />
            </NFormItem>

            <!-- 按鈕區 -->
            <div class="flex-grow flex justify-end gap-2 h-[34px] mb-[1px]">
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
                    {{ t('gameStats.search') }}
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
                    {{ t('gameStats.export') }}
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
            </div>
        </div>

        <!-- 進階搜尋條件 (可折疊) -->
        <NCollapseTransition :show="showAdvancedSearch">
            <div class="pt-4 border-t border-dashed flex flex-wrap items-end gap-x-6 gap-y-4 w-full">
                <!-- 數據粒度 -->
                <NFormItem :label="t('operationReport.granularity')" :show-feedback="false" class="w-32">
                    <NSelect 
                        v-model:value="searchModel.granularity"
                        :options="granularityOptions"
                        class="bg-white/50"
                    />
                </NFormItem>

                <!-- 自訂時間區間 -->
                <NFormItem :label="t('operationReport.timeRange')" :show-feedback="false" class="w-80">
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

                <!-- 指定詳情 (廠商/類型/ID) -->
                <NFormItem v-if="searchModel.targetType !== 'all'" :label="t('gameStats.targetTypes.' + searchModel.targetType)" :show-feedback="false" class="w-48">
                    <!-- 廠商 -->
                    <NSelect
                        v-if="searchModel.targetType === 'provider'"
                        v-model:value="searchModel.targetProvider"
                        :options="providerOptions"
                        :placeholder="t('gameStats.providerPlaceholder')"
                        clearable
                        class="bg-white/50"
                    />
                    <!-- 類型 -->
                    <NSelect
                        v-else-if="searchModel.targetType === 'type'"
                        v-model:value="searchModel.targetGameType"
                        :options="gameTypeOptions"
                        :placeholder="t('gameStats.typePlaceholder')"
                        clearable
                        class="bg-white/50"
                    />
                    <!-- 遊戲ID -->
                    <NInput 
                        v-else
                        v-model:value="searchModel.targetId"
                        :placeholder="t('gameStats.targetIdPlaceholder')"
                        clearable
                    />
                </NFormItem>

                <!-- 排除測試帳號 -->
                <div class="flex items-center h-[34px] mb-[1px]">
                   <NCheckbox v-model:checked="searchModel.excludeTesting" class="font-medium">
                     {{ t('operationReport.excludeTesting') }}
                   </NCheckbox>
                </div>
            </div>
        </NCollapseTransition>
      </div>
    </NCard>
  </div>

    <div class="flex flex-col gap-4">
      <!-- 數據圖表 -->
      <NCard class="rounded-xl shadow-sm border-0 premium-card flex flex-col overflow-hidden" content-class="p-4">
        <div class="font-bold text-gray-700 dark:text-gray-200 mb-4">分析圖表</div>
        <div class="relative w-full h-[300px]">
          <NSpin :show="loading" class="absolute inset-0 z-10 flex items-center justify-center" v-if="loading">
             <template #description>加載中...</template>
          </NSpin>
          <div v-else-if="tableData.length === 0" class="absolute inset-0 flex items-center justify-center text-gray-400">
             {{ t('operationReport.messages.noData') }}
          </div>
          <div ref="chartRef" class="w-full h-full min-h-[300px]" v-show="tableData.length > 0"></div>
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
            class="h-full custom-table"
            :bordered="false"
            :bottom-bordered="false"
            flex-height
            striped
            :scroll-x="1800"
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
