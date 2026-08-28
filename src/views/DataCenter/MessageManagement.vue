<template>
    <div class="flex flex-col gap-4 min-h-full">
        <!-- Header & Actions -->
        <div class="sticky top-0 z-30 transition-all duration-300" :class="{ 'pt-2': isSticky }">
            <n-card
                size="small"
                class="rounded-xl shadow-sm border-0 transition-all duration-300"
                :class="{ 'premium-glass shadow-xl mx-2': isSticky }"
            >
                <div class="flex items-center justify-between gap-4 flex-wrap">
                    <n-text tag="h2" style="margin: 0; font-size: 16px; font-weight: 700;">
                        <n-icon><mail-icon /></n-icon>
                        {{ t('systemMessage.title') }}
                    </n-text>
                    <n-button type="primary" @click="handleCreate" size="medium">
                        <template #icon><n-icon><create-icon /></n-icon></template>
                        {{ t('systemMessage.createMessage') }}
                    </n-button>
                </div>
                <!-- Search Filter -->
                <n-form inline :label-width="80" label-placement="left" :model="query" class="mt-3">
                    <n-grid :cols="24" :x-gap="24">
                        <n-form-item-gi :span="6" :label="t('systemMessage.filters.sendTime')">
                            <n-date-picker
                                v-model:formatted-value="dateRange"
                                type="daterange"
                                clearable
                                value-format="yyyy-MM-dd"
                                @update:value="handleSearch"
                            />
                        </n-form-item-gi>
                        <n-form-item-gi :span="5" :label="t('systemMessage.filters.type')">
                            <n-select
                                v-model:value="query.type"
                                :options="typeOptions"
                                clearable
                                @update:value="handleSearch"
                            />
                        </n-form-item-gi>
                        <n-form-item-gi :span="7" :label="t('systemMessage.filters.titleKeyword')">
                            <n-input
                                v-model:value="query.keyword"
                                clearable
                                placeholder="請輸入標題關鍵字"
                                @keydown.enter="handleSearch"
                            />
                        </n-form-item-gi>
                        <n-form-item-gi :span="4">
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
        <div class="relative z-10">
            <n-card class="rounded-xl shadow-sm border-0">
                <n-data-table
                    :columns="columns"
                    :data="tableData"
                    :loading="loading"
                    :pagination="pagination"
                    @update:page="handlePageChange"
                    remote
                    bordered
                    striped
                />
            </n-card>
        </div>

        <!-- Create / Edit Modal -->
        <n-modal
            v-model:show="showModal"
            preset="card"
            :title="isEdit ? t('systemMessage.actions.edit') : t('systemMessage.createMessage')"
            style="width: 800px; max-width: 90vw;"
        >
            <n-form ref="formRef" :model="form" :rules="rules" label-placement="left" label-width="120" require-mark-placement="right-hanging">
                
                <n-form-item :label="t('systemMessage.form.targetScope')" path="targetType">
                    <n-space vertical class="w-full">
                        <n-select v-model:value="form.targetType" :options="targetOptions" />
                        
                        <n-input 
                            v-if="form.targetType === 'SPECIFIC_IDS'" 
                            v-model:value="targetIdsStr" 
                            type="textarea" 
                            :placeholder="t('systemMessage.form.targetIdsPlaceholder')" 
                            rows="2"
                        />
                        <n-select
                            v-if="form.targetType === 'TAGS'"
                            v-model:value="form.targetTags"
                            multiple
                            :options="tagOptions"
                            :placeholder="t('systemMessage.form.targetTagsPlaceholder')"
                        />
                    </n-space>
                </n-form-item>

                <n-form-item :label="t('systemMessage.form.title')" path="title">
                    <n-input v-model:value="form.title" :maxlength="50" show-count :placeholder="t('systemMessage.form.titlePlaceholder')" />
                </n-form-item>
                
                <n-form-item label="類型" path="type">
                    <n-select v-model:value="form.type" :options="typeOptions" />
                </n-form-item>

                <n-form-item :label="t('systemMessage.form.content')" path="content">
                    <n-space vertical class="w-full">
                        <n-space align="center">
                            <n-text depth="3">{{ t('systemMessage.form.variableTool') }}:</n-text>
                            <n-button size="small" dashed @click="insertVariable('{player_id}')">{player_id}</n-button>
                            <n-button size="small" dashed @click="insertVariable('{nickname}')">{nickname}</n-button>
                        </n-space>
                        <n-input 
                            id="contentEditor"
                            v-model:value="form.content" 
                            type="textarea" 
                            :maxlength="500" 
                            show-count 
                            :placeholder="t('systemMessage.form.contentPlaceholder')"
                            rows="6"
                        />
                    </n-space>
                </n-form-item>

                <n-form-item :label="t('systemMessage.form.attachment')">
                    <n-space align="center" class="w-full">
                        <n-select style="width: 200px" placeholder="選擇模板 (選填)" :options="[]" disabled />
                        <n-text>或指定</n-text>
                        <n-input-number v-model:value="form.attachmentBonusAmount" :min="0" :placeholder="t('systemMessage.form.attachmentAmount')">
                            <template #prefix>$</template>
                        </n-input-number>
                    </n-space>
                </n-form-item>

                <n-form-item :label="t('systemMessage.form.sendMethod')" path="sendMethod">
                    <n-radio-group v-model:value="form.sendMethod">
                        <n-space>
                            <n-radio value="IMMEDIATE">{{ t('systemMessage.sendMethods.IMMEDIATE') }}</n-radio>
                            <n-radio value="SCHEDULED">{{ t('systemMessage.sendMethods.SCHEDULED') }}</n-radio>
                        </n-space>
                    </n-radio-group>
                </n-form-item>

                <n-form-item :label="t('systemMessage.form.scheduledTime')" path="scheduledTime" v-if="form.sendMethod === 'SCHEDULED'">
                    <n-date-picker v-model:formatted-value="form.scheduledTime" type="datetime" clearable value-format="yyyy-MM-dd HH:mm:ss" />
                </n-form-item>

                <n-space justify="end" class="mt-6">
                    <n-button @click="showModal = false">{{ t('common.cancel') }}</n-button>
                    <n-button type="primary" :loading="submitLoading" @click="handleSubmit">{{ t('common.save') }}</n-button>
                </n-space>
            </n-form>
        </n-modal>

        <!-- Preview Modal -->
        <n-modal
            v-model:show="showPreview"
            preset="card"
            :title="t('systemMessage.actions.preview')"
            style="width: 600px; max-width: 90vw;"
        >
            <n-space vertical v-if="previewData">
                <n-descriptions bordered label-placement="left" :column="1">
                    <n-descriptions-item :label="t('systemMessage.columns.title')">
                        <n-text strong>{{ previewData.title }}</n-text>
                    </n-descriptions-item>
                    <n-descriptions-item :label="t('systemMessage.columns.type')">
                         <n-tag :type="getTypeTagType(previewData.type)" size="small">
                            {{ t(`systemMessage.types.${previewData.type}`) }}
                        </n-tag>
                    </n-descriptions-item>
                    <n-descriptions-item :label="t('systemMessage.columns.target')">
                        {{ getTargetLabel(previewData) }}
                    </n-descriptions-item>
                    <n-descriptions-item :label="t('systemMessage.form.targetIds')" v-if="previewData.targetType === 'SPECIFIC_IDS'">
                        <n-space size="small" :wrap="true">
                            <n-tag v-for="id in previewData.targetIds" :key="id" size="small" :bordered="false">
                                {{ id }}
                            </n-tag>
                        </n-space>
                    </n-descriptions-item>
                    <n-descriptions-item :label="t('systemMessage.form.targetTags')" v-if="previewData.targetType === 'TAGS'">
                        <n-space size="small" :wrap="true">
                            <n-tag v-for="tag in previewData.targetTags" :key="tag" size="small" :bordered="false" type="info">
                                {{ tag }}
                            </n-tag>
                        </n-space>
                    </n-descriptions-item>
                    <n-descriptions-item :label="t('systemMessage.columns.attachment')" v-if="previewData.attachmentBonusAmount > 0">
                        <n-tag type="success" size="small">$ {{ previewData.attachmentBonusAmount }}</n-tag>
                    </n-descriptions-item>
                    <n-descriptions-item :label="t('systemMessage.columns.sendTime')">
                        {{ new Date(previewData.actualSendTime || previewData.scheduledTime || previewData.createTime).toLocaleString() }}
                    </n-descriptions-item>
                </n-descriptions>
                
                <n-divider title-placement="left">{{ t('systemMessage.form.content') }}</n-divider>
                
                <n-card embedded :bordered="false" class="preview-content">
                    <div v-html="previewData.content"></div>
                </n-card>

                <n-space justify="end" class="mt-4">
                    <n-button @click="showPreview = false">{{ t('common.close') || '關閉' }}</n-button>
                </n-space>
            </n-space>
        </n-modal>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { 
    useMessage, 
    NTag, 
    NButton, 
    NSpace, 
    NText, 
    NPopconfirm, 
    FormInst, 
    NCard, 
    NIcon, 
    NGrid, 
    NFormItemGi, 
    NDatePicker, 
    NSelect, 
    NInput, 
    NForm, 
    NDataTable, 
    NModal, 
    NFormItem, 
    NInputNumber, 
    NRadioGroup, 
    NRadio,
    NDescriptions,
    NDescriptionsItem,
    NDivider
} from 'naive-ui'
import { MailOutline as MailIcon, CreateOutline as CreateIcon } from '@vicons/ionicons5'
import { systemMessageApi } from '@/api/systemMessage'
import type { MessageRecord, MessageQuery, MessageType, MessageTarget, SendMethod } from '@/types/systemMessage'

