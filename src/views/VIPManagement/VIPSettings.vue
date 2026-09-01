<script setup lang="ts">
import { ref, onMounted, reactive, h } from 'vue'
import { 
    NCard, NDataTable, NButton, NModal, NForm, NFormItem, NInput, 
    NInputNumber, NUpload, NSwitch, NTag, NIcon, useMessage, 
    DataTableColumns, UploadFileInfo, NGrid, NGridItem, NDivider, NUploadDragger, NText, NSelect, NAvatar, NTabs, NTabPane, NDatePicker
} from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { 
    CreateOutline, CloudUploadOutline, StarOutline, SettingsOutline
} from '@vicons/ionicons5'
import { VIPGlobalConfig, VIPLevel } from '@/types/vip'
import { vipApi } from '@/api/vip'

const { t } = useI18n()
const message = useMessage()

// List Data
const loading = ref(false)
const vipLevels = ref<VIPLevel[]>([])
const globalConfig = reactive<VIPGlobalConfig>({
    demotion_limit_months: 6,
    settlement_timezone: 'SYSTEM',
    settlement_time: '00:00:00'
})
const globalConfigSaving = ref(false)
const isNewLevel = ref(false)

const fetchVIPData = async () => {
    loading.value = true
    try {
        const res = await vipApi.getVIPLevels()
        if (res.code === 0) {
            // 以新陣列／新物件回填，確保狀態欄與操作按鈕立即觸發 Vue 更新。
            vipLevels.value = res.data.map(level => ({ ...level })).sort((a, b) => a.rank - b.rank)
        }
        const configRes = await vipApi.getVIPConfig()
        if (configRes.code === 0 && configRes.data) Object.assign(globalConfig, configRes.data)
    } catch (e) {
        message.error(t('common.loadFailed'))
    } finally {
        loading.value = false
    }
}

const resetLevel = (rank: number) => {
    Object.assign(editingLevel, {
        rank,
        name: '',
        promotion_desc: '',
        retention_desc: '',
        promotion_desc_zh_tw: '',
        promotion_desc_zh_cn: '',
        promotion_desc_en: '',
        retention_desc_zh_tw: '',
        retention_desc_zh_cn: '',
        retention_desc_en: '',
        promo_deposit: 0,
        promo_turnover: 0,
        bind_data: 'none',
        // 新增等級先停用，待運營完成門檻與權益設定後再手動啟用。
        status: isNewLevel.value ? 'INACTIVE' : 'ACTIVE',
        level_source: isNewLevel.value ? 'OPERATOR_CREATED' : 'DEFAULT',
        is_perpetual: false,
        retention_deadline: null,
        retain_deposit: 0,
        retain_turnover: 0,
        retain_active_days: 0,
        gift_fee_rate: 0
    })
}

const getUpgradeRewardDisplay = (level: VIPLevel) => {
    if (level.upgrade_reward_desc_zh_tw || level.upgrade_reward_desc) {
        return level.upgrade_reward_desc_zh_tw || level.upgrade_reward_desc || '-'
    }
    if (!level.upgrade_reward_amount || !level.upgrade_reward_currency) return '-'
    const currency = level.upgrade_reward_currency === 'SILVER' ? '銀幣' : '銅幣'
    const details = level.upgrade_reward_currency === 'SILVER'
        ? `，流水 ${level.upgrade_reward_turnover_multiplier || 0} 倍，轉換上限 ${level.upgrade_reward_conversion_cap || 0}`
        : ''
    return `${currency} ${level.upgrade_reward_amount.toLocaleString()}${details}`
}

