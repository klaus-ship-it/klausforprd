<script setup lang="ts">
import { ref, reactive, onMounted, h, computed, watch } from 'vue'
import {
  NCard, NIcon, NButton, NDataTable, NSwitch, NTag, NSpace, NTooltip,
  NModal, NForm, NFormItem, NSelect, NRadioGroup, NRadio, NDivider,
  NEmpty, NAlert, NScrollbar, NBadge, useMessage, FormInst,
  DataTableColumns, NInput, NTabs, NTabPane, NStatistic, NSpin,
  NTimeline, NTimelineItem, NInputGroup
} from 'naive-ui'
import {
  FlashOutline,
  AddOutline,
  CreateOutline,
  TrashOutline,
  PersonOutline,
  TimeOutline,
  AlertCircleOutline,
  CheckmarkCircleOutline,
  RefreshOutline,
  SearchOutline,
  LinkOutline,
  LayersOutline,
  ShieldCheckmarkOutline,
  InformationCircleOutline,
} from '@vicons/ionicons5'
import { triggerRuleApi } from '@/api/triggerRule'
import type { TriggerRule, TriggerHistoryRecord, TriggerRuleFormData, TriggerEventType } from '@/types/triggerRule'

const message = useMessage()

// ──────────────────────────────────────────────────────────────
// 標籤頁狀態
// ──────────────────────────────────────────────────────────────
const activeTab = ref<'rules' | 'history'>('rules')

// ──────────────────────────────────────────────────────────────
// 規則清單狀態
// ──────────────────────────────────────────────────────────────
const rulesLoading = ref(false)
const rulesData = ref<TriggerRule[]>([])
const rulesTotal = ref(0)
const rulesPage = ref(1)
const rulesPageSize = ref(20)

// ──────────────────────────────────────────────────────────────
// 觸發歷史狀態
// ──────────────────────────────────────────────────────────────
const histLoading = ref(false)
const histData = ref<TriggerHistoryRecord[]>([])
const histTotal = ref(0)
const histPage = ref(1)
const histPageSize = ref(20)
const histFilter = reactive({
  ruleId: '',
  result: '',
  memberKeyword: '',
})

// ──────────────────────────────────────────────────────────────
// 新增/編輯 Modal
// ──────────────────────────────────────────────────────────────
const modalState = reactive({
  show: false,
  mode: 'create' as 'create' | 'edit',
  editingId: '',
  saving: false,
})

const formRef = ref<FormInst | null>(null)
const formData = reactive<TriggerRuleFormData>({
  triggerEvent: null,
  boundCampaignId: '',
  boundCampaignName: '',
  isEnabled: true,
})

// 異步搜尋活動
const campaignSearchLoading = ref(false)
const campaignOptions = ref<{ label: string; value: string; tags: string[] }[]>([])
const campaignSearchKw = ref('')

const handleCampaignSearch = async (query: string) => {
  campaignSearchKw.value = query
  campaignSearchLoading.value = true
  try {
    const res = await triggerRuleApi.searchEligibleCampaigns(query)
    if (res.code === 0 && res.data) {
      campaignOptions.value = res.data.map(c => ({
        label: `[${c.id}] ${c.name}`,
        value: c.id,
        tags: c.tags,
      }))
    }
  } finally {
    campaignSearchLoading.value = false
  }
}

const handleCampaignSelect = (val: string) => {
  const opt = campaignOptions.value.find(o => o.value === val)
  formData.boundCampaignId = val
  formData.boundCampaignName = opt ? opt.label.replace(/^\[.*?\]\s/, '') : ''
}

// ──────────────────────────────────────────────────────────────
// 刪除確認 Modal
// ──────────────────────────────────────────────────────────────
const deleteModal = reactive({
  show: false,
  targetId: '',
  targetName: '',
  loading: false,
})

// ──────────────────────────────────────────────────────────────
// 觸發流程圖 Modal
// ──────────────────────────────────────────────────────────────
const showFlowModal = ref(false)

// ──────────────────────────────────────────────────────────────
// 工具函式
// ──────────────────────────────────────────────────────────────
const eventConfig: Record<TriggerEventType, { label: string; color: string; icon: string }> = {
  ON_REGISTRATION: {
    label: '註冊 (On Registration)',
    color: '#6366f1',
    icon: '🎉',
  },
  ON_PROFILE_COMPLETED: {
    label: '完善資料 (On Profile Completed)',
    color: '#14b8a6',
    icon: '📋',
  },
}

const campaignStatusConfig: Record<string, { color: string; label: string }> = {
  'Draft':        { color: '#6b7280', label: '草稿' },
  'Active':       { color: '#10b981', label: '開啟' },
  'Inactive':     { color: '#f59e0b', label: '關閉' },
  'Force Closed': { color: '#ef4444', label: '強制關閉' },
}

