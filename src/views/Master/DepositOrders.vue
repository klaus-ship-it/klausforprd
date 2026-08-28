<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, nextTick, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { 
  NGrid, NGridItem, NDataTable, NButton, NSpace, NTag, NCard,
  NForm, NFormItem, NInput, NInputNumber, NSelect, NDatePicker, NModal, 
  NScrollbar, NIcon, useMessage, NUpload,
  DataTableColumns, UploadFileInfo
} from 'naive-ui'
import { Search, FlashOutline, BarChartOutline, PieChartOutline, TimeOutline } from '@vicons/ionicons5'
import * as echarts from 'echarts'
import { depositOrderApi } from '@/api/depositOrder'
import { DepositOrder, DepositStats, TrendPoint, OrderLogEntry, OrderStatus, PaymentChannel } from '@/types/depositOrder'

const { t } = useI18n()
const message = useMessage()

// 狀態定義
const loading = ref(false)
const statsLoading = ref(false)
const trendLoading = ref(false)

const stats = ref<DepositStats | null>(null)
const trendData = ref<TrendPoint[]>([])
const orders = ref<DepositOrder[]>([])
const totalOrders = ref(0)

const channelDonutRef = ref<HTMLElement | null>(null)
const statusDonutRef = ref<HTMLElement | null>(null)
const trendChartRef = ref<HTMLElement | null>(null)

// 查詢條件
const searchForm = reactive({
  timeRange: [Date.now() - 7 * 24 * 3600 * 1000, Date.now()] as [number, number] | null,
  playerId: '',
  status: [] as OrderStatus[],
  channel: [] as PaymentChannel[],
  id: '',
  includeTest: false
})

const statusOptions = [
  { label: t('finance.depositOrder.status.PENDING'), value: 'PENDING' },
  { label: t('finance.depositOrder.status.SUCCESS'), value: 'SUCCESS' },
  { label: t('finance.depositOrder.status.FAILED'), value: 'FAILED' },
  { label: t('finance.depositOrder.status.EXPIRED'), value: 'EXPIRED' },
  { label: t('finance.depositOrder.status.MANUAL'), value: 'MANUAL' },
  { label: t('finance.depositOrder.status.REFUNDED'), value: 'REFUNDED' },
  { label: t('finance.depositOrder.status.VERIFY_ERROR'), value: 'VERIFY_ERROR' }
]

const channelOptions = [
  { label: 'iOS-IAP', value: 'iOS-IAP' },
  { label: 'Android-IAP', value: 'Android-IAP' },
  { label: 'Web-信用卡', value: 'Web-CreditCard' },
  { label: 'Web-ATM', value: 'Web-ATM' },
  { label: 'MyCard', value: 'MyCard' }
]

const showManualModal = ref(false)
const currentOrderForManual = ref<string | null>(null)
const manualForm = reactive({
  fileList: [] as UploadFileInfo[],
  remarks: ''
})

const showLogModal = ref(false)
const currentOrderLogs = ref<OrderLogEntry[]>([])
const logLoading = ref(false)

