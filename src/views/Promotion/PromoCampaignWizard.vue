<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  NCard, NSteps, NStep, NButton, NSpace, NForm, NFormItem, NInput,
  NSelect, NSwitch, NRadioGroup, NRadio, NDatePicker, NCheckboxGroup,
  NCheckbox, NInputNumber, NTreeSelect, NSpin, useMessage, NTag,
  NDynamicTags, NAlert, NDivider, NIcon, NScrollbar, NTooltip,
  NUpload, FormInst, FormRules, UploadFileInfo, NDynamicInput, NTimePicker
} from 'naive-ui'
import {
  SaveOutline, CheckmarkCircleOutline, ArrowBackOutline,
  ArrowForwardOutline, WarningOutline, InformationCircleOutline
} from '@vicons/ionicons5'
import { promoCampaignApi } from '@/api/promoCampaign'
import type { PromoCampaign, CreateCampaignPayload } from '@/types/promoCampaign'

const router = useRouter()
const route = useRoute()
const message = useMessage()

// ──────────────────────────────────────────────────────────────
// 狀態與資料
// ──────────────────────────────────────────────────────────────
const loading = ref(false)
const saving = ref(false)
const currentStep = ref(1)
const formRef = ref<FormInst | null>(null)

// 是否已有會員參加 (唯讀模式)
const hasParticipants = ref(false)
const isReadOnly = computed(() => hasParticipants.value)

// 模擬樹狀遊戲類型資料
const gameTreeData = [
  {
    key: 'JDB',
    label: 'JDB 品牌',
    children: [
      { key: 'JDB_SLOT', label: 'JDB 老虎機 (Slot)' },
      { key: 'JDB_FISH', label: 'JDB 捕魚 (Fish)' },
    ]
  },
  {
    key: 'PG',
    label: 'PG 品牌',
    children: [
      { key: 'PG_SLOT', label: 'PG 老虎機 (Slot)' },
    ]
  }
]

// 代理商與活動標籤選項
const tagOptions = ref<{ label: string, value: string }[]>([])
const agentOptions = ref<{ label: string, value: string }[]>([])
const campaignOptions = ref<{ label: string, value: string }[]>([])

// 標籤橋接 ref：NSelect 用純 id 陣列，儲存時再轉回 CampaignTag[]
const selectedTagIds = ref<string[]>([])

// ──────────────────────────────────────────────────────────────
// Step 2 選項定義
// ──────────────────────────────────────────────────────────────
const paymentMethodOptions = [
  { label: 'USDT', value: 'USDT' },
  { label: '信用卡', value: 'CREDIT_CARD' },
  { label: '銀行轉帳', value: 'BANK_TRANSFER' }
]

const depositConditionOptions = [
  { label: '無限制', value: null },
  { label: '總存款金額', value: 'TOTAL_DEPOSIT' },
  { label: '當日存款金額', value: 'TODAY_DEPOSIT' },
  { label: '首存金額', value: 'FIRST_DEPOSIT' },
  { label: '當日首存金額', value: 'TODAY_FIRST_DEPOSIT' },
  { label: '當周首次存款', value: 'WEEKLY_FIRST_DEPOSIT' },
  { label: '上週存款總額', value: 'LAST_WEEK_TOTAL' },
  { label: '當周存款總額', value: 'THIS_WEEK_TOTAL' },
  { label: '當月存款總額', value: 'THIS_MONTH_TOTAL' }
]

const freqPeriodOptions = [
  { label: '每日', value: 'DAILY' },
  { label: '每週', value: 'WEEKLY' },
  { label: '每月', value: 'MONTHLY' },
  { label: '指定星期', value: 'SPECIFIC_WEEKDAY' },
  { label: '指定日期', value: 'SPECIFIC_DATE' }
]

const weekdayOptions = [
  { label: '週一', value: 1 },
  { label: '週二', value: 2 },
  { label: '週三', value: 3 },
  { label: '週四', value: 4 },
  { label: '週五', value: 5 },
  { label: '週六', value: 6 },
  { label: '週日', value: 0 }
]

const dateOptions = Array.from({ length: 31 }, (_, i) => ({
  label: `${i + 1} 號`,
  value: i + 1
}))

const vipOptions = Array.from({ length: 16 }, (_, i) => ({
  label: `VIP ${i}`,
  value: `VIP${i}`
}))

