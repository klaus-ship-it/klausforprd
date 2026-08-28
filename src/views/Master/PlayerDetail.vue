<script setup lang="ts">
import { ref, onMounted, reactive, watch, computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { 
  NCard, NTabs, NTabPane, NGrid, NGridItem, NDescriptions, NDescriptionsItem,
  NTag, NButton, NSpace, NAvatar, NStatistic, NList, NListItem, NThing,
  NModal, NForm, NFormItem, NInput, NSelect, NSwitch, useMessage, useDialog,
  NProgress, NDivider, NDatePicker, NInputNumber, NDataTable, NPagination, NText,
  NRadioGroup, NRadio, NIcon, NAlert
} from 'naive-ui'
import { 
  WalletOutline, AlertCircleOutline, SearchOutline, SwapHorizontalOutline
} from '@vicons/ionicons5'
import { playerApi } from '@/api/player'
import { vipApi } from '@/api/vip'
import { agentApi } from '@/api/agent'
import { logApi } from '@/api/log'
import { gameApi } from '@/api/game'
import { Player, PlayerAuditLog, UpdatePlayerRequest, PlayerStatus, WalletType, PlayerTransferRecord } from '@/types/player'
import { BonusCard } from '@/types/bonus'
import { AssetLog } from '@/types/log'
import { GameLog } from '@/types/game'
import { RolloverEngine } from '@/mocks/engine'
import { VIPLevel } from '@/types/vip'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const { t } = useI18n()

const playerId = route.params.id as string
const player = ref<Player | null>(null)
const vipLevels = ref<VIPLevel[]>([])

// History Tabs Data
const assetLogs = ref<AssetLog[]>([])
const gameLogs = ref<GameLog[]>([])
const auditLogs = ref<PlayerAuditLog[]>([])

// Pagination States
const auditPagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    onChange: (page: number) => {
        auditPagination.page = page
        fetchHistory()
    }
})

const assetPagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
    onChange: (page: number) => {
        assetPagination.page = page
        fetchHistory()
    },
    onUpdatePageSize: (pageSize: number) => {
        assetPagination.pageSize = pageSize
        assetPagination.page = 1
        fetchHistory()
    }
})

const gamePagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
    onChange: (page: number) => {
        gamePagination.page = page
        fetchHistory()
    },
    onUpdatePageSize: (pageSize: number) => {
        gamePagination.pageSize = pageSize
        gamePagination.page = 1
        fetchHistory()
    }
})

// History Filters
const auditFilter = reactive({
    timeRange: null as [number, number] | null
})

const assetFilter = reactive({
    currency: null as string | null,
    changeType: null as string | null,
    timeRange: null as [number, number] | null
})

const gameFilter = reactive({
    currency: 'all' as string,
    gameName: '',
    timeRange: null as [number, number] | null
})

const historyLoading = ref(false)
const currentTab = ref('wallet')
const loading = ref(false)
const selectedBonusCardIds = ref<string[]>([])
const bonusCardLoading = ref(false)
const bonusTableKey = ref(0)

// Edit State
const showEditModal = ref(false)
const editModel = reactive<UpdatePlayerRequest>({})
const vipAdjustModel = reactive<Pick<UpdatePlayerRequest, 'vip_level' | 'vip_adjust_reason' | 'vip_monthly_protection'>>({
    vip_level: 0,
    vip_adjust_reason: '',
    vip_monthly_protection: false
})
const showVipAdjustModal = ref(false)
const showVipRewardConfirmModal = ref(false)
const vipHistoryMaxAction = ref<'SAVE' | 'DONT_SAVE'>('SAVE')
const vipRewardAction = ref<'ISSUE' | 'NO_ISSUE'>('NO_ISSUE')

// Status Change State
const showStatusModal = ref(false)
const statusModel = reactive({
  status: 'ACTIVE' as PlayerStatus,
  reason: '',
  forceKick: false,
  tags: [] as string[]
})
const tagOptions = [
    { label: '一般玩家 (NORMAL)', value: 'NORMAL' },
    { label: '測試帳號 (TEST)', value: 'TEST' },
    { label: 'VIP客戶 (VIP)', value: 'VIP' },
    { label: '高風險 (RISK)', value: 'RISK' },
    { label: '高價值 (HIGH_VALUE)', value: 'HIGH_VALUE' }
]
const statusOptions = [
  { label: '正常', value: 'ACTIVE' },
  { label: '鎖定', value: 'LOCKED' },
  { label: '凍結', value: 'FROZEN' },
  { label: '停權', value: 'SUSPENDED' }
]

const genderOptions = computed(() => [
    { label: t('player.gender.MALE'), value: 'MALE' },
    { label: t('player.gender.FEMALE'), value: 'FEMALE' },
    { label: t('player.gender.UNKNOWN'), value: 'UNKNOWN' }
])

const muteOptions = computed(() => [
    { label: t('player.muteOptions.NONE'), value: 'NONE' },
    { label: t('player.muteOptions.15M'), value: '15M' },
    { label: t('player.muteOptions.1H'), value: '1H' },
    { label: t('player.muteOptions.1D'), value: '1D' },
    { label: t('player.muteOptions.PERMANENT'), value: 'PERMANENT' }
])

const currencyOptions = [
    { label: '金幣 (Gold)', value: 'GOLD' },
    { label: '銀幣 (Silver)', value: 'SILVER' },
    { label: '銅幣 (Bronze)', value: 'BRONZE' }
]

const assetTypeOptions = [
    { label: '投注 (BET)', value: 'BET' },
    { label: '派彩 (WIN)', value: 'WIN' },
    { label: '領取 (CLAIM)', value: 'CLAIM' },
    { label: '解鎖 (UNLOCK)', value: 'UNLOCK' },
    { label: '清零 (WIPE)', value: 'WIPE' }
]

// Abandon Bonus State
const showAbandonModal = ref(false)
const abandonReason = ref('')

// Player Transfer State
const showPlayerTransferModal = ref(false)
const playerTransferForm = reactive({
    new_agent_id: '',
    execution_type: 'IMMEDIATE' as 'IMMEDIATE' | 'SCHEDULED',
    execute_at: undefined as string | undefined,
    reason: ''
})
const playerTransferLoading = ref(false)
const searchAgentLoading = ref(false)
const searchResultName = ref('')
const transferRecords = ref<PlayerTransferRecord[]>([])

const fetchTransferRecords = async () => {
    try {
        const res = await playerApi.getPlayerTransferRecords(playerId)
        if (res.code === 0 && res.data) {
            transferRecords.value = res.data
        }
    } catch (e) {
        console.error(e)
    }
}

const handleSearchAgent = async () => {
    if (!playerTransferForm.new_agent_id) {
        message.warning('請輸入新代理ID')
        return
    }
    searchAgentLoading.value = true
    searchResultName.value = ''
    try {
        // Mock search using getAgents
        const res = await agentApi.getAgents({ 
            search_type: 'uid', 
            q: playerTransferForm.new_agent_id, 
            page: 1, 
            page_size: 10 
        })
        const target = res.data?.items.find(a => a.uid === playerTransferForm.new_agent_id || a.id === playerTransferForm.new_agent_id || a.username === playerTransferForm.new_agent_id)
        if (target) {
            if (target.status !== 'NORMAL') {
                message.error('轉線失敗：目標新代理目前處於停用狀態。')
            } else {
                searchResultName.value = target.username
                message.success('檢索成功')
            }
        } else {
            message.error('找不到該代理')
        }
    } catch (e) {
        message.error('檢索失敗')
    } finally {
        searchAgentLoading.value = false
    }
}

