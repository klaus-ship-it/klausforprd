<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, h, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { 
  NGrid, NGridItem, NDataTable, NButton, NSpace, NTag, NIcon,
  NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch, NModal, 
  NProgress, NImage, NTabs, NTabPane, NScrollbar, useMessage, useDialog,
  DataTableColumns 
} from 'naive-ui'
import { 
  Search, AddOutline, SettingsOutline, 
  TrashOutline, CreateOutline
} from '@vicons/ionicons5'
import { paymentChannelApi } from '@/api/paymentChannel'
import { PaymentChannel, ChannelStatus } from '@/types/paymentChannel'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const channels = ref<PaymentChannel[]>([])
const total = ref(0)

// Pending Changes Logic
const pendingChanges = ref<Record<string, Partial<PaymentChannel>>>({})
const hasPendingChanges = computed(() => Object.keys(pendingChanges.value).length > 0)
const showSaveConfirmModal = ref(false)

const searchForm = reactive({
  name: undefined as string | undefined,
  provider: undefined as string | undefined,
  status: undefined as ChannelStatus | undefined
})

const showModal = ref(false)
const modalLoading = ref(false)
const isEdit = ref(false)
const formModel = reactive<Partial<PaymentChannel>>({
  name: '',
  provider: '',
  type: 'WEB_REDIRECT',
  icon: '',
  merchantId: '',
  apiKey: '',
  secretKey: '',
  notifyUrl: '',
  minLimit: 100,
  maxLimit: 50000,
  dailyLimit: 0,
  platforms: ['WEB'],
  minVipLevel: 0,
  tags: [],
  isAuditMasked: false,
  status: 'OPEN',
  sortOrder: 10
})

const providerOptions = [
  { label: 'ApplePay', value: 'ApplePay' },
  { label: 'GooglePay', value: 'GooglePay' },
  { label: 'Alipay', value: 'Alipay' },
  { label: 'WechatPay', value: 'WechatPay' },
  { label: 'MyCard', value: 'MyCard' },
  { label: 'Stripe', value: 'Stripe' }
]

const tagOptions = [
  { label: t('player.tags.一般玩家'), value: 'NORMAL' },
  { label: t('player.tags.測試帳號'), value: 'TEST_GROUP' },
  { label: t('player.tags.高風險'), value: 'HIGH_RISK' }
]