const resultConfig: Record<string, { color: string; label: string; icon: string }> = {
  SUCCESS:                      { color: '#10b981', label: '成功綁定', icon: '✅' },
  SILENT_FAIL_IP_LIMIT:         { color: '#ef4444', label: 'IP 限制', icon: '🚫' },
  SILENT_FAIL_DEVICE_LIMIT:     { color: '#f59e0b', label: '設備限制', icon: '🔒' },
  SILENT_FAIL_CAMPAIGN_CLOSED:  { color: '#6b7280', label: '活動已關', icon: '🔕' },
  SILENT_FAIL_CAPACITY_FULL:    { color: '#8b5cf6', label: '名額已滿', icon: '🈵' },
  SILENT_FAIL_DUPLICATE:        { color: '#3b82f6', label: '重複綁定', icon: '♻️' },
}

// ──────────────────────────────────────────────────────────────
// 統計數字（由歷史資料計算）
// ──────────────────────────────────────────────────────────────
const stats = computed(() => {
  const total = histData.value.length
  const success = histData.value.filter(h => h.result === 'SUCCESS').length
  const fail = total - success
  return { total, success, fail }
})

// ──────────────────────────────────────────────────────────────
// 資料讀取
// ──────────────────────────────────────────────────────────────
const fetchRules = async () => {
  rulesLoading.value = true
  try {
    const res = await triggerRuleApi.getRules({ page: rulesPage.value, pageSize: rulesPageSize.value })
    if (res.code === 0 && res.data) {
      rulesData.value = res.data.items
      rulesTotal.value = res.data.total
    }
  } finally {
    rulesLoading.value = false
  }
}

const fetchHistory = async () => {
  histLoading.value = true
  try {
    const res = await triggerRuleApi.getHistory({
      page: histPage.value,
      pageSize: histPageSize.value,
      ruleId: histFilter.ruleId || undefined,
      result: histFilter.result || undefined,
      memberKeyword: histFilter.memberKeyword || undefined,
    })
    if (res.code === 0 && res.data) {
      histData.value = res.data.items
      histTotal.value = res.data.total
    }
  } finally {
    histLoading.value = false
  }
}

// ──────────────────────────────────────────────────────────────
// CRUD 操作
// ──────────────────────────────────────────────────────────────
const openCreate = async () => {
  modalState.mode = 'create'
  modalState.editingId = ''
  formData.triggerEvent = null
  formData.boundCampaignId = ''
  formData.boundCampaignName = ''
  formData.isEnabled = true
  campaignOptions.value = []
  // 預先載入選單
  await handleCampaignSearch('')
  modalState.show = true
}

const openEdit = async (row: TriggerRule) => {
  modalState.mode = 'edit'
  modalState.editingId = row.id
  formData.triggerEvent = row.triggerEvent
  formData.boundCampaignId = row.boundCampaignId
  formData.boundCampaignName = row.boundCampaignName
  formData.isEnabled = row.isEnabled
  // 載入可選活動，並加入目前選中的
  await handleCampaignSearch('')
  if (!campaignOptions.value.find(o => o.value === row.boundCampaignId)) {
    campaignOptions.value.unshift({
      label: `[${row.boundCampaignId}] ${row.boundCampaignName}`,
      value: row.boundCampaignId,
      tags: [],
    })
  }
  modalState.show = true
}

const handleSave = () => {
  formRef.value?.validate(async errors => {
    if (errors) return
    modalState.saving = true
    try {
      let res
      if (modalState.mode === 'create') {
        res = await triggerRuleApi.createRule({ ...formData })
      } else {
        res = await triggerRuleApi.updateRule(modalState.editingId, { ...formData })
      }

      if (res.code === 0) {
        message.success(modalState.mode === 'create' ? '觸發規則建立成功' : '觸發規則更新成功')
        modalState.show = false
        fetchRules()
      } else {
        message.error(res.msg || '操作失敗')
      }
    } finally {
      modalState.saving = false
    }
  })
}

const handleToggle = async (row: TriggerRule, val: boolean) => {
  const res = await triggerRuleApi.toggleRule(row.id, val)
  if (res.code === 0) {
    row.isEnabled = val
    message.success(val ? '觸發規則已啟用' : '觸發規則已暫停')
  } else {
    message.error('切換失敗')
  }
}

const openDelete = (row: TriggerRule) => {
  deleteModal.targetId = row.id
  deleteModal.targetName = row.boundCampaignName
  deleteModal.show = true
}

