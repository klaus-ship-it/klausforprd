<template>
    <div class="todo-center-container">
        <n-space vertical size="large">
            <!-- Header -->
            <n-card>
                <n-space justify="space-between" align="center">
                    <n-text h2 style="margin: 0">
                        <n-icon><speedometer-icon /></n-icon>
                        待辦審核中心 (Todo Center)
                    </n-text>

                    <n-space align="center">
                        <n-space align="center">
                            <n-text>排除測試帳號</n-text>
                            <n-switch v-model:value="excludeTest" @update:value="fetchData" />
                        </n-space>
                        <n-divider vertical />
                        <n-text depth="3">自動刷新: {{ timeLeft }}s</n-text>
                        <n-text depth="3" style="margin-right: 8px">最後更新: {{ lastUpdated }}</n-text>
                        <n-button 
                            type="primary" 
                            secondary 
                            circle 
                            :loading="loading" 
                            :disabled="isInCooldown"
                            @click="handleManualRefresh"
                        >
                            <template #icon><n-icon><refresh-icon /></n-icon></template>
                        </n-button>
                    </n-space>
                </n-space>
            </n-card>

            <!-- Todo Cards Grid -->
            <n-grid x-gap="16" y-gap="16" :cols="4" item-responsive>
                <!-- Finance Section -->
                <n-gi v-if="hasFinancePermission">
                    <n-card 
                        class="todo-card" 
                        :class="{ 'status-warn': stats.pendingDeposits > 0 }"
                        hoverable 
                        @click="navigateTo('/admin/deposit-orders', { status: 'pending' })"
                    >
                        <n-statistic label="儲值待補單">
                            <template #prefix>
                                <n-icon><card-icon /></n-icon>
                            </template>
                            {{ stats.pendingDeposits }}
                        </n-statistic>
                        <div class="card-action">
                            <n-text depth="3" class="text-xs">點擊前往處理 >></n-text>
                        </div>
                    </n-card>
                </n-gi>

                <n-gi v-if="hasFinancePermission">
                    <n-card 
                        class="todo-card" 
                        :class="{ 'status-warn': stats.pendingWithdrawals > 0 }"
                        hoverable
                        @click="navigateTo('/admin/manual-adjustment', { status: 'pending' })"
                    >
                        <n-statistic label="提款待審核">
                            <template #prefix>
                                <n-icon><cash-icon /></n-icon>
                            </template>
                            {{ stats.pendingWithdrawals }}
                        </n-statistic>
                        <div class="card-action">
                            <n-text depth="3" class="text-xs">點擊前往處理 >></n-text>
                        </div>
                    </n-card>
                </n-gi>

                <!-- Risk Section -->
                <n-gi v-if="hasRiskPermission">
                    <n-card 
                        class="todo-card" 
                        :class="{ 'status-danger': stats.riskAlerts > 0 }"
                        hoverable
                        @click="navigateTo('/admin/risk/alerts', { status: 'unresolved' })"
                    >
                        <n-statistic label="異常行為預警" label-class="risk-alert-label">
                            <template #prefix>
                                <n-icon><alert-circle-icon /></n-icon>
                            </template>
                            {{ stats.riskAlerts }}
                        </n-statistic>
                        <div class="card-action">
                            <n-tag type="error" size="small" v-if="stats.riskAlerts > 0">High Risk</n-tag>
                            <n-text depth="3" class="text-xs" v-else>系統監控中</n-text>
                        </div>
                    </n-card>
                </n-gi>

                <!-- System Health -->
                <n-gi>
                    <n-card 
                        class="todo-card"
                        :class="{ 'status-danger': stats.apiHealth.status !== 'healthy' }"
                        hoverable
                        @click="navigateTo('/admin/system-status')"
                    >
                        <n-statistic label="系統健康度">
                            <template #prefix>
                                <n-icon><pulse-icon /></n-icon>
                            </template>
                            <span :class="healthClass">{{ healthText }}</span>
                        </n-statistic>
                        <div class="card-action">
                             <n-popover trigger="hover" v-if="stats.apiHealth.failedServices.length > 0">
                                <template #trigger>
                                    <n-tag type="error" size="small">異常檢測</n-tag>
                                </template>
                                <span>{{ stats.apiHealth.failedServices.join(', ') }}</span>
                            </n-popover>
                            <n-text depth="3" class="text-xs" v-else>All Systems Operational</n-text>
                        </div>
                    </n-card>
                </n-gi>

            </n-grid>

            <n-divider />

            <!-- Realtime KPI Cards -->
            <n-grid x-gap="12" y-gap="12" :cols="4">
                <n-gi>
                    <n-card class="kpi-card" hoverable>
                        <n-statistic label="即時在線 (CCU)">
                            <template #prefix>
                                <div class="flex items-center gap-2">
                                    <n-icon size="24"><people-icon /></n-icon>
                                    <n-number-animation :from="0" :to="realtimeStats.ccu" />
                                    <span class="ml-1 px-2 py-0.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 rounded-md border border-emerald-100 dark:border-emerald-800">
                                        {{ ((realtimeStats.ccu / (realtimeStats.totalPlayers || 1)) * 100).toFixed(2) }}%
                                    </span>
                                </div>
                            </template>
                        </n-statistic>
                    </n-card>
                </n-gi>
                <n-gi>
                    <n-card class="kpi-card" hoverable>
                        <n-statistic label="今日累積 DAU">
                            <template #prefix>
                                <div class="flex items-center gap-2">
                                    <n-icon size="24"><person-icon /></n-icon>
                                    <n-number-animation :from="0" :to="realtimeStats.dau" />
                                    <span class="ml-1 px-2 py-0.5 text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md border border-blue-100 dark:border-blue-800">
                                        {{ ((realtimeStats.dau / (realtimeStats.totalPlayers || 1)) * 100).toFixed(2) }}%
                                    </span>
                                </div>
                            </template>
                        </n-statistic>
                    </n-card>
                </n-gi>
                <n-gi>
                    <n-card class="kpi-card" hoverable>
                        <n-statistic label="今日即時 GGR">
                            <template #prefix>$</template>
                            <n-number-animation :from="0" :to="realtimeStats.ggr" />
                        </n-statistic>
                    </n-card>
                </n-gi>
                <n-gi>
                    <n-card class="kpi-card" hoverable>
                        <n-statistic label="今日總投注 (Turnover)">
                            <template #prefix>$</template>
                             <n-number-animation :from="0" :to="realtimeStats.totalBet" />
                        </n-statistic>
                    </n-card>
                </n-gi>
            </n-grid>

            <!-- Realtime Charts -->
            <n-grid x-gap="12" y-gap="12" :cols="2">
                <n-gi>
                    <n-card title="各平台人數分布 (Provider Distribution)">
                        <div ref="providerChartRef" style="height: 350px"></div>
                    </n-card>
                </n-gi>
                <n-gi>
                    <n-card title="各裝置人數分布 (Device Distribution)">
                        <div ref="deviceChartRef" style="height: 350px"></div>
                    </n-card>
                </n-gi>
            </n-grid>
        </n-space>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, NSpace, NCard, NGrid, NGi, NStatistic, NIcon, NButton, NText, NTag, NPopover, NSwitch, NDivider, NNumberAnimation } from 'naive-ui'
