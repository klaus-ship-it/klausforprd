<template>
    <div class="system-health-container">
        <!-- Header -->
        <div class="health-header">
            <div class="header-left">
                <n-icon size="28" color="#3b82f6"><pulse-icon /></n-icon>
                <div>
                    <h1>系統健康監測</h1>
                    <p class="subtitle">System Health Monitoring Dashboard</p>
                </div>
            </div>
            <div class="header-right">
                <div class="uptime-badge">
                    <n-icon><time-icon /></n-icon>
                    <span>運行時間: {{ overview.uptime }}</span>
                </div>
                <n-divider vertical />
                <span class="last-update">最後更新: {{ lastUpdated }}</span>
                <n-button type="primary" secondary circle :loading="loading" @click="fetchAll(true)">
                    <template #icon><n-icon><refresh-icon /></n-icon></template>
                </n-button>
            </div>
        </div>

        <!-- TOP: Server Resources + Metrics -->
        <n-grid x-gap="16" y-gap="16" :cols="12">
            <!-- Server Resources Card -->
            <n-gi :span="5">
                <n-card class="section-card" title="伺服器資源 (Server Resources)">
                    <template #header-extra>
                        <n-tag :type="overview.serverLoad < 50 ? 'success' : overview.serverLoad < 80 ? 'warning' : 'error'" round size="small">
                            負載 {{ overview.serverLoad }}%
                        </n-tag>
                    </template>
                    <n-grid x-gap="16" :cols="4">
                        <n-gi>
                            <div class="resource-mini">
                                <span class="res-label">CPU</span>
                                <n-progress type="circle" :percentage="overview.cpuUsage" :status="getProgressStatus(overview.cpuUsage)" :stroke-width="8" style="width: 60px" />
                            </div>
                        </n-gi>
                        <n-gi>
                            <div class="resource-mini">
                                <span class="res-label">Memory</span>
                                <n-progress type="circle" :percentage="overview.memoryUsage" :status="getProgressStatus(overview.memoryUsage)" :stroke-width="8" style="width: 60px" />
                                <span class="res-detail">{{ overview.memoryUsed }}/{{ overview.memoryTotal }}G</span>
                            </div>
                        </n-gi>
                        <n-gi>
                            <div class="resource-mini">
                                <span class="res-label">Disk</span>
                                <n-progress type="circle" :percentage="overview.diskUsage" :status="getProgressStatus(overview.diskUsage)" :stroke-width="8" style="width: 60px" />
                            </div>
                        </n-gi>
                        <n-gi>
                            <div class="gauge-mini">
                                <div ref="gaugeChartRef" style="height: 80px; width: 100%"></div>
                            </div>
                        </n-gi>
                    </n-grid>
                </n-card>
            </n-gi>

            <!-- API Latency -->
            <n-gi :span="2">
                <n-card class="section-card metric-card-sm">
                    <div class="metric-icon-sm bg-blue"><n-icon size="20"><speedometer-icon /></n-icon></div>
                    <div class="metric-label">API 平均延遲</div>
                    <div class="metric-value-lg">{{ overview.avgLatency }}<small>ms</small></div>
                    <n-tag size="tiny" :type="overview.avgLatency < 200 ? 'success' : overview.avgLatency < 500 ? 'warning' : 'error'">
                        {{ overview.avgLatency < 200 ? '正常' : overview.avgLatency < 500 ? '稍慢' : '過慢' }}
                    </n-tag>
                </n-card>
            </n-gi>

            <!-- System Errors -->
            <n-gi :span="2">
                <n-card class="section-card metric-card-sm clickable" @click="showErrorModal = true">
                    <div class="metric-icon-sm bg-red"><n-icon size="20"><alert-icon /></n-icon></div>
                    <div class="metric-label">系統錯誤 (24h)</div>
                    <div class="metric-value-lg error-value">{{ overview.errorCount24h }}</div>
                    <n-tag size="tiny" :type="overview.errorCount24h === 0 ? 'success' : overview.errorCount24h < 5 ? 'warning' : 'error'">
                        {{ overview.errorCount24h === 0 ? '無異常' : '點擊查看' }}
                    </n-tag>
                </n-card>
            </n-gi>

            <!-- QPS -->
            <n-gi :span="3">
                <n-card class="section-card metric-card-sm">
                    <div class="metric-icon-sm bg-green"><n-icon size="20"><flash-icon /></n-icon></div>
                    <div class="metric-label">即時 QPS</div>
                    <div class="metric-value-lg">{{ overview.currentQps }}<small>/s</small></div>
                    <div class="sub-metric">
                        <n-icon size="12"><link-icon /></n-icon>
                        <span>{{ overview.activeConnections }} 連線</span>
                    </div>
                </n-card>
            </n-gi>
        </n-grid>

        <!-- BOTTOM: Traffic (Left) + Services (Right) -->
        <n-grid x-gap="16" y-gap="16" :cols="12" style="margin-top: 16px">
            <!-- API Traffic Trend -->
            <n-gi :span="7">
                <n-card class="section-card" title="API 流量走勢 (過去24小時)">
                    <div ref="trendChartRef" style="height: 360px"></div>
                </n-card>
            </n-gi>

            <!-- Service Health Status -->
            <n-gi :span="5">
                <n-card class="section-card" title="服務健康狀態 (Service Health)">
                    <template #header-extra>
                        <n-button 
                            type="primary" 
                            size="small" 
                            :disabled="pendingChanges.length === 0"
                            @click="showAccessModal = true"
                        >
                            存取操作 ({{ pendingChanges.length }})
                        </n-button>
                    </template>
                    <n-scrollbar style="max-height: 360px">
                        <div v-for="group in groups" :key="group.key" class="service-group-compact">
                            <div class="group-header-compact">
                                <span>{{ group.label }}</span>
                                <n-tag size="tiny" :type="getGroupStatus(group.key)">
                                    {{ getServicesByGroup(group.key).filter(s => s.status === 'ALIVE').length }}/{{ getServicesByGroup(group.key).length }}
                                </n-tag>
                            </div>
                            <div v-for="service in getServicesByGroup(group.key)" :key="service.id" class="service-row">
                                <div class="service-left">
                                    <div class="status-dot" :class="getStatusClass(service.status)"></div>
                                    <span class="service-name">{{ service.name }}</span>
                                </div>
                                <div class="service-right">
                                    <span class="latency" :class="getLatencyClass(service.latency)">{{ service.latency }}ms</span>
                                    <n-switch 
                                        :value="getServiceEnabled(service.id)" 
                                        size="small" 
                                        @update:value="(v) => toggleService(service.id, v)" 
                                    />
                                </div>
                            </div>
                        </div>
                    </n-scrollbar>
                </n-card>
            </n-gi>
        </n-grid>

        <!-- Error Logs Modal -->
        <n-modal v-model:show="showErrorModal" preset="card" title="系統錯誤紀錄 (Error Logs)" style="width: 900px">
            <n-data-table :columns="errorColumns" :data="errorLogs" :bordered="false" size="small" />
        </n-modal>

        <!-- Access Operation Modal -->
        <n-modal v-model:show="showAccessModal" preset="card" title="存取操作確認" style="width: 500px">
            <n-text>即將變更以下服務狀態：</n-text>
            <n-list bordered style="margin: 16px 0">
                <n-list-item v-for="change in pendingChanges" :key="change.id">
                    <n-space justify="space-between" align="center" style="width: 100%">
                        <span>{{ getServiceName(change.id) }}</span>
                        <n-tag :type="change.enabled ? 'success' : 'error'" size="small">
                            {{ change.enabled ? '開啟' : '關閉' }}
                        </n-tag>
                    </n-space>
                </n-list-item>
            </n-list>
            <n-form-item label="變更原因" required>
                <n-input v-model:value="changeReason" type="textarea" placeholder="請輸入變更原因..." :rows="2" />
            </n-form-item>
            <template #footer>
                <n-space justify="end">
                    <n-button @click="cancelChanges">取消</n-button>
                    <n-button type="primary" :disabled="!changeReason" @click="applyChanges">確認變更</n-button>
                </n-space>
            </template>
        </n-modal>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, h, computed } from 'vue'