const columns: DataTableColumns<PaymentChannel> = [
  {
    title: t('finance.paymentChannel.sort'),
    key: 'sortOrder',
    width: 100,
    align: 'center',
    render: (row) => {
      const pending = pendingChanges.value[row.id]?.sortOrder
      const value = pending !== undefined ? pending : row.sortOrder
      return h(NInputNumber, {
        value: value,
        size: 'small',
        min: 1,
        max: 999,
        onUpdateValue: (val) => handleQuickEdit(row.id, 'sortOrder', val)
      })
    }
  },
  {
    title: t('finance.paymentChannel.name'),
    key: 'name',
    minWidth: 200,
    render: (row) => h('div', { class: 'flex items-center gap-3' }, [
      h(NImage, { width: 32, height: 32, src: row.icon, previewDisabled: true, class: 'rounded shadow-sm' }),
      h('div', [
        h('div', { class: 'font-bold text-slate-700' }, row.name),
        h('div', { class: 'text-[10px] text-slate-400 uppercase' }, `${row.provider} / ${row.type}`)
      ])
    ])
  },
  {
    title: t('finance.paymentChannel.limitRange'),
    key: 'limitRange',
    minWidth: 160,
    render: (row) => h('div', { class: 'text-[12px] font-mono' }, [
      h('span', { class: 'text-slate-500' }, `$${row.minLimit.toLocaleString()}`),
      h('span', { class: 'mx-1 text-slate-300' }, '~'),
      h('span', { class: 'text-slate-800 font-bold' }, `$${row.maxLimit.toLocaleString()}`)
    ])
  },
  {
    title: `${t('finance.paymentChannel.dailyAccomplished')} / ${t('finance.paymentChannel.dailyLimit')}`,
    key: 'limit',
    minWidth: 200,
    render: (row) => {
      const percentage = row.dailyLimit > 0 ? (row.dailyAccomplished / row.dailyLimit) * 100 : 0
      const status = percentage > 95 ? 'error' : percentage > 80 ? 'warning' : 'success'
      return h('div', { class: 'w-full pr-4' }, [
        h('div', { class: 'flex justify-between text-[10px] mb-1 font-mono font-bold' }, [
          h('span', { class: 'text-slate-500' }, `$${row.dailyAccomplished.toLocaleString()}`),
          h('span', { class: 'text-slate-400' }, row.dailyLimit === 0 ? t('common.none') : `$${row.dailyLimit.toLocaleString()}`)
        ]),
        h(NProgress, {
          type: 'line',
          percentage: Math.min(percentage, 100),
          status: status,
          indicatorPlacement: 'inside',
          showIndicator: false,
          height: 6,
          borderRadius: 3
        })
      ])
    }
  },
  {
    title: t('finance.paymentChannel.vipLevel'),
    key: 'vip',
    minWidth: 120,
    render: (row) => h(NTag, { size: 'small', type: 'info', bordered: false }, { 
      default: () => t('finance.paymentChannel.vipLevelShort', { level: row.minVipLevel }) 
    })
  },
  {
    title: t('common.status'),
    key: 'status',
    minWidth: 120,
    render: (row) => {
      const pending = pendingChanges.value[row.id]?.status
      const currentStatus = pending !== undefined ? pending : row.status
      return h(NSelect, {
        value: currentStatus,
        size: 'small',
        options: [
          {label: getStatusLabel('OPEN'), value: 'OPEN'},
          {label: getStatusLabel('CLOSED'), value: 'CLOSED'},
          {label: getStatusLabel('MAINTENANCE'), value: 'MAINTENANCE'}
        ],
        onUpdateValue: (val) => handleQuickEdit(row.id, 'status', val)
      })
    }
  },
  {
    title: t('finance.paymentChannel.auditMask'),
    key: 'audit',
    width: 80,
    render: (row) => {
      const pending = pendingChanges.value[row.id]?.isAuditMasked
      const value = pending !== undefined ? pending : row.isAuditMasked
      return h(NSwitch, {
        value: value,
        size: 'small',
        onUpdateValue: (val) => handleQuickEdit(row.id, 'isAuditMasked', val)
      })
    }
  },
  {
    title: t('common.action'),
    key: 'actions',
    width: 100,
    render: (row) => h(NSpace, { size: 'small' }, {
      default: () => [
        h(NButton, { size: 'tiny', quaternary: true, type: 'info', onClick: () => openEdit(row) }, { icon: () => h(NIcon, null, { default: () => h(SettingsOutline) }) }),
        h(NButton, { size: 'tiny', quaternary: true, type: 'error', onClick: () => handleRemove(row.id) }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) })
      ]
    })
  }
]

// 輔助函式
function getStatusLabel(status: ChannelStatus) {
  const map: Record<ChannelStatus, string> = {
    OPEN: t('common.enable'), 
    CLOSED: t('common.disable'), 
    MAINTENANCE: t('game.list.maintenance'), 
    FUSED: t('finance.paymentChannel.status_fused') || t('finance.paymentChannel.status', { status: 'FUSED' }) // Use a fallback if specific translation missing
  }
  // If we don't have a specific fused translation, let's just use what's available or the key
  return map[status] || status
}

// 快速編輯邏輯
const handleQuickEdit = (id: string, field: string, value: any) => {
  const original = channels.value.find(c => c.id === id)
  if (!original) return
  
  if (!pendingChanges.value[id]) {
    pendingChanges.value[id] = {}
  }
  
  if (original[field as keyof PaymentChannel] === value) {
    delete pendingChanges.value[id][field as keyof PaymentChannel]
    if (Object.keys(pendingChanges.value[id]).length === 0) {
      delete pendingChanges.value[id]
    }
  } else {
    pendingChanges.value[id][field as keyof PaymentChannel] = value
  }
}