const openPlayerTransferModal = () => {
    playerTransferForm.new_agent_id = ''
    playerTransferForm.execution_type = 'IMMEDIATE'
    playerTransferForm.execute_at = undefined
    playerTransferForm.reason = ''
    searchResultName.value = ''
    showPlayerTransferModal.value = true
}

const cancelTransferRecord = async (recordId: string) => {
    try {
        const res = await playerApi.cancelPlayerTransfer(recordId)
        if (res.code === 0) {
            message.success('取消預約成功')
            fetchTransferRecords()
        } else {
            message.error(res.msg)
        }
    } catch(e) {
        message.error('操作失敗')
    }
}

const submitPlayerTransfer = async () => {
    if (!playerTransferForm.new_agent_id || !searchResultName.value) {
        message.warning('請先檢索並確認目標新代理')
        return
    }
    if (!playerTransferForm.reason || playerTransferForm.reason.length < 5 || playerTransferForm.reason.length > 200) {
        message.warning('異動原因需在 5 到 200 字之間')
        return
    }
    if (playerTransferForm.execution_type === 'SCHEDULED') {
        if (!playerTransferForm.execute_at) {
            message.warning('請選擇預約時間')
            return
        }
        const executeTime = new Date(playerTransferForm.execute_at).getTime()
        if (executeTime < Date.now() + 9 * 60 * 1000) {
            message.warning('預約時間必須大於當前時間至少 10 分鐘')
            return
        }
    }

    playerTransferLoading.value = true
    try {
        const res = await playerApi.transferPlayer(
            playerId,
            playerTransferForm.new_agent_id,
            playerTransferForm.execution_type,
            playerTransferForm.reason,
            playerTransferForm.execute_at
        )
        if (res.code === 0) {
            message.success(playerTransferForm.execution_type === 'IMMEDIATE' ? '玩家轉線成功' : '預約轉線已建立')
            showPlayerTransferModal.value = false
            fetchData()
            fetchTransferRecords()
        } else {
            message.error(res.msg || '轉線失敗')
        }
    } catch (e) {
        message.error('轉線操作失敗')
    } finally {
        playerTransferLoading.value = false
    }
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await playerApi.getPlayerDetail(playerId)
    if (res.code === 0 && res.data) {
      // The mock API keeps player records by reference. Clone the response so Vue
      // always receives a new value and immediately redraws card status changes.
      player.value = JSON.parse(JSON.stringify(res.data))
      bonusTableKey.value += 1
    } else {
      message.error(res.msg)
      router.push('/admin/players')
    }
    
    // Fetch Audit Logs
    const logRes = await playerApi.getAuditLogs(playerId)
    if (logRes.code === 0 && logRes.data) {
        auditLogs.value = logRes.data
    }
    
    // Fetch Transfer Records
    fetchTransferRecords()
  } catch (err) {
    message.error('載入失敗')
  } finally {
    loading.value = false
  }
}

const fetchVIPLevels = async () => {
  try {
    const res = await vipApi.getVIPLevels()
    if (res.code === 0 && res.data) vipLevels.value = res.data.filter(level => level.status !== 'INACTIVE').sort((a, b) => a.rank - b.rank)
  } catch (err) {
    console.warn('VIP 等級資料載入失敗', err)
  }
}

const vipLevelOptions = computed(() => {
  const options = vipLevels.value.map(level => ({ label: `VIP${level.rank}｜${level.name}`, value: level.rank }))
  if (player.value && !options.some(option => option.value === player.value!.vip_level)) {
    options.unshift({ label: `VIP${player.value.vip_level}｜目前等級`, value: player.value.vip_level })
  }
  return options.sort((a, b) => a.value - b.value)
})

const nextVipLevel = computed(() => {
  if (!player.value) return undefined
  return vipLevels.value.find(level => level.rank > player.value!.vip_level)
})

const bindingLabel = (binding?: VIPLevel['bind_data']) => ({
  none: '無',
  phone: '手機號碼',
  email: '信箱',
  phone_email: '手機號碼＋信箱'
}[binding || 'none'] || '無')

const nextUpgradeCriteria = computed(() => {
  const level = nextVipLevel.value
  if (!level) return '尚未設定可用的下一級 VIP'
  const items: string[] = []
  if (level.promo_deposit > 0) items.push(`歷史總儲值 ≥ ${formatAmount(level.promo_deposit)}`)
  if (level.promo_turnover > 0) items.push(`當月總投注額 ≥ ${formatAmount(level.promo_turnover)}`)
  if (level.bind_data && level.bind_data !== 'none') items.push(`資料綁定：${bindingLabel(level.bind_data)}`)
  return items.length ? `VIP${level.rank}：${items.join('；')}` : `VIP${level.rank}：尚未設定升級條件`
})

const nextRetentionCriteria = computed(() => {
  const level = nextVipLevel.value
  if (!level) return '尚未設定可用的下一級 VIP'
  if (level.is_perpetual) return `VIP${level.rank}：無條件保級`
  const items: string[] = []
  if (level.retain_deposit > 0) items.push(`當月儲值 ≥ ${formatAmount(level.retain_deposit)}`)
  if (level.retain_turnover > 0) items.push(`當月投注額 ≥ ${formatAmount(level.retain_turnover)}`)
  if (level.retain_active_days > 0) items.push(`當月活躍天數 ≥ ${level.retain_active_days} 天`)
  return items.length ? `VIP${level.rank}：${items.join('；')}` : `VIP${level.rank}：尚未設定保級條件`
})

const handleEdit = () => {
    if (!player.value) return
    delete editModel.reissue_past_vip_rewards
    editModel.display_name = player.value.display_name
    editModel.phone = player.value.phone
    // Handle legacy boolean is_muted values
    editModel.is_muted = player.value.is_muted === true ? 'PERMANENT' : (player.value.is_muted === false ? 'NONE' : player.value.is_muted)
    editModel.is_gift_disabled = player.value.is_gift_disabled
    editModel.is_deposit_disabled = player.value.is_deposit_disabled
    editModel.is_play_disabled = player.value.is_play_disabled
    editModel.gender = player.value.gender
    editModel.birthday = player.value.birthday
    editModel.email = player.value.email
    editModel.is_retention_active = player.value.is_retention_active
    // VIP 等級調整已獨立至 VIP 資訊分頁，避免一般會員資料保存時誤送 VIP 欄位。
    delete editModel.vip_level
    delete editModel.vip_adjust_reason
    delete editModel.vip_monthly_protection
    delete editModel.vip_history_max_action
    delete editModel.vip_reward_action
    showEditModal.value = true
}

const submitEdit = async () => {
    await savePlayerEdit()
}

const savePlayerEdit = async () => {
    try {
        const res = await playerApi.updatePlayer(playerId, editModel, editModel.vip_adjust_reason || 'Admin Edit')
        if (res.code === 0) {
            message.success('更新成功')
            showEditModal.value = false
            fetchData()
        } else {
            message.error(res.msg)
        }
    } catch (e) {
        message.error('更新失敗')
    }
}

const openVipAdjustModal = () => {
    if (!player.value) return
    vipAdjustModel.vip_level = player.value.vip_level
    vipAdjustModel.vip_adjust_reason = ''
    vipAdjustModel.vip_monthly_protection = player.value.vip_monthly_protection || false
    vipHistoryMaxAction.value = 'SAVE'
    vipRewardAction.value = 'NO_ISSUE'
    showVipAdjustModal.value = true
}

const submitVipAdjust = () => {
    if (!player.value) return
    const targetLevel = vipAdjustModel.vip_level ?? player.value.vip_level
    if (targetLevel === player.value.vip_level && !vipAdjustModel.vip_monthly_protection) {
        message.info('請調整 VIP 等級或開啟當月保級設定')
        return
    }
    if (targetLevel !== player.value.vip_level && !vipAdjustModel.vip_adjust_reason?.trim()) {
        message.error('VIP 手動調整必須填寫異動原因')
        return
    }
    showVipRewardConfirmModal.value = true
}