// Table Columns
const columns: DataTableColumns<VIPLevel> = [
    { 
        title: t('vip.tableRank'), 
        key: 'rank', 
        width: 80, 
        align: 'center',
        render(row) {
            return h(NTag, { type: 'info', bordered: false, round: true }, { default: () => `VIP ${row.rank}` })
        }
    },
    { 
        title: t('vip.tableName'), 
        key: 'name', 
        width: 160,
        render(row) {
            return h('div', { class: 'flex items-center gap-3' }, [
                h('span', { class: 'font-bold' }, row.name),
                h('div', { class: 'flex gap-1' }, [
                    h(NAvatar, { 
                        size: 24, 
                        src: row.icon_url,
                        color: 'transparent',
                        class: 'bg-slate-100 rounded-md text-[10px] text-gray-500 font-bold flex items-center justify-center border border-gray-200'
                    }, { default: () => '圖' }),
                    h(NAvatar, { 
                        size: 24, 
                        src: row.avatar_frame_url,
                        color: 'transparent',
                        class: 'bg-slate-100/50 ring-1 ring-sky-300 rounded-full text-[10px] text-sky-500 font-bold flex items-center justify-center'
                    }, { default: () => '框' })
                ])
            ])
        }
    },
    { 
        title: t('vip.tablePromo'), 
        key: 'promotion_desc', 
        minWidth: 200,
        render(row) {
            return h('div', { class: 'text-xs text-gray-500 whitespace-pre-wrap' }, row.promotion_desc)
        }
    },
    { 
        title: t('vip.tableRetain'), 
        key: 'retention_desc', 
        minWidth: 200,
        render(row) {
            const deadline = row.is_perpetual && row.retention_deadline ? `無條件保級至 ${row.retention_deadline}` : ''
            return h('div', { class: 'text-xs text-gray-500 whitespace-pre-wrap' }, [
                h('div', row.retention_desc || (row.is_perpetual ? '無條件保級' : '尚未設定')),
                deadline ? h('div', { class: 'text-amber-600 mt-1' }, deadline) : null
            ])
        }
    },
    {
        title: '狀態',
        key: 'status',
        width: 100,
        render(row) {
            return h(NTag, { type: row.status === 'INACTIVE' ? 'default' : 'success', bordered: false }, {
                default: () => row.status === 'INACTIVE' ? '停用' : '啟用'
            })
        }
    },
    {
        title: '最後修改人',
        key: 'updated_by',
        width: 120,
        render: (row) => row.updated_by || '-'
    },
    {
        title: '最後修改時間',
        key: 'updated_at',
        width: 180,
        render: (row) => row.updated_at ? new Date(row.updated_at).toLocaleString('zh-TW') : '-'
    },
    {
        title: '升級獎勵',
        key: 'upgrade_reward_desc',
        minWidth: 190,
        render(row) {
            return h('div', { class: 'text-xs text-gray-500 whitespace-pre-wrap' }, getUpgradeRewardDisplay(row))
        }
    },
    { 
        title: t('vip.tableFee'), 
        key: 'gift_fee_rate', 
        width: 100,
        render: (row) => {
            if (row.gift_fee_rate === 0 && row.rank < 2) return '-'
            return `${row.gift_fee_rate}%`
        }
    },
    {
        title: t('common.action'),
        key: 'actions',
        width: 160,
        fixed: 'right',
        render(row) {
            return h('div', { class: 'flex gap-2' }, [
                h(NButton, {
                    size: 'small',
                    quaternary: true,
                    type: 'primary',
                    onClick: () => handleEdit(row)
                }, { 
                    default: () => [h(NIcon, { class: 'mr-1' }, { default: () => h(CreateOutline) }), t('common.edit')]
                }),
                h(NButton, {
                    size: 'small',
                    quaternary: true,
                    type: 'warning',
                    onClick: () => handleSettings(row)
                }, { 
                    default: () => [h(NIcon, { class: 'mr-1' }, { default: () => h(SettingsOutline) }), '設定']
                }),
                h(NButton, {
                    size: 'small',
                    quaternary: true,
                    type: row.status === 'INACTIVE' ? 'success' : 'error',
                    onClick: () => handleToggleStatus(row)
                }, { default: () => row.status === 'INACTIVE' ? '啟用' : '停用' })
            ])
        }
    }
]

// Modal State
const showEditModal = ref(false)
const showSettingsModal = ref(false)
const showDisableConfirmModal = ref(false)
const showInactiveImpactModal = ref(false)
const pendingStatusLevel = ref<VIPLevel | null>(null)
const pendingSave = ref<{ isSettings: boolean } | null>(null)
// 新增等級建立後的首次設定屬於初始化，不應被視為停用等級的異動確認。
const initialSetupPendingRanks = reactive(new Set<number>())
// 原型用示範資料；正式版由會員統計 API 回傳各 VIP 等級即時人數。
const memberCountByVip = reactive<Record<number, number>>({
    0: 1280, 1: 620, 2: 318, 3: 176, 4: 92, 5: 41
})
const getMemberCount = (rank: number) => memberCountByVip[rank] ?? 0

