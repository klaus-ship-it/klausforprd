<template>
    <div class="risk-alert-container">
        <n-space vertical size="large">
            <!-- Filter Bar -->
            <n-card>
                <n-form inline label-placement="left" :show-feedback="false">
                    <n-form-item label="狀態">
                        <n-select 
                            v-model:value="searchParams.status" 
                            :options="statusOptions" 
                            clearable 
                            placeholder="全部" 
                            style="width: 140px"
                            @update:value="fetchData"
                        />
                    </n-form-item>
                    <n-form-item label="類型">
                        <n-select 
                            v-model:value="searchParams.type" 
                            :options="typeOptions" 
                            clearable 
                            placeholder="全部" 
                            style="width: 160px"
                            @update:value="fetchData"
                        />
                    </n-form-item>
                    <n-form-item label="風險等級">
                        <n-select 
                            v-model:value="searchParams.level" 
                            :options="levelOptions" 
                            clearable 
                            placeholder="全部" 
                            style="width: 120px"
                            @update:value="fetchData"
                        />
                    </n-form-item>
                    <n-form-item>
                        <n-button type="primary" @click="fetchData" :loading="loading">
                            <template #icon><n-icon><search-icon /></n-icon></template>
                            查詢
                        </n-button>
                    </n-form-item>
                </n-form>
            </n-card>

            <!-- Alert List -->
            <n-card>
                <n-data-table
                    :columns="columns"
                    :data="tableData"
                    :loading="loading"
                    :pagination="pagination"
                    @update:page="handlePageChange"
                />
            </n-card>
        </n-space>

        <!-- Detail Modal -->
        <n-modal v-model:show="showModal" preset="card" title="預警處置詳情" style="width: 600px">
            <div v-if="currentAlert">
                <n-descriptions bordered :column="1" label-placement="left" label-width="120px">
                    <n-descriptions-item label="預警編號">
                        {{ currentAlert.id }}
                    </n-descriptions-item>
                     <n-descriptions-item label="玩家">
                        <n-button text type="primary" @click="goToPlayer(currentAlert.playerId)">
                            {{ currentAlert.playerName }} (ID: {{ currentAlert.playerId }})
                        </n-button>
                    </n-descriptions-item>
                    <n-descriptions-item label="觸發時間">
                        {{ new Date(currentAlert.triggerTime).toLocaleString() }}
                    </n-descriptions-item>
                    <n-descriptions-item label="預警類型">
                        <n-tag :type="getTypeTag()">{{ currentAlert.type }}</n-tag>
                    </n-descriptions-item>
                    <n-descriptions-item label="風險等級">
                        <n-tag :type="getLevelTag(currentAlert.level)">{{ currentAlert.level }}</n-tag>
                    </n-descriptions-item>
                    <n-descriptions-item label="異常內容">
                        {{ currentAlert.description }}
                    </n-descriptions-item>
                    <n-descriptions-item label="目前狀態">
                        <n-tag :type="getStatusTag(currentAlert.status)">{{ currentAlert.status }}</n-tag>
                    </n-descriptions-item>
                </n-descriptions>
            </div>

            <template #footer>
                <div v-if="currentAlert">
                    <n-space justify="end" v-if="currentAlert.status === 'PENDING' || currentAlert.status === 'PROCESSING'">
                        <n-button type="warning" @click="handleAction('DISMISSED')">
                            誤報解除
                        </n-button>
                        <n-button type="error" @click="handleAction('RESOLVED')">
                            確認處置 (限制帳號)
                        </n-button>
                    </n-space>
                    <n-text v-else class="done-text">
                        已於 {{ new Date().toLocaleDateString() }} 由 {{ currentAlert.operator }} 結案
                    </n-text>
                </div>
            </template>
        </n-modal>
    </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage, NTag, NButton, NSpace, NCard, NForm, NFormItem, NSelect, NDataTable, NIcon, NModal, NDescriptions, NDescriptionsItem, NText } from 'naive-ui'
import { Search as SearchIcon } from '@vicons/ionicons5'
import { riskApi, RiskAlert } from '@/api/risk'
import { useAuthStore } from '@/stores/useAuthStore'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const authStore = useAuthStore()