import { useMessage, NCard, NGrid, NGi, NIcon, NText, NTag, NButton, NProgress, NDivider, NModal, NDataTable, NSwitch, NScrollbar, NSpace, NList, NListItem, NFormItem, NInput, DataTableColumns } from 'naive-ui'
import { 
    PulseOutline as PulseIcon, 
    Refresh as RefreshIcon,
    TimeOutline as TimeIcon,
    AlertCircleOutline as AlertIcon,
    FlashOutline as FlashIcon,
    SpeedometerOutline as SpeedometerIcon,
    LinkOutline as LinkIcon
} from '@vicons/ionicons5'
import * as echarts from 'echarts'
import { systemStatusApi, ServiceStatus, SystemOverviewStats, TrafficPoint, ErrorLogEntry } from '@/api/systemStatus'

const message = useMessage()
const updateInterval = 60000

// State
const loading = ref(false)
const lastUpdated = ref('')
const services = ref<ServiceStatus[]>([])
const overview = ref<SystemOverviewStats>({
    serverLoad: 0, cpuUsage: 0, memoryUsage: 0, memoryUsed: 0, memoryTotal: 64,
    diskUsage: 0, avgLatency: 0, errorCount24h: 0, currentQps: 0, activeConnections: 0, uptime: '0d 0h 0m'
})
const trafficData = ref<TrafficPoint[]>([])
const errorLogs = ref<ErrorLogEntry[]>([])
const showErrorModal = ref(false)
const showAccessModal = ref(false)
const changeReason = ref('')