// ──────────────────────────────────────────────────────────────
// 表單資料模型 (涵蓋 6 步驟)
// ──────────────────────────────────────────────────────────────
const formData = reactive<Partial<CreateCampaignPayload>>({
  name: '',
  tags: [],
  systemTags: ['SYSTEM_DEFAULT'],
  status: 'Inactive',
  frontendVisible: true,
  frontendApply: true,
  applyBlockMessage: '',
  joinStart: '',
  joinEnd: '',
  settlementDeadline: '',
  description: '',
  
  conditions: {
    requirePreviousTurnover: false,
    excludeTags: [],
    requiredCampaigns: [],
    requiredCampaignsLogic: 'ALL',
    depositSource: 'MAIN_WALLET',
    allowedPaymentMethods: [],
    deductionMode: 'FIXED',
    participationAmount: 0,
    depositConditionType: null,
    firstDepositWithin24h: false,
    depositAmountThreshold: null,
    appOnly: false,
    maxParticipantsPerUser: 1,
    maxParticipantsPerIp: 1,
    maxParticipantsPerDevice: 1,
    monthlyDepositCount: 0,
    freqCalcMode: '1D',
    freqPeriod: 'DAILY',
    freqSpecificWeekdays: [],
    freqSpecificDates: [],
    timeRanges: []
  },
  
  targetAudience: {
    totalLimit: 0,
    dailyLimit: 0,
    vipLevels: ['VIP1', 'VIP2', 'VIP3', 'VIP4', 'VIP5'],
    memberTags: [],
    agents: [],
    registerDateStart: null,
    registerDateEnd: null
  },
  
  gameSettings: {
    allowedGameTypes: [],
    blockStrategy: 'BLOCK'
  },
  
  rewardSettings: {
    rewardType: 'FIXED',
    rewardValue: 0,
    maxReward: 0,
    maxWithdrawal: 0
  },
  
  releaseConditions: {
    loseThreshold: 5,
    netwinCheck: true,
    achieveModes: ['TURNOVER'],
    turnoverMode: 'FIXED',
    turnoverValue: null,
    gameWeights: [{ gameType: 'SLOT', ratioA: 1, ratioB: 1, weight: 1.0 }],
    netwinThreshold: null,
    balanceThreshold: null,
    autoNextCampaign: false,
    nextCampaignId: null
  }
})

// 表單時間綁定用
const joinDateRange = ref<[number, number] | null>(null)
const settleDate = ref<number | null>(null)
const registerDateRange = ref<[number, number] | null>(null)

// ──────────────────────────────────────────────────────────────
// 表單驗證規則 (Form Validation Rules)
// ──────────────────────────────────────────────────────────────
const rules: FormRules = {
  name: { required: true, message: '請輸入活動名稱', trigger: ['blur', 'input'] },
  status: { required: true, message: '請選擇活動狀態', trigger: 'change' },
  'conditions.depositSource': { required: true, message: '請選擇參加金額來源', trigger: 'change' },
  'conditions.deductionMode': { required: true, message: '請選擇參加金額扣款模式', trigger: 'change' },
  'targetAudience.totalLimit': { type: 'number', required: true, message: '必填', trigger: ['blur', 'change'] },
  'targetAudience.dailyLimit': { type: 'number', required: true, message: '必填', trigger: ['blur', 'change'] },
  'gameSettings.allowedGameTypes': { type: 'array', required: true, message: '請至少選擇一種遊戲', trigger: 'change' },
  'rewardSettings.rewardValue': { type: 'number', required: true, message: '必填', trigger: ['blur', 'change'] },
  'releaseConditions.loseThreshold': { type: 'number', required: true, message: '必填', trigger: ['blur', 'change'] }
}

// ──────────────────────────────────────────────────────────────
// 初始化
// ──────────────────────────────────────────────────────────────
onMounted(async () => {
  loading.value = true
  try {
    const [tagsRes, agentsRes, campsRes] = await Promise.all([
      promoCampaignApi.getTags(),
      promoCampaignApi.getAgentChannels(),
      promoCampaignApi.getCampaigns({ page: 1, pageSize: 100 }) // mock
    ])
    tagOptions.value = (tagsRes.data || []).map(t => ({ label: t.name, value: t.id }))
    agentOptions.value = (agentsRes.data || []).map(a => ({ label: a.name, value: a.id }))
    campaignOptions.value = (campsRes.data?.items || []).map(c => ({ label: c.name, value: c.id }))
    
    // 若為編輯模式，載入資料
    const id = route.query.id as string
    if (id) {
      const res = await promoCampaignApi.getCampaign(id)
      if (res.code === 0 && res.data) {
        Object.assign(formData, res.data)
        // 標籤轉換：CampaignTag[] → string[] (id 陣列) 供 NSelect 用
        selectedTagIds.value = (res.data.tags || []).map((t: any) =>
          typeof t === 'string' ? t : t.id
        )
        if (res.data.joinStart && res.data.joinEnd) {
          joinDateRange.value = [new Date(res.data.joinStart).getTime(), new Date(res.data.joinEnd).getTime()]
        }
        if (res.data.settlementDeadline) {
          settleDate.value = new Date(res.data.settlementDeadline).getTime()
        }
        if (res.data.targetAudience?.registerDateStart && res.data.targetAudience?.registerDateEnd) {
          registerDateRange.value = [
            new Date(res.data.targetAudience.registerDateStart).getTime(),
            new Date(res.data.targetAudience.registerDateEnd).getTime()
          ]
        }
        // 判斷是否唯讀
        if (res.data.participants && res.data.participants.joined > 0) {
          hasParticipants.value = true
          message.warning('此活動已有會員參加，目前處於唯讀模式。', { duration: 5000 })
        }
      } else {
        message.error('載入活動失敗')
        router.back()
      }
    }
  } finally {
    loading.value = false
  }
})