// State
const loading = ref(false)
const tableData = ref<RiskAlert[]>([])
const showModal = ref(false)
const currentAlert = ref<RiskAlert | null>(null)

const searchParams = reactive({
    status: (route.query.status as string) || undefined,
    type: undefined,
    level: undefined,
    page: 1,
    pageSize: 10
})

const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50]
})

// Options
const statusOptions = [
    { label: '待處理', value: 'PENDING' },
    { label: '處理中', value: 'PROCESSING' },
    { label: '已處置', value: 'RESOLVED' },
    { label: '誤報解除', value: 'DISMISSED' }
]

const typeOptions = [
    { label: 'IP 關聯', value: 'IP_CONFLICT' },
    { label: '設備關聯', value: 'DEVICE_CONFLICT' },
    { label: '電子爆獎', value: 'BIG_WIN' },
    { label: '頻繁轉帳', value: 'HIGH_FREQ_TRANSFER' }
]

const levelOptions = [
    { label: 'Low', value: 'LOW' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'High', value: 'HIGH' }
]

// Helpers
const getLevelTag = (level: string): 'error' | 'warning' | 'info' => {
    switch (level) {
        case 'HIGH': return 'error'
        case 'MEDIUM': return 'warning'
        default: return 'info'
    }
}

const getStatusTag = (status: string): 'error' | 'warning' | 'success' | 'default' => {
    switch (status) {
        case 'PENDING': return 'error'
        case 'PROCESSING': return 'warning'
        case 'RESOLVED': return 'success'
        case 'DISMISSED': return 'default'
        default: return 'default'
    }
}

const getTypeTag = (): 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error' => {
    return 'default'
}

// Columns
const columns = [
    { title: '編號', key: 'id', width: 140 },
    { 
        title: '玩家', 
        key: 'playerName',
        render(row: RiskAlert) {
            return h(NButton, {
                text: true,
                type: 'primary',
                onClick: () => goToPlayer(row.playerId)
            }, { default: () => row.playerName })
        }
    },
    { 
        title: '類型', 
        key: 'type',
        render(row: RiskAlert) {
            return h(NTag, { bordered: false }, { default: () => row.type })
        }
    },
    { 
        title: '等級', 
        key: 'level',
        render(row: RiskAlert) {
            return h(NTag, { type: getLevelTag(row.level) }, { default: () => row.level })
        }
    },
    { 
        title: '時間', 
        key: 'triggerTime',
        render(row: RiskAlert) {
            return new Date(row.triggerTime).toLocaleString()
        }
    },
    { 
        title: '狀態', 
        key: 'status',
        render(row: RiskAlert) {
            return h(NTag, { type: getStatusTag(row.status) }, { default: () => row.status })
        }
    },
    {
        title: '操作',
        key: 'actions',
        render(row: RiskAlert) {
            return h(NButton, {
                size: 'small',
                onClick: () => openDetail(row)
            }, { default: () => '查看' })
        }
    }
]

// Methods
const fetchData = async () => {
    loading.value = true
    try {
        const res = await riskApi.getAlerts({
            ...searchParams,
            page: pagination.page,
            pageSize: pagination.pageSize
        })
        if (res.code === 0 && res.data) {
            tableData.value = res.data.list
            pagination.itemCount = res.data.total
        }
    } catch(e) {
        message.error('載入失敗')
    } finally {
        loading.value = false
    }
}

const handlePageChange = (page: number) => {
    pagination.page = page
    fetchData()
}

const openDetail = (row: RiskAlert) => {
    currentAlert.value = row
    showModal.value = true
}

const handleAction = async (newStatus: 'RESOLVED' | 'DISMISSED') => {
    if (!currentAlert.value) return
    
    try {
        await riskApi.updateAlertStatus(currentAlert.value.id, newStatus, authStore.user?.name || 'admin')
        message.success('處置成功')
        showModal.value = false
        fetchData()
    } catch (e) {
        message.error('操作失敗')
    }
}

const goToPlayer = (id: string) => {
    router.push(`/admin/players/${id}`)
}

onMounted(() => {
    fetchData()
})
</script>

<style scoped>
.risk-alert-container {
    padding: 24px;
}
.done-text {
    color: #999;
    font-style: italic;
}
</style>
