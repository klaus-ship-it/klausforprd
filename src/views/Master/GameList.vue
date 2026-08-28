<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, h, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NCard, NForm, NFormItem, NInput, NSelect, NButton, NDataTable, NTag, NModal, NCheckboxGroup, NCheckbox, NInputNumber, NGrid, NGridItem, NDatePicker, NSpace, NRadioGroup, NRadio, useMessage, DataTableColumns, NCollapseTransition, NImage, NUpload, NTabs, NTabPane, NDynamicTags, NDivider, NSpin } from 'naive-ui'
import { SearchOutline, RefreshOutline, CreateOutline, AddOutline, ChevronDownOutline, ChevronUpOutline, DocumentTextOutline } from '@vicons/ionicons5'
import { gameListApi, gameCopywritingApi } from '@/api/game'
import { providerApi } from '@/api/provider'
import { configApi } from '@/api/config'
import type { Game, GameListSearchParams, GameUpdateRequest, MarketingTag, GameStatus, GameType, ThirdPartyGame, GameCopywriting, GameCopywritingLocale } from '@/types/game'
import type { GameProvider } from '@/types/game'

const { t } = useI18n()
const message = useMessage()
const loading = ref(false)
const games = ref<Game[]>([])
const providers = ref<GameProvider[]>([])
const gameTypes = ref<GameType[]>([])

const searchForm = reactive<GameListSearchParams>({
    provider_id: undefined,
    type_id: undefined,
    marketing_tag: undefined,
    tag_source: undefined,
    game_id: '',
    name: '',
    status: undefined,
    date_start: undefined,
    date_end: undefined,
    page: 1,
    page_size: 20
})

// 遊戲 ID/名稱 切換
const gameSearchType = ref<'id' | 'name'>('id')
const gameSearchQuery = ref('')

// 數據粒度
const granularity = ref<'hour' | 'day' | 'month'>('day')
const granularityOptions = [
  { label: '時', value: 'hour' },
  { label: '日', value: 'day' },
  { label: '月', value: 'month' }
]

const dateRange = ref<[number, number] | null>(null)
const pendingChanges = ref<Record<string, GameStatus>>({})
const hasPendingChanges = computed(() => Object.keys(pendingChanges.value).length > 0)
const showSaveConfirmModal = ref(false)

const pagination = reactive({
    page: 1,
    pageSize: 20,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
    onChange: (page: number) => {
        pagination.page = page
        searchForm.page = page
        fetchData()
    },
    onUpdatePageSize: (pageSize: number) => {
        pagination.pageSize = pageSize
        pagination.page = 1
        searchForm.page_size = pageSize
        searchForm.page = 1
        fetchData()
    }
})

// Edit Modal
const showEditModal = ref(false)
const selectedGame = ref<Game | null>(null)
const editForm = ref<GameUpdateRequest>({
    marketing_tag: undefined,
    allowed_currencies: [],
    min_vip_level: 0,
    min_seat_vip_level: 0,
    image_url: null,
    sort_order: 999,
    final_rate: 100,
    profit_rate: 5.0
})

const vipOptions = Array.from({ length: 16 }, (_, i) => ({
    label: `VIP ${i}`,
    value: i
}))

const tagOptions = computed(() => [
    { label: t('game.list.tagOptions.none'), value: null as any },
    { label: t('game.list.tagOptions.hot'), value: 'HOT' as MarketingTag },
    { label: t('game.list.tagOptions.recommended'), value: 'RECOMMENDED' as MarketingTag },
    { label: t('game.list.tagOptions.double'), value: 'DOUBLE_TURNOVER' as MarketingTag }
])

// currencyOptions was unused, removed.

const providerOptions = computed(() => providers.value.map(p => ({ label: `${p.name} (${p.code})`, value: p.id })))
const statusFilterOptions = [
    { label: t('common.all'), value: undefined },
    { label: t('common.enable'), value: 'ACTIVE' as GameStatus },
    { label: t('common.disable'), value: 'DISABLED' as GameStatus },
    { label: t('game.list.maintenance'), value: 'MAINTENANCE' as GameStatus }
]

const statusSelectOptions = [
    { label: '正常', value: 'ACTIVE' },
    { label: '維護', value: 'MAINTENANCE' },
    { label: '停用', value: 'DISABLED' }
]

const newStatusOptions = [
    { label: '正常', value: 'ACTIVE' as GameStatus },
    { label: '維護', value: 'MAINTENANCE' as GameStatus },
    { label: '停用', value: 'DISABLED' as GameStatus }
]

const typeOptions = computed(() => [
    { label: t('common.all'), value: undefined },
    ...gameTypes.value.map(t => ({ label: t.name, value: t.id }))
])

const showAddGameModal = ref(false)
const showAdvancedSearch = ref(false)
const syncLoading = ref(false)
const lastUpdateTime = ref<string | null>(null)
const unpublishedGames = ref<ThirdPartyGame[]>([])
const newlyPublished = ref<ThirdPartyGame[]>([])
const newStatus = ref<GameStatus>('ACTIVE')

const addSearchForm = reactive({
    gameId: '',
    name: '',
    providerId: undefined as string | undefined,
    typeId: undefined as string | undefined
})