const columns: DataTableColumns<DepositOrder> = [
  {
    title: () => t('finance.depositOrder.table.orderInfo'),
    key: 'id',
    render: (row) => h('div', { class: 'order-cell' }, [
      h('div', { class: 'order-id font-mono font-bold text-cyan-400' }, row.id),
      h('div', { class: 'external-id text-[10px] text-gray-400 mt-0.5' }, `EXT: ${row.externalId}`)
    ])
  },
  {
    title: () => t('finance.depositOrder.table.playerId'),
    key: 'playerId',
    render: (row) => h('div', [
      h('div', { class: 'font-bold' }, row.playerId),
      h('div', { class: 'text-xs text-gray-500' }, row.account)
    ])
  },
  {
    title: () => t('finance.depositOrder.table.productChannel'),
    key: 'channel',
    render: (row) => h('div', [
      h(NTag, { size: 'small', type: 'info', bordered: false, class: 'glow-tag-blue' }, { default: () => row.channel }),
      h('div', { class: 'text-[11px] mt-1 text-gray-300' }, row.productName)
    ])
  },
  {
    title: () => t('finance.depositOrder.table.amount'),
    key: 'amount',
    render: (row) => h('div', { class: 'amount-stack' }, [
      h('div', { class: 'flex justify-between items-center w-32 mb-1' }, [
        h('span', { class: 'text-[10px] text-gray-400' }, `${t('finance.depositOrder.table.applied')}:`),
        h('span', { class: 'font-mono text-gray-300' }, row.amount.toLocaleString())
      ]),
      h('div', { class: 'flex justify-between items-center w-32 border-t border-gray-100/10 pt-1' }, [
        h('span', { class: 'text-[10px] text-green-400 font-bold' }, `${t('finance.depositOrder.table.actual')}:`),
        h('span', { class: 'font-mono text-green-400 font-bold text-sm' }, row.netAmount.toLocaleString())
      ])
    ])
  },
  {
    title: () => t('finance.depositOrder.table.status'),
    key: 'status',
    render: (row) => h(NTag, { 
      type: getStatusType(row.status),
      size: 'small',
      round: true,
      class: `status-tag-${row.status.toLowerCase()}`
    }, { default: () => getStatusLabel(row.status) })
  },
  {
    title: () => t('finance.depositOrder.table.time'),
    key: 'createdAt',
    render: (row) => h('div', { class: 'text-xs text-gray-400 font-mono' }, new Date(row.createdAt).toLocaleString())
  },
  {
    title: () => t('finance.depositOrder.table.actions'),
    key: 'actions',
    align: 'center',
    render: (row) => h(NSpace, { justify: 'center', size: 'small' }, {
      default: () => [
        row.status === 'PENDING' ? h(NButton, { size: 'tiny', ghost: true, type: 'info', onClick: () => handleSync(row.id) }, { default: () => t('finance.depositOrder.actions.sync') }) : null,
        row.status === 'PENDING' || row.status === 'FAILED' ? h(NButton, { size: 'tiny', type: 'info', dashed: true, onClick: () => openManual(row.id) }, { default: () => t('finance.depositOrder.actions.manual') }) : null,
        h(NButton, { size: 'tiny', tertiary: true, onClick: () => openLogs(row.id) }, { default: () => t('finance.depositOrder.actions.logs') })
      ]
    })
  }
]

function getStatusType(status: OrderStatus) {
  const map: Record<OrderStatus, 'default' | 'success' | 'error' | 'warning' | 'info'> = {
    PENDING: 'warning', SUCCESS: 'success', FAILED: 'error', EXPIRED: 'default', MANUAL: 'success', REFUNDED: 'info', VERIFY_ERROR: 'error'
  }
  return map[status]
}
function getStatusLabel(status: OrderStatus) {
  return statusOptions.find(o => o.value === status)?.label || status
}

const loadData = async () => {
  loading.value = true
  const res = await depositOrderApi.list(searchForm)
  if (res.code === 0 && res.data) {
    orders.value = res.data.items
    totalOrders.value = res.data.total
  }
  loading.value = false
}

const loadStats = async () => {
  statsLoading.value = true
  const res = await depositOrderApi.stats(searchForm)
  if (res.code === 0 && res.data) {
    stats.value = res.data
    nextTick(() => renderDonuts())
  }
  statsLoading.value = false
}

const loadTrend = async () => {
  trendLoading.value = true
  const res = await depositOrderApi.trend(searchForm)
  if (res.code === 0 && res.data) {
    trendData.value = res.data
    nextTick(() => renderTrend())
  }
  trendLoading.value = false
}

let channelChart: echarts.ECharts | null = null
let statusChart: echarts.ECharts | null = null
let trendChart: echarts.ECharts | null = null


