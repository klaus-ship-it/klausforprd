<template>
    <div class="flex flex-col gap-4 min-h-full">
        <!-- 浮動搜尋區塊 -->
        <div class="sticky top-0 z-30 transition-all duration-300" :class="{ 'pt-2': isSticky }">
            <n-card
                size="small"
                class="rounded-xl shadow-sm border-0 transition-all duration-300"
                :class="{ 'premium-glass shadow-xl mx-2': isSticky }"
            >
                <div class="flex items-center justify-between mb-3">
                    <n-text tag="h2" style="margin: 0; font-size: 16px; font-weight: 700;">
                        <n-icon><shield-checkmark-icon /></n-icon>
                        {{ t('chatManagement.triggerAudit.title') }}
                    </n-text>
                </div>

                <n-form inline :label-width="80" label-placement="left" :model="query">
                    <n-grid :cols="24" :x-gap="24">
                        <n-form-item-gi :span="6" :label="t('chatManagement.triggerAudit.columns.playerId')">
                            <n-input
                                v-model:value="query.playerId"
                                clearable
                                :placeholder="t('chatManagement.triggerAudit.columns.playerId')"
                                @keydown.enter="handleSearch"
                            />
                        </n-form-item-gi>
                        <n-form-item-gi :span="6" :label="t('chatManagement.triggerAudit.columns.status')">
                            <n-select
                                v-model:value="query.status"
                                :options="statusOptions"
                                clearable
                                @update:value="handleSearch"
                            />
                        </n-form-item-gi>
                        <n-form-item-gi :span="6" label="時間">
                            <n-date-picker
                                v-model:formatted-value="query.timeRange"
                                type="daterange"
                                clearable
                                value-format="yyyy-MM-dd"
                                @update:value="handleSearch"
                            />
                        </n-form-item-gi>
                        <n-form-item-gi :span="6">
                            <n-button type="primary" @click="handleSearch">
                                {{ t('systemMessage.search') }}
                            </n-button>
                            <n-button @click="resetSearch" class="ml-2">重置</n-button>
                        </n-form-item-gi>
                    </n-grid>
                </n-form>
            </n-card>
        </div>

            <!-- Data Table -->
            <n-card class="rounded-xl shadow-sm border-0">
                <div v-if="checkedRowKeys.length > 0" class="mb-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100 flex items-center justify-between">
                    <n-space align="center">
                        <n-text type="info" class="font-bold">已選擇 {{ checkedRowKeys.length }} 筆待處理紀錄</n-text>
                        <n-popconfirm
                            @positive-click="handleBatchProcess('BAN')"
                            :positive-text="t('common.confirm')"
                            :negative-text="t('common.cancel')"
                        >
                            <template #trigger>
                                <n-button type="error" size="small">{{ t('chatManagement.triggerAudit.process.batchBan') }}</n-button>
                            </template>
                            {{ t('chatManagement.triggerAudit.process.confirmBatch') }}
                        </n-popconfirm>
                        <n-popconfirm
                            @positive-click="handleBatchProcess('IGNORE')"
                            :positive-text="t('common.confirm')"
                            :negative-text="t('common.cancel')"
                        >
                            <template #trigger>
                                <n-button type="success" size="small">{{ t('chatManagement.triggerAudit.process.batchIgnore') }}</n-button>
                            </template>
                            {{ t('chatManagement.triggerAudit.process.confirmBatch') }}
                        </n-popconfirm>
                    </n-space>
                    <n-button text type="primary" @click="checkedRowKeys = []">取消選擇</n-button>
                </div>
                <n-data-table
                    :columns="columns"
                    :data="tableData"
                    :loading="loading"
                    :pagination="pagination"
                    :row-key="row => row.id"
                    v-model:checked-row-keys="checkedRowKeys"
                    @update:page="handlePageChange"
                    remote
                    bordered
                    striped
                />
            </n-card>
        </div>

        <!-- Process Modal -->
        <n-modal
            v-model:show="showProcessModal"
            preset="card"
            :title="t('chatManagement.triggerAudit.process.title')"
            style="width: 500px; max-width: 90vw;"
        >
            <n-form v-if="processTarget" label-placement="left" label-width="100">
                <n-descriptions bordered :column="1" class="mb-4">
                    <n-descriptions-item :label="t('chatManagement.triggerAudit.columns.playerId')">
                         <n-text strong>{{ processTarget.playerId }}</n-text>
                    </n-descriptions-item>
                    <n-descriptions-item :label="t('chatManagement.triggerAudit.columns.content')">
                         <span v-html="highlightKeyword(processTarget.content, processTarget.matchedKeyword)"></span>
                    </n-descriptions-item>
                </n-descriptions>

                <n-form-item label="處置方式">
                    <n-radio-group v-model:value="processForm.action">
                        <n-space>
                            <n-radio value="BAN">{{ t('chatManagement.triggerAudit.process.ban') }}</n-radio>
                            <n-radio value="IGNORE">{{ t('chatManagement.triggerAudit.process.ignore') }}</n-radio>
                        </n-space>
                    </n-radio-group>
                </n-form-item>

                <!-- Linked Actions specifically when banning -->
                <div v-if="processForm.action === 'BAN'" class="mt-4 p-4" style="background-color: var(--n-color-modal); border: 1px solid var(--n-border-color); border-radius: 4px;">
                    <n-space vertical>
                        <n-text strong>聯動處置選項</n-text>
                        <n-checkbox v-model:checked="processForm.syncAllPending">
                            {{ t('chatManagement.triggerAudit.process.syncAllPending') }}
                        </n-checkbox>
                        <n-checkbox v-model:checked="processForm.deleteAllMessages">
                            {{ t('chatManagement.triggerAudit.process.deleteAllMessages') }}
                        </n-checkbox>
                    </n-space>
                </div>

                <n-space justify="end" class="mt-6">
                    <n-button @click="showProcessModal = false">{{ t('common.cancel') }}</n-button>
                    <n-button type="primary" :loading="submitLoading" @click="submitProcess">{{ t('common.confirm') }}</n-button>
                </n-space>
            </n-form>
        </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, h, VNode } from 'vue'