const saveVipAdjust = async () => {
    try {
        const res = await playerApi.updatePlayer(
            playerId,
            {
                ...vipAdjustModel,
                reissue_past_vip_rewards: vipRewardAction.value === 'ISSUE',
                vip_history_max_action: vipHistoryMaxAction.value,
                vip_reward_action: vipRewardAction.value
            },
            vipAdjustModel.vip_adjust_reason || 'VIP 人工調整'
        )
        if (res.code === 0) {
            message.success('VIP 調整成功')
            showVipAdjustModal.value = false
            showVipRewardConfirmModal.value = false
            await fetchData()
        } else {
            message.error(res.msg)
        }
    } catch (e) {
        message.error('VIP 調整失敗')
    }
}

const confirmVipPromotion = async () => {
    await saveVipAdjust()
}

// History Loaders & Search
const handleQuickSelect = (tab: string, type: string) => {
    const now = new Date()
    let start = new Date()
    let end = new Date()
    
    switch (type) {
        case 'today':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
            end = now
            break
        case 'yesterday':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0)
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59)
            break
        case 'thisWeek':
            const day = now.getDay() || 7
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1, 0, 0, 0)
            end = now
            break
        case 'lastWeek':
            const day2 = now.getDay() || 7
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day2 - 6, 0, 0, 0)
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day2, 23, 59, 59)
            break
        case 'thisMonth':
            start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
            end = now
            break
        case 'lastMonth':
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0)
            end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
            break
    }
    
    const range: [number, number] = [start.getTime(), end.getTime()]
    if (tab === 'audit') auditFilter.timeRange = range
    if (tab === 'asset') assetFilter.timeRange = range
    if (tab === 'game') gameFilter.timeRange = range
}

const jumpToAssetLogs = () => {
    router.push({
        path: '/admin/asset-logs',
        query: { player_id: playerId }
    })
}

const jumpToGameLogs = () => {
    router.push({
        path: '/admin/game-logs',
        query: { player_id: playerId }
    })
}

// Columns definitions
const assetColumns = [
    { title: '時間', key: 'timestamp', width: 150, render: (row: AssetLog) => row.timestamp.replace('T', ' ').split('.')[0] },
    { title: '幣別', key: 'currency', width: 80, render: (row: AssetLog) => h(NTag, { size: 'small', type: row.currency === 'GOLD' ? 'warning' : 'info' }, { default: () => row.currency }) },
    { title: '類型', key: 'change_type', render: (row: AssetLog) => h(NTag, { size: 'small', bordered: false }, { default: () => row.change_type }) },
    { title: '金額', key: 'amount', align: 'right' as const, render: (row: AssetLog) => h('span', { class: row.amount > 0 ? 'text-green-600' : 'text-red-600' }, row.amount) },
    { title: '餘額', key: 'post_balance', align: 'right' as const }
]

const gameColumns = [
    { title: '結算時間', key: 'settle_time', width: 150, render: (row: GameLog) => row.settle_time.replace('T', ' ').split('.')[0] },
    { title: '遊戲', key: 'game_name' },
    { title: '幣別', key: 'currency', width: 80, render: (row: GameLog) => renderCurrencyIcon(row.currency) },
    { title: '投注', key: 'bet_amount', align: 'right' as const, render: (row: GameLog) => h(NSpace, { align: 'center', justify: 'end', size: 4 }, { default: () => [h('span', row.bet_amount), renderCurrencyIcon(row.currency, true)] }) },
    { title: '派彩', key: 'win_amount', align: 'right' as const, render: (row: GameLog) => h(NSpace, { align: 'center', justify: 'end', size: 4 }, { default: () => [h('span', row.win_amount), renderCurrencyIcon(row.currency, true)] }) },
    { title: '盈虧', key: 'net_amount', align: 'right' as const, render: (row: GameLog) => h(NSpace, { align: 'center', justify: 'end', size: 4 }, { default: () => [h('span', { class: row.net_amount >= 0 ? 'text-green-600' : 'text-red-600' }, row.net_amount), renderCurrencyIcon(row.currency, true)] }) }
]

const inviteColumns = [
    { title: '玩家 ID', key: 'id', width: 100 },
    { title: '帳號', key: 'username', width: 150 },
    { title: '顯示名稱', key: 'display_name', width: 150 },
    { 
        title: '狀態', 
        key: 'status', 
        width: 100,
        render: (row: Player) => {
            const typeMap: Record<PlayerStatus, 'success' | 'error' | 'warning' | 'default'> = {
                'ACTIVE': 'success',
                'LOCKED': 'error',
                'FROZEN': 'warning',
                'SUSPENDED': 'default'
            }
            return h(NTag, { size: 'small', type: typeMap[row.status] }, { default: () => row.status })
        }
    },
    { 
        title: '註冊時間', 
        key: 'register_at', 
        width: 180,
        render: (row: Player) => row.register_at.replace('T', ' ').split('.')[0]
    }
]

const invitedPlayers = ref<Player[]>([])
const invitedTotal = ref(0)
const invitedPagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    onChange: (page: number) => {
        invitedPagination.page = page
        fetchHistory()
    }
})

const renderCurrencyIcon = (currency: string, small = false) => {
    const config: Record<string, { color: string; label: string; icon: string }> = {
        GOLD: { color: '#f0a020', label: '金', icon: '🟡' },
        SILVER: { color: '#909090', label: '銀', icon: '⚪' },
        BRONZE: { color: '#a05020', label: '銅', icon: '🟤' }
    }
    const c = config[currency] || { color: '#ccc', label: '?', icon: '❓' }
    
    if (small) {
        return h('span', { style: { color: c.color, fontSize: '12px' } }, c.icon)
    }

    return h(NTag, { size: 'small', bordered: false, style: { backgroundColor: c.color + '20', color: c.color } }, { 
        default: () => [h('span', { style: { marginRight: '4px' } }, c.icon), c.label] 
    })
}

const fetchHistory = async () => {
    if (!playerId) return
    historyLoading.value = true
    try {
        if (currentTab.value === 'asset') {
            const currency = assetFilter.currency === 'all' ? undefined : assetFilter.currency
            const res = await logApi.getLogs({ 
                player_id: playerId, 
                currency: currency || undefined, 
                change_type: assetFilter.changeType || undefined, 
                page: assetPagination.page, 
                page_size: assetPagination.pageSize 
            })
            if (res.code === 0 && res.data) {
                assetLogs.value = res.data.list
                assetPagination.itemCount = res.data.total
            }
        } else if (currentTab.value === 'game') {
            const res = await gameApi.getLogs({ 
                player_id: playerId, 
                currency: gameFilter.currency === 'all' ? undefined : gameFilter.currency, 
                game_name: gameFilter.gameName || undefined, 
                page: gamePagination.page, 
                page_size: gamePagination.pageSize 
            })
            if (res.code === 0 && res.data) {
                gameLogs.value = res.data.list
                gamePagination.itemCount = res.data.total
            }
        } else if (currentTab.value === 'audit') {
            const res = await playerApi.getAuditLogs(playerId, auditPagination.page, auditPagination.pageSize)
            if (res.code === 0 && res.data) {
                auditLogs.value = res.data.items
                auditPagination.itemCount = res.data.total
            }
        } else if (currentTab.value === 'invite') {
            const res = await playerApi.getInvitedPlayers(playerId)
            if (res.code === 0 && res.data) {
                const all = res.data.list
                invitedTotal.value = res.data.total
                invitedPagination.itemCount = res.data.total
                const start = (invitedPagination.page - 1) * invitedPagination.pageSize
                invitedPlayers.value = all.slice(start, start + invitedPagination.pageSize)
            }
        }
    } catch (e) {
        console.error('Fetch history failed', e)
    } finally {
        historyLoading.value = false
    }
}

