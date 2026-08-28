<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, reactive, computed, h } from 'vue'
import { 
    NCard, NDataTable, NTag, NButton, NModal, NForm, NFormItem, 
    NSelect, NInputNumber, NInput, useMessage, DataTableColumns,
    NGrid, NGridItem, NDatePicker 
} from 'naive-ui'
import { RefreshOutline, CreateOutline, SearchOutline } from '@vicons/ionicons5'
import { providerApi } from '@/api/provider'
import type { GameProvider, ProviderStatus, ProviderUpdateRequest, ProviderSearchParams, ProviderType } from '@/types/game'
import { useAuthStore } from '@/stores/useAuthStore'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const message = useMessage()
const authStore = useAuthStore()

const loading = ref(false)
const providers = ref<GameProvider[]>([])

// Search Form State
const searchForm = reactive<ProviderSearchParams>({
    code: '',
    type: undefined,
    status: undefined,
    date_start: undefined,
    date_end: undefined
})

const getDefaultDateRange = (): [number, number] => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 7)
    return [start.getTime(), end.getTime()]
}

const allProviders = ref<GameProvider[]>([])

const vendorOptions = computed(() => {
    return allProviders.value.map(p => ({
        label: `${p.name} (${p.code})`,
        value: p.code
    }))
})

const dateRange = ref<[number, number] | null>(getDefaultDateRange())

const typeOptions = [
    { label: t('game.provider.types.SLOT'), value: 'SLOT' as ProviderType },
    { label: t('game.provider.types.LIVE'), value: 'LIVE' as ProviderType },
    { label: t('game.provider.types.SPORTS'), value: 'SPORTS' as ProviderType },
    { label: t('game.provider.types.LOTTERY'), value: 'LOTTERY' as ProviderType },
    { label: t('game.provider.types.CARD'), value: 'CARD' as ProviderType }
]

const statusOptions = [
    { label: t('common.enable'), value: 'ACTIVE' as ProviderStatus },
    { label: t('common.disable'), value: 'DISABLED' as ProviderStatus },
    { label: t('game.provider.maintenance'), value: 'MAINTENANCE' as ProviderStatus }
]

const formatAmount = (val: number) => {
    return '$ ' + val.toLocaleString()
}

// Edit Modal State
const showEditModal = ref(false)
const selectedProvider = ref<GameProvider | null>(null)
const editForm = ref<ProviderUpdateRequest>({
    status: undefined,
    sort_order: undefined,
    reason: ''
})

const columns: DataTableColumns<GameProvider> = [
    { title: t('game.provider.id'), key: 'id', width: 100 },
    { title: t('game.provider.vendorCode'), key: 'code', width: 100 },
    { title: t('game.provider.name'), key: 'name', width: 150 },
    {
        title: t('game.provider.platformType'),
        key: 'type',
        width: 100,
        render: (row) => {
            return t(`game.provider.types.${row.type}`) || row.type
        }
    },
    {
        title: t('game.provider.status'),
        key: 'status',
        width: 100,
        render: (row) => {
            const typeMap: Record<string, 'success' | 'warning' | 'error'> = {
                'ACTIVE': 'success',
                'MAINTENANCE': 'warning',
                'DISABLED': 'error'
            }
            const labelMap: Record<string, string> = {
                'ACTIVE': t('common.enable'),
                'MAINTENANCE': t('game.provider.maintenance'),
                'DISABLED': t('common.disable')
            }
            return h(NTag, { type: typeMap[row.status], bordered: false }, { default: () => labelMap[row.status] })
        }
    },
    {
        title: t('game.provider.sortOrder'),
        key: 'sort_order',
        width: 80,
        render: (row) => h('span', { class: 'font-mono' }, row.sort_order)
    },
    { 
        title: t('game.provider.currentPlayers'), 
        key: 'current_players', 
        width: 120,
        render: (row) => h('span', row.current_players.toLocaleString())
    },
    { 
        title: t('game.provider.totalBet'), 
        key: 'total_bet', 
        width: 150,
        render: (row) => h('span', { class: 'text-orange-600 font-semibold' }, formatAmount(row.total_bet))
    },
    { 
        title: t('game.provider.totalPayout'), 
        key: 'total_payout', 
        width: 150,
        render: (row) => h('span', { class: 'text-green-600 font-semibold' }, formatAmount(row.total_payout))
    },
    {
        title: t('common.action'),
        key: 'actions',
        width: 80,
        fixed: 'right',
        render: (row) => {
            return h(NButton, { size: 'small', secondary: true, onClick: () => handleEdit(row) }, { icon: () => h(CreateOutline) })
        }
    }
]

const fetchData = async () => {
    loading.value = true
    try {
        if (dateRange.value) {
            searchForm.date_start = new Date(dateRange.value[0]).toISOString()
            searchForm.date_end = new Date(dateRange.value[1]).toISOString()
        } else {
            searchForm.date_start = undefined
            searchForm.date_end = undefined
        }
        
        const res = await providerApi.getProviders(searchForm)
        if (res.code === 0) {
            providers.value = res.data
        } else {
            message.error(res.msg)
        }
    } catch (err) {
        message.error(t('common.error'))
    } finally {
        loading.value = false
    }
}

const handleReset = () => {
    searchForm.code = ''
    searchForm.type = undefined
    searchForm.status = undefined
    dateRange.value = getDefaultDateRange()
    fetchData()
}