import { useI18n } from 'vue-i18n'
import { 
    useMessage, 
    NTag, 
    NButton, 
    NSpace, 
    NText, 
    NPopconfirm,
    NCard, 
    NIcon, 
    NGrid, 
    NFormItemGi, 
    NSelect, 
    NInput, 
    NForm, 
    NDataTable, 
    NModal, 
    NFormItem,
    NDatePicker,
    NCheckbox,
    NRadioGroup,
    NRadio,
    NDescriptions,
    NDescriptionsItem
} from 'naive-ui'
import { ShieldCheckmarkOutline as ShieldCheckmarkIcon } from '@vicons/ionicons5'
import { chatManagementApi } from '@/api/chatManagement'
import type { TriggerRecord, TriggerQuery } from '@/types/chatManagement'

const { t } = useI18n()
const message = useMessage()

// State
const loading = ref(false)
const tableData = ref<TriggerRecord[]>([])
const checkedRowKeys = ref<string[]>([])
const query = ref<TriggerQuery>({
    page: 1,
    pageSize: 15,
    playerId: '',
    status: null,
    timeRange: null
})
const pagination = ref({
    page: 1,
    pageSize: 15,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [15, 30, 50]
})

// Process Modal state
const showProcessModal = ref(false)
const submitLoading = ref(false)
const processTarget = ref<TriggerRecord | null>(null)
const processForm = ref({
    action: 'BAN' as 'BAN' | 'IGNORE',
    syncAllPending: true,
    deleteAllMessages: false
})

const statusOptions = computed(() => [
    { label: t('chatManagement.triggerAudit.status.PENDING'), value: 'PENDING' },
    { label: t('chatManagement.triggerAudit.status.BANNED'), value: 'BANNED' },
    { label: t('chatManagement.triggerAudit.status.IGNORED'), value: 'IGNORED' },
    { label: t('chatManagement.triggerAudit.status.AUTO_RESOLVED'), value: 'AUTO_RESOLVED' }
])

const highlightKeyword = (content: string, keyword: string) => {
    if (!keyword) return content
    // XSS protection basic escape before replacing html
    const escapeHtml = (unsafe: string) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const escapedContent = escapeHtml(content)
    const escapedKeyword = escapeHtml(keyword)
    
    const parts = escapedContent.split(escapedKeyword)
    return parts.join(`<span style="color: red; font-weight: bold;">${escapedKeyword}</span>`)
}