const editingLevel = reactive<VIPLevel>({
    rank: 0,
    name: '',
    status: 'ACTIVE',
    level_source: 'DEFAULT',
    promotion_desc: '',
    retention_desc: '',
    promotion_desc_zh_tw: '',
    promotion_desc_zh_cn: '',
    promotion_desc_en: '',
    retention_desc_zh_tw: '',
    retention_desc_zh_cn: '',
    retention_desc_en: '',
    upgrade_reward_desc: '',
    upgrade_reward_desc_zh_tw: '',
    upgrade_reward_desc_zh_cn: '',
    upgrade_reward_desc_en: '',
    promo_deposit: 0,
    promo_turnover: 0,
    bind_data: 'none',
    upgrade_reward_currency: 'SILVER',
    upgrade_reward_amount: 0,
    upgrade_reward_turnover_multiplier: 0,
    upgrade_reward_conversion_cap: 0,
    is_perpetual: false,
    retention_deadline: null,
    retain_deposit: 0,
    retain_turnover: 0,
    retain_active_days: 0,
    gift_fee_rate: 0
})

const settingsLevel = reactive<VIPLevel>({
    rank: 0,
    name: '',
    status: 'ACTIVE',
    level_source: 'DEFAULT',
    promotion_desc: '',
    retention_desc: '',
    promo_deposit: 0,
    promo_turnover: 0,
    bind_data: 'none',
    upgrade_reward_currency: 'SILVER',
    upgrade_reward_amount: 0,
    upgrade_reward_turnover_multiplier: 0,
    upgrade_reward_conversion_cap: 0,
    is_perpetual: false,
    retention_deadline: null,
    retain_deposit: 0,
    retain_turnover: 0,
    retain_active_days: 0,
    gift_fee_rate: 0
})

const bindDataOptions = [
    { label: '無', value: 'none' },
    { label: '手機號碼', value: 'phone' },
    { label: '信箱', value: 'email' },
    { label: '手機號碼＋信箱', value: 'phone_email' }
]

const upgradeRewardCurrencyOptions = [
    { label: '銀幣', value: 'SILVER' },
    { label: '銅幣', value: 'BRONZE' }
]

const handleEdit = (row: VIPLevel) => {
    isNewLevel.value = false
    Object.assign(editingLevel, {
        promotion_desc_zh_tw: row.promotion_desc_zh_tw || row.promotion_desc,
        promotion_desc_zh_cn: row.promotion_desc_zh_cn || '',
        promotion_desc_en: row.promotion_desc_en || '',
        retention_desc_zh_tw: row.retention_desc_zh_tw || row.retention_desc,
        retention_desc_zh_cn: row.retention_desc_zh_cn || '',
        retention_desc_en: row.retention_desc_en || '',
        upgrade_reward_desc_zh_tw: row.upgrade_reward_desc_zh_tw || row.upgrade_reward_desc || '',
        upgrade_reward_desc_zh_cn: row.upgrade_reward_desc_zh_cn || '',
        upgrade_reward_desc_en: row.upgrade_reward_desc_en || '',
        retention_deadline: row.retention_deadline || null,
        ...JSON.parse(JSON.stringify(row))
    })
    showEditModal.value = true
}

const handleAdd = () => {
    isNewLevel.value = true
    const nextRank = vipLevels.value.length ? Math.max(...vipLevels.value.map(item => item.rank)) + 1 : 1
    resetLevel(nextRank)
    showEditModal.value = true
}

const handleSettings = (row: VIPLevel) => {
    Object.assign(settingsLevel, JSON.parse(JSON.stringify(row)))
    settingsLevel.retention_deadline = row.retention_deadline || null
    showSettingsModal.value = true
}

const applyToggleStatus = async (row: VIPLevel) => {
    const nextStatus = row.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE'
    if (nextStatus === 'ACTIVE') {
        if (!row.name?.trim()) {
            message.error('啟用前請先完成 VIP 名稱設定')
            return
        }
        const hasPromotionCriteria = Number(row.promo_deposit || 0) > 0 || Number(row.promo_turnover || 0) > 0 || (row.bind_data && row.bind_data !== 'none')
        if (row.rank > 0 && !hasPromotionCriteria) {
            message.error('啟用前請至少設定一項升級條件')
            return
        }
        if (!row.is_perpetual) {
            const hasRetentionCriteria = Number(row.retain_deposit || 0) > 0 || Number(row.retain_turnover || 0) > 0 || Number(row.retain_active_days || 0) > 0
            if (!hasRetentionCriteria) {
                message.error('啟用前請至少設定一項保級條件，或切換為無條件保級')
                return
            }
        }
        if (!validateRetentionDeadline(row)) return
        if (!validateLevelCriteria(row)) return
    }
    const res = await vipApi.toggleVIPLevel(row.rank, nextStatus)
    if (res.code === 0) {
        const index = vipLevels.value.findIndex(level => level.rank === row.rank)
        if (index !== -1) {
            vipLevels.value[index] = { ...vipLevels.value[index], status: nextStatus }
        }
        message.success(nextStatus === 'ACTIVE' ? 'VIP 等級已啟用' : 'VIP 等級已停用')
    } else {
        message.error(res.msg || '狀態修改失敗')
    }
}