// ──────────────────────────────────────────────────────────────
// 方法與驗證
// ──────────────────────────────────────────────────────────────

import { watch } from 'vue'

watch(() => formData.releaseConditions?.autoNextCampaign, (val) => {
  if (!val && formData.releaseConditions) {
    formData.releaseConditions.nextCampaignId = null
  }
})

watch(() => formData.gameSettings?.allowedGameTypes, (newTypes) => {
  if (newTypes && formData.releaseConditions) {
    const existing = formData.releaseConditions.gameWeights || []
    formData.releaseConditions.gameWeights = newTypes.map(type => {
      const found = existing.find(w => w.gameType === type)
      return found ? found : { gameType: type, ratioA: 1, ratioB: 1, weight: 1.0 }
    })
  }
}, { deep: true })

const handleNext = async () => {
  try {
    await formRef.value?.validate()
  } catch (errors) {
    message.error('請先完成當前步驟的必填欄位')
    return
  }

  // AC1: Step 2 & 5 聯動驗證
  if (currentStep.value === 5) {
    if (formData.rewardSettings?.rewardType === 'MULTIPLY') {
      if (!formData.conditions?.deductionMode) {
        message.warning('此活動參加條件未設定 [扣款模式]，無法選擇倍率獎金！')
        return
      }
    }
  }
  if (currentStep.value < 6) currentStep.value++
}

const handlePrev = () => {
  if (currentStep.value > 1) currentStep.value--
}