// Service Toggle State
const serviceEnabledState = ref<Record<string, boolean>>({})
const originalEnabledState = ref<Record<string, boolean>>({})

const pendingChanges = computed(() => {
    return Object.entries(serviceEnabledState.value)
        .filter(([id, enabled]) => originalEnabledState.value[id] !== enabled)
        .map(([id, enabled]) => ({ id, enabled }))
})

const getServiceEnabled = (id: string) => serviceEnabledState.value[id] ?? true
const toggleService = (id: string, enabled: boolean) => {
    serviceEnabledState.value[id] = enabled
}
const getServiceName = (id: string) => services.value.find(s => s.id === id)?.name || id

const cancelChanges = () => {
    serviceEnabledState.value = { ...originalEnabledState.value }
    showAccessModal.value = false
    changeReason.value = ''
}

const applyChanges = () => {
    message.success(`已變更 ${pendingChanges.value.length} 項服務狀態`)
    originalEnabledState.value = { ...serviceEnabledState.value }
    showAccessModal.value = false
    changeReason.value = ''
}

let timer: number | null = null

// Chart Refs
const gaugeChartRef = ref<HTMLElement | null>(null)
const trendChartRef = ref<HTMLElement | null>(null)
let gaugeChart: echarts.ECharts | null = null
let trendChart: echarts.ECharts | null = null

const groups = [
    { key: 'PAYMENT', label: '金流供應商' },
    { key: 'GAME', label: '遊戲供應商' },
    { key: 'SYSTEM', label: '系統服務' },
    { key: 'CORE', label: '核心設施' }
]