const handleToggleStatus = (row: VIPLevel) => {
    // 停用會改變後續升降級可通過的等級，先由運營商確認影響範圍。
    if (row.status !== 'INACTIVE') {
        pendingStatusLevel.value = row
        showDisableConfirmModal.value = true
        return
    }
    void applyToggleStatus(row)
}

const confirmDisableLevel = async () => {
    const row = pendingStatusLevel.value
    showDisableConfirmModal.value = false
    pendingStatusLevel.value = null
    if (row) await applyToggleStatus(row)
}

const validateRetentionDeadline = (level: VIPLevel) => {
    if (level.rank === 0) return true
    const deadline = (level.retention_deadline || '').trim()
    const hasAnyRetentionValue = Number(level.retain_deposit || 0) > 0 || Number(level.retain_turnover || 0) > 0 || Number(level.retain_active_days || 0) > 0
    if (level.is_perpetual) {
        if (!deadline || deadline === '0') {
            message.error('無條件保級必須設定保級截止時間，且不可為 0')
            return false
        }
        if (Number.isNaN(Date.parse(deadline.replace(' ', 'T')))) {
            message.error('保級截止時間格式錯誤，請使用 YYYY-MM-DD HH:mm:ss')
            return false
        }
        if (!hasAnyRetentionValue) {
            message.error('無條件保級仍須設定當月儲值、當月投注或當月活躍其中一項')
            return false
        }
    } else if (deadline) {
        message.error('有條件保級不可設定保級截止時間，請清空欄位')
        return false
    }
    return true
}

const getRetentionDeadlineHint = (level: VIPLevel) => {
    if (level.rank === 0) return 'VIP0 為系統固定基礎等級，不適用保級截止時間。'
    if (!level.is_perpetual) return '有條件保級不使用截止時間，欄位應保持空白。'
    if (!level.retention_deadline) return '請設定截止時間；截止前無條件保級，截止後依當月條件判定。'
    const parsed = Date.parse(level.retention_deadline.replace(' ', 'T'))
    if (!Number.isNaN(parsed) && parsed <= Date.now()) return '截止時間已到，現在依當月儲值、投注、活躍天數條件判定。'
    return '截止時間前為無條件保級；到期後改依當月儲值、投注、活躍天數條件判定。'
}

const handleRetentionModeChange = (isPerpetual: boolean) => {
    // 切換為有條件保級時，截止時間不得殘留，避免送出矛盾設定。
    if (!isPerpetual) settingsLevel.retention_deadline = null
}

const validateLevelCriteria = (level: VIPLevel) => {
    const previousLevel = vipLevels.value
        .filter(item => item.rank < level.rank)
        .sort((a, b) => b.rank - a.rank)[0]
    if (!previousLevel) return true

    const checks: Array<[string, number | undefined, number | undefined]> = [
        ['歷史總儲值（晉級）', level.promo_deposit, previousLevel.promo_deposit],
        ['當月總投注額（晉級）', level.promo_turnover, previousLevel.promo_turnover]
    ]
    if (!level.is_perpetual) {
        checks.push(
            ['當月儲值（保級）', level.retain_deposit, previousLevel.retain_deposit],
            ['當月投注額（保級）', level.retain_turnover, previousLevel.retain_turnover],
            ['當月活躍天數（保級）', level.retain_active_days, previousLevel.retain_active_days]
        )
    }

    const invalid = checks.filter(([, current, previous]) => {
        const currentValue = Number(current || 0)
        const previousValue = Number(previous || 0)
        // 上一級已設定的門檻，下一級不得清空或低於；上一級未設定時，
        // 下一級可先維持未設定，待運營後續補齊。
        return previousValue > 0 && currentValue < previousValue
    })
    const bindingRank: Record<NonNullable<VIPLevel['bind_data']>, number> = {
        none: 0,
        phone: 1,
        email: 1,
        phone_email: 2
    }
    const previousBinding = bindingRank[previousLevel.bind_data || 'none']
    const currentBinding = bindingRank[level.bind_data || 'none']
    if (currentBinding < previousBinding) {
        invalid.push(['資料綁定條件', currentBinding, previousBinding])
    }
    if (invalid.length) {
        message.error(`以下條件不得低於上一級：${invalid.map(([label]) => label).join('、')}`)
        return false
    }
    return true
}

