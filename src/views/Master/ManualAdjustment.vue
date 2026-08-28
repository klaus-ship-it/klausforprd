<template>
    <div class="manual-adjustment-container flex flex-col gap-6">
        <!-- 頂部浮動搜尋區塊 -->
        <div class="sticky top-0 z-30 transition-all duration-300" :class="{ 'pt-2': isSticky }">
            <NCard 
                title="人工存提紀錄"
                size="small"
                class="rounded-xl shadow-sm border-0 premium-card transition-all duration-300" 
                :class="{ 'premium-glass shadow-xl mx-2': isSticky }"
            >
                <template #header-extra>
                    <div class="flex items-center gap-2">
                        <n-button type="primary" @click="openAdjustmentModal">人工存提</n-button>
                    </div>
                </template>
            </NCard>
        </div>

        <n-modal v-model:show="showAdjustmentModal" preset="card" title="人工存提操作" style="width: min(720px, calc(100vw - 32px))" :mask-closable="false">
            <n-form-item :show-label="false" :show-feedback="false" class="mb-4">
                <n-input-group>
                    <n-input v-model:value="searchId" placeholder="輸入玩家 ID" @keydown.enter="handleSearch" class="tech-input-light" />
                    <n-button type="primary" @click="handleSearch" :loading="searching">鎖定對象</n-button>
                </n-input-group>
            </n-form-item>
            <!-- 玩家資訊展示 -->
            <n-card v-if="player" class="rounded-xl shadow-sm border-0 premium-card">
                <n-alert type="info" title="當前鎖定玩家" class="mb-4">
                    <template #icon>
                        <n-icon>
                            <person-icon />
                        </n-icon>
                    </template>
                    <div class="player-info-grid">
                        <div class="info-item">
                            <span class="label">ID:</span>
                            <span class="value">{{ player.id }}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">帳號:</span>
                            <span class="value">{{ player.username }}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">暱稱:</span>
                            <span class="value">{{ player.display_name }}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">標籤:</span>
                            <n-tag v-for="tag in player.tags" :key="tag" size="small" type="warning" class="mr-1">
                                {{ tag }}
                            </n-tag>
                        </div>
                    </div>
                    <n-divider />
                    <div class="wallet-grid">
                        <!-- 儲值錢包 CASH -->
                        <div class="wallet-group">
                            <div class="wallet-group-label">💰 儲值錢包</div>
                            <div class="wallet-items">
                                <div class="wallet-item">
                                    <span class="wallet-currency gold">金幣</span>
                                    <span class="wallet-balance">{{ cashGold.toLocaleString() }}</span>
                                </div>
                                <div class="wallet-item">
                                    <span class="wallet-currency silver">銀幣</span>
                                    <span class="wallet-balance">{{ cashSilver.toLocaleString() }}</span>
                                </div>
                            </div>
                        </div>
                        <!-- 活動錢包 BONUS -->
                        <div class="wallet-group">
                            <div class="wallet-group-label">🎁 活動錢包</div>
                            <div class="wallet-items">
                                <div class="wallet-item">
                                    <span class="wallet-currency gold">金幣</span>
                                    <span class="wallet-balance">{{ bonusGold.toLocaleString() }}</span>
                                </div>
                                <div class="wallet-item">
                                    <span class="wallet-currency silver">銀幣</span>
                                    <span class="wallet-balance">{{ bonusSilver.toLocaleString() }}</span>
                                </div>
                            </div>
                        </div>
                        <!-- 保險箱 SAFE -->
                        <div class="wallet-group">
                            <div class="wallet-group-label">🔒 保險箱</div>
                            <div class="wallet-items">
                                <div class="wallet-item">
                                    <span class="wallet-currency gold">金幣</span>
                                    <span class="wallet-balance">{{ safeGold.toLocaleString() }}</span>
                                </div>
                            </div>
                        </div>
                        <!-- 遊戲錢包 GAME -->
                        <div class="wallet-group">
                            <div class="wallet-group-label">🎮 遊戲錢包</div>
                            <div class="wallet-items">
                                <div class="wallet-item">
                                    <span class="wallet-currency bronze">銅幣</span>
                                    <span class="wallet-balance">{{ gameBronze.toLocaleString() }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </n-alert>

                <!-- 2. Operation Form -->
                <n-form ref="formRef" :model="formModel" :rules="rules" label-placement="left" label-width="120" require-mark-placement="right-hanging">
                    
                    <n-form-item label="操作類型" path="type">
                        <n-radio-group v-model:value="formModel.type" name="type">
                            <n-space>
                                <n-radio value="DEPOSIT">人工存款 (加點)</n-radio>
                                <n-radio value="WITHDRAW">人工提款 (扣點)</n-radio>
                            </n-space>
                        </n-radio-group>
                    </n-form-item>

                    <n-form-item label="目標錢包" path="walletType">
                        <n-select v-model:value="formModel.walletType" :options="walletOptions" />
                    </n-form-item>

                    <n-form-item label="幣別" path="currency">
                        <n-select v-model:value="formModel.currency" :options="currencyOptions" />
                    </n-form-item>

                    <n-form-item label="調整金額" path="amount">
                        <n-input-number v-model:value="formModel.amount" :min="1" :precision="2" placeholder="輸入金額" style="width: 100%">
                            <template #prefix>$</template>
                        </n-input-number>
                    </n-form-item>

                    <n-form-item label="調整原因" path="reason">
                        <n-select v-model:value="formModel.reason" :options="reasonOptions" placeholder="請選擇原因" />
                    </n-form-item>

                    <n-form-item label="詳細備註" path="note">
                        <n-input v-model:value="formModel.note" type="textarea" placeholder="請輸入詳細說明 (至少 5 字)" />
                    </n-form-item>

                    <!-- Dynamic Fields -->
                    <n-form-item label="相關憑證" path="evidence" v-if="formModel.reason === 'OFFLINE_DEPOSIT'">
                        <n-upload
                            list-type="image-card"
                            :max="1"
                            accept="image/png, image/jpeg"
                            @change="handleUploadChange"
                            :default-file-list="fileList"
                        >
                            <div>上傳圖片</div>
                        </n-upload>
                    </n-form-item>

                    <n-form-item label="計入流水" path="isRollover" v-if="formModel.walletType === 'BONUS' && formModel.type === 'DEPOSIT'">
                        <n-switch v-model:value="formModel.isRollover" />
                    </n-form-item>

                    <n-form-item label="流水倍率" path="rolloverMultiplier" v-if="formModel.isRollover && formModel.walletType === 'BONUS' && formModel.type === 'DEPOSIT'">
                        <n-input-number v-model:value="formModel.rolloverMultiplier" :min="0" :step="1" placeholder="倍率" />
                    </n-form-item>

                    <n-form-item label="設定轉換上限" path="hasConversionCap" v-if="formModel.isRollover && formModel.walletType === 'BONUS' && formModel.type === 'DEPOSIT'">
                        <n-space align="center">
                            <n-switch v-model:value="formModel.hasConversionCap" />
                            <n-text depth="3" style="font-size:12px">開啟後，流水達標時轉入儲值錢包的金額將不超過上限</n-text>
                        </n-space>
                    </n-form-item>

                    <n-form-item label="轉換上限" path="conversionCap" v-if="formModel.isRollover && formModel.hasConversionCap && formModel.walletType === 'BONUS' && formModel.type === 'DEPOSIT'">
                        <n-input-number v-model:value="formModel.conversionCap" :min="1" :precision="2" placeholder="最高可轉換金額" style="width: 100%">
                            <template #prefix>$</template>
                        </n-input-number>
                    </n-form-item>

                    <n-form-item>
                        <n-button type="primary" @click="handleSubmit" :loading="submitting" size="large" block>
                            提交申請
                        </n-button>
                    </n-form-item>

                </n-form>
            </n-card>

        </n-modal>

        <div class="relative z-10">
            <n-card class="rounded-xl shadow-sm border-0 premium-card" content-class="p-0">
                <template #header-extra>
                    <n-tag type="info" round>共 {{ adjustmentTotal }} 筆</n-tag>
                </template>
                <div class="p-4 border-b border-slate-100">
                    <n-form inline :show-feedback="false" label-placement="left">
                        <n-form-item label="時間區間">
                            <n-date-picker
                                v-model:value="adjustmentQuery.timeRange"
                                type="datetimerange"
                                clearable
                                format="yyyy-MM-dd HH:mm"
                                style="width: 320px"
                            />
                        </n-form-item>
                        <n-form-item label="操作類型">
                            <n-select
                                v-model:value="adjustmentQuery.type"
                                :options="adjustmentTypeOptions"
                                clearable
                                placeholder="全部"
                                style="width: 140px"
                            />
                        </n-form-item>
                        <n-form-item label="玩家 ID">
                            <n-input v-model:value="adjustmentQuery.playerId" clearable placeholder="輸入玩家 ID" style="width: 160px" />
                        </n-form-item>
                        <n-space>
                            <n-button type="primary" :loading="adjustmentLoading" @click="handleAdjustmentSearch">查詢</n-button>
                            <n-button @click="resetAdjustmentSearch">重設</n-button>
                        </n-space>
                    </n-form>
                </div>
                <n-data-table
                    :columns="adjustmentColumns"
                    :data="adjustmentRecords"
                    :loading="adjustmentLoading"
                    :bordered="false"
                    :row-key="(row) => row.id"
                />
            </n-card>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted, onBeforeUnmount, h } from 'vue'
