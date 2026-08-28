<template>
    <div class="financial-overview-container">
        <n-space vertical size="large">
            <!-- Filter Bar -->
            <n-card>
                <n-space align="center" justify="space-between">
                    <n-space align="center">
                        <n-radio-group v-model:value="timeRange" @update:value="fetchData">
                            <n-radio-button value="today">今日</n-radio-button>
                            <n-radio-button value="yesterday">昨日</n-radio-button>
                            <n-radio-button value="week">過去 7 天</n-radio-button>
                        </n-radio-group>
                        
                        <n-divider vertical />
                        
                        <n-checkbox v-model:checked="excludeTest" @update:checked="fetchData">
                            排除測試帳號
                        </n-checkbox>
                    </n-space>

                    <n-space align="center">
                        <n-text depth="3" class="last-updated">
                            最後更新: {{ lastUpdated }}
                        </n-text>
                        <n-button secondary circle type="primary" @click="fetchData" :loading="loading">
                            <template #icon><n-icon><refresh-icon /></n-icon></template>
                        </n-button>
                    </n-space>
                </n-space>
            </n-card>

            <!-- KPI Cards Grid (8 items) -->
            <n-grid x-gap="12" y-gap="12" :cols="4">
                <!-- Row 1 -->
                <n-gi>
                    <n-card class="kpi-card">
                        <n-statistic label="今日總儲值 (Net)">
                            <template #prefix>$</template>
                            {{ stats.totalDeposit.toLocaleString() }}
                        </n-statistic>
                        <n-text depth="3" class="sub-text">筆數: {{ stats.depositCount }}</n-text>
                    </n-card>
                </n-gi>
                <n-gi>
                    <n-card class="kpi-card">
                        <n-statistic label="今日總兌換 (Total Out)">
                            <template #prefix>$</template>
                            {{ stats.totalWithdraw.toLocaleString() }}
                        </n-statistic>
                        <n-text depth="3" class="sub-text">筆數: {{ stats.withdrawChannelStats.length * 15 }}</n-text>
                    </n-card>
                </n-gi>
                <n-gi>
                    <n-card class="kpi-card" :class="{ 'alert-flash': isHighManualAdd }">
                        <n-statistic label="人工加點合計 (Cash)">
                            <template #prefix>$</template>
                            <span :class="{ 'text-warn': isHighManualAdd }">
                                {{ stats.manualAddCash.toLocaleString() }}
                            </span>
                        </n-statistic>
                        <div v-if="isHighManualAdd" class="alert-action">
                            <n-tag type="error" size="small">異常高</n-tag>
                            <n-button text type="error" size="tiny" class="ml-2" @click="goToManualLog">
                                查看詳情 >
                            </n-button>
                        </div>
                    </n-card>
                </n-gi>
                <n-gi>
                    <n-card class="kpi-card">
                        <n-statistic label="人工扣點合計 (Cash)">
                            <template #prefix>$</template>
                            {{ stats.manualDeductCash.toLocaleString() }}
                        </n-statistic>
                    </n-card>
                </n-gi>

                <!-- Row 2 -->
                <n-gi>
                    <n-card class="kpi-card">
                        <n-statistic label="今日 GGR">
                            <template #prefix>$</template>
                            {{ stats.ggr.toLocaleString() }}
                        </n-statistic>
                    </n-card>
                </n-gi>
                 <n-gi>
                    <n-card class="kpi-card">
                        <n-statistic label="入金轉換率">
                            <template #suffix>%</template>
                            {{ depositConversionRate }}
                        </n-statistic>
                        <n-text depth="3" class="sub-text">人數: {{ stats.depositUserCount }} / {{ stats.activeUserCount }}</n-text>
                    </n-card>
                </n-gi>
                <n-gi>
                    <n-card class="kpi-card">
                        <n-statistic label="總派發 (Total Dist)">
                            <template #prefix>$</template>
                            {{ stats.totalDistribution.toLocaleString() }}
                        </n-statistic>
                        <n-text depth="3" class="sub-text">人工(B): {{ stats.manualAddBonus.toLocaleString() }}</n-text>
                    </n-card>
                </n-gi>
                <n-gi>
                    <n-card class="kpi-card">
                        <n-statistic label="活動金轉換率">
                            <template #suffix>%</template>
                            {{ bonusConversionRate }}
                        </n-statistic>
                        <n-text depth="3" class="sub-text">轉換: ${{ stats.totalConversion.toLocaleString() }}</n-text>
                    </n-card>
                </n-gi>
            </n-grid>

            <!-- Charts (3 Cols) -->
            <n-grid x-gap="12" :cols="3">
                <n-gi>
                    <n-card :title="depositTitle" content-style="height: 300px">
                        <div ref="depositChartRef" class="chart-container"></div>
                    </n-card>
                </n-gi>
                <n-gi>
                    <n-card :title="withdrawTitle" content-style="height: 300px">
                        <div ref="withdrawChartRef" class="chart-container"></div>
                    </n-card>
                </n-gi>
                <n-gi>
                    <n-card :title="distributionTitle" content-style="height: 300px">
                        <div ref="distributionChartRef" class="chart-container"></div>
                    </n-card>
                </n-gi>
            </n-grid>
        </n-space>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, NSpace, NCard, NRadioGroup, NRadioButton, NDivider, NCheckbox, NText, NButton, NIcon, NGrid, NGi, NStatistic, NTag } from 'naive-ui'