const filteredUnpublished = computed(() => {
    return unpublishedGames.value.filter(g => {
        if (addSearchForm.providerId && g.provider_id !== addSearchForm.providerId) return false
        if (addSearchForm.typeId && g.type_id !== addSearchForm.typeId) return false
        if (addSearchForm.gameId && !g.provider_game_id.includes(addSearchForm.gameId)) return false
        if (addSearchForm.name && !g.name.includes(addSearchForm.name) && !g.name_en.toLowerCase().includes(addSearchForm.name.toLowerCase())) return false
        return true
    })
})

const handleUpdateProviderGames = async () => {
    syncLoading.value = true
    try {
        const res = await gameListApi.fetchLatestProviderGames()
        if (res.code === 0) {
            const thirdPartyGames = res.data
            unpublishedGames.value = []
            
            const dbProviderIds = new Set(games.value.map(g => g.provider_game_id))
            
            for (const tpg of thirdPartyGames) {
                if (!dbProviderIds.has(tpg.provider_game_id) && !newlyPublished.value.find(n => n.provider_game_id === tpg.provider_game_id)) {
                    unpublishedGames.value.push(tpg)
                }
            }

            const externalIds = new Set(thirdPartyGames.map(t => t.provider_game_id))
            games.value.forEach(g => {
                if (!externalIds.has(g.provider_game_id) && g.status !== 'SOURCE_MISSING') {
                    // Update frontend state immediately to reflect missing status
                    g.status = 'SOURCE_MISSING'
                }
            })
            
            lastUpdateTime.value = new Date().toLocaleString()
            message.success('更新清單並比對完成')
        }
    } catch {
        message.error('獲取清單失敗')
    } finally {
        syncLoading.value = false
    }
}

const moveToPublished = (game: ThirdPartyGame) => {
    unpublishedGames.value = unpublishedGames.value.filter(g => g.provider_game_id !== game.provider_game_id)
    newlyPublished.value.push(game)
}

const moveToUnpublished = (game: ThirdPartyGame) => {
    newlyPublished.value = newlyPublished.value.filter(g => g.provider_game_id !== game.provider_game_id)
    unpublishedGames.value.push(game)
}

const handleConfirmAdd = async () => {
    if (newlyPublished.value.length === 0) return
    syncLoading.value = true
    try {
        const payload = newlyPublished.value.map(g => ({
            provider_id: g.provider_id,
            provider_game_id: g.provider_game_id,
            type_id: g.type_id,
            name: g.name,
            name_en: g.name_en,
            status: newStatus.value === 'UNPUBLISHED' ? 'ACTIVE' : newStatus.value
        }))
        
        const res = await gameListApi.batchAddGames(payload as any)
        if (res.code === 0) {
            message.success('新增成功')
            showAddGameModal.value = false
            newlyPublished.value = []
            addSearchForm.gameId = ''
            addSearchForm.name = ''
            newStatus.value = 'UNPUBLISHED'
            fetchData()
        }
    } catch {
        message.error('新增失敗')
    } finally {
        syncLoading.value = false
    }
}