import { useMessage, FormInst, FormRules, NCard, NGrid, NGi, NFormItem, NInputGroup, NInput, NButton, NAlert, NIcon, NTag, NDivider, NStatistic, NForm, NRadioGroup, NSpace, NRadio, NSelect, NInputNumber, NUpload, NSwitch, NDatePicker, NDataTable, NModal } from 'naive-ui'
import { PersonOutline as PersonIcon } from '@vicons/ionicons5'
import { playerApi } from '@/api/player'
import { adjustmentApi, ADJUSTMENT_REASONS } from '@/api/adjustment'
import type { Player } from '@/types/player'
import type { UploadFileInfo } from 'naive-ui'
import type { AdjustmentRecord } from '@/api/adjustment'

const message = useMessage()
const showAdjustmentModal = ref(false)

const isSticky = ref(false)
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  isSticky.value = target.scrollTop > 20
}

onMounted(() => {
  fetchAdjustmentRecords()
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

// Search State
const searchId = ref('')
const searching = ref(false)
const player = ref<Player | null>(null)

const openAdjustmentModal = () => {
    searchId.value = ''
    player.value = null
    showAdjustmentModal.value = true
}

const getDefaultAdjustmentRange = (): [number, number] => {
    const end = new Date()
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
    return [start.getTime(), end.getTime()]
}

const adjustmentLoading = ref(false)
const adjustmentRecords = ref<AdjustmentRecord[]>([])
const adjustmentTotal = ref(0)
const adjustmentQuery = reactive({
    timeRange: getDefaultAdjustmentRange() as [number, number] | null,
    type: null as 'DEPOSIT' | 'WITHDRAW' | null,
    playerId: ''
})

const adjustmentTypeOptions = [
    { label: '人工加點', value: 'DEPOSIT' },
    { label: '人工扣點', value: 'WITHDRAW' }
]

const walletLabels: Record<AdjustmentRecord['walletType'], string> = {
    CASH: '儲值錢包', BONUS: '活動錢包', SAFE: '保險箱', GAME: '遊戲錢包'
}
const adjustmentCurrencyLabels: Record<AdjustmentRecord['currency'], string> = {
    GOLD: '金幣', SILVER: '銀幣', BRONZE: '銅幣'
}

const adjustmentColumns = [
    { title: '時間', key: 'createdAt', width: 170, render: (row: AdjustmentRecord) => row.createdAt.replace('T', ' ').slice(0, 16) },
    { title: '玩家', key: 'playerName', width: 150, render: (row: AdjustmentRecord) => h('div', [h('div', { class: 'font-medium' }, row.playerName), h('div', { class: 'text-xs text-gray-500' }, row.playerId)]) },
    { title: '操作', key: 'type', width: 110, render: (row: AdjustmentRecord) => h(NTag, { type: row.type === 'DEPOSIT' ? 'success' : 'error', bordered: false }, { default: () => row.type === 'DEPOSIT' ? '人工加點' : '人工扣點' }) },
    { title: '目標錢包', key: 'walletType', width: 120, render: (row: AdjustmentRecord) => walletLabels[row.walletType] },
    { title: '幣別', key: 'currency', width: 90, render: (row: AdjustmentRecord) => adjustmentCurrencyLabels[row.currency] },
    { title: '金額', key: 'amount', align: 'right' as const, render: (row: AdjustmentRecord) => h('span', { class: row.type === 'DEPOSIT' ? 'text-green-600 font-bold' : 'text-red-600 font-bold' }, `${row.type === 'DEPOSIT' ? '+' : '-'}${row.amount.toLocaleString()}`) },
    { title: '原因', key: 'reason', width: 150 },
    { title: '備註', key: 'note', ellipsis: true }
]

const fetchAdjustmentRecords = async () => {
    adjustmentLoading.value = true
    try {
        const res = await adjustmentApi.getAdjustments({
            startAt: adjustmentQuery.timeRange?.[0], endAt: adjustmentQuery.timeRange?.[1],
            type: adjustmentQuery.type || undefined, playerId: adjustmentQuery.playerId || undefined
        })
        if (res.code === 0 && res.data) {
            adjustmentRecords.value = res.data.list
            adjustmentTotal.value = res.data.total
        } else message.error(res.msg || '查詢人工存提紀錄失敗')
    } catch (e) {
        message.error('查詢人工存提紀錄失敗')
    } finally {
        adjustmentLoading.value = false
    }
}

const handleAdjustmentSearch = () => fetchAdjustmentRecords()
const resetAdjustmentSearch = () => {
    adjustmentQuery.timeRange = getDefaultAdjustmentRange()
    adjustmentQuery.type = null
    adjustmentQuery.playerId = ''
    fetchAdjustmentRecords()
}

// Form State
const formRef = ref<FormInst | null>(null)
const submitting = ref(false)
const fileList = ref<UploadFileInfo[]>([])

const formModel = reactive({
    type: 'DEPOSIT',
    walletType: 'CASH',
    currency: 'GOLD' as 'GOLD' | 'SILVER' | 'BRONZE',
    amount: null as number | null,
    reason: null as string | null,
    note: '',
    evidence: null as File | null,
    isRollover: false,
    rolloverMultiplier: 1,
    hasConversionCap: false,
    conversionCap: null as number | null
})

// Options
type AdjustmentType = 'DEPOSIT' | 'WITHDRAW'
type WalletType = 'CASH' | 'BONUS' | 'SAFE' | 'GAME'
type Currency = 'GOLD' | 'SILVER' | 'BRONZE'

const walletConfigurations: Record<AdjustmentType, { label: string; value: WalletType; currencies: Currency[] }[]> = {
    DEPOSIT: [
        { label: '儲值錢包 (Cash)', value: 'CASH', currencies: ['GOLD', 'SILVER'] },
        { label: '活動錢包 (Bonus)', value: 'BONUS', currencies: ['SILVER'] },
        { label: '保險箱 (Safe)', value: 'SAFE', currencies: ['GOLD'] },
        { label: '遊戲錢包 (Game)', value: 'GAME', currencies: ['BRONZE'] }
    ],
    WITHDRAW: [
        { label: '儲值錢包 (Cash)', value: 'CASH', currencies: ['GOLD', 'SILVER'] },
        { label: '保險箱 (Safe)', value: 'SAFE', currencies: ['GOLD'] },
        { label: '遊戲錢包 (Game)', value: 'GAME', currencies: ['BRONZE'] }
    ]
}

const currencyLabels: Record<Currency, string> = {
    GOLD: '金幣',
    SILVER: '銀幣',
    BRONZE: '銅幣'
}

const selectedWalletConfig = computed(() =>
    walletConfigurations[formModel.type as AdjustmentType].find(wallet => wallet.value === formModel.walletType)
)
const walletOptions = computed(() =>
    walletConfigurations[formModel.type as AdjustmentType].map(({ label, value }) => ({ label, value }))
)
const currencyOptions = computed(() =>
    (selectedWalletConfig.value?.currencies ?? []).map(value => ({ label: currencyLabels[value], value }))
)

watch(
    () => [formModel.type, formModel.walletType] as const,
    () => {
        const availableWallets = walletConfigurations[formModel.type as AdjustmentType]
        if (!availableWallets.some(wallet => wallet.value === formModel.walletType)) {
            formModel.walletType = availableWallets[0].value
        }
        const currencies = walletConfigurations[formModel.type as AdjustmentType]
            .find(wallet => wallet.value === formModel.walletType)?.currencies ?? []
        if (!currencies.includes(formModel.currency)) {
            formModel.currency = currencies[0]
        }
    },
    { immediate: true }
)

const reasonOptions = ADJUSTMENT_REASONS

// Computed - wallet balances per type+currency
const getWallet = (type: string, currency: string) =>
    player.value?.wallets.find(w => w.type === type && w.currency === currency)?.balance ?? 0

const cashGold = computed(() => getWallet('CASH', 'GOLD'))
const cashSilver = computed(() => getWallet('CASH', 'SILVER'))
const bonusGold = computed(() => getWallet('BONUS', 'GOLD'))
const bonusSilver = computed(() => getWallet('BONUS', 'SILVER'))
const safeGold = computed(() => getWallet('SAFE', 'GOLD'))
const gameBronze = computed(() => getWallet('GAME', 'BRONZE'))

const selectedWalletBalance = computed(() => getWallet(formModel.walletType, formModel.currency))

// Validation Rules
const rules: FormRules = {
    type: { required: true, message: '請選擇操作類型', trigger: 'change' },
    walletType: { required: true, message: '請選擇目標錢包', trigger: 'change' },
    amount: [
        { required: true, message: '請輸入金額', trigger: 'blur', type: 'number' as any },
        { 
            validator: (_rule: any, value: number) => {
                if (value <= 0) return new Error('金額必須大於 0')
                // Withdrawal check
                if (formModel.type === 'WITHDRAW' && player.value) {
                    if (value > selectedWalletBalance.value) return new Error('餘額不足')
                }
                return true
            },
            trigger: 'blur'
        }
    ],
    reason: { required: true, message: '請選擇調整原因', trigger: 'change' },
    note: [
        { required: true, message: '請輸入備註', trigger: 'blur' },
        { min: 5, message: '備註至少需要 5 個字', trigger: 'blur' }
    ],
    // Custom logic for evidence is handled in handleSubmit or via custom validator if needed more strictly
}

// Methods
const handleSearch = async () => {
    if (!searchId.value) return
    searching.value = true
    player.value = null
    try {
        const res = await playerApi.getPlayerDetail(searchId.value)
        if (res.code === 0 && res.data) {
            player.value = res.data
            message.success('已鎖定玩家')
        } else {
            message.error('找不到該玩家')
        }
    } catch (e) {
        message.error('搜尋失敗')
    } finally {
        searching.value = false
    }
}

const handleUploadChange = (data: { fileList: UploadFileInfo[] }) => {
    fileList.value = data.fileList
    if (data.fileList.length > 0 && data.fileList[0].file) {
        formModel.evidence = data.fileList[0].file
    } else {
        formModel.evidence = null
    }
}

const handleSubmit = async () => {
    if (!formRef.value || !player.value) return

    // Offline deposit proof check
    if (formModel.reason === 'OFFLINE_DEPOSIT' && !formModel.evidence) {
        message.error('線下充值必須上傳憑證')
        return
    }

    formRef.value.validate(async (errors) => {
        if (!errors) {
            
            // Warning for Test Account
            const isTestAccount = player.value?.tags.includes('測試帳號') || false
            if(isTestAccount) {
                 // Non-blocking warning via notification
                message.warning('注意：此為測試帳號操作')
            }

            submitting.value = true
            try {
                const res = await adjustmentApi.createAdjustment({
                    playerId: player.value!.id,
                    playerName: player.value!.username,
                    type: formModel.type as 'DEPOSIT' | 'WITHDRAW',
                    walletType: formModel.walletType as WalletType,
                    currency: formModel.currency,
                    amount: formModel.amount!,
                    reason: formModel.reason!,
                    note: formModel.note,
                    evidence: formModel.evidence,
                    isRollover: formModel.isRollover,
                    rolloverMultiplier: formModel.rolloverMultiplier,
                    hasConversionCap: formModel.hasConversionCap,
                    conversionCap: formModel.hasConversionCap ? formModel.conversionCap : undefined
                })

                if (res.code === 0) {
                    message.success('操作成功')
                    fetchAdjustmentRecords()
                    showAdjustmentModal.value = false
                    // Refresh player data to update balance
                    handleSearch()
                    // Reset form partially
                    formModel.amount = null
                    formModel.note = ''
                    formModel.evidence = null
                    fileList.value = []
                } else {
                    message.error(res.msg || '操作失敗')
                }
            } catch (e) {
                message.error('系統錯誤')
            } finally {
                submitting.value = false
            }
        } else {
            message.error('請檢查表單欄位')
        }
    })
}
</script>

<style scoped>
.manual-adjustment-container {
    /* padding: 24px; */ /* Removed to support edge-to-edge sticky */
    min-height: 100%;
}
.player-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
}
.info-item {
    display: flex;
    align-items: center;
}
.label {
    font-weight: bold;
    color: #666;
    margin-right: 8px;
}
.value {
    font-weight: 500;
}
.wallet-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 12px;
    margin-top: 12px;
}
.wallet-group {
    background: rgba(0, 0, 0, 0.03);
    border-radius: 8px;
    padding: 10px 12px;
    border: 1px solid rgba(0,0,0,0.06);
}
.wallet-group-label {
    font-size: 12px;
    font-weight: 600;
    color: #888;
    margin-bottom: 8px;
    white-space: nowrap;
}
.wallet-items {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.wallet-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
}
.wallet-currency {
    font-size: 11px;
    font-weight: 600;
    padding: 1px 7px;
    border-radius: 10px;
    white-space: nowrap;
}
.wallet-currency.gold {
    background: #fffbe6;
    color: #d48806;
    border: 1px solid #ffe58f;
}
.wallet-currency.silver {
    background: #f5f5f5;
    color: #595959;
    border: 1px solid #d9d9d9;
}
.wallet-currency.bronze {
    background: #fff2e8;
    color: #ad4e00;
    border: 1px solid #ffbb96;
}
.wallet-balance {
    font-size: 14px;
    font-weight: 600;
    color: #262626;
    font-variant-numeric: tabular-nums;
}
.mb-4 {
    margin-bottom: 16px;
}
.mr-1 {
    margin-right: 4px;
}
.ml-8 {
    margin-left: 32px;
}
</style>