const { t } = useI18n()
const message = useMessage()

// State
const loading = ref(false)
const tableData = ref<MessageRecord[]>([])
const query = ref<MessageQuery>({
    page: 1,
    pageSize: 15,
    type: null,
    keyword: ''
})
const dateRange = ref<[string, string] | null>(null)
const pagination = ref({
    page: 1,
    pageSize: 15,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [15, 30, 50]
})

// Modal State
const showModal = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInst | null>(null)
const targetIdsStr = ref('')

// Preview State
const showPreview = ref(false)
const previewData = ref<MessageRecord | null>(null)

const form = ref({
    id: undefined as string | undefined,
    title: '',
    type: 'SYSTEM' as MessageType,
    targetType: 'ALL' as MessageTarget,
    targetIds: [] as string[],
    targetTags: [] as string[],
    content: '',
    attachmentBonusAmount: 0,
    sendMethod: 'IMMEDIATE' as SendMethod,
    scheduledTime: null as string | null
})

// Options
const typeOptions = computed(() => [
    { label: t('systemMessage.types.SYSTEM'), value: 'SYSTEM' },
    { label: t('systemMessage.types.PROMOTION'), value: 'PROMOTION' },
    { label: t('systemMessage.types.COMPENSATION'), value: 'COMPENSATION' },
    { label: t('systemMessage.types.PERSONAL'), value: 'PERSONAL' }
])