const columns: DataTableColumns<Game> = [
    { title: 'ID', key: 'id', width: 80, fixed: 'left' },
    { 
        title: t('game.list.vendor'), 
        key: 'provider_id', 
        width: 100,
        render: (row) => {
            const provider = providers.value.find(p => p.id === row.provider_id)
            return provider ? provider.code : row.provider_id
        }
    },
    {
        title: t('game.list.image'),
        key: 'image_url',
        width: 100,
        render: (row) => {
            if (!row.image_url) return h('div', { class: 'w-12 h-12 bg-gray-100 flex items-center justify-center rounded text-gray-400 text-xs' }, '無圖片')
            return h(NImage, {
                width: 48,
                height: 48,
                src: row.image_url,
                class: 'rounded shadow-sm',
                objectFit: 'cover'
            })
        }
    },
    { title: t('game.list.gameName'), key: 'name', width: 150, ellipsis: { tooltip: true } },
    {
        title: t('game.list.winRate'),
        key: 'win_rate',
        width: 100,
        render: (row) => {
            if (row.total_bet === 0) return '0.00%'
            const rtp = (row.total_payout / row.total_bet) * 100
            const color = rtp <= 100 ? 'text-green-600' : 'text-red-600'
            return h('span', { class: `font-mono font-bold ${color}` }, `${rtp.toFixed(2)}%`)
        }
    },
    { 
        title: t('game.list.cumulativeTurnover'), 
        key: 'cumulative_turnover', 
        width: 120,
        render: (row) => h('span', { class: 'font-mono text-blue-600 font-semibold' }, row.cumulative_turnover.toLocaleString())
    },
    {
        title: t('game.list.tag'),
        key: 'marketing_tag',
        width: 140,
        render: (row) => {
            if (!row.marketing_tag) return '-'
            const tagMap: Record<string, { label: string; type: 'success' | 'warning' | 'error' }> = {
                'HOT': { label: t('game.list.tagOptions.hot').split(' ')[0], type: 'error' },
                'RECOMMENDED': { label: t('game.list.tagOptions.recommended').split(' ')[0], type: 'warning' },
                'DOUBLE_TURNOVER': { label: t('game.list.tagOptions.double').split(' ')[0], type: 'success' }
            }
            const tag = tagMap[row.marketing_tag]
            return h(NTag, { type: tag.type, size: 'small' }, { default: () => tag.label })
        }
    },

    {
        title: t('game.list.effectiveTurnoverRate'),
        key: 'final_rate',
        width: 120,
        render: (row) => h('span', { class: row.final_rate > 100 ? 'text-green-600 font-bold' : 'font-mono' }, `${row.final_rate}%`)
    },
    {
        title: t('common.status'),
        key: 'status',
        width: 120,
        render: (row) => {
            const currentStatus = pendingChanges.value[row.id] || row.status
            const isSourceMissing = currentStatus === 'SOURCE_MISSING'
            
            // If the current status is not one of the manual three, we should show it in the dropdown options
            // but the user says "only these three are manual", so we map the options.
            // If the current status is UNPUBLISHED or SOURCE_MISSING, we add it to the options so it can be displayed.
            const displayOptions = [...statusSelectOptions]
            if (currentStatus === 'UNPUBLISHED') {
                displayOptions.push({ label: '未上架', value: 'UNPUBLISHED' })
            } else if (currentStatus === 'SOURCE_MISSING') {
                displayOptions.push({ label: '來源遺失', value: 'SOURCE_MISSING' })
            }

            return h(NSelect, {
                value: currentStatus,
                options: displayOptions,
                size: 'small',
                disabled: isSourceMissing,
                onUpdateValue: (val: GameStatus) => {
                    handleStatusChange(row, val)
                }
            })
        }
    },
    {
        title: t('game.list.currency'),
        key: 'allowed_currencies',
        width: 120,
        render: (row) => {
            const labelMap: Record<string, string> = {
                'GOLD': t('common.gold'),
                'SILVER': t('common.silver'),
                'BRONZE': t('common.bronze')
            }
            return row.allowed_currencies.map(c => labelMap[c] || c).join(', ')
        }
    },
    { title: t('game.list.vip'), key: 'min_vip_level', width: 70, render: (row) => `VIP ${row.min_vip_level}` },
    { title: t('game.list.selectSeat'), key: 'min_seat_vip_level', width: 70, render: (row) => `VIP ${row.min_seat_vip_level}` },
    { title: t('game.provider.sortOrder'), key: 'sort_order', width: 70 },
    {
        title: t('game.list.typeTag'),
        key: 'type_id',
        width: 120,
        render: (row) => {
            const type = gameTypes.value.find(t => t.id === row.type_id)
            return h(NTag, { size: 'small', type: 'info', bordered: false }, { default: () => type ? type.name : row.type_id })
        }
    },
    {
        title: t('common.action'),
        key: 'actions',
        width: 140,
        fixed: 'right',
        render: (row) => h(NSpace, { size: 'small' }, {
            default: () => [
                h(NButton, { size: 'small', secondary: true, onClick: () => handleEdit(row) }, { icon: () => h(CreateOutline) }),
                h(NButton, { size: 'small', tertiary: true, type: 'info', onClick: () => handleOpenCopywriting(row) }, { icon: () => h(DocumentTextOutline), default: () => '文案' })
            ]
        })
    }
]

const fetchData = async () => {
    loading.value = true
    pendingChanges.value = {} // Clear pending changes on fresh fetch
    
    if (dateRange.value) {
        searchForm.date_start = new Date(dateRange.value[0]).toISOString()
        searchForm.date_end = new Date(dateRange.value[1]).toISOString()
    } else {
        searchForm.date_start = undefined
        searchForm.date_end = undefined
    }

    try {
        const res = await gameListApi.getGames(searchForm)
        if (res.code === 0) {
            games.value = res.data.list
            pagination.itemCount = res.data.total
        } else {
            message.error(res.msg)
        }
    } catch (err) {
        message.error(t('common.error'))
    } finally {
        loading.value = false
    }
}

const isSticky = ref(false)
const handleScroll = (e: Event) => {
    const target = e.target as HTMLElement
    isSticky.value = target.scrollTop > 20
}

onMounted(async () => {
    // Default to past week
    const now = new Date()
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    dateRange.value = [lastWeek.getTime(), now.getTime()]

    const [pRes, tRes] = await Promise.all([
        providerApi.getProviders(),
        configApi.getGameTypes()
    ])
    if (pRes.code === 0) providers.value = pRes.data
    if (tRes.code === 0) gameTypes.value = tRes.data
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

// 快速選擇時間
const handleQuickSelect = (type: string) => {
  const now = new Date()
  let start = new Date()
  let end = new Date()
  switch (type) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      end = now
      break
    case 'yesterday':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999)
      break
    case 'thisWeek':
      const day = now.getDay() || 7
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1, 0, 0, 0, 0)
      end = now
      break
    case 'lastWeek':
      const day2 = now.getDay() || 7
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day2 - 6, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day2, 23, 59, 59, 999)
      break
    case 'thisMonth':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      end = now
      break
    case 'lastMonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      break
  }
  dateRange.value = [start.getTime(), end.getTime()]
}