const handleDelete = async () => {
  deleteModal.loading = true
  try {
    const res = await triggerRuleApi.deleteRule(deleteModal.targetId)
    if (res.code === 0) {
      message.success('觸發規則已刪除（歷史綁定紀錄保留）')
      deleteModal.show = false
      fetchRules()
    } else {
      message.error(res.msg || '刪除失敗')
    }
  } finally {
    deleteModal.loading = false
  }
}

// ──────────────────────────────────────────────────────────────
// 規則清單表格
// ──────────────────────────────────────────────────────────────
const rulesColumns = computed<DataTableColumns<TriggerRule>>(() => [
  // 規則 ID
  {
    title: '觸發規則 ID',
    key: 'id',
    width: 170,
    render: row =>
      h('span', {
        class: 'font-mono text-xs font-bold text-teal-600 dark:text-teal-400 tracking-wide'
      }, row.id)
  },
  // 觸發名稱（事件）
  {
    title: '觸發名稱（事件）',
    key: 'triggerEvent',
    width: 230,
    render: row => {
      const cfg = eventConfig[row.triggerEvent]
      return h('span', {
        class: 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold',
        style: { background: cfg.color + '18', color: cfg.color, border: `1px solid ${cfg.color}44` }
      }, [
        h('span', cfg.icon),
        cfg.label
      ])
    }
  },
  // 綁定活動 ID
  {
    title: '綁定活動 ID',
    key: 'boundCampaignId',
    width: 200,
    render: row =>
      h('a', {
        class: 'font-mono text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 cursor-pointer flex items-center gap-1',
        title: '點擊查看活動詳情',
        onClick: () => message.info(`導向活動：${row.boundCampaignId}`)
      }, [
        h(NIcon, { size: 13 }, { default: () => h(LinkOutline) }),
        row.boundCampaignId
      ])
  },
  // 綁定活動名稱
  {
    title: '綁定活動名稱',
    key: 'boundCampaignName',
    minWidth: 200,
    ellipsis: { tooltip: true },
    render: row =>
      h('span', { class: 'text-sm text-slate-700 dark:text-slate-300' }, row.boundCampaignName)
  },
  // 目標活動狀態
  {
    title: '目標活動狀態',
    key: 'campaignStatus',
    width: 130,
    render: row => {
      const cfg = campaignStatusConfig[row.campaignStatus] ?? { color: '#94a3b8', label: '未知' }
      return h('span', {
        class: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold',
        style: { background: cfg.color + '22', color: cfg.color, border: `1px solid ${cfg.color}44` }
      }, [
        h('span', { class: 'w-1.5 h-1.5 rounded-full', style: { background: cfg.color } }),
        cfg.label
      ])
    }
  },
  // 規則開關
  {
    title: '規則開關',
    key: 'isEnabled',
    width: 100,
    align: 'center',
    render: row =>
      h(NSwitch, {
        value: row.isEnabled,
        size: 'small',
        'onUpdate:value': (val: boolean) => handleToggle(row, val),
        checkedStyle: 'background: #10b981',
      }, {
        checked: () => '啟用',
        unchecked: () => '暫停',
      })
  },
  // 建立資訊
  {
    title: '建立資訊',
    key: 'creatorInfo',
    width: 130,
    render: row =>
      h(NTooltip, {}, {
        trigger: () =>
          h('div', { class: 'flex items-center gap-1 cursor-default' }, [
            h(NIcon, { size: 14, class: 'text-slate-400' }, { default: () => h(PersonOutline) }),
            h('span', { class: 'text-xs text-slate-600 dark:text-slate-400 truncate max-w-[85px]' }, row.creatorInfo.creator)
          ]),
        default: () =>
          h('div', { class: 'text-xs space-y-1 py-1 min-w-[200px]' }, [
            h('div', [h('span', { class: 'text-slate-400' }, '建立者：'), h('span', { class: 'font-medium' }, row.creatorInfo.creator)]),
            h('div', [h('span', { class: 'text-slate-400' }, '建立時間：'), h('span', { class: 'font-mono' }, row.creatorInfo.createdAt)]),
          ])
      })
  },
  // 操作
  {
    title: '操作',
    key: 'actions',
    width: 100,
    align: 'center',
    render: row =>
      h(NSpace, { size: 6, justify: 'center' }, {
        default: () => [
          h(NTooltip, {}, {
            trigger: () =>
              h(NButton, {
                size: 'tiny',
                quaternary: true,
                type: 'info',
                onClick: () => openEdit(row)
              }, { icon: () => h(NIcon, { size: 15 }, { default: () => h(CreateOutline) }) }),
            default: () => '編輯規則'
          }),
          h(NTooltip, {}, {
            trigger: () =>
              h(NButton, {
                size: 'tiny',
                quaternary: true,
                type: 'error',
                onClick: () => openDelete(row)
              }, { icon: () => h(NIcon, { size: 15 }, { default: () => h(TrashOutline) }) }),
            default: () => '刪除規則'
          }),
        ]
      })
  },
])

