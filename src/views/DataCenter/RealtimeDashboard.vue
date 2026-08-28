<template>
    <div class="realtime-dashboard">
        <n-space vertical size="large">
            <!-- Header & Filter -->
            <n-card>
                <n-space justify="space-between" align="center">
                     <n-text h2 style="margin: 0">
                        <n-icon><pulse-icon /></n-icon>
                        即時運作數據 (Realtime Ops)
                    </n-text>

                    <n-space align="center" size="large">
                        <n-space align="center">
                            <n-text>排除測試帳號</n-text>
                            <n-switch v-model:value="excludeTest" @update:value="fetchData" />
                        </n-space>
                        
                        <n-divider vertical />

                        <n-text depth="3" class="text-xs">
                            自動刷新: {{ timeLeft }}s
                        </n-text>
                        <n-button circle size="small" @click="fetchData">
                            <template #icon><n-icon><refresh-icon /></n-icon></template>
                        </n-button>
                    </n-space>
                </n-space>
            </n-card>

            <!-- KPI Cards -->
            <n-grid x-gap="12" y-gap="12" :cols="4">
                <n-gi>
                    <n-card class="kpi-card" hoverable>
                        <n-statistic label="即時在線 (CCU)">
                            <template #prefix><n-icon><people-icon /></n-icon></template>
                            <n-number-animation :from="0" :to="stats.ccu" />
                        </n-statistic>
                    </n-card>
                </n-gi>
                <n-gi>
                    <n-card class="kpi-card" hoverable>
                        <n-statistic label="今日累積 DAU">
                            <template #prefix><n-icon><person-icon /></n-icon></template>
                            <n-number-animation :from="0" :to="stats.dau" />
                        </n-statistic>
                    </n-card>
                </n-gi>
                <n-gi>
                    <n-card class="kpi-card" hoverable>
                        <n-statistic label="今日即時 GGR">
                            <template #prefix>$</template>
                            <n-number-animation :from="0" :to="stats.ggr" />
                        </n-statistic>
                    </n-card>
                </n-gi>
                <n-gi>
                    <n-card class="kpi-card" hoverable>
                        <n-statistic label="今日總投注 (Turnover)">
                            <template #prefix>$</template>
                             <n-number-animation :from="0" :to="stats.totalBet" />
                        </n-statistic>
                    </n-card>
                </n-gi>
            </n-grid>

            <!-- Charts -->
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
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { NSpace, NCard, NGrid, NGi, NIcon, NText, NSwitch, NButton, NStatistic, NNumberAnimation, NDivider } from 'naive-ui'
import { 
    PulseOutline as PulseIcon, 
    Refresh as RefreshIcon,
    PeopleOutline as PeopleIcon,
    PersonOutline as PersonIcon
} from '@vicons/ionicons5'
import * as echarts from 'echarts'
import { realtimeApi, RealtimeStats } from '@/api/realtime'

// const message = useMessage()
const REFRESH_INTERVAL = 10 // seconds

// State
const excludeTest = ref(true)
const timeLeft = ref(REFRESH_INTERVAL)
const stats = ref<RealtimeStats>({
    ccu: 0,
    dau: 0,
    ggr: 0,
    totalBet: 0,
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

// Methods
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
                data: stats.value.providerStats,
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
                data: stats.value.deviceStats,
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

const fetchData = async () => {
    try {
        const res = await realtimeApi.getRealtimeStats(excludeTest.value)
        if (res.code === 0 && res.data) {
            stats.value = res.data
            updateCharts()
            timeLeft.value = REFRESH_INTERVAL // Reset timer
        }
    } catch (e) {
        console.error(e)
        // Silent fail for auto-refresh
    }
}

const startAutoRefresh = () => {
    // Data Fetch Interval
    timer = window.setInterval(fetchData, REFRESH_INTERVAL * 1000)
    
    // Countdown UI
    countdownTimer = window.setInterval(() => {
        if (timeLeft.value > 0) {
            timeLeft.value--
        }
    }, 1000)
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

const handleResize = () => {
    providerChart?.resize()
    deviceChart?.resize()
}

watch(excludeTest, () => {
    fetchData()
})

</script>

<style scoped>
.realtime-dashboard {
    padding: 24px;
}
.kpi-card {
    cursor: pointer;
    transition: transform 0.2s;
}
.kpi-card:hover {
    transform: translateY(-5px);
}
.text-xs {
    font-size: 12px;
}
</style>