const loadData = async () => {
  loading.value = true
  pendingChanges.value = {} // 重置暫存異動
  try {
    const res = await paymentChannelApi.list(searchForm)
    if (res.code === 0) {
      channels.value = res.data.items
      total.value = res.data.total
    }
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  isEdit.value = false
  Object.assign(formModel, {
    name: '', provider: '', type: 'WEB_REDIRECT', icon: '',
    merchantId: '', apiKey: '', secretKey: '', notifyUrl: '',
    minLimit: 100, maxLimit: 50000, dailyLimit: 0,
    platforms: ['WEB'], minVipLevel: 0, tags: [],
    isAuditMasked: false, status: 'OPEN', sortOrder: 10
  })
  showModal.value = true
}

const openEdit = (row: PaymentChannel) => {
  isEdit.value = true
  Object.assign(formModel, JSON.parse(JSON.stringify(row)))
  showModal.value = true
}

const handleSave = async () => {
  modalLoading.value = true
  try {
    const api = isEdit.value ? paymentChannelApi.update(formModel.id!, formModel) : paymentChannelApi.create(formModel)
    const res = await api
    if (res.code === 0) {
      message.success(res.msg)
      showModal.value = false
      loadData()
    } else {
      message.error(res.msg)
    }
  } finally {
    modalLoading.value = false
  }
}

const handleBatchSave = async () => {
  loading.value = true
  try {
    const promises = Object.entries(pendingChanges.value).map(([id, changes]) => 
      paymentChannelApi.update(id, changes)
    )
    const results = await Promise.all(promises)
    const successCount = results.filter(r => r.code === 0).length
    
    if (successCount === results.length) {
      message.success(t('common.success'))
    } else {
      message.warning(`部分存取失敗 (${successCount}/${results.length})`)
    }
    
    showSaveConfirmModal.value = false
    loadData()
  } catch (err) {
    message.error(t('common.error'))
  } finally {
    loading.value = false
  }
}

const handleRemove = async (id: string) => {
  dialog.warning({
    title: t('common.warning'),
    content: t('finance.paymentChannel.deleteConfirm'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      const res = await paymentChannelApi.remove(id)
      if (res.code === 0) {
        message.success(res.msg)
        loadData()
      }
    }
  })
}

const isSticky = ref(false)
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  isSticky.value = target.scrollTop > 20
}

