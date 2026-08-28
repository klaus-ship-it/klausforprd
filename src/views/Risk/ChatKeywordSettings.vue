<template>
    <div class="chat-keyword-settings-container p-4">
        <n-space vertical size="large">
            <!-- Header & Actions -->
            <n-card>
                <n-space justify="space-between" align="center">
                    <n-text h2 style="margin: 0">
                        <n-icon><settings-icon /></n-icon>
                        {{ t('chatManagement.keywordSettings.title') }}
                    </n-text>
                    <n-button type="primary" @click="handleCreate" size="large">
                        <template #icon><n-icon><add-icon /></n-icon></template>
                        {{ t('chatManagement.keywordSettings.create') }}
                    </n-button>
                </n-space>
            </n-card>

            <!-- Search Filter -->
            <n-card>
                <n-form inline :label-width="80" label-placement="left" :model="query">
                    <n-grid :cols="24" :x-gap="24">
                        <n-form-item-gi :span="6" :label="t('chatManagement.keywordSettings.form.keyword')">
                            <n-input 
                                v-model:value="query.keyword" 
                                clearable 
                                :placeholder="t('chatManagement.keywordSettings.form.keyword')" 
                                @keydown.enter="handleSearch"
                            />
                        </n-form-item-gi>
                        <n-form-item-gi :span="6" :label="t('chatManagement.keywordSettings.form.status')">
                            <n-select 
                                v-model:value="query.status" 
                                :options="statusOptions" 
                                clearable 
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

            <!-- Data Table -->
            <n-card>
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
        </n-space>

        <!-- Create / Edit Modal -->
        <n-modal
            v-model:show="showModal"
            preset="card"
            :title="isEdit ? t('chatManagement.keywordSettings.edit') : t('chatManagement.keywordSettings.create')"
            style="width: 500px; max-width: 90vw;"
        >
            <n-form ref="formRef" :model="form" :rules="rules" label-placement="left" label-width="100" require-mark-placement="right-hanging">
                
                <n-form-item :label="t('chatManagement.keywordSettings.form.keyword')" path="keyword">
                    <n-input v-model:value="form.keyword" :maxlength="30" show-count placeholder="輸入關鍵字" />
                </n-form-item>
                
                <n-form-item :label="t('chatManagement.keywordSettings.form.action')" path="action">
                    <n-select v-model:value="form.action" :options="actionOptions" />
                </n-form-item>

                <n-form-item :label="t('chatManagement.keywordSettings.form.weight')" path="weight">
                    <n-input-number v-model:value="form.weight" :min="1" :max="100" />
                </n-form-item>
                
                <n-form-item :label="t('chatManagement.keywordSettings.form.status')" path="status">
                    <n-switch v-model:value="form.status" checked-value="ACTIVE" unchecked-value="INACTIVE" />
                    <n-text class="ml-2">{{ t(`chatManagement.keywordSettings.status.${form.status}`) }}</n-text>
                </n-form-item>

                <n-space justify="end" class="mt-6">
                    <n-button @click="showModal = false">{{ t('common.cancel') }}</n-button>
                    <n-button type="primary" :loading="submitLoading" @click="handleSubmit">{{ t('common.save') }}</n-button>
                </n-space>
            </n-form>
        </n-modal>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
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
    NSelect, 
    NInput, 
    NForm, 
    NDataTable, 
    NModal, 
    NFormItem, 
    NInputNumber, 
    NSwitch 
} from 'naive-ui'
import { SettingsOutline as SettingsIcon, AddOutline as AddIcon } from '@vicons/ionicons5'
import { chatManagementApi } from '@/api/chatManagement'
import type { KeywordRecord, KeywordQuery, KeywordAction, KeywordStatus } from '@/types/chatManagement'

const { t } = useI18n()
const message = useMessage()

// State
const loading = ref(false)
const tableData = ref<KeywordRecord[]>([])
const query = ref<KeywordQuery>({
    page: 1,
    pageSize: 15,
    keyword: '',
    status: null
})
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

const form = ref({
    id: undefined as string | undefined,
    keyword: '',
    action: 'BLOCK' as KeywordAction,
    weight: 1,
    status: 'ACTIVE' as KeywordStatus
})

// Options
const actionOptions = computed(() => [
    { label: t('chatManagement.keywordSettings.actions.BLOCK'), value: 'BLOCK' },
    { label: t('chatManagement.keywordSettings.actions.REPLACE'), value: 'REPLACE' },
    { label: t('chatManagement.keywordSettings.actions.MONITOR'), value: 'MONITOR' }
])