// ──────────────────────────────────────────────────────────────
// 觸發歷史表格
// ──────────────────────────────────────────────────────────────
const histColumns = computed<DataTableColumns<TriggerHistoryRecord>>(() => [
  {
    title: '觸發時間',
    key: 'triggeredAt',
    width: 175,
    render: row =>
      h('span', { class: 'text-xs font-mono text-slate-600 dark:text-slate-400' }, row.triggeredAt)
  },
  {
    title: '會員',
    key: 'member',
    width: 160,
    render: row =>
      h('div', {}, [
        h('div', { class: 'text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400' }, row.memberId),
        h('div', { class: 'text-xs text-slate-500' }, row.memberName),
      ])
  },
  {
    title: '規則 ID',
    key: 'ruleId',
    width: 160,
    render: row =>
      h('span', { class: 'text-xs font-mono text-teal-600 dark:text-teal-400' }, row.ruleId)
  },
  {
    title: '綁定活動',
    key: 'campaignId',
    width: 175,
    render: row =>
      h('span', { class: 'text-xs font-mono text-slate-600 dark:text-slate-400' }, row.campaignId)
  },
  {
    title: '觸發結果',
    key: 'result',
    width: 140,
    render: row => {
      const cfg = resultConfig[row.result] ?? { color: '#94a3b8', label: row.result, icon: '?' }
      return h('span', {
        class: 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold',
        style: { background: cfg.color + '18', color: cfg.color, border: `1px solid ${cfg.color}44` }
      }, [h('span', cfg.icon), cfg.label])
    }
  },
  {
    title: '失敗原因 (Log)',
    key: 'failReason',
    minWidth: 220,
    render: row => {
      if (!row.failReason) return h('span', { class: 'text-slate-300 text-xs' }, '—')
      return h('span', {
        class: 'font-mono text-xs px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
      }, row.failReason)
    }
  },
  {
    title: 'IP / 設備 ID',
    key: 'ipDevice',
    width: 190,
    render: row =>
      h('div', { class: 'text-xs font-mono text-slate-500 space-y-0.5' }, [
        row.ip ? h('div', row.ip) : null,
        row.deviceId ? h('div', { class: 'text-slate-400' }, row.deviceId) : null,
      ])
  },
])

// ──────────────────────────────────────────────────────────────
// 表單驗證規則
// ──────────────────────────────────────────────────────────────
const formRules = {
  triggerEvent: [{ required: true, message: '請選擇觸發事件', trigger: 'change' }],
  boundCampaignId: [{ required: true, message: '請搜尋並選擇綁定活動', trigger: 'change' }],
}

// ──────────────────────────────────────────────────────────────
// 結果篩選選項
// ──────────────────────────────────────────────────────────────
const resultFilterOptions = [
  { label: '全部', value: '' },
  ...Object.entries(resultConfig).map(([k, v]) => ({ label: `${v.icon} ${v.label}`, value: k }))
]

const ruleFilterOptions = computed(() => [
  { label: '全部規則', value: '' },
  ...rulesData.value.map(r => ({ label: `${r.id} (${eventConfig[r.triggerEvent]?.icon})`, value: r.id }))
])

// ──────────────────────────────────────────────────────────────
// 初始化
// ──────────────────────────────────────────────────────────────
onMounted(async () => {
  await fetchRules()
  await fetchHistory()
})

watch(activeTab, (tab) => {
  if (tab === 'history') fetchHistory()
})
</script>