const renderDonuts = () => {
  const commonPie = {
    type: 'pie',
    radius: '55%',
    avoidLabelOverlap: true,
    itemStyle: { borderRadius: 0 },
    label: { show: true, position: 'outside', color: '#64748b', formatter: '{b}:\n{d}%', fontSize: 10 },
    labelLine: { lineStyle: { color: 'rgba(0,0,0,0.1)' } },
    emphasis: {
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: 'rgba(0, 0, 0, 0.5)'
      }
    }
  }

  if (channelDonutRef.value && stats.value) {
    if (!channelChart) channelChart = echarts.init(channelDonutRef.value)
    channelChart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', backgroundColor: 'rgba(255, 255, 255, 0.9)', borderColor: '#e2e8f0', textStyle: { color: '#0f172a' } },
      color: ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981'],
      series: [{ ...commonPie, name: t('finance.depositOrder.charts.segment'), data: stats.value.channelDonut }]
    })
  }
  if (statusDonutRef.value && stats.value) {
    if (!statusChart) statusChart = echarts.init(statusDonutRef.value)
    statusChart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', backgroundColor: 'rgba(255, 255, 255, 0.9)', borderColor: '#e2e8f0', textStyle: { color: '#0f172a' } },
      color: ['#f59e0b', '#10b981', '#ef4444', '#64748b', '#3b82f6', '#8b5cf6'],
      series: [{ ...commonPie, name: t('finance.depositOrder.charts.status'), data: stats.value.statusDonut }]
    })
  }
}

const renderTrend = () => {
  if (trendChartRef.value) {
    if (!trendChart) trendChart = echarts.init(trendChartRef.value)
    trendChart.setOption({
      backgroundColor: 'transparent',
      tooltip: { 
        trigger: 'axis', 
        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
        borderColor: '#e2e8f0',
        textStyle: { color: '#0f172a' },
        axisPointer: { type: 'line', lineStyle: { color: '#e2e8f0', type: 'dashed' } }
      },
      legend: { data: [t('finance.depositOrder.charts.successAmount'), t('finance.depositOrder.charts.totalOrders'), t('finance.depositOrder.charts.failedCount')], textStyle: { color: '#64748b' }, top: 0 },
      grid: { left: '3%', right: '4%', bottom: '5%', containLabel: true },
      xAxis: { 
        type: 'category', 
        data: trendData.value.map(p => p.time),
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#64748b' }
      },
      yAxis: [
        { type: 'value', name: 'TWD', axisLine: { show: false }, axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
        { type: 'value', name: t('finance.depositOrder.stats.orderCount').slice(-2), axisLine: { show: false }, axisLabel: { color: '#64748b' }, splitLine: { show: false } }
      ],
      series: [
        {
          name: t('finance.depositOrder.charts.successAmount'), type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
          itemStyle: { color: '#10b981' },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(16, 185, 129, 0.1)' }, { offset: 1, color: 'rgba(16, 185, 129, 0)' }]) },
          data: trendData.value.map(p => p.successAmount)
        },
        {
          name: t('finance.depositOrder.charts.totalOrders'), type: 'bar', yAxisIndex: 1, barWidth: '30%',
          itemStyle: { 
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: 'rgba(59, 130, 246, 0.1)' }]),
            borderRadius: [4, 4, 0, 0]
          },
          data: trendData.value.map(p => p.totalCount)
        },
        {
          name: t('finance.depositOrder.charts.failedCount'), type: 'line', color: '#ef4444', yAxisIndex: 1, smooth: true,
          lineStyle: { width: 2, type: 'dotted' },
          data: trendData.value.map(p => p.failedCount)
        }
      ]
    })
  }
}

const handleSearch = () => {
  loadData(); loadStats(); loadTrend();
}

const handleSync = async (id: string) => {
  const res = await depositOrderApi.sync(id)
  if (res.code === 0) { message.success(res.msg); loadData(); }
  else message.error(res.msg)
}

const openManual = (id: string) => {
  currentOrderForManual.value = id; manualForm.fileList = []; manualForm.remarks = ''; showManualModal.value = true;
}

const submitManual = async () => {
  if (manualForm.fileList.length === 0 || !manualForm.remarks) { message.warning(t('common.fillRequired')); return; }
  const res = await depositOrderApi.manualComplete(currentOrderForManual.value!, manualForm)
  if (res.code === 0) { message.success(t('common.success')); showManualModal.value = false; loadData(); }
}

const openLogs = async (id: string) => {
  showLogModal.value = true; logLoading.value = true;
  const res = await depositOrderApi.logs(id)
  if (res.code === 0 && res.data) currentOrderLogs.value = res.data;
  logLoading.value = false;
}