const targetOptions = computed(() => [
    { label: t('systemMessage.targetTypes.ALL'), value: 'ALL' },
    { label: t('systemMessage.targetTypes.TAGS'), value: 'TAGS' },
    { label: t('systemMessage.targetTypes.SPECIFIC_IDS'), value: 'SPECIFIC_IDS' }
])

const tagOptions = [
    { label: 'VIP', value: 'VIP' },
    { label: '一般玩家', value: '一般玩家' },
    { label: '高風險', value: '高風險' }
]

// Rules
const rules = {
    title: { required: true, message: '請輸入標題', trigger: 'blur' },
    type: { required: true, message: '請選擇類型', trigger: 'change' },
    content: { required: true, message: '請填寫內容', trigger: 'blur' },
    targetType: {
        validator: (rule: any, value: string) => {
            if (value === 'SPECIFIC_IDS' && !targetIdsStr.value.trim()) {
                return new Error('請填寫指定 ID')
            }
            if (value === 'TAGS' && form.value.targetTags.length === 0) {
                return new Error('請選擇至少一個標籤')
            }
            return true
        },
        trigger: ['change', 'blur']
    },
    scheduledTime: {
        validator: (rule: any, value: any) => {
            if (form.value.sendMethod === 'SCHEDULED' && !value) {
                return new Error('請選擇預約時間')
            }
            return true
        },
        trigger: 'change'
    }
}