import { 
    SpeedometerOutline as SpeedometerIcon,
    Refresh as RefreshIcon,
    CardOutline as CardIcon,
    CashOutline as CashIcon,
    AlertCircleOutline as AlertCircleIcon,
    PulseOutline as PulseIcon,
    PeopleOutline as PeopleIcon,
    PersonOutline as PersonIcon
} from '@vicons/ionicons5'
import { dashboardApi, TodoStats } from '@/api/dashboard'
import { realtimeApi, RealtimeStats } from '@/api/realtime'
import { useAuthStore } from '@/stores/useAuthStore'
import * as echarts from 'echarts'

const REFRESH_INTERVAL = 30 // seconds config
const cooldownTime = 5000 // 5s

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

// State
const loading = ref(false)
const isInCooldown = ref(false)
const lastUpdated = ref('')
const excludeTest = ref(true)
const timeLeft = ref(REFRESH_INTERVAL)

const stats = ref<TodoStats>({
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    riskAlerts: 0,
    apiHealth: { status: 'healthy', failedServices: [] },
    ccu: 0
})

const realtimeStats = ref<RealtimeStats>({
    ccu: 0,
    dau: 0,
    ggr: 0,
    totalBet: 0,
    totalPlayers: 0,
    providerStats: [],
    deviceStats: []
})

// Charts
const providerChartRef = ref<HTMLElement | null>(null)
const deviceChartRef = ref<HTMLElement | null>(null)
let providerChart: echarts.ECharts | null = null
let deviceChart: echarts.ECharts | null = null

let timer: number | null = null
let countdownTimer: number | null = null

// Permissions
const hasFinancePermission = computed(() => {
    const role = authStore.user?.role
    return ['DEVELOPER', 'MANAGER', 'FINANCE'].includes(role || '')
})