const handleStatusChange = (row: Game, newStatus: GameStatus) => {
    if (row.status === newStatus) {
        delete pendingChanges.value[row.id]
    } else {
        pendingChanges.value[row.id] = newStatus
    }
}

const handleBatchSave = async () => {
    loading.value = true
    try {
        const promises = Object.entries(pendingChanges.value).map(([id, status]) => 
            gameListApi.updateGame(id, { status })
        )
        const results = await Promise.all(promises)
        const successCount = results.filter(r => r.code === 0).length
        
        if (successCount === results.length) {
            message.success(t('common.success'))
        } else {
            message.warning(`部分存取失敗 (${successCount}/${results.length})`)
        }
        
        showSaveConfirmModal.value = false
        fetchData()
    } catch (err) {
        message.error(t('common.error'))
    } finally {
        loading.value = false
    }
}

const handleSearch = () => {
    // 將合併欄位的值填回 searchForm
    if (gameSearchType.value === 'id') {
        searchForm.game_id = gameSearchQuery.value
        searchForm.name = ''
    } else {
        searchForm.name = gameSearchQuery.value
        searchForm.game_id = ''
    }
    searchForm.page = 1
    pagination.page = 1
    fetchData()
}

const handleEdit = (game: Game) => {
    selectedGame.value = game
    editForm.value = {
        marketing_tag: game.marketing_tag,
        allowed_currencies: game.allowed_currencies,
        min_vip_level: game.min_vip_level,
        min_seat_vip_level: game.min_seat_vip_level,
        image_url: game.image_url,
        sort_order: game.sort_order,
        final_rate: game.final_rate,
        profit_rate: game.profit_rate
    }
    showEditModal.value = true
}