<template>
  <div class="p-6 space-y-5">

    <!-- ── 頁首 ──────────────────────────────────────────────── -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
          <NIcon size="22" color="white"><FlashOutline /></NIcon>
        </div>
        <div>
          <h1 class="text-xl font-black text-slate-800 dark:text-white">自動觸發活動管理</h1>
          <p class="text-xs text-slate-500 mt-0.5">
            Event-Driven Campaign Trigger — 設定事件驅動規則，在會員完成指定行為後自動綁定活動與建立錢包
          </p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <!-- 觸發流程說明 -->
        <NButton secondary size="medium" class="!rounded-xl" @click="showFlowModal = true">
          <template #icon><NIcon><InformationCircleOutline /></NIcon></template>
          觸發流程說明
        </NButton>
        <NButton type="primary" size="medium" class="!rounded-xl !px-5" @click="openCreate">
          <template #icon><NIcon><AddOutline /></NIcon></template>
          新增觸發活動
        </NButton>
      </div>
    </div>

    <!-- ── 統計卡片列 ─────────────────────────────────────────── -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg,#6366f1,#8b5cf6)">
          <NIcon size="18" color="white"><LayersOutline /></NIcon>
        </div>
        <div>
          <div class="stat-label">觸發規則總數</div>
          <div class="stat-value">{{ rulesTotal }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg,#10b981,#059669)">
          <NIcon size="18" color="white"><CheckmarkCircleOutline /></NIcon>
        </div>
        <div>
          <div class="stat-label">啟用中規則</div>
          <div class="stat-value text-emerald-600">{{ rulesData.filter(r => r.isEnabled).length }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg,#3b82f6,#2563eb)">
          <NIcon size="18" color="white"><FlashOutline /></NIcon>
        </div>
        <div>
          <div class="stat-label">今日觸發成功</div>
          <div class="stat-value text-blue-600">{{ histData.filter(h => h.result === 'SUCCESS').length }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg,#ef4444,#dc2626)">
          <NIcon size="18" color="white"><AlertCircleOutline /></NIcon>
        </div>
        <div>
          <div class="stat-label">今日靜默失敗</div>
          <div class="stat-value text-red-500">{{ histData.filter(h => h.result !== 'SUCCESS').length }}</div>
        </div>
      </div>
    </div>

    <!-- ── 頁籤 ──────────────────────────────────────────────── -->
    <NCard class="trigger-glass rounded-2xl border-0 !shadow-sm" :content-style="{ padding: 0 }">
      <NTabs v-model:value="activeTab" type="line" animated :tab-style="{ padding: '16px 24px' }">

        <!-- ── Tab 1: 規則清單 ─────────────────────────────── -->
        <NTabPane name="rules" tab="觸發規則清單">
          <div class="px-4 pb-4">
            <!-- 快速說明 -->
            <NAlert type="info" :bordered="false" class="mb-4 rounded-xl" :show-icon="true">
              <template #icon><NIcon><ShieldCheckmarkOutline /></NIcon></template>
              <span class="text-sm">
                觸發服務採用<strong>非同步機制</strong>，與前台主流程完全解耦。即使觸發服務延遲，<strong>不影響會員正常的註冊/完善資料流程</strong>。
                同一活動最多建立一條觸發規則；下拉選單僅顯示狀態為「開啟」且含「Register」標籤的活動。
              </span>
            </NAlert>

            <NDataTable
              :columns="rulesColumns"
              :data="rulesData"
              :loading="rulesLoading"
              :bordered="false"
              :striped="true"
              size="small"
              :scroll-x="1100"
              :pagination="{
                page: rulesPage,
                pageSize: rulesPageSize,
                itemCount: rulesTotal,
                showSizePicker: true,
                pageSizes: [10, 20, 50],
                prefix: ({ itemCount }: { itemCount: number }) => `共 ${itemCount} 筆規則`,
                onChange: (p: number) => { rulesPage = p; fetchRules() },
                onUpdatePageSize: (s: number) => { rulesPageSize = s; rulesPage = 1; fetchRules() }
              }"
            >
              <template #empty>
                <NEmpty description="尚無觸發規則，點擊「新增觸發活動」建立" class="py-12">
                  <template #icon>
                    <NIcon size="48" class="text-slate-300"><FlashOutline /></NIcon>
                  </template>
                </NEmpty>
              </template>
            </NDataTable>
          </div>
        </NTabPane>

        <!-- ── Tab 2: 觸發歷史 ─────────────────────────────── -->
        <NTabPane name="history" tab="觸發歷史記錄（System Log）">
          <div class="px-4 pb-4 space-y-4">
            <!-- 篩選列 -->
            <div class="flex flex-wrap gap-3 items-end">
              <div>
                <div class="filter-label">規則篩選</div>
                <NSelect
                  v-model:value="histFilter.ruleId"
                  :options="ruleFilterOptions"
                  style="width: 200px"
                  clearable
                />
              </div>
              <div>
                <div class="filter-label">觸發結果</div>
                <NSelect
                  v-model:value="histFilter.result"
                  :options="resultFilterOptions"
                  style="width: 170px"
                />
              </div>
              <div>
                <div class="filter-label">會員 ID / 名稱</div>
                <NInput
                  v-model:value="histFilter.memberKeyword"
                  placeholder="搜尋會員"
                  clearable
                  style="width: 160px"
                  @keyup.enter="fetchHistory"
                >
                  <template #prefix>
                    <NIcon size="13" class="text-slate-400"><SearchOutline /></NIcon>
                  </template>
                </NInput>
              </div>
              <NButton type="primary" @click="() => { histPage = 1; fetchHistory() }">
                <template #icon><NIcon><SearchOutline /></NIcon></template>
                查詢
              </NButton>
              <NButton secondary @click="() => {
                histFilter.ruleId = '';
                histFilter.result = '';
                histFilter.memberKeyword = '';
                histPage = 1;
                fetchHistory()
              }">
                <template #icon><NIcon><RefreshOutline /></NIcon></template>
                重置
              </NButton>
            </div>

            <!-- 結果分佈標籤 -->
            <div class="flex flex-wrap gap-2">
              <div
                v-for="(cfg, key) in resultConfig"
                :key="key"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer transition-all hover:shadow-sm"
                :style="{ borderColor: cfg.color + '44', background: cfg.color + '11', color: cfg.color }"
                @click="() => { histFilter.result = key; histPage = 1; fetchHistory() }"
              >
                <span>{{ cfg.icon }}</span>
                <span>{{ cfg.label }}</span>
                <span class="text-slate-400 font-mono ml-0.5">
                  {{ histData.filter(h => h.result === key).length }}
                </span>
              </div>
            </div>

            <NDataTable
              :columns="histColumns"
              :data="histData"
              :loading="histLoading"
              :bordered="false"
              :striped="true"
              size="small"
              :scroll-x="1200"
              :row-class-name="(row: TriggerHistoryRecord) => row.result !== 'SUCCESS' ? 'fail-row' : ''"
              :pagination="{
                page: histPage,
                pageSize: histPageSize,
                itemCount: histTotal,
                showSizePicker: true,
                pageSizes: [10, 20, 50, 100],
                prefix: ({ itemCount }: { itemCount: number }) => `共 ${itemCount} 筆記錄`,
                onChange: (p: number) => { histPage = p; fetchHistory() },
                onUpdatePageSize: (s: number) => { histPageSize = s; histPage = 1; fetchHistory() }
              }"
            >
              <template #empty>
                <NEmpty description="暫無觸發歷史記錄" class="py-10" />
              </template>
            </NDataTable>
          </div>
        </NTabPane>
      </NTabs>
    </NCard>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- 新增 / 編輯觸發規則 Modal                              -->
    <!-- ══════════════════════════════════════════════════════ -->
    <NModal
      v-model:show="modalState.show"
      preset="card"
      style="width: 520px; border-radius: 18px"
      :mask-closable="false"
    >
      <template #header>
        <div class="flex items-center gap-2 font-bold">
          <NIcon size="18" class="text-teal-500"><FlashOutline /></NIcon>
          {{ modalState.mode === 'create' ? '新增觸發規則' : '編輯觸發規則' }}
        </div>
      </template>

      <NForm
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-placement="top"
        require-mark-placement="right-hanging"
        class="space-y-1"
      >
        <!-- 觸發名稱 -->
        <NFormItem label="觸發名稱（事件）" path="triggerEvent">
          <NSelect
            v-model:value="formData.triggerEvent"
            :options="[
              { label: '🎉 註冊 (On Registration)', value: 'ON_REGISTRATION' },
              { label: '📋 完善資料 (On Profile Completed)', value: 'ON_PROFILE_COMPLETED' },
            ]"
            placeholder="請選擇觸發事件"
            style="width: 100%"
          />
          <template #feedback>
            <div v-if="formData.triggerEvent" class="mt-1.5 text-xs px-3 py-2 rounded-lg bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300">
              <template v-if="formData.triggerEvent === 'ON_REGISTRATION'">
                🎉 當會員完成帳號<strong>註冊</strong>時，系統自動發出 <code class="font-mono bg-teal-100 dark:bg-teal-900 px-1 rounded">USER_REGISTERED_EVENT</code>
              </template>
              <template v-else>
                📋 當會員填妥<strong>真實姓名、手機、提款卡</strong>等資料後，系統自動發出 <code class="font-mono bg-teal-100 dark:bg-teal-900 px-1 rounded">USER_PROFILE_COMPLETED_EVENT</code>
              </template>
            </div>
          </template>
        </NFormItem>

        <!-- 活動名稱（異步搜尋）-->
        <NFormItem label="綁定活動名稱" path="boundCampaignId">
          <NSelect
            v-model:value="formData.boundCampaignId"
            :options="campaignOptions"
            :loading="campaignSearchLoading"
            filterable
            remote
            clearable
            placeholder="搜尋活動 ID 或名稱..."
            style="width: 100%"
            @search="handleCampaignSearch"
            @update:value="handleCampaignSelect"
          />
          <template #feedback>
            <div class="mt-1.5 text-xs text-slate-400 px-1">
              ⚠ 僅顯示：狀態為「開啟 (Active)」＋ 標籤含「Register」＋ 尚未建立觸發規則的活動
            </div>
          </template>
        </NFormItem>

        <!-- 所選活動預覽 -->
        <Transition name="slide-fade">
          <div v-if="formData.boundCampaignId" class="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 p-3 -mt-1 mb-2">
            <div class="text-xs text-indigo-500 mb-1 font-bold">已選擇活動</div>
            <div class="font-mono text-xs text-indigo-700 dark:text-indigo-300">{{ formData.boundCampaignId }}</div>
            <div class="text-sm font-medium text-slate-700 dark:text-slate-200 mt-0.5">{{ formData.boundCampaignName }}</div>
          </div>
        </Transition>

        <!-- 啟用狀態 -->
        <NFormItem label="啟用狀態" path="isEnabled">
          <div class="flex items-center gap-3">
            <NSwitch v-model:value="formData.isEnabled">
              <template #checked>立即啟用</template>
              <template #unchecked>暫不啟用</template>
            </NSwitch>
            <span class="text-xs text-slate-400">
              {{ formData.isEnabled ? '建立後立即監聽事件，會員完成觸發條件後自動綁定' : '建立規則但暫不觸發，可稍後手動啟用' }}
            </span>
          </div>
        </NFormItem>
      </NForm>

      <!-- 風控提示 -->
      <div class="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
        <div class="text-xs text-amber-700 dark:text-amber-300 font-bold mb-1">📦 邊界條件說明</div>
        <ul class="text-xs text-amber-600 dark:text-amber-400 space-y-1 list-disc list-inside">
          <li>觸發執行將依目標活動的 <strong>Step 2 參加條件</strong>（同 IP/同機碼限制等）進行資格審查</li>
          <li>不符合資格者靜默失敗，記錄到 System Log，<strong>不中斷</strong>會員主流程</li>
          <li>Redis 分散式鎖確保高併發下名額正確扣減</li>
          <li>會員 + 活動 ID 組合<strong>只觸發一次</strong>，防止重複綁定</li>
        </ul>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <NButton @click="modalState.show = false" :disabled="modalState.saving">取消</NButton>
          <NButton type="primary" :loading="modalState.saving" @click="handleSave">
            <template #icon><NIcon><CheckmarkCircleOutline /></NIcon></template>
            {{ modalState.mode === 'create' ? '建立規則' : '更新規則' }}
          </NButton>
        </div>
      </template>
    </NModal>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- 刪除確認 Modal（AC4）                                  -->
    <!-- ══════════════════════════════════════════════════════ -->
    <NModal
      v-model:show="deleteModal.show"
      preset="card"
      style="width: 440px; border-radius: 18px"
      :mask-closable="false"
    >
      <template #header>
        <div class="flex items-center gap-2 text-red-500 font-bold">
          <NIcon size="18"><TrashOutline /></NIcon>
          刪除觸發規則
        </div>
      </template>

      <div class="space-y-4">
        <NAlert type="warning" :bordered="false" class="rounded-xl">
          <template #icon><NIcon><AlertCircleOutline /></NIcon></template>
          <p class="text-sm font-medium">確定要刪除此觸發規則？</p>
          <p class="text-xs text-slate-500 mt-1">刪除後，系統將停止監聽此規則的觸發事件。</p>
        </NAlert>

        <div class="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400">規則 ID：</span>
            <span class="font-mono text-xs text-teal-600 font-bold">{{ deleteModal.targetId }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400">綁定活動：</span>
            <span class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ deleteModal.targetName }}</span>
          </div>
        </div>

        <!-- AC4 說明 -->
        <div class="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3">
          <div class="text-xs text-blue-700 dark:text-blue-300 font-bold mb-1">ℹ AC4 保障</div>
          <p class="text-xs text-blue-600 dark:text-blue-400">
            刪除觸發規則<strong>不會影響</strong>先前透過此規則已成功綁定活動的歷史會員。
            既有的活動錢包與獎勵資料均完整保留。
          </p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <NButton @click="deleteModal.show = false" :disabled="deleteModal.loading">取消</NButton>
          <NButton type="error" :loading="deleteModal.loading" @click="handleDelete">
            <template #icon><NIcon><TrashOutline /></NIcon></template>
            確認刪除
          </NButton>
        </div>
      </template>
    </NModal>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- 觸發流程說明 Modal                                     -->
    <!-- ══════════════════════════════════════════════════════ -->
    <NModal
      v-model:show="showFlowModal"
      preset="card"
      style="width: 600px; border-radius: 18px"
    >
      <template #header>
        <div class="flex items-center gap-2 font-bold">
          <NIcon size="18" class="text-teal-500"><FlashOutline /></NIcon>
          觸發執行流程說明
        </div>
      </template>

      <NScrollbar style="max-height: 70vh">
        <!-- 流程時間軸 -->
        <NTimeline class="px-2">
          <NTimelineItem type="info" title="① 會員完成前台動作" content="會員在前台完成「帳號註冊」或「完善個人資料」後，系統發出對應 Event（例：USER_REGISTERED_EVENT）" />
          <NTimelineItem type="info" title="② 觸發服務 Match 規則" content="Promotion Trigger Service 監聽事件，查詢是否存在狀態為「啟用」的匹配觸發規則" />
          <NTimelineItem type="warning" title="③ 目標活動狀態二次確認" content="確認目標活動當前狀態仍為「Active」，若已被關閉或強制關閉，流程立即中斷，靜默失敗" />
          <NTimelineItem type="warning" title="④ 資格審查（風控核對）" content="依照目標活動 Step 2 設定的參加條件（同 IP 次數、同機碼、註冊日期等）即時核對" />
          <NTimelineItem type="success" title="⑤A 通過 → 建立錢包並綁定" content="系統自動建立專屬活動錢包，發放贈金，將會員狀態設為「活動中」，全程無需手動申請" />
          <NTimelineItem type="error" title="⑤B 不通過 → 靜默失敗 + 寫入 Log" content="僅記錄 REASON_IP_LIMIT_EXCEEDED / REASON_DEVICE_LIMIT_EXCEEDED 等原因到 System Log，不中斷會員原有流程" />
        </NTimeline>

        <NDivider dashed>邊界條件保障</NDivider>

        <div class="grid grid-cols-1 gap-3 px-2 pb-4">
          <div class="risk-card">
            <span class="risk-icon">🔐</span>
            <div>
              <div class="risk-title">高併發搶領保護</div>
              <div class="risk-desc">透過 Redis 分散式鎖原子性扣減名額，超過上限後的會員自動靜默失敗，不產生超額派發</div>
            </div>
          </div>
          <div class="risk-card">
            <span class="risk-icon">🔁</span>
            <div>
              <div class="risk-title">重複觸發防護</div>
              <div class="risk-desc">會員 ID + 活動 ID 唯一組合，同一活動只觸發一次，即使多次完善資料也不重複綁定</div>
            </div>
          </div>
          <div class="risk-card">
            <span class="risk-icon">🚀</span>
            <div>
              <div class="risk-title">主流程解耦（非同步）</div>
              <div class="risk-desc">觸發服務採用 Async 機制，即使服務崩潰或延遲，絕對不影響會員正常的註冊成功率</div>
            </div>
          </div>
          <div class="risk-card">
            <span class="risk-icon">📊</span>
            <div>
              <div class="risk-title">精準 Log 記錄</div>
              <div class="risk-desc">每筆觸發（成功/失敗）均寫入 System Log，可在「觸發歷史記錄」頁籤篩選查詢</div>
            </div>
          </div>
        </div>
      </NScrollbar>

      <template #footer>
        <div class="flex justify-end">
          <NButton type="primary" @click="showFlowModal = false">瞭解了</NButton>
        </div>
      </template>
    </NModal>

  </div>