// Columns definition
const columns = computed(() => [
    { title: t('systemMessage.columns.id'), key: 'id', width: 120 },
    { 
        title: t('systemMessage.columns.title'), 
        key: 'title', 
        ellipsis: { tooltip: true }, 
        width: 250,
        render(row: MessageRecord) {
            return h(
                NButton,
                {
                    text: true,
                    type: 'primary',
                    onClick: () => handlePreview(row)
                },
                { default: () => row.title }
            )
        }
    },
    { 
        title: t('systemMessage.columns.type'), 
        key: 'type', 
        width: 100,
        render(row: MessageRecord) {
            const typesMap: Record<string, 'info' | 'success' | 'warning' | 'primary'> = {
                SYSTEM: 'primary',
                PROMOTION: 'success',
                COMPENSATION: 'warning',
                PERSONAL: 'info'
            }
            return h(NTag, { type: typesMap[row.type] || 'default', size: 'small' }, { default: () => t(`systemMessage.types.${row.type}`) })
        }
    },
    { 
        title: t('systemMessage.columns.target'), 
        key: 'target', 
        width: 150,
        render(row: MessageRecord) {
            let label = t(`systemMessage.targetTypes.${row.targetType}`)
            if (row.targetType === 'SPECIFIC_IDS') label += ` (${row.targetIds?.length || 0}人)`
            if (row.targetType === 'TAGS') label += ` (${row.targetTags?.join(', ')})`
            return label
        }
    },
    { 
        title: t('systemMessage.columns.attachment'), 
        key: 'attachmentBonusAmount', 
        width: 120,
        render(row: MessageRecord) {
            if (!row.attachmentBonusAmount || row.attachmentBonusAmount === 0) return h(NText, { depth: 3 }, { default: () => t('common.none') })
            return h(NTag, { type: 'success', size: 'small', bordered: false }, { default: () => `$${row.attachmentBonusAmount}` })
        }
    },
    { 
        title: t('systemMessage.columns.status'), 
        key: 'status', 
        width: 100,
        render(row: MessageRecord) {
            const statusMap: Record<string, 'default' | 'primary' | 'success' | 'error'> = {
                SCHEDULED: 'primary',
                SENT: 'success',
                RECALLED: 'error'
            }
            return h(NTag, { type: statusMap[row.status], size: 'small' }, { default: () => t(`systemMessage.status.${row.status}`) })
        }
    },
    { 
        title: t('systemMessage.columns.readRate'), 
        key: 'readRate', 
        width: 120,
        render(row: MessageRecord) {
            const perc = (row.readRate * 100).toFixed(1)
            return `${row.readCount}/${row.totalRecipients} (${perc}%)`
        }
    },
    { 
        title: t('systemMessage.columns.claimRate'), 
        key: 'claimRate', 
        width: 120,
        render(row: MessageRecord) {
            if (!row.attachmentBonusAmount || row.attachmentBonusAmount === 0) return '-'
            const perc = (row.claimRate * 100).toFixed(1)
            return `${row.claimedCount}/${row.totalRecipients} (${perc}%)`
        }
    },
    { 
        title: t('systemMessage.columns.sendTime'), 
        key: 'sendTime', 
        width: 160,
        render(row: MessageRecord) {
            const time = row.actualSendTime || row.scheduledTime || row.createTime
            const date = new Date(time)
            return date.toLocaleString()
        }
    },
    {
        title: t('systemMessage.columns.actions'),
        key: 'actions',
        width: 150,
        fixed: 'right',
        render(row: MessageRecord) {
            const actions = []
            
            // Edit is only available for SCHEDULED messages
            if (row.status === 'SCHEDULED') {
                actions.push(
                    h(NButton, {
                        size: 'small',
                        type: 'primary',
                        secondary: true,
                        onClick: () => handleEdit(row)
                    }, { default: () => t('systemMessage.actions.edit') })
                )
            }

            // Recall is available if not already recalled
            if (row.status !== 'RECALLED') {
                actions.push(
                    h(NPopconfirm, {
                        onPositiveClick: () => executeRecall(row.id),
                        positiveText: t('common.confirm'),
                        negativeText: t('common.cancel')
                    }, {
                        trigger: () => h(NButton, {
                            size: 'small',
                            type: 'error',
                            secondary: true,
                            style: 'margin-left: 8px;'
                        }, { default: () => t('systemMessage.actions.recall') }),
                        default: () => t('systemMessage.actions.recallConfirm')
                    })
                )
            }

            return h(NSpace, null, { default: () => actions })
        }
    }
]) as any