// Columns definition
const columns = computed(() => [
    { type: 'selection', disabled: (row: TriggerRecord) => row.status !== 'PENDING' },
    { title: t('chatManagement.triggerAudit.columns.playerId'), key: 'playerId', width: 120, render(row: TriggerRecord) {
        return h(NButton, { text: true, type: 'primary' }, { default: () => row.playerId })
    }},
    { 
        title: t('chatManagement.triggerAudit.columns.content'), 
        key: 'content', 
        width: 300,
        render(row: TriggerRecord) {
            return h('span', { innerHTML: highlightKeyword(row.content, row.matchedKeyword) })
        }
    },
    { 
        title: t('chatManagement.triggerAudit.columns.matchedKeyword'), 
        key: 'matchedKeyword', 
        width: 120,
        render(row: TriggerRecord) {
            return h(NTag, { type: 'error', size: 'small', bordered: false }, { default: () => row.matchedKeyword })
        }
    },
    { title: t('chatManagement.triggerAudit.columns.frequency'), key: 'frequency', width: 150 },
    { 
        title: t('chatManagement.triggerAudit.columns.actionTaken'), 
        key: 'actionTaken', 
        width: 120,
        render(row: TriggerRecord) {
            const typesMap: Record<string, string> = {
                BLOCK: 'error',
                REPLACE: 'warning',
                MONITOR: 'info'
            }
            return h(NTag, { type: typesMap[row.actionTaken] || 'default', size: 'small' }, { default: () => t(`chatManagement.keywordSettings.actions.${row.actionTaken}`) })
        }
    },
    { 
        title: t('chatManagement.triggerAudit.columns.status'), 
        key: 'status', 
        width: 120,
        render(row: TriggerRecord) {
            const statusMap: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
                PENDING: 'warning',
                BANNED: 'error',
                IGNORED: 'default',
                AUTO_RESOLVED: 'success'
            }
            return h(NTag, { type: statusMap[row.status] || 'default', size: 'small' }, { default: () => t(`chatManagement.triggerAudit.status.${row.status}`) })
        }
    },
    { 
        title: t('chatManagement.triggerAudit.columns.triggerTime'), 
        key: 'triggerTime', 
        width: 170,
        render(row: TriggerRecord) {
            return new Date(row.triggerTime).toLocaleString()
        }
    },
    {
        title: t('chatManagement.triggerAudit.columns.actions'),
        key: 'actions',
        width: 120,
        fixed: 'right',
        render(row: TriggerRecord) {
            if (row.status !== 'PENDING') return h(NText, { depth: 3 }, { default: () => '-' })
            
            return h(NButton, {
                size: 'small',
                type: 'primary',
                onClick: () => handleProcess(row)
            }, { default: () => '審核' })
        }
    }
]) as any

// Data fetching
const fetchData = async () => {
    loading.value = true
    try {
        const payload = { ...query.value }
        const res = await chatManagementApi.getTriggers(payload)
        if (res.code === 0) {
            tableData.value = res.data.items
            pagination.value.itemCount = res.data.total
        }
    } catch (e: any) {
        message.error(e.message || t('common.loadFailed'))
    } finally {
        loading.value = false
    }
}

const handleSearch = () => {
    query.value.page = 1
    pagination.value.page = 1
    checkedRowKeys.value = []
    fetchData()
}

const resetSearch = () => {
    query.value = { page: 1, pageSize: 15, playerId: '', status: null, timeRange: null }
    handleSearch()
}

const handlePageChange = (p: number) => {
    query.value.page = p
    pagination.value.page = p
    checkedRowKeys.value = []
    fetchData()
}

const handleProcess = (row: TriggerRecord) => {
    processTarget.value = row
    processForm.value = {
        action: 'BAN',
        syncAllPending: true,
        deleteAllMessages: false
    }
    showProcessModal.value = true
}

const submitProcess = async () => {
    if (!processTarget.value) return
    submitLoading.value = true
    try {
        const payload = {
            id: processTarget.value.id,
            playerId: processTarget.value.playerId,
            action: processForm.value.action,
            syncAllPending: processForm.value.syncAllPending,
            deleteAllMessages: processForm.value.deleteAllMessages
        }
        const res = await chatManagementApi.processTrigger(payload)
        message.success(res.msg)
        showProcessModal.value = false
        checkedRowKeys.value = []
        fetchData()
    } catch (e: any) {
        message.error(e.message || 'Error occurred')
    } finally {
        submitLoading.value = false
    }
}

const handleBatchProcess = async (action: 'BAN' | 'IGNORE') => {
    if (checkedRowKeys.value.length === 0) {
        message.warning(t('chatManagement.triggerAudit.process.selectNeeded'))
        return
    }
    loading.value = true
    try {
        const res = await chatManagementApi.batchProcessTriggers({
            ids: checkedRowKeys.value,
            action
        })
        message.success(res.msg)
        checkedRowKeys.value = []
        fetchData()
    } catch (e: any) {
        message.error(e.message || 'Error executing batch action')
    } finally {
        loading.value = false
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
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(226, 232, 240, 0.6) !important;
}
</style>