</template>

<style scoped>
/* 玻璃擬態 */
.trigger-glass {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.dark .trigger-glass {
  background: rgba(15, 23, 42, 0.78);
}

/* 篩選標籤 */
.filter-label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* 統計卡片 */
.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.15);
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s;
}
.dark .stat-card {
  background: rgba(30, 41, 59, 0.85);
}
.stat-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.03em;
}
.stat-value {
  font-size: 22px;
  font-weight: 900;
  color: #1e293b;
  line-height: 1.1;
}
.dark .stat-value { color: #f1f5f9; }

/* 失敗記錄列 */
:deep(.fail-row td) {
  background: rgba(239, 68, 68, 0.035) !important;
}
:deep(.fail-row:hover td) {
  background: rgba(239, 68, 68, 0.07) !important;
}

/* 風控卡片 */
.risk-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid rgba(226, 232, 240, 0.8);
}
.dark .risk-card {
  background: rgba(30, 41, 59, 0.5);
  border-color: rgba(71, 85, 105, 0.5);
}
.risk-icon {
  font-size: 22px;
  flex-shrink: 0;
  line-height: 1.2;
}
.risk-title {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  margin-bottom: 2px;
}
.dark .risk-title { color: #e2e8f0; }
.risk-desc {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
}
.dark .risk-desc { color: #94a3b8; }

/* 滑入動畫 */
.slide-fade-enter-active { transition: all 0.22s ease-out; }
.slide-fade-leave-active { transition: all 0.18s ease-in; }
.slide-fade-enter-from,
.slide-fade-leave-to { opacity: 0; transform: translateY(-6px); }

/* Row hover */
:deep(.n-data-table-tr:hover td) {
  background: rgba(20, 184, 166, 0.04) !important;
}
</style>