const executeSave = async (isSettings: boolean = false) => {
    const dataToSave = isSettings ? settingsLevel : editingLevel
    const creating = isNewLevel.value && !isSettings
    try {
        const res = creating
            ? await vipApi.createVIPLevel(dataToSave as VIPLevel)
            : await vipApi.updateVIPLevel(dataToSave as VIPLevel)
        if (res.code === 0) {
            message.success(t('common.success'))
            if (creating) initialSetupPendingRanks.add(dataToSave.rank)
            else initialSetupPendingRanks.delete(dataToSave.rank)
            if (isSettings) showSettingsModal.value = false
            else showEditModal.value = false
            fetchVIPData()
            isNewLevel.value = false
        } else {
            message.error(res.msg || '儲存失敗')
        }
    } catch (e) {
        message.error(t('common.error'))
    }
}

const handleSave = async (isSettings: boolean = false) => {
    const dataToSave = isSettings ? settingsLevel : editingLevel
    if (isSettings && (!validateRetentionDeadline(dataToSave) || !validateLevelCriteria(dataToSave))) return
    const isCreating = isNewLevel.value && !isSettings
    const isInitialSetup = initialSetupPendingRanks.has(dataToSave.rank)
    if (!isCreating && !isInitialSetup && dataToSave.status === 'INACTIVE' && getMemberCount(dataToSave.rank) > 0) {
        pendingSave.value = { isSettings }
        showInactiveImpactModal.value = true
        return
    }
    await executeSave(isSettings)
}

const confirmInactiveImpactSave = async () => {
    const saveRequest = pendingSave.value
    showInactiveImpactModal.value = false
    pendingSave.value = null
    if (saveRequest) await executeSave(saveRequest.isSettings)
}

const saveGlobalConfig = async () => {
    globalConfigSaving.value = true
    try {
        const res = await vipApi.updateVIPConfig({ demotion_limit_months: globalConfig.demotion_limit_months })
        if (res.code === 0) message.success('全域 N 設定已儲存')
        else message.error(res.msg || '全域設定儲存失敗')
    } finally {
        globalConfigSaving.value = false
    }
}

const validateAssetUpload = ({ file }: { file: UploadFileInfo }) => {
    const raw = file.file
    if (raw && raw.size > 5 * 1024 * 1024) {
        message.error('圖示或頭像框單檔不可超過 5MB')
        return false
    }
    return true
}

onMounted(fetchVIPData)
</script>