// Error Table Columns
const errorColumns: DataTableColumns<ErrorLogEntry> = [
    { title: '時間', key: 'timestamp', width: 160, render: (row) => new Date(row.timestamp).toLocaleString() },
    { title: 'API', key: 'apiEndpoint', ellipsis: { tooltip: true } },
    { title: 'Method', key: 'method', width: 70, render: (row) => h(NTag, { size: 'tiny', type: 'info' }, { default: () => row.method }) },
    { title: 'Status', key: 'statusCode', width: 70, render: (row) => h(NTag, { size: 'tiny', type: 'error' }, { default: () => row.statusCode }) },
    { title: '訊息', key: 'message', ellipsis: { tooltip: true } },
    { title: '嚴重度', key: 'severity', width: 90, render: (row) => h(NTag, { size: 'small', type: row.severity === 'CRITICAL' ? 'error' : row.severity === 'ERROR' ? 'warning' : 'default' }, { default: () => row.severity }) }
]

// Helpers
const getServicesByGroup = (groupKey: string) => services.value.filter(s => s.group === groupKey)
const getGroupStatus = (groupKey: string) => {
    const g = getServicesByGroup(groupKey)
    const alive = g.filter(s => s.status === 'ALIVE').length
    return alive === g.length ? 'success' : alive > 0 ? 'warning' : 'error'
}
const getStatusClass = (status: string) => ({ 'ALIVE': 'dot-green', 'WARNING': 'dot-yellow', 'CRITICAL': 'dot-red' }[status] || 'dot-gray')
const getLatencyClass = (latency: number) => latency < 200 ? 'latency-good' : latency < 1000 ? 'latency-warn' : 'latency-bad'
const getProgressStatus = (v: number): 'success' | 'warning' | 'error' => v < 50 ? 'success' : v < 80 ? 'warning' : 'error'

// Charts
const initCharts = () => {
    if (gaugeChartRef.value) gaugeChart = echarts.init(gaugeChartRef.value)
    if (trendChartRef.value) trendChart = echarts.init(trendChartRef.value)
    updateCharts()
}

const updateCharts = () => {
    if (gaugeChart) {
        const load = overview.value.serverLoad
        gaugeChart.setOption({
            series: [{
                type: 'gauge', startAngle: 180, endAngle: 0, min: 0, max: 100,
                itemStyle: { color: load < 50 ? '#18a058' : load < 80 ? '#f0a020' : '#d03050' },
                progress: { show: true, width: 10 },
                pointer: { show: false },
                axisLine: { lineStyle: { width: 10, color: [[1, '#e5e7eb']] } },
                axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, title: { show: false },
                detail: { valueAnimation: true, fontSize: 18, fontWeight: 'bold', offsetCenter: [0, '0%'], formatter: '{value}%', color: load < 50 ? '#18a058' : load < 80 ? '#f0a020' : '#d03050' },
                data: [{ value: load }]
            }]
        })
    }

    if (trendChart && trafficData.value.length > 0) {
        trendChart.setOption({
            tooltip: { trigger: 'axis' },
            grid: { left: '2%', right: '3%', top: '10%', bottom: '10%', containLabel: true },
            xAxis: { type: 'category', boundaryGap: false, data: trafficData.value.map(p => p.time), axisLabel: { color: '#94a3b8' } },
            yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
            series: [{
                name: 'Requests', type: 'line', smooth: true, symbol: 'none',
                itemStyle: { color: '#3b82f6' }, lineStyle: { width: 2 },
                areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(59, 130, 246, 0.25)' }, { offset: 1, color: 'rgba(59, 130, 246, 0.02)' }]) },
                data: trafficData.value.map(p => p.requests)
            }]
        })
    }
}