// Data fetching
const fetchData = async () => {
    loading.value = true
    try {
        const payload = { ...query.value }
        if (dateRange.value) {
            payload.dateRange = dateRange.value
        }
        
        const res = await systemMessageApi.getMessages(payload)
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
    fetchData()
}

const resetSearch = () => {
    query.value = { page: 1, pageSize: 15, type: null, keyword: '' }
    dateRange.value = null
    handleSearch()
}

const handlePageChange = (p: number) => {
    query.value.page = p
    pagination.value.page = p
    fetchData()
}

// Modal handling
const handleCreate = () => {
    isEdit.value = false
    form.value = {
        id: undefined,
        title: '',
        type: 'SYSTEM',
        targetType: 'ALL',
        targetIds: [],
        targetTags: [],
        content: '',
        attachmentBonusAmount: 0,
        sendMethod: 'IMMEDIATE',
        scheduledTime: null
    }
    targetIdsStr.value = ''
    showModal.value = true
}

const handleEdit = (row: MessageRecord) => {
    isEdit.value = true
    form.value = {
        id: row.id,
        title: row.title,
        type: row.type,
        targetType: row.targetType,
        targetIds: row.targetIds ? [...row.targetIds] : [],
        targetTags: row.targetTags ? [...row.targetTags] : [],
        content: row.content,
        attachmentBonusAmount: row.attachmentBonusAmount || 0,
        sendMethod: row.sendMethod,
        scheduledTime: row.scheduledTime || null
    }
    targetIdsStr.value = row.targetIds?.join(',') || ''
    showModal.value = true
}

const insertVariable = (variable: string) => {
    // A simple append for now. You could use selection start/end for true insertion.
    form.value.content += variable
    message.success(`${t('systemMessage.actions.copyVariables')} ${variable}`)
}

const handleSubmit = () => {
    formRef.value?.validate(async (errors) => {
        if (!errors) {
            submitLoading.value = true
            try {
                // Parse IDs
                if (form.value.targetType === 'SPECIFIC_IDS') {
                    form.value.targetIds = targetIdsStr.value.split(',').map(s => s.trim()).filter(Boolean)
                }

                const payload = {
                    title: form.value.title,
                    type: form.value.type,
                    targetType: form.value.targetType,
                    targetIds: form.value.targetType === 'SPECIFIC_IDS' ? form.value.targetIds : undefined,
                    targetTags: form.value.targetType === 'TAGS' ? form.value.targetTags : undefined,
                    content: form.value.content,
                    attachmentBonusAmount: form.value.attachmentBonusAmount,
                    sendMethod: form.value.sendMethod,
                    scheduledTime: form.value.sendMethod === 'SCHEDULED' ? form.value.scheduledTime : undefined
                } as any

                if (isEdit.value && form.value.id) {
                    payload.id = form.value.id
                    await systemMessageApi.updateMessage(payload)
                    message.success(t('systemMessage.actions.updateSuccess'))
                } else {
                    await systemMessageApi.createMessage(payload)
                    message.success(t('systemMessage.actions.createSuccess'))
                }
                showModal.value = false
                fetchData()
            } catch (e: any) {
                message.error(e.message || 'Error occurred')
            } finally {
                submitLoading.value = false
            }
        }
    })
}

const executeRecall = async (id: string) => {
    try {
        const res = await systemMessageApi.recallMessage(id)
        if (res.code === 0) {
            message.success(t('systemMessage.actions.recallSuccess'))
            fetchData()
        }
    } catch (e: any) {
        message.error(e.message || 'Error')
    }
}

const handlePreview = (row: MessageRecord) => {
    previewData.value = row
    showPreview.value = true
}

const getTypeTagType = (type: string) => {
    const typesMap: Record<string, 'info' | 'success' | 'warning' | 'primary'> = {
        SYSTEM: 'primary',
        PROMOTION: 'success',
        COMPENSATION: 'warning',
        PERSONAL: 'info'
    }
    return typesMap[type] || 'default'
}

const getTargetLabel = (row: MessageRecord) => {
    let label = t(`systemMessage.targetTypes.${row.targetType}`)
    if (row.targetType === 'SPECIFIC_IDS') label += ` (${row.targetIds?.length || 0}人)`
    if (row.targetType === 'TAGS') label += ` (${row.targetTags?.join(', ')})`
    return label
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
.preview-content {
    min-height: 200px;
    max-height: 400px;
    overflow-y: auto;
    padding: 12px;
}
.premium-glass {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(226, 232, 240, 0.6) !important;
}
</style>