const handleEdit = (provider: GameProvider) => {
    selectedProvider.value = provider
    editForm.value = {
        status: provider.status,
        sort_order: provider.sort_order,
        reason: ''
    }
    showEditModal.value = true
}

const handleSubmit = async () => {
    if (!selectedProvider.value) return
    
    if (!editForm.value.reason) {
        message.warning(t('game.provider.reasonPlaceholder'))
        return
    }

    try {
        const res = await providerApi.updateProvider(
            selectedProvider.value.id,
            editForm.value,
            authStore.user?.user_id || 'admin'
        )
        if (res.code === 0) {
            message.success(t('common.success'))
            showEditModal.value = false
            fetchData()
        } else {
            message.error(res.msg)
        }
    } catch (err) {
        message.error(t('common.error'))
    }
}

const isSticky = ref(false)
const handleScroll = (e: Event) => {
    const target = e.target as HTMLElement
    isSticky.value = target.scrollTop > 20
}

onMounted(async () => {
    // Fetch all providers once for the filter dropdown
    const res = await providerApi.getProviders()
    if (res.code === 0) {
        allProviders.value = res.data
    }
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

<template>
    <div class="flex flex-col gap-4 min-h-full">
        <!-- 浮動搜尋區塊 -->
        <div class="sticky top-0 z-30 transition-all duration-300" :class="{ 'pt-2': isSticky }">
            <NCard
                :title="t('game.provider.title')"
                size="small"
                class="rounded-xl shadow-sm border-0 transition-all duration-300"
                :class="{ 'premium-glass shadow-xl mx-2': isSticky }"
            >
                <NForm inline :model="searchForm" label-placement="left" label-width="auto" @keypress.enter="fetchData">
                    <NGrid :cols="24" :x-gap="12">
                        <NGridItem :span="6">
                            <NFormItem :label="t('game.provider.vendorCode')">
                                <NSelect v-model:value="searchForm.code" :options="vendorOptions" :placeholder="t('common.all')" clearable />
                            </NFormItem>
                        </NGridItem>
                        <NGridItem :span="6">
                            <NFormItem :label="t('game.provider.platformType')">
                                <NSelect v-model:value="searchForm.type" :options="typeOptions" :placeholder="t('common.all')" clearable />
                            </NFormItem>
                        </NGridItem>
                        <NGridItem :span="6">
                            <NFormItem :label="t('common.status')">
                                <NSelect v-model:value="searchForm.status" :options="statusOptions" :placeholder="t('common.all')" clearable />
                            </NFormItem>
                        </NGridItem>
                        <NGridItem :span="6">
                            <NFormItem :label="t('game.provider.date')">
                                <NDatePicker v-model:value="dateRange" type="datetimerange" clearable />
                            </NFormItem>
                        </NGridItem>
                        <NGridItem :span="24">
                            <div class="flex justify-end gap-2">
                                <NButton secondary @click="handleReset">
                                    {{ t('common.reset') || t('common.all') }}
                                </NButton>
                                <NButton type="primary" @click="fetchData" :loading="loading">
                                    <template #icon><SearchOutline /></template>
                                    {{ t('common.search') }}
                                </NButton>
                            </div>
                        </NGridItem>
                    </NGrid>
                </NForm>
            </NCard>
        </div>

        <!-- 資料列表區塊 -->
        <div class="px-0 relative z-10">
            <NCard class="rounded-xl shadow-sm border-0">
                <template #header-extra>
                    <NButton secondary circle @click="fetchData" :loading="loading">
                        <template #icon><RefreshOutline /></template>
                    </NButton>
                </template>

                <NDataTable
                    :columns="columns"
                    :data="providers"
                    :loading="loading"
                    :pagination="false"
                    :bordered="false"
                    :scroll-x="1200"
                />
            </NCard>
        </div>

        <!-- Edit Modal -->
        <NModal v-model:show="showEditModal" preset="card" :title="t('game.provider.editStatus')" style="width: 500px">
            <div v-if="selectedProvider" class="mb-4 p-3 bg-gray-50 rounded">
                <div class="font-semibold">{{ selectedProvider.name }}</div>
                <div class="text-xs text-gray-500">{{ selectedProvider.code }} | {{ selectedProvider.id }}</div>
            </div>

            <NForm :model="editForm" label-placement="left" label-width="80">
                <NFormItem :label="t('common.status')" required>
                    <NSelect v-model:value="editForm.status" :options="statusOptions" />
                </NFormItem>
                <NFormItem :label="t('game.provider.sortOrder')" required>
                    <NInputNumber v-model:value="editForm.sort_order" :min="1" :max="100" style="width: 100%" />
                </NFormItem>
                <NFormItem :label="t('game.provider.reason')" required>
                    <NInput type="textarea" v-model:value="editForm.reason" :placeholder="t('game.provider.reasonPlaceholder')" :rows="3" />
                </NFormItem>
            </NForm>

            <template #footer>
                <div class="flex justify-end gap-2">
                    <NButton @click="showEditModal = false">{{ t('common.cancel') }}</NButton>
                    <NButton type="primary" @click="handleSubmit">{{ t('common.save') }}</NButton>
                </div>
            </template>
        </NModal>
    </div>
</template>

<style scoped>
.premium-glass {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(226, 232, 240, 0.6) !important;
}
</style>