watch(currentTab, () => {
    fetchHistory()
})

watch([assetFilter, gameFilter, auditFilter], () => {
    auditPagination.page = 1
    assetPagination.page = 1
    gamePagination.page = 1
    fetchHistory()
}, { deep: true })

const gameSummary = computed(() => {
    let bet = 0
    let win = 0
    let net = 0
    
    gameLogs.value.forEach(log => {
        let factor = 0
        if (log.currency === 'GOLD') factor = 1
        else if (log.currency === 'SILVER') factor = 0.01
        
        bet += log.bet_amount * factor
        win += log.win_amount * factor
        net += log.net_amount * factor
    })
    
    return { 
        bet: parseFloat(bet.toFixed(2)), 
        win: parseFloat(win.toFixed(2)), 
        net: parseFloat(net.toFixed(2)) 
    }
})

const handleStatusChange = () => {
    if (!player.value) return
    statusModel.status = player.value.status
    statusModel.tags = [...player.value.tags]
    statusModel.reason = ''
    statusModel.forceKick = false
    showStatusModal.value = true
}

const submitStatusChange = async () => {
    if (!statusModel.reason) {
        message.warning('請填寫異動原因')
        return
    }
    try {
        // Create an array of promises to execute
        const promises = []
        
        // Always update status
        promises.push(playerApi.updatePlayerStatus(playerId, statusModel.status, statusModel.reason, statusModel.forceKick))
        
        // Update tags if changed (simple comparison or just always update for now to keep reason sync)
        if (JSON.stringify(statusModel.tags) !== JSON.stringify(player.value?.tags)) {
             promises.push(playerApi.updatePlayer(playerId, { tags: statusModel.tags }, statusModel.reason))
        }

        const results = await Promise.all(promises)
        const allSuccess = results.every(r => r.code === 0)

        if (allSuccess) {
            message.success('更新成功')
            showStatusModal.value = false
            fetchData()
        } else {
            const errorMsg = results.find(r => r.code !== 0)?.msg || '更新失敗'
            message.error(errorMsg)
        }
    } catch (e) {
        message.error('狀態更新失敗')
    }
}

const handleAbandonBonus = () => {
    abandonReason.value = ''
    showAbandonModal.value = true
}

const submitAbandonBonus = async () => {
    if (!abandonReason.value) {
        message.warning('請填寫原因')
        return
    }
    try {
        const res = await playerApi.abandonBonus(playerId, abandonReason.value)
         if (res.code === 0) {
            message.success('已放棄獎勵')
            RolloverEngine.abandonBonus(player.value!) // Sync Mock Logic
            showAbandonModal.value = false
            fetchData()
        } else {
            message.error(res.msg)
        }
    } catch (e) {
        message.error('操作失敗')
    }
}

const handleForceApproveBonus = () => {
    dialog.warning({
        title: '強制通過確認',
        content: '確定要強制通過此獎勵卡任務嗎？剩餘點數將轉入儲值錢包。',
        positiveText: '確認通過',
        negativeText: '取消',
        onPositiveClick: async () => {
            try {
                const res = await playerApi.forceApproveBonus(playerId, '管理員強制通過')
                if (res.code === 0) {
                    message.success('已強制通過')
                    RolloverEngine.forceApproveBonus(player.value!, '管理員強制通過')
                    fetchData()
                } else {
                    message.error(res.msg)
                }
            } catch (e) {
                message.error('操作失敗')
            }
        }
    })
}

const bonusCards = computed(() => {
    const queued = player.value?.bonus_queue || []
    return player.value?.active_bonus_card ? [player.value.active_bonus_card, ...queued] : queued
})

const isBonusCardActive = (card: BonusCard) =>
    player.value?.rollover_container?.status === 'ACTIVE'
    && player.value.rollover_container.active_card_id === card.id

const bonusCardColumns = [
    { type: 'selection' as const, disabled: (row: BonusCard) => isBonusCardActive(row) },
    { title: '獎勵卡', key: 'id', width: 150, render: (row: BonusCard) => row.id },
    { title: '狀態', key: 'status', width: 100, render: (row: BonusCard) => h(NTag, { type: isBonusCardActive(row) ? 'success' : 'default', bordered: false }, { default: () => isBonusCardActive(row) ? '啟用中' : '未啟用' }) },
    { title: '餘額', key: 'lave_amount', align: 'right' as const, render: (row: BonusCard) => formatAmount(row.lave_amount) },
    { title: '流水門檻', key: 'target_current', align: 'right' as const, render: (row: BonusCard) => formatAmount(row.target_current) },
    { title: '累計流水', key: 'current', align: 'right' as const, render: (row: BonusCard) => formatAmount(isBonusCardActive(row) ? player.value?.rollover_container?.current_wagering || 0 : row.current_wagering || 0) },
    { title: '轉換上限', key: 'cap', align: 'right' as const, render: (row: BonusCard) => formatAmount(row.cap) },
    { title: '操作', key: 'actions', width: 250, render: (row: BonusCard) => h(NSpace, { size: 'small' }, { default: () => [
        isBonusCardActive(row)
            ? h(NButton, { size: 'tiny', type: 'warning', onClick: () => deactivateBonusCard() }, { default: () => '停用' })
            : h(NButton, { size: 'tiny', type: 'success', onClick: () => activateBonusCard(row) }, { default: () => '啟用' }),
        !isBonusCardActive(row) ? h(NButton, { size: 'tiny', type: 'warning', onClick: () => forceApproveInactiveBonusCard(row) }, { default: () => '強制通過' }) : null,
        !isBonusCardActive(row) ? h(NButton, { size: 'tiny', type: 'error', onClick: () => abandonInactiveBonusCard(row) }, { default: () => '放棄獎勵' }) : null
    ].filter(Boolean) as any }) }
]

const deactivateBonusCard = async () => {
    bonusCardLoading.value = true
    try {
        const res = await playerApi.deactivateBonusCard(playerId)
        if (res.code === 0) { message.success('已停用獎勵卡'); selectedBonusCardIds.value = []; await fetchData() }
        else message.error(res.msg)
    } finally { bonusCardLoading.value = false }
}

const activateBonusCard = async (card: BonusCard) => {
    bonusCardLoading.value = true
    try {
        const res = await playerApi.activateBonusCard(playerId, card.id)
        if (res.code === 0) { message.success('獎勵卡已啟用'); selectedBonusCardIds.value = []; await fetchData() } else message.error(res.msg)
    } finally { bonusCardLoading.value = false }
}

const forceApproveInactiveBonusCard = (card: BonusCard) => {
    dialog.warning({ title: '強制通過確認', content: '確定要強制通過此未啟用獎勵卡嗎？可轉換金額將轉入儲值錢包。', positiveText: '確認通過', negativeText: '取消', onPositiveClick: async () => {
        const res = await playerApi.forceApproveInactiveBonusCard(playerId, card.id)
        if (res.code === 0) { message.success('已強制通過'); selectedBonusCardIds.value = []; fetchData() } else message.error(res.msg)
    } })
}

const abandonInactiveBonusCard = (card: BonusCard) => {
    dialog.warning({ title: '放棄獎勵確認', content: '確定要放棄此未啟用獎勵卡嗎？此操作無法復原。', positiveText: '確認放棄', negativeText: '取消', onPositiveClick: async () => {
        const res = await playerApi.abandonInactiveBonusCard(playerId, card.id)
        if (res.code === 0) { message.success('已放棄獎勵'); selectedBonusCardIds.value = []; fetchData() } else message.error(res.msg)
    } })
}