import { Refresh as RefreshIcon } from '@vicons/ionicons5'
import * as echarts from 'echarts'
import { financeApi, FinanceStats } from '@/api/finance'

const MANUAL_ADD_THRESHOLD = 50000 // Alert threshold

const router = useRouter()
const message = useMessage()

// State
const loading = ref(false)
const timeRange = ref('today')
const excludeTest = ref(true)
const lastUpdated = ref('')
const stats = ref<FinanceStats>({
    totalDeposit: 0,
    totalWithdraw: 0,
    netRevenue: 0,
    manualAddCash: 0,
    manualDeductCash: 0,
    manualAddBonus: 0,
    manualDeductBonus: 0,
    ggr: 0,
    depositCount: 0,
    activeUserCount: 0,
    channelStats: [],
    withdrawChannelStats: [],
    // New
    totalDistribution: 0,
    totalRecovery: 0,
    totalConversion: 0,
    totalInProgress: 0,
    depositUserCount: 0
})

// Charts
const depositChartRef = ref<HTMLElement | null>(null)
const withdrawChartRef = ref<HTMLElement | null>(null)
const distributionChartRef = ref<HTMLElement | null>(null)
let depositChart: echarts.ECharts | null = null
let withdrawChart: echarts.ECharts | null = null
let distributionChart: echarts.ECharts | null = null

// Timer
let refreshTimer: number | null = null

// Computed
const isHighManualAdd = computed(() => stats.value.manualAddCash > MANUAL_ADD_THRESHOLD)

const depositConversionRate = computed(() => {
    if (stats.value.activeUserCount === 0) return 0
    return ((stats.value.depositUserCount / stats.value.activeUserCount) * 100).toFixed(2)
})

const bonusConversionRate = computed(() => {
    if (stats.value.totalDistribution === 0) return 0
    return ((stats.value.totalConversion / stats.value.totalDistribution) * 100).toFixed(2)
})

const getDateRange = (range: string) => {
    const end = new Date()
    const start = new Date()
    
    if (range === 'yesterday') {
        start.setDate(start.getDate() - 1)
        start.setHours(0, 0, 0, 0)
        end.setDate(end.getDate() - 1)
        end.setHours(23, 59, 59, 999)
    } else if (range === 'week') {
        start.setDate(start.getDate() - 7)
    } else {
        // today
        start.setHours(0, 0, 0, 0)
    }
    
    return {
        startDate: start.toISOString(),
        endDate: end.toISOString()
    }
}

// Titles with Totals
const depositTitle = computed(() => `入金渠道分佈 (Total: $${stats.value.totalDeposit.toLocaleString()})`)
const withdrawTitle = computed(() => `出金渠道分佈 (Total: $${stats.value.totalWithdraw.toLocaleString()})`)
const distributionTitle = computed(() => `總派發活動金 (Total: $${stats.value.totalDistribution.toLocaleString()})`)