const isSticky = ref(false)
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  isSticky.value = target.scrollTop > 20
}

onMounted(() => {
  handleSearch()
  window.addEventListener('resize', () => { channelChart?.resize(); statusChart?.resize(); trendChart?.resize(); })
  
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
  <div class="premium-container p-6 min-h-full flex flex-col gap-8">
    <!-- 背景修飾（亮色模式調整） -->
    <div class="tech-glow glow-1"></div>

    <!-- 搜尋區塊 (移至最上方) -->
    <div class="sticky top-0 z-30 transition-all duration-300" :class="{ 'pt-2': isSticky }">
      <NCard 
        :title="t('finance.paymentChannel.title')" 
        class="rounded-xl shadow-sm border-0 premium-card transition-all duration-300" 
        :class="{ 'premium-glass shadow-xl mx-2': isSticky }"
        size="small"
      >
        <NForm inline :model="searchForm" label-placement="left" class="flex-wrap gap-4 mt-4" label-width="auto">
          <NFormItem label="建立時間">
            <NDatePicker v-model:value="searchForm.timeRange" type="daterange" clearable style="width: 280px" />
          </NFormItem>
          <NFormItem :label="t('player.list.id')">
            <NInput v-model:value="searchForm.playerId" :placeholder="t('common.keywordPlaceholder')" clearable style="width: 180px" />
          </NFormItem>
          <NFormItem :label="t('finance.paymentChannel.type')">
            <NSelect v-model:value="searchForm.channel" multiple :options="channelOptions" :placeholder="t('common.all')" clearable style="width: 220px" />
          </NFormItem>
          <NFormItem :label="t('common.status')">
            <NSelect v-model:value="searchForm.status" multiple :options="statusOptions" :placeholder="t('common.all')" clearable style="width: 220px" />
          </NFormItem>
          <NFormItem>
            <NButton type="primary" @click="handleSearch">
              <template #icon><NIcon><Search /></NIcon></template>
              {{ t('common.search') }}
            </NButton>
          </NFormItem>
        </NForm>
      </NCard>
    </div>

    <div class="content-wrapper space-y-8 relative z-10 flex-1">

      <!-- 1. 科技亮色統計層 -->
      <NGrid :x-gap="20" :y-gap="20" :cols="4">
        <NGridItem>
          <div class="tech-card p-5 group hover:shadow-xl transition-all duration-300">
            <div class="flex items-start justify-between">
              <div>
                <div class="text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-bold">{{ $t('finance.depositOrder.stats.successDeposit') }}</div>
                <div class="text-3xl font-mono font-bold text-slate-800 tracking-tighter flex items-end gap-1">
                  <span class="text-lg text-blue-500">¥</span>
                  {{ (stats?.totalAmount || 0).toLocaleString() }}
                </div>
              </div>
              <div class="p-2 bg-blue-50 rounded-lg text-blue-500 shadow-sm"><NIcon size="24"><BarChartOutline /></NIcon></div>
            </div>
            <div class="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full bg-blue-500 pulse-anim-light w-[85%]"></div>
            </div>
          </div>
        </NGridItem>
        <NGridItem>
          <div class="tech-card p-5 group hover:shadow-xl transition-all duration-300">
            <div class="flex items-start justify-between">
              <div>
                <div class="text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-bold">{{ $t('finance.depositOrder.stats.totalFees') }}</div>
                <div class="text-3xl font-mono font-bold text-slate-800 tracking-tighter flex items-end gap-1">
                  <span class="text-lg text-indigo-500">¥</span>
                  {{ (stats?.totalFee || 0).toLocaleString() }}
                </div>
              </div>
              <div class="p-2 bg-indigo-50 rounded-lg text-indigo-500 shadow-sm"><NIcon size="24"><FlashOutline /></NIcon></div>
            </div>
            <div class="mt-2 text-xs text-slate-500 font-mono">
              {{ $t('finance.depositOrder.stats.costRatio') }}: <span class="font-bold text-indigo-600">{{ stats ? (stats.totalFee / stats.totalAmount * 100).toFixed(2) : 0 }}%</span>
            </div>
          </div>
        </NGridItem>
        <NGridItem>
          <div class="tech-card p-5 group hover:shadow-xl transition-all duration-300">
            <div class="flex items-start justify-between">
              <div>
                <div class="text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-bold">{{ $t('finance.depositOrder.stats.orderCount') }}</div>
                <div class="text-3xl font-mono font-bold text-slate-800 tracking-tighter flex items-end gap-1">
                  {{ (stats?.totalCount || 0).toLocaleString() }}
                  <span class="text-xs text-slate-400 pb-1 font-normal italic">PCS</span>
                </div>
              </div>
              <div class="p-2 bg-emerald-50 rounded-lg text-emerald-500 shadow-sm"><NIcon size="24"><PieChartOutline /></NIcon></div>
            </div>
            <div class="mt-2 text-[10px] text-slate-400 flex justify-between uppercase font-bold">
              <span>{{ $t('finance.depositOrder.stats.syncStatus') }}</span>
              <span class="text-emerald-500">● LIVE</span>
            </div>
          </div>
        </NGridItem>
        <NGridItem>
          <div class="tech-card p-5 group hover:shadow-xl transition-all duration-300">
            <div class="flex items-start justify-between">
              <div>
                <div class="text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-bold">{{ $t('finance.depositOrder.stats.performanceRate') }}</div>
                <div class="text-3xl font-mono font-bold text-slate-800 tracking-tighter">
                  {{ stats ? ((stats.statusDonut.find(s => s.name === t('finance.depositOrder.status.SUCCESS'))?.value || 0) / (stats.totalCount || 1) * 100).toFixed(1) : 0 }}%
                </div>
              </div>
              <div class="p-2 bg-orange-50 rounded-lg text-orange-500 shadow-sm"><NIcon size="24"><TimeOutline /></NIcon></div>
            </div>
            <div class="flex items-center gap-1 mt-2">
              <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{{ $t('finance.depositOrder.stats.healthCheck') }}: </span>
              <span class="text-[10px] text-orange-500 font-bold uppercase">{{ $t('finance.depositOrder.stats.optimalRange') }}</span>
            </div>
          </div>
        </NGridItem>
      </NGrid>

      <!-- 2. 圖表展示 -->
      <NGrid :x-gap="20" :y-gap="20" :cols="12">
        <NGridItem :span="8">
          <div class="tech-card h-full">
            <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <span class="text-xs font-bold text-slate-500 uppercase tracking-widest">{{ $t('finance.depositOrder.charts.analytics') }}</span>
            </div>
            <div class="p-6">
              <div ref="trendChartRef" class="w-full h-[400px]"></div>
            </div>
          </div>
        </NGridItem>
        <NGridItem :span="4">
          <div class="flex flex-col gap-6">
            <div class="tech-card">
              <div class="p-4 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-widest font-black">{{ $t('finance.depositOrder.charts.segment') }}</div>
              <div class="p-4 flex flex-col items-center">
                <div ref="channelDonutRef" class="w-full h-48"></div>
              </div>
            </div>
            <div class="tech-card">
              <div class="p-4 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-widest font-black">{{ $t('finance.depositOrder.charts.status') }}</div>
              <div class="p-4 flex flex-col items-center">
                <div ref="statusDonutRef" class="w-full h-48"></div>
              </div>
            </div>
          </div>
        </NGridItem>
      </NGrid>


        <NCard class="tech-card overflow-hidden p-0">
          <NDataTable 
            remote 
            :loading="loading" 
            :columns="columns" 
            :data="orders" 
            :pagination="{ page: 1, pageSize: 15, itemCount: totalOrders }"
            :bordered="false"
            class="tech-table-light"
          />
        </NCard>
    </div>

    <!-- 彈窗維持亮色高端風 -->
    <NModal v-model:show="showManualModal" :title="$t('finance.depositOrder.modals.manualTitle')" preset="card" class="tech-modal-light" style="width: 500px">
      <NForm :model="manualForm" label-placement="top">
        <NFormItem label="上傳圖片" required>
          <NUpload
            v-model:file-list="manualForm.fileList"
            list-type="image-card"
            :max="1"
            accept="image/*"
            @before-upload="({ file }) => { manualForm.fileList = [file]; return false }"
          >
            上傳
          </NUpload>
        </NFormItem>
        <NFormItem label="備註說明" required>
          <NInput v-model:value="manualForm.remarks" type="textarea" placeholder="請輸入人工補單的原因與說明..." class="tech-input-light" :rows="3" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showManualModal = false" quaternary>{{ $t('finance.depositOrder.modals.discard') }}</NButton>
          <NButton type="info" color="#0369a1" @click="submitManual">{{ $t('finance.depositOrder.modals.process') }}</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showLogModal" :title="$t('finance.depositOrder.modals.logsTitle')" preset="card" class="tech-modal-light" style="width: 800px">
      <NScrollbar style="max-height: 60vh">
        <div class="p-6 space-y-6">
          <div v-for="(log, i) in currentOrderLogs" :key="i" class="log-entry-light border-l-4 border-blue-500 bg-blue-50/50 p-5 rounded-r-xl">
             <div class="flex justify-between items-center mb-2">
               <span class="font-black text-slate-700 tracking-tight">{{ log.action }}</span>
               <span class="text-[10px] text-slate-400 font-mono">{{ log.time }}</span>
             </div>
             <div class="flex items-center gap-3 text-xs mb-3">
               <NTag v-if="log.statusBefore" size="tiny" :type="getStatusType(log.statusBefore)" round>{{ getStatusLabel(log.statusBefore) }}</NTag>
               <span v-if="log.statusBefore" class="text-slate-300">➜</span>
               <NTag size="tiny" :type="getStatusType(log.statusAfter)" round>{{ getStatusLabel(log.statusAfter) }}</NTag>
             </div>
             <div v-if="log.rawDetail" class="raw-box-light text-[11px] font-mono p-4 bg-slate-900 text-blue-300 rounded-lg shadow-inner overflow-x-auto">
               {{ log.rawDetail }}
             </div>
             <div class="mt-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest flex gap-4">
               <span>Operator / {{ log.operator }}</span>
               <span>Node / {{ log.ip }}</span>
             </div>
          </div>
        </div>
      </NScrollbar>
    </NModal>
  </div>
</template>

<style scoped>
.premium-container {
  background-color: #f8fafc; /* Slate 50 */
  color: #1e293b;
  position: relative;
  /* overflow: hidden; */ /* Removed to allow sticky children */
}

.tech-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 20px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
}

.tech-glow {
  position: absolute;
  width: 600px; height: 600px;
  border-radius: 50%;
  filter: blur(150px);
  opacity: 0.1;
  background: radial-gradient(circle, #3b82f6, #6366f1);
  top: -200px; left: 50%; transform: translateX(-50%);
  pointer-events: none;
}

.pulse-anim-light {
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.3);
  position: relative;
}
.pulse-anim-light::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
  animation: scanning 2.5s ease-in-out infinite;
}

@keyframes scanning {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

:deep(.tech-table-light) {
  --n-color: transparent !important;
  --n-td-color: transparent !important;
  --n-th-color: #f8fafc !important;
  --n-td-text-color: #334155 !important;
  --n-th-text-color: #64748b !important;
  --n-border-color: #f1f5f9 !important;
  --n-th-font-weight: 900 !important;
  --n-th-font-size: 11px !important;
}


.tech-btn-light {
  letter-spacing: 1px;
  font-weight: 900;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(3, 105, 161, 0.2);
}

.font-mono {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace !important;
}

/* 狀態標籤亮色優化 */
:deep(.n-tag--success-type) { background: #f0fdf4 !important; color: #15803d !important; border: 1px solid #dcfce7 !important; }
:deep(.n-tag--warning-type) { background: #fffbeb !important; color: #b45309 !important; border: 1px solid #fef3c7 !important; }
:deep(.n-tag--error-type) { background: #fef2f2 !important; color: #b91c1c !important; border: 1px solid #fee2e2 !important; }

/* 訂單列表內特殊佈局 */
.amount-stack {
  padding: 4px 0;
}
</style>