const hasRiskPermission = computed(() => {
    const role = authStore.user?.role
    // Assuming RISK role or Manager
    return ['DEVELOPER', 'MANAGER', 'RISK'].includes(role || '')
})

// Visual Helpers
const healthText = computed(() => {
    if (stats.value.apiHealth.status === 'healthy') return '正常'
    if (stats.value.apiHealth.status === 'degraded') return '部分異常'
    return '服務中斷'
})

const healthClass = computed(() => {
    if (stats.value.apiHealth.status === 'healthy') return 'text-success'
    return 'text-danger'
})

// Chart Methods
const initCharts = () => {
    if (providerChartRef.value) {
        providerChart = echarts.init(providerChartRef.value)
    }
    if (deviceChartRef.value) {
        deviceChart = echarts.init(deviceChartRef.value)
    }
    updateCharts()
}

const updateCharts = () => {
    if (providerChart) {
        providerChart.setOption({
            tooltip: { trigger: 'item' },
            legend: { show: false },
            series: [{
                name: 'Provider',
                type: 'pie',
                radius: '55%',
                data: realtimeStats.value.providerStats,
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

    if (deviceChart) {
        deviceChart.setOption({
            tooltip: { trigger: 'item' },
            legend: { show: false },
            series: [{
                name: 'Device',
                type: 'pie',
                radius: '55%',
                data: realtimeStats.value.deviceStats,
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

// Data Methods
const fetchData = async (isAuto = false) => {
    if (!isAuto) loading.value = true
    try {
        const [dashboardRes, realtimeRes] = await Promise.all([
             dashboardApi.getTodoStats(),
             realtimeApi.getRealtimeStats(excludeTest.value)
        ])

        if (dashboardRes.code === 0 && dashboardRes.data) {
            stats.value = dashboardRes.data
        }
        if (realtimeRes.code === 0 && realtimeRes.data) {
            realtimeStats.value = realtimeRes.data
            updateCharts()
        }

        lastUpdated.value = new Date().toLocaleTimeString()
        timeLeft.value = REFRESH_INTERVAL

    } catch (e) {
        message.error('數據更新失敗')
    } finally {
        if (!isAuto) loading.value = false
    }
}

const handleManualRefresh = () => {
    if (isInCooldown.value) return
    
    fetchData()
    isInCooldown.value = true
    setTimeout(() => {
        isInCooldown.value = false
    }, cooldownTime)
}

const startAutoRefresh = () => {
    timer = window.setInterval(() => fetchData(true), REFRESH_INTERVAL * 1000)
    
    countdownTimer = window.setInterval(() => {
        if (timeLeft.value > 0) {
            timeLeft.value--
        }
    }, 1000)
}

const navigateTo = (path: string, query?: Record<string, string>) => {
    router.push({ path, query })
}

const handleResize = () => {
    providerChart?.resize()
    deviceChart?.resize()
}

// Lifecycle
onMounted(() => {
    fetchData()
    nextTick(() => {
        initCharts()
        window.addEventListener('resize', handleResize)
    })
    startAutoRefresh()
})

onUnmounted(() => {
    if (timer) clearInterval(timer)
    if (countdownTimer) clearInterval(countdownTimer)
    window.removeEventListener('resize', handleResize)
    providerChart?.dispose()
    deviceChart?.dispose()
})

watch(excludeTest, () => {
    fetchData()
})

</script>

<style scoped>
.todo-center-container {
    padding: 24px;
}
.todo-card {
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    border-left: 4px solid #e0e0e0;
}
.todo-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.kpi-card {
    cursor: pointer;
    transition: transform 0.2s;
}
.kpi-card:hover {
    transform: translateY(-5px);
}

.status-warn {
    border-left-color: #f0a020;
}
.status-danger {
    border-left-color: #d03050;
    background-color: #fff0f0;
}
.status-neutral {
    border-left-color: #2080f0;
}

.card-action {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
}

.text-xs {
    font-size: 12px;
}
.text-success { color: #18a058; }
.text-danger { color: #d03050; }

/* Dark mode styling for risk alert label and value */
.dark :deep(.risk-alert-label) {
    color: #dc2626 !important;
    font-weight: 600;
}

.dark :deep(.n-statistic .risk-alert-label) {
    color: #dc2626 !important;
}

.dark .status-danger :deep(.n-statistic__label),
.dark .status-danger :deep(.n-statistic-value__content) {
    color: #dc2626 !important;
    font-weight: 600;
}

.dark .status-danger :deep(.n-statistic-value i),
.dark .status-danger :deep(.n-statistic-value .n-icon) {
    color: #dc2626 !important;
}
</style>
