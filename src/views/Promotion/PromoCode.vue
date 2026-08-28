<script setup lang="ts">
import { ref, onMounted, reactive, h, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NCard,
  NButton,
  NIcon,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NSwitch,
  NDataTable,
  NSpace,
  NDatePicker,
  NTag,
  NPopconfirm,
  NCheckbox,
  NDivider,
  NAlert,
  useMessage,
  FormRules,
  FormInst
} from 'naive-ui'
import {
  SearchOutline,
  RefreshOutline,
  AddOutline,
  TrashOutline,
  CreateOutline as EditIcon,
  TicketOutline,
  GiftOutline,
  TimeOutline,
  InfiniteOutline,
  CalendarOutline
} from '@vicons/ionicons5'
import { promoCodeApi } from '@/api/promoCode'
import { PromoCode, PromoCodeQueryParams } from '@/types/promoCode'

const { t } = useI18n()
const message = useMessage()

// ── 列表狀態 ──────────────────────────────────────────────
const loading = ref(false)
const data = ref<PromoCode[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const queryParams = reactive<PromoCodeQueryParams>({
  page: 1,
  pageSize: 10,
  code: '',
  name: '',
  hasExpiry: '',
  hasMaxRedemptions: '',
  status: ''
})

// ── 表單狀態 ──────────────────────────────────────────────
const showModal = ref(false)
const modalType = ref<'create' | 'edit'>('create')
const editingId = ref<string | null>(null)
const formRef = ref<FormInst | null>(null)

interface FormValue {
  code: string
  name: string
  hasExpiry: boolean
  hasMaxRedemptions: boolean
  rewardType: 'GOLD' | 'SILVER' | 'BRONZE' | 'ACTIVITY_BONUS'
  rewardAmount: number
  timeRange: [number, number] | null
  maxRedemptions: number | null
  /** 活動金(銀幣)專用：流水門檻倍數，選填 */
  turnoverMultiplier: number | null
  /** 活動金(銀幣)專用：轉換上限，選填 */
  conversionLimit: number | null
  status: 'ACTIVE' | 'INACTIVE'
}

const formValue = reactive<FormValue>({
  code: '',
  name: '',
  hasExpiry: false,
  hasMaxRedemptions: false,
  rewardType: 'GOLD',
  rewardAmount: 100,
  timeRange: null,
  maxRedemptions: null,
  turnoverMultiplier: null,
  conversionLimit: null,
  status: 'ACTIVE'
})

// 計算目前優惠碼的性質標籤
const promoTagLabel = computed(() => {
  if (!formValue.hasExpiry && !formValue.hasMaxRedemptions) return '常駐優惠碼'
  const parts = []
  if (formValue.hasExpiry) parts.push('有效日期')
  if (formValue.hasMaxRedemptions) parts.push('次數限制')
  return parts.join(' + ')
})

// ── 驗證規則 ──────────────────────────────────────────────
const rules: FormRules = {
  code: [
    { required: true, message: '請輸入優惠碼代碼', trigger: 'blur' },
    { pattern: /^[A-Z0-9_]+$/, message: '優惠碼代碼僅能包含大寫英文、數字與下底線', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '請輸入優惠碼名稱', trigger: 'blur' }
  ],
  rewardAmount: [
    { required: true, type: 'number', min: 1, message: '請輸入大於 0 的獎勵數量', trigger: 'blur' }
  ],
  timeRange: [
    {
      validator: (_rule, value) => {
        if (formValue.hasExpiry && (!value || !value[0] || !value[1])) {
          return new Error('已勾選「有效日期」，請選擇有效日期區間')
        }
        return true
      },
      trigger: 'change'
    }
  ],
  maxRedemptions: [
    {
      validator: (_rule, value) => {
        if (formValue.hasMaxRedemptions) {
          if (value === null || value === undefined) {
            return new Error('已勾選「次數限制」，請輸入總兌換次數上限')
          }
          if (value <= 0) {
            return new Error('次數限制必須大於 0')
          }
        }
        return true
      },
      trigger: 'blur'
    }
  ]
}

// ── 選單選項 ──────────────────────────────────────────────
const rewardTypeOptions = [
  { label: '金幣', value: 'GOLD' },
  { label: '銀幣', value: 'SILVER' },
  { label: '銅幣', value: 'BRONZE' },
  { label: '活動金(銀幣)', value: 'ACTIVITY_BONUS' }
]

const statusOptions = [
  { label: '啟用', value: 'ACTIVE' },
  { label: '停用', value: 'INACTIVE' }
]

// ── 工具函式 ──────────────────────────────────────────────
const getRewardLabel = (type: string) => {
  const found = rewardTypeOptions.find(o => o.value === type)
  return found ? found.label : type
}

const getRewardColor = (type: string): 'warning' | 'default' | 'error' | 'success' | 'info' => {
  switch (type) {
    case 'GOLD': return 'warning'
    case 'SILVER': return 'default'
    case 'BRONZE': return 'error'
    case 'ACTIVITY_BONUS': return 'success'
    default: return 'info'
  }
}

const formatDateTime = (isoString?: string) => {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ── 資料讀取 ──────────────────────────────────────────────
const fetchData = async () => {
  loading.value = true
  try {
    queryParams.page = page.value
    queryParams.pageSize = pageSize.value
    const response = await promoCodeApi.getPromoCodes(queryParams)
    if (response.code === 0 && response.data) {
      data.value = response.data.items
      total.value = response.data.total
    }
  } catch (error) {
    console.error('Failed to fetch promo codes', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  fetchData()
}

const handleResetFilters = () => {
  queryParams.code = ''
  queryParams.name = ''
  queryParams.hasExpiry = ''
  queryParams.hasMaxRedemptions = ''
  queryParams.status = ''
  page.value = 1
  fetchData()
}

// ── CRUD 操作 ──────────────────────────────────────────────
const handleCreate = () => {
  modalType.value = 'create'
  editingId.value = null
  Object.assign(formValue, {
    code: '',
    name: '',
    hasExpiry: false,
    hasMaxRedemptions: false,
    rewardType: 'GOLD',
    rewardAmount: 100,
    timeRange: null,
    maxRedemptions: null,
    turnoverMultiplier: null,
    conversionLimit: null,
    status: 'ACTIVE'
  })
  showModal.value = true
}

const handleEdit = (row: PromoCode) => {
  modalType.value = 'edit'
  editingId.value = row.id
  Object.assign(formValue, {
    code: row.code,
    name: row.name,
    hasExpiry: row.hasExpiry,
    hasMaxRedemptions: row.hasMaxRedemptions,
    rewardType: row.rewardType,
    rewardAmount: row.rewardAmount,
    timeRange: row.startTime && row.endTime
      ? [new Date(row.startTime).getTime(), new Date(row.endTime).getTime()]
      : null,
    maxRedemptions: row.maxRedemptions ?? null,
    turnoverMultiplier: row.turnoverMultiplier ?? null,
    conversionLimit: row.conversionLimit ?? null,
    status: row.status
  })
  showModal.value = true
}

const handleSave = () => {
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      try {
        const isActivityBonus = formValue.rewardType === 'ACTIVITY_BONUS'
        const payload = {
          code: formValue.code,
          name: formValue.name,
          hasExpiry: formValue.hasExpiry,
          hasMaxRedemptions: formValue.hasMaxRedemptions,
          rewardType: formValue.rewardType,
          rewardAmount: formValue.rewardAmount,
          startTime: formValue.hasExpiry && formValue.timeRange ? new Date(formValue.timeRange[0]).toISOString() : undefined,
          endTime: formValue.hasExpiry && formValue.timeRange ? new Date(formValue.timeRange[1]).toISOString() : undefined,
          maxRedemptions: formValue.hasMaxRedemptions && formValue.maxRedemptions ? formValue.maxRedemptions : undefined,
          turnoverMultiplier: isActivityBonus && formValue.turnoverMultiplier != null ? formValue.turnoverMultiplier : undefined,
          conversionLimit: isActivityBonus && formValue.conversionLimit != null ? formValue.conversionLimit : undefined,
          status: formValue.status
        }

        if (modalType.value === 'create') {
          const res = await promoCodeApi.createPromoCode(payload)
          if (res.code === 0) message.success(t('promoCode.messages.createSuccess'))
        } else if (modalType.value === 'edit' && editingId.value) {
          const res = await promoCodeApi.updatePromoCode(editingId.value, payload)
          if (res.code === 0) message.success(t('promoCode.messages.updateSuccess'))
        }
        showModal.value = false
        fetchData()
      } catch (error) {
        console.error('Save failed', error)
      }
    }
  })
}

const handleDelete = async (id: string) => {
  try {
    const res = await promoCodeApi.deletePromoCode(id)
    if (res.code === 0) {
      message.success(t('promoCode.messages.deleteSuccess'))
      fetchData()
    }
  } catch (error) {
    console.error('Delete failed', error)
  }
}

const handleToggleStatus = async (row: PromoCode) => {
  try {
    const next = row.status !== 'ACTIVE'
    const res = await promoCodeApi.toggleStatus(row.id, next)
    if (res.code === 0) {
      message.success(t('promoCode.messages.statusChangeSuccess'))
      row.status = next ? 'ACTIVE' : 'INACTIVE'
    }
  } catch (error) {
    console.error('Toggle status failed', error)
  }
}

onMounted(fetchData)

// ── 表格欄位 ──────────────────────────────────────────────
const columns = [
  {
    title: '優惠碼代碼',
    key: 'code',
    width: 150,
    render: (row: PromoCode) =>
      h('span', { class: 'font-mono font-bold text-sky-500 tracking-wider' }, row.code)
  },
  {
    title: '名稱',
    key: 'name',
    ellipsis: { tooltip: true }
  },
  {
    title: '限制條件',
    key: 'constraints',
    width: 180,
    render: (row: PromoCode) => {
      const tags = []
      if (!row.hasExpiry && !row.hasMaxRedemptions) {
        tags.push(h(NTag, { type: 'success', size: 'small', round: true, bordered: false }, { default: () => '常駐' }))
      } else {
        if (row.hasExpiry) {
          tags.push(h(NTag, { type: 'info', size: 'small', round: true, bordered: false }, {
            icon: () => h(NIcon, { size: 12 }, { default: () => h(TimeOutline) }),
            default: () => '有期限'
          }))
        }
        if (row.hasMaxRedemptions) {
          tags.push(h(NTag, { type: 'warning', size: 'small', round: true, bordered: false }, {
            icon: () => h(NIcon, { size: 12 }, { default: () => h(InfiniteOutline) }),
            default: () => '次數限制'
          }))
        }
      }
      return h(NSpace, { size: 6 }, { default: () => tags })
    }
  },
  {
    title: '獎勵',
    key: 'reward',
    width: 160,
    render: (row: PromoCode) =>
      h(NTag, { type: getRewardColor(row.rewardType), bordered: false, size: 'small' }, {
        default: () => `${getRewardLabel(row.rewardType)}  ×  ${row.rewardAmount.toLocaleString()}`
      })
  },
  {
    title: '有效期間',
    key: 'period',
    render: (row: PromoCode) => {
      if (!row.hasExpiry) return h('span', { class: 'text-slate-400 text-xs' }, '無期限限制')
      return h('div', { class: 'text-xs font-mono text-slate-600 dark:text-slate-300 leading-5' }, [
        h('div', `${formatDateTime(row.startTime)}`),
        h('span', { class: 'text-slate-400 px-1' }, '～'),
        h('div', `${formatDateTime(row.endTime)}`)
      ])
    }
  },
  {
    title: '兌換進度',
    key: 'redemptions',
    width: 140,
    render: (row: PromoCode) => {
      if (!row.hasMaxRedemptions) {
        return h('div', { class: 'text-xs' }, [
          h('span', { class: 'font-mono font-bold text-slate-700 dark:text-slate-200' }, `${row.usedRedemptions.toLocaleString()}`),
          h('span', { class: 'text-slate-400 ml-1' }, '次 / 無上限')
        ])
      }
      const pct = row.maxRedemptions ? Math.round((row.usedRedemptions / row.maxRedemptions) * 100) : 0
      const barColor = pct >= 90 ? '#f56c6c' : pct >= 60 ? '#e6a23c' : '#18a058'
      return h('div', { class: 'space-y-1' }, [
        h('div', { class: 'text-xs font-mono' }, [
          h('span', { class: 'font-bold' }, `${row.usedRedemptions.toLocaleString()}`),
          h('span', { class: 'text-slate-400' }, ` / ${row.maxRedemptions?.toLocaleString()}`)
        ]),
        h('div', {
          style: {
            height: '4px',
            borderRadius: '2px',
            background: '#e5e7eb',
            overflow: 'hidden'
          }
        }, [
          h('div', {
            style: {
              width: `${Math.min(pct, 100)}%`,
              height: '100%',
              background: barColor,
              borderRadius: '2px',
              transition: 'width 0.3s'
            }
          })
        ])
      ])
    }
  },
  {
    title: '狀態',
    key: 'status',
    width: 80,
    render: (row: PromoCode) =>
      h(NSwitch, {
        value: row.status === 'ACTIVE',
        onUpdateValue: () => handleToggleStatus(row)
      })
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    render: (row: PromoCode) =>
      h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, {
            size: 'small',
            secondary: true,
            type: 'info',
            onClick: () => handleEdit(row)
          }, {
            icon: () => h(NIcon, null, { default: () => h(EditIcon) }),
            default: () => '編輯'
          }),
          h(NPopconfirm, {
            onPositiveClick: () => handleDelete(row.id),
            positiveText: '確認刪除',
            negativeText: '取消'
          }, {
            trigger: () => h(NButton, { size: 'small', secondary: true, type: 'error' }, {
              icon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
              default: () => '刪除'
            }),
            default: () => t('promoCode.deleteConfirm')
          })
        ]
      })
  }
]
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <NIcon :component="TicketOutline" class="text-sky-500" />
          {{ t('promoCode.title') }}
        </h2>
        <p class="text-sm text-slate-500 mt-1">管理前台玩家可領取的優惠碼與虛擬貨幣獎勵</p>
      </div>
      <NButton type="primary" @click="handleCreate">
        <template #icon><NIcon><AddOutline /></NIcon></template>
        {{ t('promoCode.addPromo') }}
      </NButton>
    </div>

    <!-- 搜尋篩選 -->
    <NCard class="rounded-2xl border-0 premium-glass">
      <div class="flex flex-wrap gap-4 items-end justify-between">
        <div class="flex flex-wrap gap-4">
          <div>
            <div class="text-xs text-slate-400 mb-1">優惠碼代碼</div>
            <NInput v-model:value="queryParams.code" placeholder="搜尋代碼" clearable style="width: 160px" @keyup.enter="handleSearch" />
          </div>
          <div>
            <div class="text-xs text-slate-400 mb-1">優惠碼名稱</div>
            <NInput v-model:value="queryParams.name" placeholder="搜尋名稱" clearable style="width: 160px" @keyup.enter="handleSearch" />
          </div>
          <div>
            <div class="text-xs text-slate-400 mb-1">有效期限</div>
            <NSelect
              v-model:value="queryParams.hasExpiry"
              style="width: 130px"
              :options="[
                { label: '全部', value: '' },
                { label: '有期限', value: true },
                { label: '無期限', value: false }
              ]"
            />
          </div>
          <div>
            <div class="text-xs text-slate-400 mb-1">次數限制</div>
            <NSelect
              v-model:value="queryParams.hasMaxRedemptions"
              style="width: 130px"
              :options="[
                { label: '全部', value: '' },
                { label: '有限制', value: true },
                { label: '無限制', value: false }
              ]"
            />
          </div>
          <div>
            <div class="text-xs text-slate-400 mb-1">狀態</div>
            <NSelect
              v-model:value="queryParams.status"
              style="width: 110px"
              :options="[{ label: '全部', value: '' }, ...statusOptions]"
            />
          </div>
        </div>
        <NSpace :size="10">
          <NButton secondary @click="handleResetFilters">
            <template #icon><NIcon><RefreshOutline /></NIcon></template>
            重置
          </NButton>
          <NButton type="primary" @click="handleSearch">
            <template #icon><NIcon><SearchOutline /></NIcon></template>
            搜尋
          </NButton>
        </NSpace>
      </div>
    </NCard>

    <!-- 資料表 -->
    <NCard class="rounded-2xl border-0 premium-glass">
      <NDataTable
        :columns="columns"
        :data="data"
        :loading="loading"
        :bordered="false"
        :striped="true"
        remote
        :pagination="{
          page,
          pageSize,
          itemCount: total,
          showSizePicker: true,
          pageSizes: [10, 20, 50],
          onChange: (p: number) => { page = p; fetchData() },
          onUpdatePageSize: (size: number) => { pageSize = size; page = 1; fetchData() }
        }"
      />
    </NCard>

    <!-- 新增 / 編輯彈窗 -->
    <NModal
      v-model:show="showModal"
      preset="card"
      style="width: 520px"
      class="rounded-2xl"
      :segmented="{ content: 'soft', footer: 'soft' }"
    >
      <template #header>
        <div class="flex items-center gap-2 font-bold">
          <NIcon :component="GiftOutline" class="text-sky-500" />
          {{ modalType === 'create' ? t('promoCode.addPromo') : t('promoCode.editPromo') }}
        </div>
      </template>

      <NForm
        ref="formRef"
        :model="formValue"
        :rules="rules"
        label-placement="left"
        label-width="110"
        require-mark-placement="right-hanging"
      >
        <!-- 優惠碼代碼 -->
        <NFormItem label="優惠碼代碼" path="code">
          <NInput
            v-model:value="formValue.code"
            placeholder="大寫英文/數字/下底線，如 WELCOME888"
            :disabled="modalType === 'edit'"
          />
        </NFormItem>

        <!-- 優惠碼名稱 -->
        <NFormItem label="優惠碼名稱" path="name">
          <NInput v-model:value="formValue.name" placeholder="請輸入說明名稱" />
        </NFormItem>

        <!-- 獎勵類型 -->
        <NFormItem label="獎勵類型" path="rewardType">
          <NSelect v-model:value="formValue.rewardType" :options="rewardTypeOptions" />
        </NFormItem>

        <!-- 獎勵數量 -->
        <NFormItem label="獎勵數量" path="rewardAmount">
          <NInputNumber v-model:value="formValue.rewardAmount" :min="1" style="width: 100%" />
        </NFormItem>

        <!-- 活動金(銀幣)專屬欄位 -->
        <Transition name="slide-fade">
          <div v-if="formValue.rewardType === 'ACTIVITY_BONUS'" class="space-y-0">
            <NFormItem label="流水門檻(倍)" path="turnoverMultiplier">
              <NInputNumber
                v-model:value="formValue.turnoverMultiplier"
                :min="0"
                :precision="0"
                placeholder="選填，請輸入流水門檻倍數"
                style="width: 100%"
                clearable
              />
            </NFormItem>
            <NFormItem label="轉換上限" path="conversionLimit">
              <NInputNumber
                v-model:value="formValue.conversionLimit"
                :min="0"
                :precision="0"
                placeholder="選填，請輸入轉換上限數值"
                style="width: 100%"
                clearable
              />
            </NFormItem>
          </div>
        </Transition>

        <NDivider style="margin: 4px 0 12px">
          <span class="text-xs text-slate-400 font-normal">限制條件設定</span>
        </NDivider>

        <!-- 動態特性說明 -->
        <NAlert
          :type="!formValue.hasExpiry && !formValue.hasMaxRedemptions ? 'success' : 'info'"
          :bordered="false"
          style="margin-bottom: 14px; border-radius: 10px"
        >
          <template #icon>
            <NIcon :component="formValue.hasExpiry || formValue.hasMaxRedemptions ? CalendarOutline : InfiniteOutline" />
          </template>
          <span class="text-sm font-medium">
            {{ !formValue.hasExpiry && !formValue.hasMaxRedemptions
              ? '⬇ 未勾選任何條件，此優惠碼為「常駐優惠碼」，永久有效且無兌換次數上限'
              : `⬇ 已啟用：${promoTagLabel}` }}
          </span>
        </NAlert>

        <!-- ✅ 有效日期 勾選 -->
        <NFormItem label="有效日期" path="hasExpiry">
          <div class="w-full space-y-3">
            <NCheckbox v-model:checked="formValue.hasExpiry">
              <span class="font-medium">啟用有效日期限制</span>
              <span class="text-slate-400 text-xs ml-1">（每個玩家限使用一次）</span>
            </NCheckbox>

            <!-- 日期區間輸入 - 動態顯示 -->
            <Transition name="slide-fade">
              <div v-if="formValue.hasExpiry" class="pl-6 pt-1">
                <NFormItem path="timeRange" :show-label="false" style="margin-bottom: 0">
                  <NDatePicker
                    v-model:value="formValue.timeRange"
                    type="datetimerange"
                    clearable
                    style="width: 100%"
                    :start-placeholder="'開始時間'"
                    :end-placeholder="'結束時間'"
                  />
                </NFormItem>
              </div>
            </Transition>
          </div>
        </NFormItem>

        <!-- ✅ 次數限制 勾選 -->
        <NFormItem label="次數限制" path="hasMaxRedemptions">
          <div class="w-full space-y-3">
            <NCheckbox v-model:checked="formValue.hasMaxRedemptions">
              <span class="font-medium">啟用總兌換次數上限</span>
              <span class="text-slate-400 text-xs ml-1">（全平台合計）</span>
            </NCheckbox>

            <!-- 次數輸入 - 動態顯示 -->
            <Transition name="slide-fade">
              <div v-if="formValue.hasMaxRedemptions" class="pl-6 pt-1">
                <NFormItem path="maxRedemptions" :show-label="false" style="margin-bottom: 0">
                  <NInputNumber
                    v-model:value="formValue.maxRedemptions"
                    :min="1"
                    placeholder="請輸入此優惠碼可兌換的總次數上限"
                    style="width: 100%"
                  />
                </NFormItem>
              </div>
            </Transition>
          </div>
        </NFormItem>

        <!-- 啟用狀態 -->
        <NFormItem label="狀態" path="status">
          <NSelect v-model:value="formValue.status" :options="statusOptions" />
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="flex justify-end gap-3">
          <NButton @click="showModal = false">取消</NButton>
          <NButton type="primary" @click="handleSave">儲存</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.premium-glass {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.dark .premium-glass {
  background: rgba(30, 41, 59, 0.75);
}

/* 動態展開動畫 */
.slide-fade-enter-active {
  transition: all 0.25s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