const mergeSelectedBonusCards = () => {
    if (selectedBonusCardIds.value.length < 2) { message.warning('請至少勾選兩張待啟用的獎勵卡'); return }
    dialog.warning({ title: '確認合併獎勵卡', content: '將加總餘額、流水門檻、轉換上限與累計流水，並建立一張新的獎勵卡。', positiveText: '確認合併', negativeText: '取消', onPositiveClick: async () => {
        const res = await playerApi.mergeBonusCards(playerId, selectedBonusCardIds.value)
        if (res.code === 0) { message.success('獎勵卡已合併'); selectedBonusCardIds.value = []; fetchData() } else message.error(res.msg)
    } })
}

const getWalletBalance = (type: string, currency?: string) => {
    if (!player.value) return 0
    const wallet = player.value.wallets.find(w => w.type === type && (!currency || w.currency === currency))
    return wallet ? wallet.balance : 0
}

const formatAmount = (val: number) => {
    return val.toLocaleString()
}


onMounted(() => {
  if (!playerId) {
    router.push('/admin/players')
    return
  }
  fetchData()
  fetchVIPLevels()
  fetchHistory()
})
</script>

<template>
  <div class="p-6" v-if="player">
    <NGrid :x-gap="12" :y-gap="12" cols="1 240:1 800:3">
      <!-- Left Column: Basic Info -->
      <NGridItem span="1">
        <NCard :title="t('player.list.basicInfo')" class="mb-4">
          <template #header-extra>
            <NSpace>
                <NButton size="small" type="primary" @click="handleEdit">{{ t('common.editInfo') }}</NButton>
                <NButton size="small" type="warning" @click="handleStatusChange">{{ t('player.list.statusManagement') }}</NButton>
                <NButton size="small" type="error" @click="openPlayerTransferModal">
                    <template #icon><NIcon><SwapHorizontalOutline /></NIcon></template>
                    玩家轉線
                </NButton>
            </NSpace>
          </template>
          <div class="flex flex-col items-center mb-6">
            <NAvatar round :size="80" class="mb-2">{{ player.username.substring(0, 1).toUpperCase() }}</NAvatar>
            <div class="text-xl font-bold">{{ player.display_name }}</div>
            <div class="text-gray-500">ID: {{ player.id }}</div>
            <NSpace class="mt-2">
                <NTag :type="player.status === 'ACTIVE' ? 'success' : 'error'">{{ player.status }}</NTag>
                <NTag v-if="player.is_online" type="success" bordered>ONLINE</NTag>
                <NTag v-else type="default" bordered>OFFLINE</NTag>
            </NSpace>
          </div>
          
          <NDescriptions :column="1" label-placement="left" bordered>
            <NDescriptionsItem label="帳號">{{ player.username }}</NDescriptionsItem>
            <NDescriptionsItem label="手機號碼">{{ player.phone || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="VIP 等級">LV.{{ player.vip_level }}</NDescriptionsItem>
            <NDescriptionsItem label="歸屬代理">
                <span v-if="player.agent_name">{{ player.agent_name }} <NTag size="tiny" :bordered="false">ID: {{ player.agent_id }}</NTag></span>
                <span v-else>-</span>
            </NDescriptionsItem>
            <NDescriptionsItem :label="t('navigation.promoCode')">{{ player.promo_code || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="自身邀請碼">{{ player.invite_code || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="註冊來源">{{ player.register_source }}</NDescriptionsItem>
            <NDescriptionsItem :label="t('player.list.gender')">{{ player.gender ? t(`player.gender.${player.gender}`) : '-' }}</NDescriptionsItem>
            <NDescriptionsItem :label="t('player.list.birthday')">{{ player.birthday || '-' }}</NDescriptionsItem>
            <NDescriptionsItem :label="t('player.list.email')">{{ player.email || '-' }}</NDescriptionsItem>
            <NDescriptionsItem :label="t('player.list.registerDate')">{{ player.register_at.split('T')[0] }}</NDescriptionsItem>
            <NDescriptionsItem :label="t('player.list.registerIp')">{{ player.register_ip }}</NDescriptionsItem>
            <NDescriptionsItem :label="t('player.list.lastLoginDate')">{{ player.last_login_at?.split('T')[0] || '-' }}</NDescriptionsItem>
            <NDescriptionsItem :label="t('player.list.lastLoginIp')">{{ player.last_login_ip || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="連續簽到天數">{{ player.consecutive_check_in_days || 0 }} 天</NDescriptionsItem>
          </NDescriptions>
        </NCard>
        
      </NGridItem>
      
      <!-- Right Column: Details Tabs -->
      <NGridItem span="2">
        <NCard content-style="padding: 0;">
          <NTabs v-model:value="currentTab" type="line" animated>
            <NTabPane name="wallet" tab="即時資料">
              <NGrid cols="2" :x-gap="12" :y-gap="12">
                 <NGridItem>
                    <NCard size="small" :title="t('player.list.depositWallet')">
                        <template #header-extra><WalletOutline class="w-5 h-5 text-blue-500" /></template>
                        <NSpace vertical size="small">
                            <NStatistic :label="t('common.goldBalance')" :value="formatAmount(getWalletBalance('CASH', 'GOLD'))">
                                <template #prefix>$ </template>
                            </NStatistic>
                            <NStatistic :label="t('common.silverBalance')" :value="formatAmount(getWalletBalance('CASH', 'SILVER'))">
                                <template #prefix>$ </template>
                            </NStatistic>
                        </NSpace>
                    </NCard>
                 </NGridItem>
                 <NGridItem>
                    <NCard size="small" :title="t('player.list.activityWallet')">
                         <template #header-extra><WalletOutline class="w-5 h-5 text-orange-400" /></template>
                         <NStatistic :label="t('common.silverBalance')" :value="formatAmount(getWalletBalance('BONUS', 'SILVER'))">
                            <template #prefix>$ </template>
                        </NStatistic>
                    </NCard>
                 </NGridItem>
                 <NGridItem>
                    <NCard size="small" :title="t('player.list.gameWallet')">
                        <template #header-extra><WalletOutline class="w-5 h-5 text-yellow-800" /></template>
                        <NStatistic :label="t('common.bronzeBalance')" :value="formatAmount(getWalletBalance('GAME', 'BRONZE'))">
                            <template #prefix>$ </template>
                        </NStatistic>
                    </NCard>
                 </NGridItem>
                 <NGridItem>
                    <NCard size="small" :title="t('player.list.safeWallet')">
                        <template #header-extra><WalletOutline class="w-5 h-5 text-yellow-500" /></template>
                        <NStatistic :label="t('common.balance')" :value="formatAmount(getWalletBalance('SAFE', 'GOLD'))">
                            <template #prefix>$ </template>
                        </NStatistic>
                    </NCard>
                 </NGridItem>
                 <NGridItem class="col-span-2">
                    <NCard size="small" title="帳號權限" class="mt-2">
                        <NDescriptions :column="2" label-placement="left" bordered>
                            <NDescriptionsItem :label="t('player.list.muteStatus')"><NTag :type="(player.is_muted === 'NONE' || player.is_muted === false) ? 'success' : 'error'">{{ (player.is_muted === 'NONE' || player.is_muted === false) ? '正常' : t(`player.muteOptions.${player.is_muted}`) }}</NTag></NDescriptionsItem>
                            <NDescriptionsItem :label="t('player.list.giftStatus')"><NTag :type="player.is_gift_disabled ? 'error' : 'success'">{{ player.is_gift_disabled ? '開啟' : '關閉' }}</NTag></NDescriptionsItem>
                            <NDescriptionsItem :label="t('player.list.depositStatus')"><NTag :type="player.is_deposit_disabled ? 'error' : 'success'">{{ player.is_deposit_disabled ? '開啟' : '關閉' }}</NTag></NDescriptionsItem>
                            <NDescriptionsItem :label="t('player.list.playStatus')"><NTag :type="player.is_play_disabled ? 'error' : 'success'">{{ player.is_play_disabled ? '開啟' : '關閉' }}</NTag></NDescriptionsItem>
                        </NDescriptions>
                    </NCard>
                 </NGridItem>
              </NGrid>
            </NTabPane>

            <NTabPane name="vip" tab="VIP 資訊">
              <NCard size="small" title="VIP 會員資訊">
                <template #header-extra>
                  <NButton
                    type="primary"
                    secondary
                    @click="openVipAdjustModal"
                  >調整 VIP 等級</NButton>
                </template>
                <NDescriptions :column="1" label-placement="left" bordered>
                  <NDescriptionsItem label="VIP 等級">LV.{{ player.vip_level }}</NDescriptionsItem>
                  <NDescriptionsItem label="歷史最高 VIP">VIP{{ player.vip_historical_max_level ?? player.vip_level }}</NDescriptionsItem>
                  <NDescriptionsItem label="手機綁定條件">{{ player.phone ? '已綁定' : '未綁定' }}</NDescriptionsItem>
                  <NDescriptionsItem label="信箱綁定條件">{{ player.email ? '已綁定' : '未綁定' }}</NDescriptionsItem>
                  <NDescriptionsItem label="歷史總儲值">{{ formatAmount(player.vip_lifetime_deposit || 0) }}</NDescriptionsItem>
                  <NDescriptionsItem label="歷史總投注額（僅顯示）">{{ formatAmount(player.vip_lifetime_turnover || 0) }}</NDescriptionsItem>
                  <NDescriptionsItem label="本月 VIP 累計">
                    儲值 {{ formatAmount(player.vip_current_month_deposit || 0) }}／投注 {{ formatAmount(player.vip_current_month_turnover || 0) }}／活躍 {{ player.vip_current_month_active_days || 0 }} 天
                  </NDescriptionsItem>
                  <NDescriptionsItem label="本月人工保級設定">{{ player.vip_monthly_protection ? '當月保級' : '當月不保級' }}</NDescriptionsItem>
                  <NDescriptionsItem label="下一級升級條件">{{ nextUpgradeCriteria }}</NDescriptionsItem>
                  <NDescriptionsItem label="下一級保級條件">{{ nextRetentionCriteria }}</NDescriptionsItem>
                </NDescriptions>
                <NAlert type="info" class="mt-4">
                  歷史最高 VIP 僅供顯示與查詢，不參與升級、保級、降級或獎勵判斷。
                </NAlert>
              </NCard>
            </NTabPane>

            <NTabPane name="promotion" tab="優惠紀錄">
                <div class="mb-4 flex items-center justify-between">
                    <NText depth="3">進行操作或合併前請先停用獎勵卡。</NText>
                    <NButton type="primary" :disabled="selectedBonusCardIds.length < 2" @click="mergeSelectedBonusCards">合併已選獎勵卡</NButton>
                </div>
                <NDataTable
                    :key="bonusTableKey"
                    :columns="bonusCardColumns"
                    :data="bonusCards"
                    :loading="bonusCardLoading"
                    :row-key="(row: BonusCard) => row.id"
                    v-model:checked-row-keys="selectedBonusCardIds"
                    :bordered="false"
                />
            </NTabPane>
            
            <NTabPane name="audit" :tab="t('player.list.auditHistory')">
                <div class="mb-4 flex gap-4 items-end">
                    <NFormItem label="快速切換" :show-feedback="false">
                        <NSpace>
                            <NButton size="small" @click="handleQuickSelect('audit', 'today')">本日</NButton>
                            <NButton size="small" @click="handleQuickSelect('audit', 'yesterday')">昨日</NButton>
                            <NButton size="small" @click="handleQuickSelect('audit', 'thisWeek')">本週</NButton>
                            <NButton size="small" @click="handleQuickSelect('audit', 'lastWeek')">上一週</NButton>
                            <NButton size="small" @click="handleQuickSelect('audit', 'thisMonth')">本月</NButton>
                            <NButton size="small" @click="handleQuickSelect('audit', 'lastMonth')">上個月</NButton>
                        </NSpace>
                    </NFormItem>
                    <NFormItem label="時間區間" :show-feedback="false">
                        <NDatePicker v-model:value="auditFilter.timeRange" type="daterange" clearable />
                    </NFormItem>
                    <NButton type="primary" @click="fetchHistory">查詢</NButton>
                </div>
                <NList>
                    <NListItem v-for="log in auditLogs" :key="log.id">
                        <NThing :title="log.action" :content-style="{ marginTop: '10px' }">
                            <template #description>
                                <NSpace size="small" style="margin-top: 4px">
                                    <NTag size="small" :bordered="false" type="info">{{ log.operator }}</NTag>
                                    <span class="text-xs text-gray-500">{{ log.created_at }}</span>
                                </NSpace>
                            </template>
                            <div v-if="log.old_value || log.new_value" class="text-xs text-gray-500 mb-2">
                                {{ log.old_value }} -> {{ log.new_value }}
                            </div>
                            <div>原因: {{ log.reason }}</div>
                        </NThing>
                    </NListItem>
                </NList>
                <div class="mt-4 flex justify-end">
                    <NPagination 
                        v-model:page="auditPagination.page" 
                        :item-count="auditPagination.itemCount" 
                        :page-size="auditPagination.pageSize"
                        @update:page="auditPagination.onChange"
                    />
                </div>
            </NTabPane>

            <NTabPane name="asset" :tab="t('player.list.assetHistory')">
                 <div class="mb-4 flex flex-wrap gap-4 items-end">
                    <NFormItem label="快速切換" :show-feedback="false">
                        <NSpace>
                            <NButton size="small" @click="handleQuickSelect('asset', 'today')">本日</NButton>
                            <NButton size="small" @click="handleQuickSelect('asset', 'yesterday')">昨日</NButton>
                            <NButton size="small" @click="handleQuickSelect('asset', 'thisWeek')">本週</NButton>
                            <NButton size="small" @click="handleQuickSelect('asset', 'lastWeek')">上一週</NButton>
                            <NButton size="small" @click="handleQuickSelect('asset', 'thisMonth')">本月</NButton>
                            <NButton size="small" @click="handleQuickSelect('asset', 'lastMonth')">上個月</NButton>
                        </NSpace>
                    </NFormItem>
                    <NFormItem label="幣別" :show-feedback="false">
                         <NSelect v-model:value="assetFilter.currency" :options="[{ label: '全部', value: 'all' }, ...currencyOptions]" style="width: 120px" placeholder="全部" />
                    </NFormItem>
                    <NFormItem label="變動類型" :show-feedback="false">
                         <NSelect v-model:value="assetFilter.changeType" :options="assetTypeOptions" style="width: 120px" placeholder="全部" clearable />
                    </NFormItem>
                    <NButton type="primary" @click="fetchHistory">查詢</NButton>
                    <NButton type="primary" secondary @click="jumpToAssetLogs">
                         <template #icon><SearchOutline /></template>
                         {{ t('player.list.advancedSearch') }}
                    </NButton>
                </div>
                <NDataTable 
                    remote
                    :columns="assetColumns" 
                    :data="assetLogs" 
                    :loading="historyLoading" 
                    :pagination="assetPagination"
                    size="small" 
                />
            </NTabPane>

            <NTabPane name="game" :tab="t('player.list.gameHistory')">
                <div class="mb-4 flex flex-wrap gap-4 items-end">
                    <NFormItem label="快速切換" :show-feedback="false">
                        <NSpace>
                            <NButton size="small" @click="handleQuickSelect('game', 'today')">本日</NButton>
                            <NButton size="small" @click="handleQuickSelect('game', 'yesterday')">昨日</NButton>
                            <NButton size="small" @click="handleQuickSelect('game', 'thisWeek')">本週</NButton>
                            <NButton size="small" @click="handleQuickSelect('game', 'lastWeek')">上一週</NButton>
                            <NButton size="small" @click="handleQuickSelect('game', 'thisMonth')">本月</NButton>
                            <NButton size="small" @click="handleQuickSelect('game', 'lastMonth')">上個月</NButton>
                        </NSpace>
                    </NFormItem>
                    <NFormItem label="幣別" :show-feedback="false">
                         <NSelect v-model:value="gameFilter.currency" :options="[{ label: '全部', value: 'all' }, ...currencyOptions]" style="width: 120px" />
                    </NFormItem>
                    <NFormItem label="遊戲名稱" :show-feedback="false">
                         <NInput v-model:value="gameFilter.gameName" style="width: 150px" placeholder="搜尋遊戲" clearable />
                    </NFormItem>
                    <NButton type="primary" @click="fetchHistory">查詢</NButton>
                    <NButton type="primary" secondary @click="jumpToGameLogs">
                         <template #icon><SearchOutline /></template>
                         {{ t('player.list.advancedSearch') }}
                    </NButton>
                </div>
                <div v-if="gameFilter.currency === 'all'" class="mb-4 bg-gray-50 p-4 rounded-lg flex justify-around border border-gray-100">
                    <div class="text-center">
                        <div class="text-xs text-gray-500 mb-1">轉折總投注 (Gold Unit)</div>
                        <div class="text-lg font-bold text-blue-600">{{ formatAmount(gameSummary.bet) }}</div>
                    </div>
                    <div class="text-center">
                        <div class="text-xs text-gray-500 mb-1">轉折總派彩 (Gold Unit)</div>
                        <div class="text-lg font-bold text-orange-600">{{ formatAmount(gameSummary.win) }}</div>
                    </div>
                    <div class="text-center">
                        <div class="text-xs text-gray-500 mb-1">轉折總盈虧 (Gold Unit)</div>
                        <div class="text-lg font-bold" :class="gameSummary.net >= 0 ? 'text-green-600' : 'text-red-600'">
                            {{ gameSummary.net >= 0 ? '+' : '' }}{{ formatAmount(gameSummary.net) }}
                        </div>
                    </div>
                </div>
                <NDataTable 
                    remote
                    :columns="gameColumns" 
                    :data="gameLogs" 
                    :loading="historyLoading" 
                    :pagination="gamePagination"
                    size="small" 
                />
            </NTabPane>

            <!-- Transfer Records Tab -->
            <NTabPane name="transfer" tab="轉線紀錄">
                <div v-if="transferRecords.length === 0" class="py-10 text-center text-gray-400">
                    尚無轉線紀錄
                </div>
                <NList v-else hoverable>
                    <NListItem v-for="record in transferRecords" :key="record.id">
                        <NThing>
                            <template #header>
                                <span class="font-bold">轉線排程：{{ record.id }}</span>
                                <NTag class="ml-2" size="small" :type="record.status === 'SUCCESS' ? 'success' : record.status === 'PENDING' ? 'warning' : record.status === 'CANCELED' ? 'error' : 'default'">
                                     {{ record.status }}
                                </NTag>
                            </template>
                            <template #header-extra>
                                <NButton v-if="record.status === 'PENDING'" size="small" type="error" @click="cancelTransferRecord(record.id)">取消預約</NButton>
                            </template>
                            <NDescriptions :column="2" size="small" class="mt-2">
                                <NDescriptionsItem label="原歸屬代理">{{ record.original_agent_name }} ({{ record.original_agent_id }})</NDescriptionsItem>
                                <NDescriptionsItem label="新歸屬代理">{{ record.new_agent_name }} ({{ record.new_agent_id }})</NDescriptionsItem>
                                <NDescriptionsItem label="執行類型">{{ record.execution_type === 'IMMEDIATE' ? '立即' : '排程' }}</NDescriptionsItem>
                                <NDescriptionsItem label="執行時間">{{ record.execute_at.replace('T', ' ').split('.')[0] }}</NDescriptionsItem>
                                <NDescriptionsItem label="建立時間">{{ record.created_at.replace('T', ' ').split('.')[0] }}</NDescriptionsItem>
                                <NDescriptionsItem label="異動原因">{{ record.reason }}</NDescriptionsItem>
                            </NDescriptions>
                        </NThing>
                    </NListItem>
                </NList>
            </NTabPane>

            <!-- Invite Details Tab -->
            <NTabPane name="invite" tab="邀請明細">
                <div class="mb-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg flex items-center justify-between border border-gray-100 dark:border-gray-700">
                    <div>
                        <span class="text-xs text-gray-500 block mb-1">自身邀請碼</span>
                        <span class="text-lg font-bold text-blue-600 font-mono">{{ player.invite_code || '-' }}</span>
                    </div>
                    <div class="text-right">
                        <span class="text-xs text-gray-500 block mb-1">成功邀請人數</span>
                        <NSpace align="baseline" justify="end" :size="2">
                            <span class="text-2xl font-bold text-slate-800 dark:text-white">{{ invitedTotal }}</span>
                            <span class="text-xs text-gray-400">人</span>
                        </NSpace>
                    </div>
                </div>
                <NDataTable
                    :columns="inviteColumns"
                    :data="invitedPlayers"
                    :loading="historyLoading"
                    :pagination="invitedPagination"
                    size="small"
                />
            </NTabPane>
          </NTabs>
        </NCard>
      </NGridItem>
    </NGrid>
    
    <!-- Modals -->
    <NModal v-model:show="showEditModal" preset="card" title="編輯玩家資料" style="width: 500px">
        <NForm :model="editModel" label-placement="left" label-width="80">
            <NFormItem label="顯示名稱">
                <NInput v-model:value="editModel.display_name" />
            </NFormItem>
            <NFormItem label="手機號碼">
                <NInput v-model:value="editModel.phone" />
            </NFormItem>
            <NFormItem :label="t('player.list.gender')">
                <NSelect v-model:value="editModel.gender" :options="genderOptions" />
            </NFormItem>
            <NFormItem :label="t('player.list.birthday')">
                <NDatePicker v-model:formatted-value="editModel.birthday" value-format="yyyy-MM-dd" type="date" clearable />
            </NFormItem>
            <NFormItem :label="t('player.list.email')">
                 <NInput v-model:value="editModel.email" />
            </NFormItem>
            <NFormItem label="密碼">
                 <NInput v-model:value="editModel.password" type="password" show-password-on="click" placeholder="留空表示不修改密碼" clearable />
            </NFormItem>
             <NFormItem :label="t('player.list.muteStatus')">
                <NSelect v-model:value="editModel.is_muted" :options="muteOptions" />
            </NFormItem>
            <NFormItem :label="t('player.list.giftStatus')">
                <NSwitch v-model:value="editModel.is_gift_disabled" />
            </NFormItem>
            <NFormItem :label="t('player.list.depositStatus')">
                <NSwitch v-model:value="editModel.is_deposit_disabled" />
            </NFormItem>
            <NFormItem :label="t('player.list.playStatus')">
                <NSwitch v-model:value="editModel.is_play_disabled" />
            </NFormItem>
            <NFormItem :label="t('player.list.retentionCheck')">
                <NSwitch v-model:value="editModel.is_retention_active" />
            </NFormItem>
        </NForm>
        <template #footer>
            <div class="flex justify-end gap-2">
                <NButton @click="showEditModal = false">取消</NButton>
                <NButton type="primary" @click="submitEdit">儲存</NButton>
            </div>
        </template>
    </NModal>

    <NModal v-model:show="showVipAdjustModal" preset="card" title="調整 VIP 等級" style="width: 520px">
        <NForm :model="vipAdjustModel" label-placement="top">
            <NFormItem label="VIP 等級">
                <NSelect v-model:value="vipAdjustModel.vip_level" :options="vipLevelOptions" />
            </NFormItem>
            <NFormItem label="VIP 異動原因" :required="vipAdjustModel.vip_level !== player?.vip_level">
                <NInput v-model:value="vipAdjustModel.vip_adjust_reason" type="textarea" placeholder="調整 VIP 等級時必填" />
            </NFormItem>
            <NFormItem label="當月保級">
                <NSwitch v-model:value="vipAdjustModel.vip_monthly_protection">
                    <template #checked>當月保級</template>
                    <template #unchecked>當月不保級</template>
                </NSwitch>
                <p class="mt-1 text-xs text-gray-500">僅本自然月有效；同一會員同月不可重複建立人工保級判定。</p>
            </NFormItem>
        </NForm>
        <template #footer>
            <div class="flex justify-end gap-2">
                <NButton @click="showVipAdjustModal = false">取消</NButton>
                <NButton type="primary" @click="submitVipAdjust">下一步</NButton>
            </div>
        </template>
    </NModal>

    <NModal v-model:show="showVipRewardConfirmModal" preset="card" title="確認 VIP 等級調整" style="width: 560px" :mask-closable="false">
        <NAlert type="warning" class="mb-4">
            請確認歷史最高等級、升級獎勵與本月保級設定。取消任一項目都不會保存本次 VIP 調整。
        </NAlert>
        <NForm label-placement="top">
            <NFormItem label="是否同步更新歷史最高等級">
                <NRadioGroup v-model:value="vipHistoryMaxAction">
                    <NSpace>
                        <NRadio value="SAVE">保存</NRadio>
                        <NRadio value="DONT_SAVE">不保存</NRadio>
                    </NSpace>
                </NRadioGroup>
            </NFormItem>
            <p class="mt-1 text-xs text-gray-500">歷史最高等級僅供後台顯示與查詢，不參與 VIP 升降級或獎勵判斷。</p>
            <NFormItem label="升級獎勵">
                <NRadioGroup v-model:value="vipRewardAction">
                    <NSpace>
                        <NRadio value="ISSUE">發放</NRadio>
                        <NRadio value="NO_ISSUE">不發放升級</NRadio>
                    </NSpace>
                </NRadioGroup>
            </NFormItem>
        </NForm>
        <p class="mt-2 text-xs text-gray-500">選擇發放時，目標範圍內尚未領取的獎勵會逐級補發；已領取的獎勵不重複發放。降級後依一般升級條件重新升級時，仍依既有領取狀態判斷。</p>
        <template #footer>
            <div class="flex justify-end gap-2">
                <NButton @click="showVipRewardConfirmModal = false">取消</NButton>
                <NButton type="primary" @click="confirmVipPromotion">確認調整</NButton>
            </div>
        </template>
    </NModal>
    
    <NModal v-model:show="showStatusModal" preset="card" title="變更帳戶狀態" style="width: 400px">
        <NForm :model="statusModel">
             <NFormItem label="狀態" required>
                 <NSelect v-model:value="statusModel.status" :options="statusOptions" />
             </NFormItem>
             <NFormItem label="強制踢線">
                <NSwitch v-model:value="statusModel.forceKick" />
                <span class="ml-2 text-xs text-gray-500">若勾選，玩家將被強制登出</span>
             </NFormItem>
             <NFormItem label="玩家標籤">
                 <NSelect v-model:value="statusModel.tags" multiple filterable tag :options="tagOptions" placeholder="選擇或輸入標籤" />
             </NFormItem>
             <NFormItem label="異動原因" required>
                 <NInput type="textarea" v-model:value="statusModel.reason" placeholder="請詳細說明原因..." />
             </NFormItem>
        </NForm>
        <template #footer>
            <div class="flex justify-end gap-2">
                <NButton @click="showStatusModal = false">取消</NButton>
                <NButton type="primary" @click="submitStatusChange">確認變更</NButton>
            </div>
        </template>
    </NModal>

    <NModal v-model:show="showAbandonModal" preset="card" title="放棄當前獎勵" style="width: 400px">
        <div class="text-red-500 mb-4 bg-red-50 p-3 rounded">
            <AlertCircleOutline class="w-4 h-4 inline mr-1"/>
            警告：此操作將清空玩家當前活動進度與餘額，且無法復原。
        </div>
        <NInput type="textarea" v-model:value="abandonReason" placeholder="請填寫放棄原因..." />
        <template #footer>
            <div class="flex justify-end gap-2">
                <NButton @click="showAbandonModal = false">取消</NButton>
                <NButton type="error" @click="submitAbandonBonus">確認放棄</NButton>
            </div>
        </template>
    </NModal>

    <!-- Player Transfer Modal -->
    <NModal v-model:show="showPlayerTransferModal" preset="card" title="玩家轉線" style="width: 550px; border-radius: 20px;">
        <NForm :model="playerTransferForm" label-placement="left" label-width="120">
            <NDivider title-placement="left">目前歸屬</NDivider>
            <NFormItem label="當前歸屬代理">
                <div v-if="player?.agent_name" class="flex items-center gap-2">
                    <span class="font-bold">{{ player.agent_name }}</span>
                    <NTag size="small" type="info">ID: {{ player.agent_id }}</NTag>
                </div>
                <span v-else class="text-gray-400">尚無歸屬代理</span>
            </NFormItem>

            <NDivider title-placement="left">轉線設定</NDivider>
            <NFormItem label="新代理ID" required>
                <div class="flex-col w-full gap-2">
                    <div class="flex gap-2 w-full">
                        <NInput v-model:value="playerTransferForm.new_agent_id" placeholder="請輸入新的代理ID" @keydown.enter.prevent="handleSearchAgent" />
                        <NButton type="primary" :loading="searchAgentLoading" @click="handleSearchAgent">檢索</NButton>
                    </div>
                    <div v-if="searchResultName" class="text-green-600 text-sm mt-1 font-bold">
                        檢索成功：{{ searchResultName }}
                    </div>
                </div>
            </NFormItem>
            <NFormItem label="執行類型">
                <NRadioGroup v-model:value="playerTransferForm.execution_type">
                    <NRadio value="IMMEDIATE">立即轉線</NRadio>
                    <NRadio value="SCHEDULED">預定轉線</NRadio>
                </NRadioGroup>
            </NFormItem>
            <NFormItem v-if="playerTransferForm.execution_type === 'SCHEDULED'" label="預定執行時間" required>
                <NDatePicker
                    v-model:formatted-value="playerTransferForm.execute_at"
                    type="datetime"
                    clearable
                    value-format="yyyy-MM-dd HH:mm:ss"
                    style="width: 100%"
                    placeholder="請選擇未來時間 (至少大於目前 10 分鐘)"
                />
            </NFormItem>
            <NFormItem label="異動原因" required>
                <NInput v-model:value="playerTransferForm.reason" type="textarea" :rows="3" placeholder="請輸入異動原因 (5-200字)" />
            </NFormItem>
        </NForm>
        <template #footer>
            <div class="flex justify-end gap-3">
                <NButton quaternary @click="showPlayerTransferModal = false">取消</NButton>
                <NButton type="primary" rounded @click="submitPlayerTransfer" :loading="playerTransferLoading" :disabled="!searchResultName">確認轉線</NButton>
            </div>
        </template>
    </NModal>
  </div>
</template>