// Methods
const fetchData = async () => {
    loading.value = true
    try {
        const { startDate, endDate } = getDateRange(timeRange.value)
        const res = await financeApi.getStats({
            startDate,
            endDate,
            excludeTest: excludeTest.value
        })
        
        if (res.code === 0 && res.data) {
            stats.value = res.data
            lastUpdated.value = new Date().toLocaleTimeString()
            updateCharts()
        }
    } catch (e) {
        message.error('數據載入失敗')
    } finally {
        loading.value = false
    }
}

const initCharts = () => {
    if (depositChartRef.value) depositChart = echarts.init(depositChartRef.value)
    if (withdrawChartRef.value) withdrawChart = echarts.init(withdrawChartRef.value)
    if (distributionChartRef.value) distributionChart = echarts.init(distributionChartRef.value)
}

const updateCharts = () => {
    if (depositChart) {
        depositChart.setOption({
            tooltip: { trigger: 'item' },
            legend: { bottom: '0%' },
            series: [{
                name: '入金渠道',
                type: 'pie',
                radius: '55%',
                avoidLabelOverlap: false,
                data: stats.value.channelStats,
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        })
    }

    if (withdrawChart) {
        withdrawChart.setOption({
            tooltip: { trigger: 'item' },
            legend: { bottom: '0%' },
            series: [{
                name: '出金渠道',
                type: 'pie',
                radius: '55%',
                avoidLabelOverlap: false,
                data: stats.value.withdrawChannelStats,
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        })
    }
    
    if (distributionChart) {
        distributionChart.setOption({
            tooltip: { trigger: 'item' },
            legend: { bottom: '0%' },
            series: [{
                name: '派發結構',
                type: 'pie',
                radius: '55%',
                avoidLabelOverlap: false,
                data: [
                    { value: stats.value.totalRecovery, name: '總回收' },
                    { value: stats.value.totalConversion, name: '總轉換' },
                    { value: stats.value.totalInProgress, name: '進行中' }
                ],
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        })
    }
}

const handleResize = () => {
    depositChart?.resize()
    withdrawChart?.resize()
    distributionChart?.resize()
}

const goToManualLog = () => {
    // Assuming OPE-603 or Logging page
    router.push('/admin/manual-adjustment')
}

// Lifecycle
onMounted(() => {
    nextTick(() => {
        initCharts()
        fetchData()
        window.addEventListener('resize', handleResize)
    })
    refreshTimer = window.setInterval(fetchData, 60000)
})

onUnmounted(() => {
    if (refreshTimer) clearInterval(refreshTimer)
    window.removeEventListener('resize', handleResize)
    depositChart?.dispose()
    withdrawChart?.dispose()
    distributionChart?.dispose()
})
</script>

<style scoped>
.financial-overview-container {
    padding: 24px;
}
.kpi-card {
    height: 100%;
    transition: all 0.3s ease;
}
.sub-text {
    font-size: 12px;
    margin-top: 4px;
    display: block;
}
.highlight-metric :deep(.n-statistic__content) {
    font-weight: bold;
    color: var(--primary-color);
}
.text-negative {
    color: #d03050;
}
.text-warn {
    color: #d03050; 
    font-weight: bold;
}
.alert-tag {
    margin-top: 4px;
}
.alert-action {
    display: flex;
    align-items: center;
    margin-top: 4px;
}
.ml-2 {
    margin-left: 8px;
}
.chart-container {
    width: 100%;
    height: 100%;
    min-height: 250px;
}
.last-updated {
    font-size: 12px;
    margin-right: 12px;
}

/* Alert Animation */
@keyframes flash-red {
    0% { background-color: white; }
    50% { background-color: rgba(208, 48, 80, 0.1); }
    100% { background-color: white; }
}

.alert-flash {
    animation: flash-red 2s infinite;
    border: 1px solid #d03050;
}
</style>