// Actions
const fetchAll = async (showLoading = false) => {
    if (showLoading) loading.value = true
    try {
        const [healthRes, overviewRes, trendRes, errorsRes] = await Promise.all([
            systemStatusApi.getHealthStats(),
            systemStatusApi.getSystemOverview(),
            systemStatusApi.getTrafficTrend(),
            systemStatusApi.getErrorLogs()
        ])
        if (healthRes.code === 0 && healthRes.data) {
            services.value = healthRes.data
            // Initialize enabled state for all services
            healthRes.data.forEach(s => {
                if (!(s.id in serviceEnabledState.value)) {
                    serviceEnabledState.value[s.id] = true
                    originalEnabledState.value[s.id] = true
                }
            })
        }
        if (overviewRes.code === 0 && overviewRes.data) overview.value = overviewRes.data
        if (trendRes.code === 0 && trendRes.data) trafficData.value = trendRes.data
        if (errorsRes.code === 0 && errorsRes.data) errorLogs.value = errorsRes.data
        lastUpdated.value = new Date().toLocaleTimeString()
        updateCharts()
    } catch (e) {
        message.error('監控數據更新失敗')
    } finally {
        if (showLoading) loading.value = false
    }
}

const handleResize = () => { gaugeChart?.resize(); trendChart?.resize() }

onMounted(() => {
    fetchAll(true)
    nextTick(() => { initCharts(); window.addEventListener('resize', handleResize) })
    timer = window.setInterval(() => fetchAll(false), updateInterval)
})

onUnmounted(() => {
    if (timer) clearInterval(timer)
    window.removeEventListener('resize', handleResize)
    gaugeChart?.dispose(); trendChart?.dispose()
})
</script>

<style scoped>
.system-health-container {
    padding: 24px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    min-height: 100vh;
}

.health-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 16px 20px;
    background: white;
    border-radius: 14px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.header-left { display: flex; align-items: center; gap: 12px; }
.header-left h1 { font-size: 22px; font-weight: 700; margin: 0; color: #1e293b; }
.subtitle { font-size: 12px; color: #94a3b8; margin: 2px 0 0; }
.header-right { display: flex; align-items: center; gap: 12px; }
.uptime-badge { display: flex; align-items: center; gap: 6px; padding: 5px 10px; background: #ecfdf5; color: #059669; border-radius: 6px; font-size: 12px; font-weight: 500; }
.last-update { color: #94a3b8; font-size: 12px; }

.section-card { border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }

/* Resource Mini Cards */
.resource-mini { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.res-label { font-size: 11px; color: #64748b; font-weight: 500; }
.res-detail { font-size: 10px; color: #94a3b8; }
.gauge-mini { display: flex; align-items: center; justify-content: center; }

/* Metric Cards */
.metric-card-sm { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 16px !important; gap: 6px; }
.metric-card-sm.clickable { cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
.metric-card-sm.clickable:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.metric-icon-sm { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; }
.bg-blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.bg-red { background: linear-gradient(135deg, #ef4444, #dc2626); }
.bg-green { background: linear-gradient(135deg, #22c55e, #16a34a); }
.metric-label { font-size: 11px; color: #64748b; }
.metric-value-lg { font-size: 24px; font-weight: 700; color: #1e293b; line-height: 1; }
.metric-value-lg small { font-size: 12px; font-weight: 400; color: #94a3b8; }
.error-value { color: #ef4444; }
.sub-metric { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #94a3b8; }

/* Service Group */
.service-group-compact { margin-bottom: 12px; }
.group-header-compact { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f1f5f9; border-radius: 8px; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: #475569; }
.service-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: white; border-radius: 6px; margin-bottom: 4px; border: 1px solid #f1f5f9; }
.service-left { display: flex; align-items: center; gap: 8px; }
.service-right { display: flex; align-items: center; gap: 10px; }
.service-name { font-size: 13px; color: #334155; }
.latency { font-size: 12px; font-family: monospace; }
.latency-good { color: #18a058; }
.latency-warn { color: #f0a020; }
.latency-bad { color: #d03050; font-weight: 600; }

.status-dot { width: 7px; height: 7px; border-radius: 50%; }
.dot-green { background: #18a058; box-shadow: 0 0 5px #18a058; }
.dot-yellow { background: #f0a020; box-shadow: 0 0 5px #f0a020; }
.dot-red { background: #d03050; box-shadow: 0 0 5px #d03050; animation: pulse 1.5s infinite; }
.dot-gray { background: #94a3b8; }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