const statusOptions = computed(() => [
    { label: t('chatManagement.keywordSettings.status.ACTIVE'), value: 'ACTIVE' },
    { label: t('chatManagement.keywordSettings.status.INACTIVE'), value: 'INACTIVE' }
])

// Rules
const rules = {
    keyword: { required: true, message: '請輸入關鍵字', trigger: 'blur' },
    action: { required: true, message: '請選擇處置方式', trigger: 'change' },
    weight: { required: true, type: 'number', message: '請輸入權重', trigger: 'change' }
}

const getActionTagType = (action: KeywordAction) => {
    switch (action) {
        case 'BLOCK': return 'error'
        case 'REPLACE': return 'warning'
        case 'MONITOR': return 'info'
        default: return 'default'
    }
}

// Columns definition
const columns = computed(() => [
    { title: 'ID', key: 'id', width: 100 },
    { title: t('chatManagement.keywordSettings.columns.keyword'), key: 'keyword', width: 200 },
    { 
        title: t('chatManagement.keywordSettings.columns.action'), 
        key: 'action', 
        width: 150,
        render(row: KeywordRecord) {
            return h(NTag, { type: getActionTagType(row.action), size: 'small' }, { default: () => t(`chatManagement.keywordSettings.actions.${row.action}`) })
        }
    },
    { 
        title: t('chatManagement.keywordSettings.columns.weight'), 
        key: 'weight', 
        width: 120 
    },
    { 
        title: t('chatManagement.keywordSettings.columns.status'), 
        key: 'status', 
        width: 120,
        render(row: KeywordRecord) {
            const isAcive = row.status === 'ACTIVE'
            return h(NTag, { type: isAcive ? 'success' : 'default', size: 'small' }, { default: () => t(`chatManagement.keywordSettings.status.${row.status}`) })
        }
    },
    { 
        title: t('chatManagement.keywordSettings.columns.createTime'), 
        key: 'createTime', 
        width: 180,
        render(row: KeywordRecord) {
            return new Date(row.createTime).toLocaleString()
        }
    },
    {
        title: t('chatManagement.keywordSettings.columns.actions'),
        key: 'actions',
        width: 150,
        fixed: 'right',
        render(row: KeywordRecord) {
            return h(NSpace, null, {
                default: () => [
                    h(NButton, {
                        size: 'small',
                        type: 'primary',
                        secondary: true,
                        onClick: () => handleEdit(row)
                    }, { default: () => t('chatManagement.keywordSettings.edit') }),
                    h(NPopconfirm, {
                        onPositiveClick: () => handleDelete(row.id),
                        positiveText: t('common.confirm'),
                        negativeText: t('common.cancel')
                    }, {
                        trigger: () => h(NButton, {
                            size: 'small',
                            type: 'error',
                            secondary: true,
                            style: 'margin-left: 8px;'
                        }, { default: () => t('common.delete') }),
                        default: () => '確定要刪除此敏感字嗎？'
                    })
                ]
            })
        }
    }
]) as any

// Data fetching
const fetchData = async () => {
    loading.value = true
    try {
        const payload = { ...query.value }
        
        const res = await chatManagementApi.getKeywords(payload)
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
    query.value = { page: 1, pageSize: 15, keyword: '', status: null }
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
        keyword: '',
        action: 'BLOCK',
        weight: 1,
        status: 'ACTIVE'
    }
    showModal.value = true
}

const handleEdit = (row: KeywordRecord) => {
    isEdit.value = true
    form.value = {
        id: row.id,
        keyword: row.keyword,
        action: row.action,
        weight: row.weight,
        status: row.status
    }
    showModal.value = true
}

const handleSubmit = () => {
    formRef.value?.validate(async (errors) => {
        if (!errors) {
            submitLoading.value = true
            try {
                if (isEdit.value && form.value.id) {
                    await chatManagementApi.updateKeyword(form.value as any)
                    message.success(t('systemMessage.actions.updateSuccess') || '更新成功')
                } else {
                    await chatManagementApi.createKeyword(form.value as any)
                    message.success(t('systemMessage.actions.createSuccess') || '建立成功')
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

const handleDelete = async (id: string) => {
    try {
        const res = await chatManagementApi.deleteKeyword(id)
        if (res.code === 0) {
            message.success('刪除成功')
            fetchData()
        }
    } catch (e: any) {
        message.error(e.message || 'Error')
    }
}

onMounted(() => {
    fetchData()
})

</script>

<style scoped>
.chat-keyword-settings-container {
    height: 100%;
}
</style>