const handleSubmit = async () => {
    if (!selectedGame.value) return
    
    try {
        const res = await gameListApi.updateGame(selectedGame.value.id, editForm.value)
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

// --- Game Copywriting ---
const showCopywritingModal = ref(false)
const copywritingLoading = ref(false)
const copywritingSaving = ref(false)
const copywritingGameId = ref('')
const copywritingGameName = ref('')
const activeLang = ref('zh-TW')

const availableLangs = [
    { label: '繁體中文', value: 'zh-TW' },
    { label: '簡體中文', value: 'zh-CN' },
    { label: 'English', value: 'en' },
    { label: '日本語', value: 'ja' },
    { label: '한국어', value: 'ko' },
    { label: 'Tiếng Việt', value: 'vi' },
    { label: 'ไทย', value: 'th' }
]

const emptyLocale = (): GameCopywritingLocale => ({
    game_name: '',
    game_introduce: '',
    game_volatility: '',
    high_hit: '',
    game_details: ''
})

const copywritingForm = reactive<GameCopywriting>({
    game_id: '',
    lang_type: [],
    game_banners: [],
    locales: {}
})

const bannerPreviewUrls = ref<Record<string, string>>({})
const processedFileIds = new Set<string>()

const handleBannerUpload = (data: { file: UploadFileInfo; fileList: UploadFileInfo[] }) => {
    const file = data.file
    if (!file) return
    
    // Check if we already processed this unique file upload lifecycle item
    if (processedFileIds.has(file.id)) return
    processedFileIds.add(file.id)

    const raw = file.file
    if (raw) {
        const localUrl = URL.createObjectURL(raw)
        const cdnUrl = `https://cdn.gameplatform.com/banners/game_${copywritingGameId.value}_${Date.now()}_${file.name}`
        copywritingForm.game_banners.push(cdnUrl)
        bannerPreviewUrls.value[cdnUrl] = localUrl
        message.success('圖片上傳成功，已生成 CDN 連結')
    }
}

const handleRemoveBanner = (index: number) => {
    const url = copywritingForm.game_banners[index]
    if (bannerPreviewUrls.value[url]) {
        URL.revokeObjectURL(bannerPreviewUrls.value[url])
        delete bannerPreviewUrls.value[url]
    }
    copywritingForm.game_banners.splice(index, 1)
}

const handleOpenCopywriting = async (game: Game) => {
    copywritingGameId.value = game.id
    copywritingGameName.value = `${game.name} (${game.name_en})`
    activeLang.value = 'zh-TW'
    copywritingLoading.value = true
    showCopywritingModal.value = true
    processedFileIds.clear()

    try {
        const res = await gameCopywritingApi.get(game.id)
        if (res.code === 0 && res.data) {
            Object.assign(copywritingForm, res.data)
            // Ensure all lang_types have a locale initialized
            copywritingForm.lang_type.forEach(lang => {
                if (!copywritingForm.locales[lang]) {
                    copywritingForm.locales[lang] = emptyLocale()
                }
            })
        } else {
            // Initialize empty
            copywritingForm.game_id = game.id
            copywritingForm.lang_type = ['zh-TW']
            copywritingForm.game_banners = []
            copywritingForm.locales = { 'zh-TW': emptyLocale() }
        }
    } catch {
        message.error('載入文案失敗')
    } finally {
        copywritingLoading.value = false
    }
}

const handleAddLang = (lang: string) => {
    if (!copywritingForm.locales[lang]) {
        copywritingForm.locales[lang] = emptyLocale()
    }
    if (!copywritingForm.lang_type.includes(lang)) {
        copywritingForm.lang_type.push(lang)
    }
    activeLang.value = lang
}

const handleRemoveLang = (lang: string) => {
    delete copywritingForm.locales[lang]
    copywritingForm.lang_type = copywritingForm.lang_type.filter(l => l !== lang)
    if (activeLang.value === lang) {
        activeLang.value = copywritingForm.lang_type[0] || 'zh-TW'
    }
}

const handleSaveCopywriting = async () => {
    copywritingSaving.value = true
    try {
        const res = await gameCopywritingApi.save(copywritingGameId.value, copywritingForm)
        if (res.code === 0) {
            message.success('文案儲存成功')
            showCopywritingModal.value = false
        } else {
            message.error(res.msg || '儲存失敗')
        }
    } catch {
        message.error('儲存失敗')
    } finally {
        copywritingSaving.value = false
    }
}

// Available langs that haven't been added yet
const unusedLangs = computed(() => availableLangs.filter(l => !copywritingForm.lang_type.includes(l.value)))

</script>

<template>
    <div class="flex flex-col gap-4 min-h-full">
        <!-- 浮動搜尋區塊 -->
        <div class="sticky top-0 z-30 transition-all duration-300" :class="{ 'pt-2': isSticky }">
            <NCard
                :title="t('game.list.title')"
                size="small"
                class="rounded-xl shadow-sm border-0 transition-all duration-300"
                :class="{ 'premium-glass shadow-xl mx-2': isSticky }"
            >
                <NForm :model="searchForm" label-placement="left" label-width="auto" @keypress.enter="handleSearch">
                  <div class="flex flex-col gap-4">
                    <!-- 第一排: 基礎搜尋條件 -->
                    <div class="flex flex-wrap items-end gap-x-6 gap-y-4">
                        <NFormItem label-placement="top" :show-feedback="false">
                            <template #label>
                                <div class="flex items-center gap-2">
                                    <span class="text-slate-500 font-bold">{{ t('game.list.gameName') }}</span>
                                    <NRadioGroup v-model:value="gameSearchType" name="gameSearchType" size="small">
                                        <NRadio value="id">ID</NRadio>
                                        <NRadio value="name">名稱</NRadio>
                                    </NRadioGroup>
                                </div>
                            </template>
                            <NInput v-model:value="gameSearchQuery" :placeholder="gameSearchType === 'id' ? '請輸入遊戲 ID' : '請輸入遊戲名稱'" clearable style="width: 200px" />
                        </NFormItem>
                        <NFormItem :label="t('game.list.vendor')" :show-feedback="false">
                            <NSelect v-model:value="searchForm.provider_id" :options="providerOptions" :placeholder="t('common.all')" clearable style="width: 160px" />
                        </NFormItem>
                        <NFormItem :label="t('common.status')" :show-feedback="false">
                            <NSelect v-model:value="searchForm.status" :options="statusFilterOptions" :placeholder="t('common.all')" clearable style="width: 120px" />
                        </NFormItem>
                        <NFormItem label="快速切換" :show-feedback="false">
                            <NSpace wrap>
                                <NButton size="small" @click="handleQuickSelect('today')">{{ t('operationReport.quickButtons.today') }}</NButton>
                                <NButton size="small" @click="handleQuickSelect('yesterday')">{{ t('operationReport.quickButtons.yesterday') }}</NButton>
                                <NButton size="small" @click="handleQuickSelect('thisWeek')">{{ t('operationReport.quickButtons.thisWeek') }}</NButton>
                                <NButton size="small" @click="handleQuickSelect('lastWeek')">{{ t('operationReport.quickButtons.lastWeek') }}</NButton>
                                <NButton size="small" @click="handleQuickSelect('thisMonth')">{{ t('operationReport.quickButtons.thisMonth') }}</NButton>
                                <NButton size="small" @click="handleQuickSelect('lastMonth')">{{ t('operationReport.quickButtons.lastMonth') }}</NButton>
                            </NSpace>
                        </NFormItem>

                        <div class="flex gap-2 mb-[2px]">
                            <NButton type="primary" @click="handleSearch" :loading="loading">
                                <template #icon><SearchOutline /></template>
                                {{ t('common.search') }}
                            </NButton>
                            <NButton secondary @click="() => { dateRange = null; fetchData() }" :loading="loading">
                                <template #icon><RefreshOutline /></template>
                                {{ t('common.all') }}
                            </NButton>
                            <NButton text icon-placement="right" @click="showAdvancedSearch = !showAdvancedSearch" class="ml-2">
                                <template #icon>
                                    <ChevronDownOutline v-if="!showAdvancedSearch" />
                                    <ChevronUpOutline v-else />
                                </template>
                                {{ showAdvancedSearch ? '收起搜尋' : '進階搜尋' }}
                            </NButton>
                        </div>
                    </div>

                    <!-- 進階搜尋條件 (可折疊) -->
                    <NCollapseTransition :show="showAdvancedSearch">
                        <div class="pt-4 border-t border-dashed flex flex-wrap items-end gap-x-6 gap-y-4">
                            <NFormItem :label="t('game.list.tag')" :show-feedback="false">
                                <NSelect v-model:value="searchForm.marketing_tag" :options="tagOptions" :placeholder="t('common.all')" clearable style="width: 140px" />
                            </NFormItem>
                            <NFormItem :label="t('game.list.typeTag')" :show-feedback="false">
                                <NSelect v-model:value="searchForm.type_id" :options="typeOptions" :placeholder="t('common.all')" clearable style="width: 140px" />
                            </NFormItem>
                            <NFormItem :label="t('operationReport.granularity')" :show-feedback="false" style="width: 140px">
                                <NSelect v-model:value="granularity" :options="granularityOptions" />
                            </NFormItem>
                            <NFormItem :label="t('game.list.dateRange')" :show-feedback="false" class="w-80">
                                <NDatePicker
                                    v-if="granularity === 'hour'"
                                    v-model:value="dateRange"
                                    type="datetimerange"
                                    clearable
                                    format="yyyy-MM-dd HH:mm"
                                    class="w-full"
                                />
                                <NDatePicker
                                    v-if="granularity === 'day'"
                                    v-model:value="dateRange"
                                    type="daterange"
                                    clearable
                                    class="w-full"
                                />
                                <NDatePicker
                                    v-if="granularity === 'month'"
                                    v-model:value="dateRange"
                                    type="monthrange"
                                    clearable
                                    class="w-full"
                                />
                            </NFormItem>
                        </div>
                    </NCollapseTransition>
                  </div>
                </NForm>
            </NCard>
        </div>

        <!-- 資料列表區塊 -->
        <div class="relative z-10">
            <NCard class="rounded-xl shadow-sm border-0">
                <div class="mb-4 flex flex-wrap justify-between items-center gap-4">
                    <div class="flex gap-2">
                        <NButton
                            type="warning"
                            :disabled="!hasPendingChanges"
                            @click="showSaveConfirmModal = true"
                            :loading="loading"
                        >
                            <template #icon><CreateOutline /></template>
                            {{ t('game.list.accessOperation') }}
                            <span v-if="hasPendingChanges" class="ml-1">({{ Object.keys(pendingChanges).length }})</span>
                        </NButton>
                    </div>
                    <div>
                        <NButton type="primary" @click="showAddGameModal = true">
                            <template #icon><AddOutline /></template>
                            新增遊戲
                        </NButton>
                    </div>
                </div>
                <NDataTable
                    :columns="columns"
                    :data="games"
                    :loading="loading"
                    :pagination="pagination"
                    :scroll-x="1600"
                />
            </NCard>
        </div>


        <!-- Edit Modal -->
        <NModal v-model:show="showEditModal" preset="card" :title="t('game.list.editTitle')" style="width: 500px">
            <div v-if="selectedGame" class="mb-4 p-3 bg-gray-50 rounded">
                <div class="font-semibold">{{ selectedGame.name }} ({{ selectedGame.name_en }})</div>
                <div class="text-xs text-gray-500">{{ selectedGame.id }} | {{ selectedGame.provider_id }}</div>
            </div>

            <NForm :model="editForm" label-placement="left" label-width="100">
                <NFormItem :label="t('game.list.tag')">
                    <NSelect v-model:value="editForm.marketing_tag" :options="tagOptions" />
                </NFormItem>
                <NFormItem :label="t('game.list.currency')">
                    <NCheckboxGroup v-model:value="editForm.allowed_currencies">
                        <NCheckbox value="GOLD" :label="t('common.gold')" />
                        <NCheckbox value="SILVER" :label="t('common.silver')" />
                        <NCheckbox value="BRONZE" :label="t('common.bronze')" />
                    </NCheckboxGroup>
                </NFormItem>
                <NFormItem :label="t('game.list.image')">
                    <div class="flex flex-col gap-2 w-full">
                        <NInput v-model:value="editForm.image_url" placeholder="請輸入圖片連結或點擊上傳" />
                        <div v-if="editForm.image_url" class="mt-2">
                            <NImage :src="editForm.image_url" width="100" class="rounded border" />
                        </div>
                    </div>
                </NFormItem>
                <NFormItem :label="t('game.list.vip')">
                    <NSelect v-model:value="editForm.min_vip_level" :options="vipOptions" />
                </NFormItem>
                <NFormItem :label="t('game.list.selectSeat')">
                    <NSelect v-model:value="editForm.min_seat_vip_level" :options="vipOptions" />
                </NFormItem>
                <NFormItem :label="t('game.list.effectiveTurnoverRate')">
                    <NInputNumber v-model:value="editForm.final_rate" :min="0" :max="1000" style="width: 100%">
                        <template #suffix>%</template>
                    </NInputNumber>
                </NFormItem>
                <NFormItem :label="t('game.list.profitRate')">
                    <NInputNumber 
                        :value="100 - (editForm.profit_rate ?? 0)" 
                        :min="0" :max="100" 
                        style="width: 100%"
                        @update:value="(v) => editForm.profit_rate = 100 - (v || 0)"
                    >
                        <template #suffix>%</template>
                    </NInputNumber>
                </NFormItem>
                <NFormItem :label="t('game.provider.sortOrder')">
                    <NInputNumber v-model:value="editForm.sort_order" :min="1" :max="999" style="width: 100%" />
                </NFormItem>
            </NForm>

            <template #footer>
                <div class="flex justify-end gap-2">
                    <NButton @click="showEditModal = false">{{ t('common.cancel') }}</NButton>
                    <NButton type="primary" @click="handleSubmit">{{ t('common.save') }}</NButton>
                </div>
            </template>
        </NModal>

        <!-- Add Game Modal -->
        <NModal v-model:show="showAddGameModal" preset="card" title="新增遊戲" style="width: 1000px; max-width: 90vw;">
            <div class="flex flex-col gap-4">
                <div class="flex justify-between items-center bg-gray-50 p-4 rounded">
                    <div class="text-sm text-gray-600">
                        遊戲清單最後更新日期：{{ lastUpdateTime || '尚未更新' }}
                    </div>
                    <NButton type="primary" @click="handleUpdateProviderGames" :loading="syncLoading">
                        <template #icon><RefreshOutline /></template>
                        更新遊戲
                    </NButton>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <!-- 未上架 (Unpublished) -->
                    <NCard title="未上架" size="small" class="h-[500px] flex flex-col" style="display: flex; flex-direction: column;">
                        <NForm :model="addSearchForm" inline size="small" class="mb-2">
                            <NGrid :cols="2" x-gap="4" y-gap="4">
                                <NGridItem>
                                    <NInput v-model:value="addSearchForm.gameId" placeholder="遊戲 ID" clearable />
                                </NGridItem>
                                <NGridItem>
                                    <NInput v-model:value="addSearchForm.name" placeholder="遊戲名稱" clearable />
                                </NGridItem>
                                <NGridItem>
                                    <NSelect v-model:value="addSearchForm.providerId" :options="providerOptions" placeholder="廠商" clearable />
                                </NGridItem>
                                <NGridItem>
                                    <NSelect v-model:value="addSearchForm.typeId" :options="typeOptions" placeholder="類型" clearable />
                                </NGridItem>
                            </NGrid>
                        </NForm>
                        <div class="flex-1 overflow-y-auto mt-2" style="flex: 1; overflow-y: auto;">
                            <div v-for="game in filteredUnpublished" :key="game.provider_game_id" 
                                 class="p-2 mb-2 border rounded cursor-pointer hover:bg-gray-100 transition-colors"
                                 @click="moveToPublished(game)">
                                <div class="font-bold text-sm">{{ game.name }} ({{ game.name_en }})</div>
                                <div class="text-xs text-gray-500 flex justify-between mt-1">
                                    <span>ID: {{ game.provider_game_id }}</span>
                                    <span>{{ providers.find(p => p.id === game.provider_id)?.code || game.provider_id }} | {{ gameTypes.find(t => t.id === game.type_id)?.name || game.type_id }}</span>
                                </div>
                            </div>
                            <div v-if="filteredUnpublished.length === 0" class="text-center text-gray-400 mt-4">{{ unpublishedGames.length === 0 ? '請點擊上方更新遊戲獲取新名單' : '沒有符合條件的資料' }}</div>
                        </div>
                    </NCard>

                    <!-- 新上架 (Newly Published) -->
                    <NCard title="新上架" size="small" class="h-[500px] flex flex-col" style="display: flex; flex-direction: column;">
                        <div class="flex-1" style="flex: 1; overflow-y: auto;">
                            <div v-for="game in newlyPublished" :key="game.provider_game_id" 
                                 class="p-2 mb-2 border border-green-200 bg-green-50 rounded cursor-pointer hover:bg-green-100 transition-colors"
                                 @click="moveToUnpublished(game)">
                                <div class="font-bold text-sm">{{ game.name }} ({{ game.name_en }})</div>
                                <div class="text-xs text-gray-500 flex justify-between mt-1">
                                    <span>ID: {{ game.provider_game_id }}</span>
                                    <span>{{ providers.find(p => p.id === game.provider_id)?.code || game.provider_id }} | {{ gameTypes.find(t => t.id === game.type_id)?.name || game.type_id }}</span>
                                </div>
                            </div>
                            <div v-if="newlyPublished.length === 0" class="text-center text-gray-400 mt-4">請從左側點選以加入上架清單</div>
                        </div>
                        <template #action>
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-semibold whitespace-nowrap">新上架遊戲狀態:</span>
                                <NSelect v-model:value="newStatus" :options="newStatusOptions" class="w-32" />
                            </div>
                        </template>
                    </NCard>
                </div>
            </div>
            <template #footer>
                <div class="flex justify-end gap-2 mt-4 border-t pt-4">
                    <NButton @click="showAddGameModal = false">{{ t('common.cancel') }}</NButton>
                    <NButton type="primary" @click="handleConfirmAdd" :disabled="newlyPublished.length === 0" :loading="syncLoading">{{ t('common.confirm') }}</NButton>
                </div>
            </template>
        </NModal>

        <!-- Status Batch Save Confirm -->
        <NModal
            v-model:show="showSaveConfirmModal"
            preset="dialog"
            type="warning"
            :title="t('common.warning')"
            :content="t('game.list.saveConfirm')"
            :positive-text="t('common.confirm')"
            :negative-text="t('common.cancel')"
            @positive-click="handleBatchSave"
        />

        <!-- Game Copywriting Modal -->
        <NModal v-model:show="showCopywritingModal" preset="card" title="遊戲文案編輯" style="width: 750px; max-width: 95vw;">
            <div class="mb-3 p-3 bg-gray-50 rounded flex justify-between items-center">
                <div>
                    <div class="font-semibold">{{ copywritingGameName }}</div>
                    <div class="text-xs text-gray-500">ID: {{ copywritingGameId }}</div>
                </div>
                <div v-if="unusedLangs.length > 0">
                    <NSelect
                        placeholder="新增語系"
                        :options="unusedLangs"
                        style="width: 140px"
                        @update:value="handleAddLang"
                        :value="null"
                        size="small"
                    />
                </div>
            </div>

            <template v-if="!copywritingLoading">
                <!-- Banner Management -->
                <NDivider title-placement="left" dashed>遊戲示範圖片 (game_banners)</NDivider>
                <div class="mb-4">
                    <div class="flex items-center gap-2 mb-3">
                        <NUpload
                            action="#"
                            :show-file-list="false"
                            @change="handleBannerUpload"
                            accept="image/png, image/jpeg, image/webp"
                        >
                            <NButton size="small" type="primary">上傳示範圖片</NButton>
                        </NUpload>
                        <span class="text-xs text-gray-400">（上傳後將自動生成 CDN 示範連結）</span>
                    </div>
                    <div v-for="(url, idx) in copywritingForm.game_banners" :key="idx" class="flex items-center gap-2 mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <NImage :src="bannerPreviewUrls[url] || url" width="60" height="40" object-fit="cover" class="rounded border flex-shrink-0" />
                        <span class="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">{{ url }}</span>
                        <NButton size="tiny" type="error" quaternary @click="handleRemoveBanner(idx)">移除</NButton>
                    </div>
                    <div v-if="copywritingForm.game_banners.length === 0" class="text-center text-gray-400 text-sm py-2">尚未上傳任何圖片</div>
                </div>

                <!-- Language Type Display -->
                <NDivider title-placement="left" dashed>語系種類 (lang_type)</NDivider>
                <div class="mb-4">
                    <NSpace>
                        <NTag v-for="lang in copywritingForm.lang_type" :key="lang" closable @close="handleRemoveLang(lang)" type="info" size="small">
                            {{ availableLangs.find(l => l.value === lang)?.label || lang }}
                        </NTag>
                    </NSpace>
                </div>

                <!-- Multi-language Tabs -->
                <NDivider title-placement="left" dashed>多語系文案內容</NDivider>
                <NTabs v-if="copywritingForm.lang_type.length > 0" v-model:value="activeLang" type="card" size="small">
                    <NTabPane
                        v-for="lang in copywritingForm.lang_type"
                        :key="lang"
                        :name="lang"
                        :tab="availableLangs.find(l => l.value === lang)?.label || lang"
                    >
                        <NForm v-if="copywritingForm.locales[lang]" label-placement="left" label-width="120" size="small">
                            <NFormItem label="遊戲名稱">
                                <NInput v-model:value="copywritingForm.locales[lang].game_name" placeholder="前台顯示的遊戲名稱" />
                            </NFormItem>
                            <NFormItem label="簡短介紹">
                                <NInput v-model:value="copywritingForm.locales[lang].game_introduce" type="textarea" :rows="2" placeholder="簡短遊戲介紹（短文）" />
                            </NFormItem>
                            <NGrid :cols="2" :x-gap="12">
                                <NGridItem>
                                    <NFormItem label="波動性">
                                        <NInput v-model:value="copywritingForm.locales[lang].game_volatility" placeholder="例如：中高" />
                                    </NFormItem>
                                </NGridItem>
                                <NGridItem>
                                    <NFormItem label="最大倍率">
                                        <NInput v-model:value="copywritingForm.locales[lang].high_hit" placeholder="例如：3000倍" />
                                    </NFormItem>
                                </NGridItem>
                            </NGrid>
                            <NFormItem label="詳細介紹">
                                <NInput v-model:value="copywritingForm.locales[lang].game_details" type="textarea" :rows="5" placeholder="遊戲介紹詳情（長文）" />
                            </NFormItem>
                        </NForm>
                    </NTabPane>
                </NTabs>
                <div v-else class="text-center text-gray-400 py-8">請先新增語系</div>
            </template>
            <div v-else class="text-center py-12">
                <NSpin />
            </div>

            <template #footer>
                <div class="flex justify-end gap-2">
                    <NButton @click="showCopywritingModal = false">{{ t('common.cancel') }}</NButton>
                    <NButton type="primary" @click="handleSaveCopywriting" :loading="copywritingSaving">儲存文案</NButton>
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