const formatDateTime = (ts: number) => {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const preparePayload = () => {
  const payload = { ...formData }

  // 標籤轉換：string[] (id) → CampaignTag[] 儲存
  payload.tags = selectedTagIds.value.map(id => {
    const found = tagOptions.value.find(o => o.value === id)
    return found
      ? { id, name: found.label, color: '#6366f1' }
      : { id, name: id, color: '#6366f1' }
  })

  if (joinDateRange.value) {
    payload.joinStart = formatDateTime(joinDateRange.value[0])
    payload.joinEnd = formatDateTime(joinDateRange.value[1])
  }
  if (settleDate.value) {
    payload.settlementDeadline = formatDateTime(settleDate.value)
  }
  if (registerDateRange.value && payload.targetAudience) {
    payload.targetAudience.registerDateStart = formatDateTime(registerDateRange.value[0])
    payload.targetAudience.registerDateEnd = formatDateTime(registerDateRange.value[1])
  } else if (payload.targetAudience) {
    payload.targetAudience.registerDateStart = null
    payload.targetAudience.registerDateEnd = null
  }

  // 計算遊戲權重 (ratioA / ratioB)
  if (payload.releaseConditions && payload.releaseConditions.gameWeights) {
    payload.releaseConditions.gameWeights = payload.releaseConditions.gameWeights.map(gw => ({
      ...gw,
      weight: (gw.ratioA !== undefined && gw.ratioB) ? gw.ratioA / gw.ratioB : 1.0
    }))
  }

  return payload
}

const handleSaveDraft = async () => {
  saving.value = true
  try {
    const payload = preparePayload()
    const res = await promoCampaignApi.saveDraft(payload)
    if (res.code === 0) {
      message.success('草稿儲存成功！')
      router.push({ name: 'PromoCampaigns' })
    }
  } finally {
    saving.value = false
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
  } catch (errors) {
    message.error('尚有欄位未填寫正確，請檢查表單')
    return
  }
  if (!joinDateRange.value || !settleDate.value) {
    message.error('請選擇參加時間與最後結算時間')
    currentStep.value = 1
    return
  }
  
  saving.value = true
  try {
    const payload = preparePayload()
    const res = await promoCampaignApi.submitCampaign(payload)
    if (res.code === 0) {
      message.success('活動建立完成！')
      router.push({ name: 'PromoCampaigns' })
    }
  } finally {
    saving.value = false
  }
}

// 模擬 AC2 (Netwin查核失敗)
const simulateNetwinCheck = () => {
  message.error('尚有未結算注單，請稍後再試 (AC2)')
}

</script>

<template>
  <div class="h-[calc(100vh-60px)] flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
    <!-- 頁首 -->
    <div class="px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0 shadow-sm z-10">
      <div class="flex items-center gap-3">
        <NButton quaternary circle @click="router.back()">
          <template #icon><NIcon size="20"><ArrowBackOutline /></NIcon></template>
        </NButton>
        <div>
          <h1 class="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            {{ route.query.id ? '編輯活動' : '新增活動' }}
            <NTag v-if="isReadOnly" type="error" size="small" round>
              唯讀模式 (已有參加者)
            </NTag>
          </h1>
          <div class="text-xs text-slate-500 font-mono mt-0.5">Campaign Wizard</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <NButton v-if="!isReadOnly" size="medium" secondary @click="handleSaveDraft" :loading="saving">
          <template #icon><NIcon><SaveOutline /></NIcon></template>儲存草稿
        </NButton>
        <!-- 模擬 AC2 按鈕 -->
        <NTooltip>
          <template #trigger>
            <NButton v-if="isReadOnly" size="medium" secondary type="warning" @click="simulateNetwinCheck">
              模擬解招(AC2)
            </NButton>
          </template>
          測試 Netwin 查核阻擋邏輯
        </NTooltip>
      </div>
    </div>

    <NSpin :show="loading" class="flex-1 min-h-0">
      <div class="h-full flex flex-col">
        
        <!-- 步驟條 -->
        <div class="px-8 py-5 shrink-0 bg-white dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700/50">
          <NSteps :current="currentStep" status="process" size="small">
            <NStep title="1. 基本資訊" />
            <NStep title="2. 參加條件" />
            <NStep title="3. 玩家篩選" />
            <NStep title="4. 遊戲設定" />
            <NStep title="5. 獎勵設定" />
            <NStep title="6. 達成與解除" />
          </NSteps>
        </div>

        <!-- 內容區 -->
        <div class="flex-1 min-h-0 p-6 overflow-hidden flex justify-center">
          <NCard class="max-w-4xl w-full h-full rounded-2xl shadow-sm border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur" :content-style="{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }">
            <NScrollbar class="flex-1 px-8 py-6">
              
              <NForm ref="formRef" :model="formData" :rules="rules" :disabled="isReadOnly" label-placement="top" size="medium" class="max-w-3xl">
                
                <!-- ＝＝＝＝＝ Step 1 ＝＝＝＝＝ -->
                <div v-show="currentStep === 1" class="space-y-5 fade-in">
                  <h2 class="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <NIcon><InformationCircleOutline /></NIcon> 基本資訊
                  </h2>
                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <NFormItem label="活動名稱" path="name">
                      <NInput v-model:value="formData.name" placeholder="請輸入前/後台顯示名稱" />
                    </NFormItem>
                    <NFormItem label="活動狀態" path="status">
                      <NRadioGroup v-model:value="formData.status">
                        <NSpace>
                          <NRadio value="Active">開啟 (Active)</NRadio>
                          <NRadio value="Inactive">關閉 (Inactive)</NRadio>
                        </NSpace>
                      </NRadioGroup>
                    </NFormItem>
                  </div>

                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <NFormItem label="活動標籤 (排他檢查用)">
                      <NSelect
                        v-model:value="selectedTagIds"
                        multiple
                        filterable
                        placeholder="請選擇標籤"
                        :options="tagOptions"
                        max-tag-count="responsive"
                        clearable
                      />
                    </NFormItem>
                    <NFormItem label="保留系統標籤">
                      <NDynamicTags v-model:value="formData.systemTags" disabled />
                    </NFormItem>
                  </div>

                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <NFormItem label="前台顯示與申請">
                      <NSpace size="large">
                        <NCheckbox v-model:checked="formData.frontendVisible">前台顯示</NCheckbox>
                        <NCheckbox v-model:checked="formData.frontendApply">開放申請</NCheckbox>
                      </NSpace>
                    </NFormItem>
                    <NFormItem label="文案阻擋提示 (關閉申請時)">
                      <NInput v-model:value="formData.applyBlockMessage" placeholder="例如：此活動已結束，請期待下次活動！" />
                    </NFormItem>
                  </div>

                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <NFormItem label="參加時間區間" required>
                      <NDatePicker v-model:value="joinDateRange" type="datetimerange" clearable />
                    </NFormItem>
                    <NFormItem label="最後結算時間 (流水統計截止)" required>
                      <NDatePicker v-model:value="settleDate" type="datetime" clearable />
                    </NFormItem>
                  </div>
                  
                  <NFormItem label="活動描述 (支援 Markdown/HTML)">
                    <NInput v-model:value="formData.description" type="textarea" :rows="4" placeholder="請填寫前台顯示的活動規則..." />
                  </NFormItem>

                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <NFormItem label="活動列表圖 (List Image)">
                      <NUpload accept="image/*" max="1" :default-file-list="formData.listImage ? [{ id: '1', name: 'list.jpg', status: 'finished', url: formData.listImage }] : []" @finish="({ file }) => { formData.listImage = file.name; return file }">
                        <NButton>上傳圖片</NButton>
                      </NUpload>
                    </NFormItem>
                    <NFormItem label="活動 Banner (Banner Image)">
                      <NUpload accept="image/*" max="1" :default-file-list="formData.bannerImage ? [{ id: '2', name: 'banner.jpg', status: 'finished', url: formData.bannerImage }] : []" @finish="({ file }) => { formData.bannerImage = file.name; return file }">
                        <NButton>上傳圖片</NButton>
                      </NUpload>
                    </NFormItem>
                  </div>
                </div>

                <!-- ＝＝＝＝＝ Step 2 ＝＝＝＝＝ -->
                <div v-show="currentStep === 2" class="space-y-5 fade-in">
                  <h2 class="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <NIcon><InformationCircleOutline /></NIcon> 參加條件
                  </h2>
                  <NAlert type="info" :show-icon="false" class="mb-4">
                    設定會員申請活動所需的門檻與風控規則。若未達成，前台清單仍會顯示該活動，但在點擊申請時阻擋。
                  </NAlert>
                  
                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <NFormItem label="須滿足先前流水">
                      <NSwitch v-model:value="formData.conditions!.requirePreviousTurnover" />
                    </NFormItem>
                    <NFormItem label="不可重複參加標籤 (防刷)">
                      <NSelect v-model:value="formData.conditions!.excludeTags" multiple :options="tagOptions" placeholder="選擇標籤" />
                    </NFormItem>
                  </div>

                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <NFormItem label="須先參加的活動">
                      <NSelect v-model:value="formData.conditions!.requiredCampaigns" multiple filterable :options="campaignOptions" placeholder="選擇先決活動" />
                    </NFormItem>
                    <NFormItem label="先決活動條件邏輯">
                      <NRadioGroup v-model:value="formData.conditions!.requiredCampaignsLogic" :disabled="!formData.conditions!.requiredCampaigns.length">
                        <NSpace>
                          <NRadio value="ALL">全部 (ALL)</NRadio>
                          <NRadio value="ANY">任一 (ANY)</NRadio>
                        </NSpace>
                      </NRadioGroup>
                    </NFormItem>
                  </div>

                  <NDivider dashed>金額與扣款門檻</NDivider>

                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <NFormItem label="參加金額來源" path="conditions.depositSource">
                      <NSelect v-model:value="formData.conditions!.depositSource" :options="[
                        {label: '主錢包餘額', value: 'MAIN_WALLET'},
                        {label: '24小時存款', value: 'DEPOSIT_24H'},
                        {label: '當日單筆存款', value: 'DEPOSIT_TODAY'}
                      ]" />
                    </NFormItem>
                    <NFormItem label="指定存款方式">
                      <NSelect 
                        v-model:value="formData.conditions!.allowedPaymentMethods" 
                        multiple 
                        :options="paymentMethodOptions" 
                        placeholder="選填，不限管道則留空"
                        :disabled="formData.conditions!.depositSource === 'MAIN_WALLET'"
                      />
                    </NFormItem>
                  </div>

                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <NFormItem label="參加金額扣款模式" path="conditions.deductionMode">
                      <NRadioGroup v-model:value="formData.conditions!.deductionMode">
                        <NSpace>
                          <NRadio value="FIXED">固定金額</NRadio>
                          <NRadio value="INPUT">依輸入金額 (門檻)</NRadio>
                        </NSpace>
                      </NRadioGroup>
                    </NFormItem>
                    <NFormItem label="參加金額門檻/數值">
                      <NInputNumber v-model:value="formData.conditions!.participationAmount" :min="0" :precision="2" clearable placeholder="輸入金額" />
                    </NFormItem>
                  </div>

                  <NDivider dashed>存款與次數門檻</NDivider>

                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <NFormItem label="存款金額條件類別">
                      <NSelect v-model:value="formData.conditions!.depositConditionType" :options="depositConditionOptions" placeholder="無限制" clearable />
                    </NFormItem>
                    <NFormItem label="首存限 24 小時內完成">
                      <NCheckbox 
                        v-model:checked="formData.conditions!.firstDepositWithin24h"
                        :disabled="formData.conditions!.depositConditionType !== 'FIRST_DEPOSIT'"
                      >
                        啟用
                      </NCheckbox>
                    </NFormItem>
                  </div>
                  
                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <NFormItem label="存款門檻金額">
                      <NInputNumber 
                        v-model:value="formData.conditions!.depositAmountThreshold" 
                        :min="0" 
                        :precision="2" 
                        clearable 
                        placeholder="請輸入門檻"
                        :disabled="!formData.conditions!.depositConditionType"
                      />
                    </NFormItem>
                    <NFormItem label="當月存款次數限制">
                      <NInputNumber v-model:value="formData.conditions!.monthlyDepositCount" :min="0" placeholder="0 為不限制" />
                    </NFormItem>
                  </div>

                  <NDivider dashed>頻率與次數風控</NDivider>
                  
                  <div class="grid grid-cols-3 gap-x-4 gap-y-1">
                    <NFormItem label="玩家總次數上限">
                      <NInputNumber v-model:value="formData.conditions!.maxParticipantsPerUser" :min="1" />
                    </NFormItem>
                    <NFormItem label="同 IP 可參加次數">
                      <NInputNumber v-model:value="formData.conditions!.maxParticipantsPerIp" :min="1" />
                    </NFormItem>
                    <NFormItem label="同機碼可參加次數">
                      <NInputNumber v-model:value="formData.conditions!.maxParticipantsPerDevice" :min="1" />
                    </NFormItem>
                  </div>

                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <NFormItem label="參加頻率計算模式">
                      <NRadioGroup v-model:value="formData.conditions!.freqCalcMode">
                        <NSpace>
                          <NRadio value="24H">24小時制</NRadio>
                          <NRadio value="1D">1日制 (跨日重置)</NRadio>
                        </NSpace>
                      </NRadioGroup>
                    </NFormItem>
                    <NFormItem label="APP 限定">
                      <NSwitch v-model:value="formData.conditions!.appOnly" />
                    </NFormItem>
                  </div>

                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <NFormItem label="參加頻率週期">
                      <NSelect v-model:value="formData.conditions!.freqPeriod" :options="freqPeriodOptions" />
                    </NFormItem>
                    <NFormItem label="指定星期/日期">
                      <NSelect 
                        v-if="formData.conditions!.freqPeriod === 'SPECIFIC_WEEKDAY'"
                        v-model:value="formData.conditions!.freqSpecificWeekdays" 
                        multiple 
                        :options="weekdayOptions" 
                        placeholder="選擇星期"
                      />
                      <NSelect 
                        v-else-if="formData.conditions!.freqPeriod === 'SPECIFIC_DATE'"
                        v-model:value="formData.conditions!.freqSpecificDates" 
                        multiple 
                        :options="dateOptions" 
                        placeholder="選擇日期"
                      />
                      <div v-else class="text-slate-400 text-sm mt-1">
                        無需設定 (依週期自然解鎖)
                      </div>
                    </NFormItem>
                  </div>

                  <NFormItem label="時段限制 (每日開放申請區段)">
                    <NDynamicInput v-model:value="formData.conditions!.timeRanges" :on-create="() => ({ start: null, end: null })">
                      <template #default="{ value }">
                        <div class="flex items-center gap-2 w-full">
                          <NTimePicker v-model:formatted-value="value.start" value-format="HH:mm:ss" placeholder="開始時間" clearable style="width: 150px" />
                          <span>~</span>
                          <NTimePicker v-model:formatted-value="value.end" value-format="HH:mm:ss" placeholder="結束時間" clearable style="width: 150px" />
                        </div>
                      </template>
                    </NDynamicInput>
                  </NFormItem>

                </div>

                <!-- ＝＝＝＝＝ Step 3 ＝＝＝＝＝ -->
                <div v-show="currentStep === 3" class="space-y-5 fade-in">
                  <h2 class="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <NIcon><InformationCircleOutline /></NIcon> 玩家篩選
                  </h2>

                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <NFormItem label="總參加人數上限 (0 為不限)" required>
                      <NInputNumber v-model:value="formData.targetAudience!.totalLimit" :min="0" />
                    </NFormItem>
                    <NFormItem label="每日可參加人數 (0 為不限)" required>
                      <NInputNumber v-model:value="formData.targetAudience!.dailyLimit" :min="0" />
                    </NFormItem>
                  </div>

                  <NFormItem label="會員等級限制" required>
                    <NSelect v-model:value="formData.targetAudience!.vipLevels" multiple :options="vipOptions" placeholder="選擇 VIP 等級" />
                  </NFormItem>

                  <NFormItem label="會員註冊日期區間">
                    <NDatePicker v-model:value="registerDateRange" type="daterange" clearable placeholder="限指定註冊日期的會員" />
                  </NFormItem>

                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <NFormItem label="指定會員標籤">
                      <NSelect v-model:value="formData.targetAudience!.memberTags" multiple :options="tagOptions" placeholder="選擇標籤" />
                    </NFormItem>
                    <NFormItem label="限定代理商">
                      <NSelect v-model:value="formData.targetAudience!.agents" multiple filterable :options="agentOptions" placeholder="選擇總代理" />
                    </NFormItem>
                  </div>
                </div>

                <!-- ＝＝＝＝＝ Step 4 ＝＝＝＝＝ -->
                <div v-show="currentStep === 4" class="space-y-5 fade-in">
                  <h2 class="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <NIcon><InformationCircleOutline /></NIcon> 遊戲設定
                  </h2>

                  <NFormItem label="指定允許遊戲類型" required>
                    <NTreeSelect
                      v-model:value="formData.gameSettings!.allowedGameTypes"
                      multiple
                      cascade
                      checkable
                      :options="gameTreeData"
                      placeholder="選擇允許的遊戲品牌或類別"
                    />
                  </NFormItem>

                  <NFormItem label="跨遊戲類別阻擋策略" required>
                    <NRadioGroup v-model:value="formData.gameSettings!.blockStrategy">
                      <NSpace vertical>
                        <NRadio value="BLOCK">開啟阻擋 (不允許進入非活動遊戲)</NRadio>
                        <NRadio value="ALLOW_NO_TURNOVER">允許進入，但不計入活動流水</NRadio>
                      </NSpace>
                    </NRadioGroup>
                  </NFormItem>
                </div>

                <!-- ＝＝＝＝＝ Step 5 ＝＝＝＝＝ -->
                <div v-show="currentStep === 5" class="space-y-5 fade-in">
                  <h2 class="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <NIcon><InformationCircleOutline /></NIcon> 獎勵設定
                  </h2>

                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <NFormItem label="獎金發放方式" required>
                      <NRadioGroup v-model:value="formData.rewardSettings!.rewardType">
                        <NSpace>
                          <NRadio value="FIXED">定值 (Fixed)</NRadio>
                          <NRadio value="MULTIPLY">倍率 (Multiply)</NRadio>
                        </NSpace>
                      </NRadioGroup>
                    </NFormItem>
                    <NFormItem :label="formData.rewardSettings!.rewardType === 'FIXED' ? '發放金額' : '發放倍率'" required>
                      <NInputNumber v-model:value="formData.rewardSettings!.rewardValue" :min="0" :step="0.5" />
                    </NFormItem>
                  </div>

                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <NFormItem label="最大獎金金額 (0 為不限)" required>
                      <NInputNumber v-model:value="formData.rewardSettings!.maxReward" :min="0" />
                    </NFormItem>
                    <NFormItem label="獎金發放上限 / 帶出上限 (0 為不限)" required>
                      <NInputNumber v-model:value="formData.rewardSettings!.maxWithdrawal" :min="0" />
                    </NFormItem>
                  </div>
                  
                  <!-- AC3 保障說明 -->
                  <div class="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 mt-4">
                    <div class="text-xs text-blue-700 dark:text-blue-300 font-bold mb-1">ℹ 帶出上限 (AC3) 說明</div>
                    <p class="text-xs text-blue-600 dark:text-blue-400">
                      當會員達成過招條件解招時，若活動錢包餘額超過此「帶出上限」，系統會自動回收超出部分，僅將上限金額轉入主錢包。
                    </p>
                  </div>
                </div>

                <!-- ＝＝＝＝＝ Step 6 ＝＝＝＝＝ -->
                <div v-show="currentStep === 6" class="space-y-5 fade-in">
                  <h2 class="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <NIcon><InformationCircleOutline /></NIcon> 達成與解除條件
                  </h2>

                  <NDivider dashed>解除條件 (Release Conditions)</NDivider>
                  
                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <NFormItem label="解除條件餘額" required>
                      <NInputNumber v-model:value="formData.releaseConditions!.loseThreshold" :min="0" :precision="2" placeholder="當餘額小於此值即為失敗" />
                    </NFormItem>
                    <NFormItem label="Netwin 查核">
                      <NSwitch v-model:value="formData.releaseConditions!.netwinCheck" />
                      <div class="text-xs text-slate-400 mt-1">強制驗證 Netwin 算式，防範未結算注單套利</div>
                    </NFormItem>
                  </div>

                  <NDivider dashed>達成條件 (Achieve Conditions)</NDivider>
                  
                  <NFormItem label="達成條件類型 (可多選，AND 邏輯)" required>
                    <NCheckboxGroup v-model:value="formData.releaseConditions!.achieveModes">
                      <NSpace>
                        <NCheckbox value="TURNOVER">押碼量 (Bet Amount)</NCheckbox>
                        <NCheckbox value="NETWIN">輸贏 (Netwin)</NCheckbox>
                        <NCheckbox value="BALANCE">錢包餘額 (Balance)</NCheckbox>
                      </NSpace>
                    </NCheckboxGroup>
                  </NFormItem>

                  <div v-if="formData.releaseConditions!.achieveModes.includes('TURNOVER')" class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 space-y-4">
                    <div class="font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">押碼量設定</div>
                    
                    <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                      <NFormItem label="押碼量計算模式" required>
                        <NRadioGroup v-model:value="formData.releaseConditions!.turnoverMode">
                          <NSpace>
                            <NRadio value="FIXED">定值 (固定門檻)</NRadio>
                            <NRadio value="MULTIPLY">倍率 (本金+贈金)x倍率</NRadio>
                          </NSpace>
                        </NRadioGroup>
                      </NFormItem>
                      <NFormItem label="押碼量數值 / 倍率" required>
                        <NInputNumber 
                          v-model:value="formData.releaseConditions!.turnoverValue" 
                          :min="0" 
                          :precision="formData.releaseConditions!.turnoverMode === 'FIXED' ? 0 : 2" 
                          :placeholder="formData.releaseConditions!.turnoverMode === 'FIXED' ? '請輸入正整數' : '請輸入倍率'"
                        />
                      </NFormItem>
                    </div>

                    <div>
                      <div class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">各遊戲類型比例 (Game Type Ratios) A : B</div>
                      <div v-if="formData.releaseConditions!.gameWeights && formData.releaseConditions!.gameWeights.length === 0" class="text-xs text-slate-400 mb-2">
                        💡 請先至 Step 4 勾選允許的遊戲類型
                      </div>
                      <div v-for="(weight, idx) in formData.releaseConditions!.gameWeights" :key="idx" class="flex items-center gap-3 mb-2">
                        <NTag type="info" class="w-32 justify-center">{{ weight.gameType }}</NTag>
                        <NInputNumber v-model:value="weight.ratioA" :min="0" :precision="0" style="width: 100px" placeholder="A" />
                        <span class="text-slate-500 font-bold">:</span>
                        <NInputNumber v-model:value="weight.ratioB" :min="1" :precision="0" style="width: 100px" placeholder="B" />
                        <div class="text-xs text-slate-400 ml-2">折算率: {{ weight.ratioB ? Math.round((weight.ratioA / weight.ratioB) * 100) : 0 }}%</div>
                      </div>
                    </div>
                  </div>

                  <div v-if="formData.releaseConditions!.achieveModes.includes('NETWIN')" class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
                    <NFormItem label="累積輸贏門檻 (Netwin Target)" required>
                      <NInputNumber v-model:value="formData.releaseConditions!.netwinThreshold" :precision="2" placeholder="請輸入 Netwin 門檻" />
                    </NFormItem>
                  </div>

                  <div v-if="formData.releaseConditions!.achieveModes.includes('BALANCE')" class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
                    <NFormItem label="錢包餘額門檻 (Balance Target)" required>
                      <NInputNumber v-model:value="formData.releaseConditions!.balanceThreshold" :min="0" :precision="2" placeholder="請輸入餘額門檻" />
                    </NFormItem>
                  </div>

                  <NDivider dashed>自動參加活動 (Auto-Join Next Activity)</NDivider>
                  
                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <NFormItem label="達成後自動參加下一活動">
                      <NSwitch v-model:value="formData.releaseConditions!.autoNextCampaign" />
                    </NFormItem>
                    <NFormItem label="目標續接活動">
                      <NSelect 
                        v-model:value="formData.releaseConditions!.nextCampaignId" 
                        :options="campaignOptions" 
                        filterable 
                        placeholder="請選擇目標活動"
                        :disabled="!formData.releaseConditions!.autoNextCampaign"
                      />
                    </NFormItem>
                  </div>
                </div>

              </NForm>
            </NScrollbar>
          </NCard>
        </div>
        
        <!-- 頁尾控制按鈕 -->
        <div class="px-8 py-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0 flex justify-between items-center z-10">
          <div>
            <!-- 佔位符 -->
          </div>
          <div class="flex items-center gap-3">
            <NButton size="large" @click="handlePrev" :disabled="currentStep === 1">
              <template #icon><NIcon><ArrowBackOutline /></NIcon></template> 上一步
            </NButton>
            
            <NButton v-if="currentStep < 6" size="large" type="primary" @click="handleNext">
              下一步 <template #icon><NIcon><ArrowForwardOutline /></NIcon></template>
            </NButton>
            
            <NButton v-if="currentStep === 6 && !isReadOnly" size="large" type="primary" @click="handleSubmit" :loading="saving">
              <template #icon><NIcon><CheckmarkCircleOutline /></NIcon></template> 完成並儲存
            </NButton>
          </div>
        </div>

      </div>
    </NSpin>
  </div>
</template>

<style scoped>
.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