<template>
    <div class="p-6">
        <!-- Header Section -->
        <NCard class="premium-glass mb-6">
            <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <NIcon size="24" color="white"><StarOutline /></NIcon>
                    </div>
                    <div>
                        <h2 class="text-xl font-black text-slate-800 dark:text-white">{{ t('vip.title') }}</h2>
                        <p class="text-xs text-slate-500">管理營運自行建立的 VIP 等級、當月升降級條件與等級權益。</p>
                    </div>
                </div>
                <NButton type="primary" @click="handleAdd">新增 VIP 等級</NButton>
            </div>
        </NCard>

        <NCard class="premium-glass mb-6" title="VIP 升級／保級／降級排程規則">
            <div class="flex flex-wrap items-end gap-5">
                <NFormItem label="連續降級月數上限 N" show-require-mark>
                    <NInputNumber v-model:value="globalConfig.demotion_limit_months" :min="1" :max="15" style="width: 180px" />
                </NFormItem>
                <NFormItem label="排程時間">
                    <NTag type="info">升級每日 00:00；保級／降級每月 1 日 00:00（依系統時間）</NTag>
                </NFormItem>
                <NButton type="warning" :loading="globalConfigSaving" @click="saveGlobalConfig">儲存全域設定</NButton>
            </div>
            <p class="text-xs text-slate-500 mt-2">升級每日執行；保級／降級於每月 1 日結算前一完整月份，使用已啟用的儲值、投注與活躍天數條件。當月升級者當月不因保級不足而降級；每月最多降 1 級，連續降級達 N 個月後停止因保級失敗降級。</p>
        </NCard>

        <!-- Main Content (Table) -->
        <NCard class="premium-glass overflow-hidden" :content-style="{ padding: 0 }">
            <NDataTable 
                :loading="loading"
                :columns="columns"
                :data="vipLevels"
                :bordered="false"
                class="premium-table"
                :pagination="false"
            />
        </NCard>

        <!-- Edit Modal -->
        <NModal v-model:show="showEditModal" preset="card" :title="isNewLevel ? '新增 VIP 等級' : t('vip.editTitle', { rank: editingLevel.rank })" style="width: 800px">
            <div class="max-h-[70vh] overflow-y-auto pr-2 px-1">
                <NForm label-placement="left" label-width="120" label-align="right">
                    
                    <NDivider title-placement="left">{{ t('vip.basicInfo') }}</NDivider>
                    <NGrid :cols="2" :x-gap="24">
                        <NGridItem>
                            <NFormItem :label="t('vip.levelName')" required>
                                <NInput v-model:value="editingLevel.name" :placeholder="t('vip.levelName')" />
                            </NFormItem>
                        </NGridItem>
                        <NGridItem>
                            <NFormItem :label="t('vip.levelRank')">
                                <NInputNumber v-model:value="editingLevel.rank" :disabled="!isNewLevel" :min="0" style="width: 100%" />
                            </NFormItem>
                        </NGridItem>
                        <NGridItem>
                            <NFormItem label="狀態">
                                <NSelect v-model:value="editingLevel.status" :disabled="isNewLevel" :options="[{ label: '啟用', value: 'ACTIVE' }, { label: '停用', value: 'INACTIVE' }]" />
                                <p v-if="isNewLevel" class="mt-1 text-xs text-slate-500">新增後預設停用，完成設定後再由運營手動啟用。</p>
                            </NFormItem>
                        </NGridItem>
                    </NGrid>

                    <NDivider title-placement="left">{{ t('vip.visuals') }}</NDivider>
                    <NGrid :cols="2" :x-gap="24">
                        <NGridItem>
                            <NFormItem :label="t('vip.icon')">
                                <NUpload action="#prototype-upload" :max="1" accept=".svg,.png,.jpg,.webp" :default-upload="false" :on-before-upload="validateAssetUpload">
                                    <NUploadDragger>
                                        <div class="mb-2"><NIcon size="32" :depth="3"><CloudUploadOutline /></NIcon></div>
                                        <NText style="font-size: 13px">{{ t('vip.uploadHint') }}{{ t('vip.icon') }}</NText>
                                    </NUploadDragger>
                                </NUpload>
                            </NFormItem>
                        </NGridItem>
                        <NGridItem>
                            <NFormItem :label="t('vip.avatarFrame')">
                                <NUpload action="#prototype-upload" :max="1" accept=".svg,.png,.jpg,.webp" :default-upload="false" :on-before-upload="validateAssetUpload">
                                    <NUploadDragger>
                                        <div class="mb-2"><NIcon size="32" :depth="3"><CloudUploadOutline /></NIcon></div>
                                        <NText style="font-size: 13px">{{ t('vip.uploadHint') }}{{ t('vip.avatarFrame') }}</NText>
                                    </NUploadDragger>
                                </NUpload>
                            </NFormItem>
                        </NGridItem>
                    </NGrid>

                    <NTabs type="line" animated class="mt-4">
                        <NTabPane name="zh-TW" tab="繁體中文">
                            <NFormItem label="升級條件說明">
                                <NInput v-model:value="editingLevel.promotion_desc_zh_tw" type="textarea" :placeholder="t('vip.desc')" />
                            </NFormItem>
                            <NFormItem label="保級條件說明">
                                <NInput v-model:value="editingLevel.retention_desc_zh_tw" type="textarea" :disabled="editingLevel.is_perpetual" :placeholder="editingLevel.is_perpetual ? '無條件保級，無需特別說明' : '請填寫保級條件說明'" />
                            </NFormItem>
                            <NFormItem label="升級獎勵">
                                <NInput v-model:value="editingLevel.upgrade_reward_desc_zh_tw" type="textarea" placeholder="例如：首次升級即可獲得銀幣 100" />
                            </NFormItem>
                        </NTabPane>
                        <NTabPane name="zh-CN" tab="簡體中文">
                            <NFormItem label="升級條件說明">
                                <NInput v-model:value="editingLevel.promotion_desc_zh_cn" type="textarea" :placeholder="t('vip.desc')" />
                            </NFormItem>
                            <NFormItem label="保級條件說明">
                                <NInput v-model:value="editingLevel.retention_desc_zh_cn" type="textarea" :disabled="editingLevel.is_perpetual" :placeholder="editingLevel.is_perpetual ? '無條件保級，無需特別說明' : '請填寫保級條件說明'" />
                            </NFormItem>
                            <NFormItem label="升級獎勵">
                                <NInput v-model:value="editingLevel.upgrade_reward_desc_zh_cn" type="textarea" placeholder="例如：首次升级即可获得银币 100" />
                            </NFormItem>
                        </NTabPane>
                        <NTabPane name="en" tab="English">
                            <NFormItem label="升級條件說明">
                                <NInput v-model:value="editingLevel.promotion_desc_en" type="textarea" :placeholder="t('vip.desc')" />
                            </NFormItem>
                            <NFormItem label="保級條件說明">
                                <NInput v-model:value="editingLevel.retention_desc_en" type="textarea" :disabled="editingLevel.is_perpetual" :placeholder="editingLevel.is_perpetual ? '無條件保級，無需特別說明' : '請填寫保級條件說明'" />
                            </NFormItem>
                            <NFormItem label="升級獎勵">
                                <NInput v-model:value="editingLevel.upgrade_reward_desc_en" type="textarea" placeholder="e.g. Receive 100 Silver Coins upon first promotion" />
                            </NFormItem>
                        </NTabPane>
                    </NTabs>

                    <!-- V3 不在基本資料編輯視窗設定返水；返水欄位已從 VIP 設定移除。 -->
                    
                </NForm>
            </div>
            <template #footer>
                <div class="flex justify-end gap-3">
                    <NButton @click="showEditModal = false">{{ t('common.cancel') }}</NButton>
                    <NButton type="primary" @click="() => handleSave(false)" rounded>{{ t('common.save') }}配置</NButton>
                </div>
            </template>
        </NModal>

        <!-- Settings Modal -->
        <NModal v-model:show="showSettingsModal" preset="card" :title="`設定 VIP ${settingsLevel.rank} 條件`" style="width: 700px">
            <div class="max-h-[70vh] overflow-y-auto pr-2 px-1">
                <NForm label-placement="top" label-align="left">
                    
                    <NDivider title-placement="left">升級條件（已配置條件全部符合）</NDivider>
                    <NGrid :cols="3" :x-gap="24">
                        <NGridItem>
                            <NFormItem label="歷史總儲值（選填）">
                                <NInputNumber v-model:value="settingsLevel.promo_deposit" :min="0" style="width: 100%" />
                            </NFormItem>
                        </NGridItem>
                        <NGridItem>
                            <NFormItem label="當月總投注額（晉級，選填）">
                                <NInputNumber v-model:value="settingsLevel.promo_turnover" :min="0" style="width: 100%" />
                            </NFormItem>
                        </NGridItem>
                        <NGridItem>
                            <NFormItem label="綁定資料條件">
                                <NSelect v-model:value="settingsLevel.bind_data" :options="bindDataOptions" />
                            </NFormItem>
                        </NGridItem>
                    </NGrid>

                    <NDivider title-placement="left">升級獎勵</NDivider>
                    <NGrid :cols="2" :x-gap="24">
                        <NGridItem>
                            <NFormItem label="幣別">
                                <NSelect v-model:value="settingsLevel.upgrade_reward_currency" :options="upgradeRewardCurrencyOptions" />
                            </NFormItem>
                        </NGridItem>
                        <NGridItem>
                            <NFormItem label="數量">
                                <NInputNumber v-model:value="settingsLevel.upgrade_reward_amount" :min="0" style="width: 100%" />
                            </NFormItem>
                        </NGridItem>
                        <template v-if="settingsLevel.upgrade_reward_currency === 'SILVER'">
                            <NGridItem>
                                <NFormItem label="流水門檻倍率">
                                    <NInputNumber v-model:value="settingsLevel.upgrade_reward_turnover_multiplier" :min="0" :step="1" style="width: 100%" />
                                </NFormItem>
                            </NGridItem>
                            <NGridItem>
                                <NFormItem label="轉換上限">
                                    <NInputNumber v-model:value="settingsLevel.upgrade_reward_conversion_cap" :min="0" style="width: 100%" />
                                </NFormItem>
                            </NGridItem>
                        </template>
                    </NGrid>

                    <NDivider title-placement="left">
                        <div class="flex items-center gap-3">
                            <span>保級條件</span>
                            <NSwitch v-model:value="settingsLevel.is_perpetual" :checked-value="false" :unchecked-value="true" @update:value="handleRetentionModeChange">
                                <template #checked>開啟 (需保級)</template>
                                <template #unchecked>關閉 (無條件保級)</template>
                            </NSwitch>
                        </div>
                    </NDivider>
                    <NFormItem label="無條件保級截止時間" :required="settingsLevel.rank > 0">
                        <div class="w-full">
                            <NDatePicker
                                v-model:formatted-value="settingsLevel.retention_deadline"
                                type="datetime"
                                clearable
                                value-format="yyyy-MM-dd HH:mm:ss"
                                format="yyyy-MM-dd HH:mm:ss"
                                :disabled="!settingsLevel.is_perpetual || settingsLevel.rank === 0"
                                style="width: 100%"
                                placeholder="請選擇無條件保級截止日期與時間"
                            />
                            <p class="mt-1 text-xs" :class="settingsLevel.is_perpetual ? 'text-amber-600' : 'text-slate-500'">{{ getRetentionDeadlineHint(settingsLevel) }}</p>
                        </div>
                    </NFormItem>
                    <NGrid :cols="3" :x-gap="24">
                        <NGridItem>
                            <NFormItem label="當月儲值金額（至少填一項）">
                                <NInputNumber v-model:value="settingsLevel.retain_deposit" :min="0" style="width: 100%" />
                            </NFormItem>
                        </NGridItem>
                        <NGridItem>
                            <NFormItem label="當月投注額（至少填一項）">
                                <NInputNumber v-model:value="settingsLevel.retain_turnover" :min="0" style="width: 100%" />
                            </NFormItem>
                        </NGridItem>
                        <NGridItem>
                            <NFormItem label="當月活躍天數（至少填一項）">
                                <NInputNumber v-model:value="settingsLevel.retain_active_days" :min="0" style="width: 100%" />
                            </NFormItem>
                        </NGridItem>
                    </NGrid>
                    <p class="text-xs text-slate-500 mt-1">無條件保級期間不檢查上述門檻；三個欄位至少填一項，供截止後切換為有條件保級時使用。</p>
                    
                    <NDivider title-placement="left">VIP 權益設定</NDivider>
                    <NFormItem label="P2P 贈禮手續費 (%)">
                        <NInputNumber v-model:value="settingsLevel.gift_fee_rate" :min="0" :max="100" style="width: 100%" />
                    </NFormItem>
                    <p class="text-xs text-slate-500 mt-3">VIP0 為系統固定基礎等級；VIP1 以上不預設，由營運新增並完成設定後啟用。升級可配置「歷史總儲值」＋「當月總投注額」及綁定資料條件；保級可啟用當月儲值、投注與活躍天數條件，並可設定暫時無條件保級的截止時間。</p>
                    <p class="text-xs text-amber-600 mt-2">規則：已填寫的晉級／保級數值必須等於或高於上一個階級；未設定的選填條件不納入比較。</p>
                    
                </NForm>
            </div>
            <template #footer>
                <div class="flex justify-end gap-3">
                    <NButton @click="showSettingsModal = false">{{ t('common.cancel') }}</NButton>
                    <NButton type="warning" @click="() => handleSave(true)" rounded>{{ t('common.save') }}條件</NButton>
                </div>
            </template>
        </NModal>

        <!-- Disable confirmation: disable only skips this level for future transitions; existing members are unaffected. -->
        <NModal v-model:show="showDisableConfirmModal" preset="dialog" type="warning" title="運營商停用 VIP 等級確認" positive-text="確認停用" negative-text="取消" :mask-closable="false" @positive-click="confirmDisableLevel">
            <p v-if="pendingStatusLevel" class="leading-6">
                停用 VIP {{ pendingStatusLevel.rank }}（{{ pendingStatusLevel.name }}）後，其他 VIP 等級的會員在升級或降級判定時會略過此等級；目前已在此等級的會員不受影響，仍可正常升級、降級並享有原有 VIP 權益。
            </p>
            <p class="mt-2 text-xs text-slate-500">停用只影響後續等級流轉，不會移除會員目前等級或既有權益。</p>
        </NModal>

        <!-- Saving a disabled level requires a second impact confirmation. -->
        <NModal v-model:show="showInactiveImpactModal" preset="dialog" type="warning" title="運營商保存停用等級資料確認" positive-text="繼續保存" negative-text="取消" :mask-closable="false" @positive-click="confirmInactiveImpactSave">
            <p v-if="pendingSave">
                目前 VIP {{ (pendingSave.isSettings ? settingsLevel : editingLevel).rank }} 等級下有 <strong>{{ getMemberCount((pendingSave.isSettings ? settingsLevel : editingLevel).rank) }} 人</strong>，您的操作將會影響此 VIP 的會員，請問是否繼續？
            </p>
            <p class="mt-2 text-xs text-slate-500">停用狀態下保存的設定，將套用於此等級既有會員的權益與後續資料呈現；不會自動移轉會員等級。</p>
        </NModal>
    </div>
</template>

<style scoped>
.premium-glass {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
    border-radius: 16px;
}

:deep(.premium-table .n-data-table-th) {
    background-color: rgba(248, 250, 252, 0.8);
    font-weight: 800;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.05em;
    color: #64748b;
}

:deep(.premium-table .n-data-table-td) {
    padding: 16px;
}

:deep(.n-divider .n-divider__title) {
    font-weight: 700;
    color: #f59e0b;
}

:deep(.n-modal.n-card) {
    border-radius: 20px !important;
}
</style>