onMounted(() => {
  loadData()
  
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
  <div class="premium-container p-6 min-h-full flex flex-col gap-6 w-full">
    <div class="tech-glow glow-1"></div>

    <!-- 頂部浮動區塊 -->
    <div class="sticky top-0 z-30 transition-all duration-300 flex flex-col gap-4" :class="{ 'pt-2': isSticky }">
      <div 
        class="transition-all duration-300"
        :class="{ 'premium-glass shadow-xl mx-2 p-4 rounded-xl': isSticky, 'relative z-10': !isSticky }"
      >
        <!-- 標題與操作區 -->
        <div class="flex justify-between items-center mb-4">
        <div class="flex items-center gap-3">
          <div class="w-2 h-8 bg-blue-500 rounded-full"></div>
          <div>
            <h1 class="text-2xl font-black text-slate-800 leading-none">{{ t('finance.paymentChannel.title') }}</h1>
            <p class="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Payment Gateways & Traffic Control</p>
          </div>
        </div>
        <NSpace>
          <NButton 
            type="warning" 
            :disabled="!hasPendingChanges" 
            @click="showSaveConfirmModal = true"
            :loading="loading"
            class="tech-btn-light"
          >
            <template #icon><NIcon><CreateOutline /></NIcon></template>
            {{ t('finance.paymentChannel.accessOperation') }}
            <span v-if="hasPendingChanges" class="ml-1">({{ Object.keys(pendingChanges).length }})</span>
          </NButton>
          <NButton type="info" color="#0369a1" @click="openCreate" class="tech-btn-light">
            <template #icon><NIcon><AddOutline /></NIcon></template>
            {{ t('finance.paymentChannel.addChannel') }}
          </NButton>
        </NSpace>
      </div>

      <!-- 查詢過濾 -->
      <div class="tech-card p-6 bg-white/80">
        <div class="flex flex-wrap gap-4 items-end">
          <div class="w-64">
            <div class="text-[10px] text-slate-400 uppercase mb-1 font-black">{{ t('finance.paymentChannel.name') }}</div>
            <NInput v-model:value="searchForm.name" :placeholder="t('common.inputPlaceholder')" size="small" class="tech-input-light" clearable />
          </div>
          <div class="w-48">
            <div class="text-[10px] text-slate-400 uppercase mb-1 font-black">{{ t('finance.paymentChannel.provider') }}</div>
            <NSelect v-model:value="searchForm.provider" :options="providerOptions" :placeholder="t('common.all')" size="small" class="tech-select-light" clearable />
          </div>
          <div class="w-40">
            <div class="text-[10px] text-slate-400 uppercase mb-1 font-black">{{ t('common.status') }}</div>
            <NSelect v-model:value="searchForm.status" :options="[
              {label: getStatusLabel('OPEN'), value: 'OPEN'}, {label: getStatusLabel('CLOSED'), value: 'CLOSED'}, 
              {label: getStatusLabel('MAINTENANCE'), value: 'MAINTENANCE'}, {label: getStatusLabel('FUSED'), value: 'FUSED'}
            ]" :placeholder="t('common.all')" size="small" class="tech-select-light" clearable />
          </div>
          <NButton type="info" ghost @click="loadData" class="px-6 font-bold" size="small">
            <template #icon><NIcon><Search /></NIcon></template>
            {{ t('common.search') }}
          </NButton>
        </div>
      </div>
    </div>
  </div>

  <div class="relative z-10">

      <!-- 列表區域 -->
      <div class="tech-card overflow-hidden">
        <NDataTable 
          remote 
          :loading="loading" 
          :columns="columns" 
          :data="channels" 
          :bordered="false"
          :pagination="false"
          class="tech-table-light"
          :scroll-x="1000"
        />
      </div>
    </div>

    <!-- 配置彈窗 -->
    <NModal v-model:show="showModal" preset="card" :title="isEdit ? t('finance.paymentChannel.editChannel') : t('finance.paymentChannel.addChannel')" style="width: 800px" class="tech-modal-light">
      <NScrollbar style="max-height: 75vh">
        <NForm :model="formModel" label-placement="top" class="p-4">
          <NTabs type="segment" animated>
            <NTabPane name="basic" :tab="t('player.list.basicInfo')">
              <NGrid :x-gap="20" :cols="2">
                <NGridItem>
                  <NFormItem :label="t('finance.paymentChannel.name')" required>
                    <NInput v-model:value="formModel.name" :placeholder="t('common.inputPlaceholder')" />
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem :label="t('finance.paymentChannel.provider')" required>
                    <NSelect v-model:value="formModel.provider" :options="providerOptions" />
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem :label="t('finance.paymentChannel.type')" required>
                    <NSelect v-model:value="formModel.type" :options="[
                      {label: t('finance.paymentChannel.typeOptions.iap'), value: 'IAP'},
                      {label: t('finance.paymentChannel.typeOptions.web_redirect'), value: 'WEB_REDIRECT'},
                      {label: t('finance.paymentChannel.typeOptions.manual'), value: 'MANUAL'}
                    ]" />
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem label="Icon URL">
                    <NInput v-model:value="formModel.icon" placeholder="https://..." />
                  </NFormItem>
                </NGridItem>
              </NGrid>
            </NTabPane>
 
            <NTabPane name="api" :tab="t('finance.paymentChannel.apiConfig')">
              <NGrid :x-gap="20" :cols="2">
                <NGridItem>
                  <NFormItem :label="t('finance.paymentChannel.merchantId')" required>
                    <NInput v-model:value="formModel.merchantId" :placeholder="t('finance.paymentChannel.merchantPlaceholder')" />
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem :label="t('finance.paymentChannel.appId')" required>
                    <NInput v-model:value="formModel.apiKey" :placeholder="t('finance.paymentChannel.appIdPlaceholder')" />
                  </NFormItem>
                </NGridItem>
                <NGridItem :span="2">
                  <NFormItem :label="t('finance.paymentChannel.secretKey')" required>
                    <NInput type="password" show-password-on="mousedown" v-model:value="formModel.secretKey" :placeholder="t('finance.paymentChannel.secretKeyPlaceholder')" />
                  </NFormItem>
                </NGridItem>
                <NGridItem :span="2">
                  <NFormItem :label="t('finance.paymentChannel.notifyUrl')">
                    <NInput v-model:value="formModel.notifyUrl" :placeholder="t('finance.paymentChannel.notifyUrlPlaceholder')" />
                  </NFormItem>
                </NGridItem>
              </NGrid>
            </NTabPane>
 
            <NTabPane name="risk" :tab="t('finance.paymentChannel.riskStrategy')">
              <NGrid :x-gap="20" :cols="2">
                <NGridItem>
                  <NFormItem :label="`${t('finance.paymentChannel.limitRange')} (Min)`">
                    <NInputNumber v-model:value="formModel.minLimit" :min="1" class="w-full" />
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem :label="`${t('finance.paymentChannel.limitRange')} (Max)`">
                    <NInputNumber v-model:value="formModel.maxLimit" :min="1" class="w-full" />
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem :label="t('finance.paymentChannel.dailyLimit')">
                    <NInputNumber v-model:value="formModel.dailyLimit" :min="0" class="w-full" />
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem :label="t('finance.paymentChannel.sort')">
                    <NInputNumber v-model:value="formModel.sortOrder" :min="1" :max="999" class="w-full" />
                  </NFormItem>
                </NGridItem>
              </NGrid>
            </NTabPane>

            <NTabPane name="target" :tab="t('finance.paymentChannel.trafficControl')">
              <NFormItem :label="t('finance.paymentChannel.platforms')">
                <NSelect v-model:value="formModel.platforms" multiple :options="[
                  {label: t('finance.paymentChannel.platformOptions.ios'), value: 'IOS'},
                  {label: t('finance.paymentChannel.platformOptions.android'), value: 'ANDROID'},
                  {label: t('finance.paymentChannel.platformOptions.web'), value: 'WEB'},
                  {label: t('finance.paymentChannel.platformOptions.mobileWeb'), value: 'MOBILE_WEB'}
                ]" />
              </NFormItem>
              <NFormItem :label="t('finance.paymentChannel.vipLevel')">
                <NSelect 
                  v-model:value="formModel.minVipLevel" 
                  :options="[0,1,2,3,4,5,6,7,8,9,10].map(v => ({
                    label: t('finance.paymentChannel.vipLevelShort', { level: v }), 
                    value: v
                  }))" 
                />
              </NFormItem>
              <NFormItem :label="t('player.list.tags')">
                <NSelect v-model:value="formModel.tags" multiple :options="tagOptions" filterable tag />
              </NFormItem>
              <NGrid :cols="2" :x-gap="20">
                <NGridItem>
                  <NFormItem :label="t('finance.paymentChannel.status')">
                    <NSelect v-model:value="formModel.status" :options="[
                      {label: getStatusLabel('OPEN'), value: 'OPEN'}, 
                      {label: getStatusLabel('CLOSED'), value: 'CLOSED'}, 
                      {label: getStatusLabel('MAINTENANCE'), value: 'MAINTENANCE'}
                    ]" />
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem :label="t('finance.paymentChannel.auditMask')">
                    <NSwitch v-model:value="formModel.isAuditMasked" />
                  </NFormItem>
                </NGridItem>
              </NGrid>
            </NTabPane>
          </NTabs>
        </NForm>
      </NScrollbar>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showModal = false" quaternary>{{ t('common.cancel') }}</NButton>
          <NButton type="info" :loading="modalLoading" color="#0369a1" @click="handleSave">{{ t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- Save Confirm Modal -->
    <NModal
      v-model:show="showSaveConfirmModal"
      preset="dialog"
      type="warning"
      :title="t('common.warning')"
      :content="t('finance.paymentChannel.saveConfirm')"
      :positive-text="t('common.confirm')"
      :negative-text="t('common.cancel')"
      @positive-click="handleBatchSave"
    />
  </div>
</template>

<style scoped>
.premium-container {
  background-color: #f8fafc;
  color: #1e293b;
  position: relative;
  /* overflow: hidden; */ /* Removed to allow sticky children */
}

.tech-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 20px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
}

.tech-glow {
  position: absolute;
  width: 600px; height: 600px;
  border-radius: 50%;
  filter: blur(150px);
  opacity: 0.1;
  background: radial-gradient(circle, #3b82f6, #6366f1);
  top: -200px; right: -100px;
  pointer-events: none;
}

:deep(.tech-table-light) {
  --n-color: transparent !important;
  --n-td-color: transparent !important;
  --n-th-color: #f8fafc !important;
  --n-th-font-weight: 900 !important;
  --n-th-font-size: 11px !important;
}

.tech-btn-light {
  font-weight: 900;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(3, 105, 161, 0.1);
}

.font-mono {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace !important;
}
</style>
