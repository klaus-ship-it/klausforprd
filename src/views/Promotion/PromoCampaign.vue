<script setup lang="ts">
import { ref, reactive, onMounted, h, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NIcon, NButton, NDataTable, NInput, NSelect, NSwitch, NDatePicker,
  NTag, NSpace, NTooltip, NProgress, NDrawer, NDrawerContent, NModal,
  NForm, NFormItem, NUpload, NUploadDragger, NImage, NDivider,
  NEmpty, NBadge, useMessage, useDialog, DataTableColumns, UploadFileInfo
} from 'naive-ui'
import {
  GiftOutline,
  AddOutline,
  SearchOutline,
  RefreshOutline,
  CopyOutline,
  EyeOutline,
  CreateOutline,
  ImageOutline,
  WarningOutline,
  PersonOutline,
  TimeOutline,
  FilterOutline,
  ChevronDownOutline,
  CloudUploadOutline,
} from '@vicons/ionicons5'
import { promoCampaignApi } from '@/api/promoCampaign'
import type { PromoCampaign, CampaignStatus, CampaignTag, CampaignQueryParams } from '@/types/promoCampaign'

const message = useMessage()
const dialog = useDialog()
const router = useRouter()

// ──────────────────────────────────────────────────────────────
// 資料狀態
// ──────────────────────────────────────────────────────────────
const loading = ref(false)
const tableData = ref<PromoCampaign[]>([])
const total = ref(0)

const allTags = ref<CampaignTag[]>([])
const agentChannels = ref<{ id: string; name: string }[]>([])

// ──────────────────────────────────────────────────────────────
// 查詢參數
// ──────────────────────────────────────────────────────────────
const queryParams = reactive<CampaignQueryParams>({
  page: 1,
  pageSize: 20,
  keyword: '',
  tags: [],
  statuses: [],
  frontendVisible: null,
  frontendApply: null,
  joinTimeStart: undefined,
  joinTimeEnd: undefined,
  agentChannel: '',
})

const joinTimeRange = ref<[number, number] | null>(null)

// ──────────────────────────────────────────────────────────────
// 強制關閉 Modal
// ──────────────────────────────────────────────────────────────
const forceCloseModal = reactive({
  show: false,
  targetId: '',
  targetName: '',
  confirmInput: '',
  loading: false,
})

// ──────────────────────────────────────────────────────────────
// 圖片編輯 Drawer
// ──────────────────────────────────────────────────────────────
const imageDrawer = reactive({
  show: false,
  targetId: '',
  targetName: '',
  listImageUrl: '',
  bannerImageUrl: '',
  saving: false,
})

// 模擬圖片上傳：使用 @before-upload 攔截，讀取 Base64 後阻止實際上傳
const handleListImageUpload = (data: { file: UploadFileInfo; fileList: UploadFileInfo[] }): boolean => {
  const raw = data.file.file
  if (!raw) return false
  const reader = new FileReader()
  reader.onload = (e) => {
    imageDrawer.listImageUrl = e.target?.result as string
  }
  reader.readAsDataURL(raw)
  // 回傳 false 阻止 naive-ui 繼續發送 HTTP 請求
  return false
}

const handleBannerImageUpload = (data: { file: UploadFileInfo; fileList: UploadFileInfo[] }): boolean => {
  const raw = data.file.file
  if (!raw) return false
  const reader = new FileReader()
  reader.onload = (e) => {
    imageDrawer.bannerImageUrl = e.target?.result as string
  }
  reader.readAsDataURL(raw)
  return false
}

const handleSaveImages = async () => {
  imageDrawer.saving = true
  try {
    const res = await promoCampaignApi.updateImages(imageDrawer.targetId, {
      listImage: imageDrawer.listImageUrl || undefined,
      bannerImage: imageDrawer.bannerImageUrl || undefined,
    })
    if (res.code === 0) {
      message.success('圖片更新成功')
      imageDrawer.show = false
      fetchData()
    }
  } finally {
    imageDrawer.saving = false
  }
}

// ──────────────────────────────────────────────────────────────
// 選單選項
// ──────────────────────────────────────────────────────────────
const tagOptions = computed(() =>
  allTags.value.map(t => ({ label: t.name, value: t.id }))
)

const statusOptions: { label: string; value: CampaignStatus }[] = [
  { label: '草稿 (Draft)', value: 'Draft' },
  { label: '開啟 (Active)', value: 'Active' },
  { label: '關閉 (Inactive)', value: 'Inactive' },
  { label: '強制關閉 (Force Closed)', value: 'Force Closed' },
]

const visibleOptions = [
  { label: '全部', value: null },
  { label: '開啟 (Yes)', value: true },
  { label: '關閉 (No)', value: false },
]

const applyOptions = [
  { label: '全部', value: null },
  { label: '開啟 (Yes)', value: true },
  { label: '關閉 (No)', value: false },
]

const agentOptions = computed(() => [
  { label: '全部', value: '' },
  ...agentChannels.value.map(a => ({ label: a.name, value: a.id }))
])

// ──────────────────────────────────────────────────────────────
// 工具函式
// ──────────────────────────────────────────────────────────────
const fmtDt = (dt: string) => dt || '—'

// Status badge 配色
const statusConfig: Record<CampaignStatus, { color: string; textColor: string; label: string }> = {
  'Draft':        { color: '#6b7280', textColor: '#fff', label: '草稿' },
  'Active':       { color: '#10b981', textColor: '#fff', label: '開啟' },
  'Inactive':     { color: '#f59e0b', textColor: '#fff', label: '關閉' },
  'Force Closed': { color: '#ef4444', textColor: '#fff', label: '強制關閉' },
}

// ──────────────────────────────────────────────────────────────
// 資料操作
// ──────────────────────────────────────────────────────────────
const fetchData = async () => {
  loading.value = true
  try {
    // 同步時間區間到 queryParams
    if (joinTimeRange.value) {
      const fmt = (ts: number) => {
        const d = new Date(ts)
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
      }
      queryParams.joinTimeStart = fmt(joinTimeRange.value[0])
      queryParams.joinTimeEnd = fmt(joinTimeRange.value[1])
    } else {
      queryParams.joinTimeStart = undefined
      queryParams.joinTimeEnd = undefined
    }

    const res = await promoCampaignApi.getCampaigns({ ...queryParams })
    if (res.code === 0 && res.data) {
      tableData.value = res.data.items
      total.value = res.data.total
    }
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  queryParams.page = 1
  fetchData()
}

const handleReset = () => {
  queryParams.keyword = ''
  queryParams.tags = []
  queryParams.statuses = []
  queryParams.frontendVisible = null
  queryParams.frontendApply = null
  queryParams.agentChannel = ''
  joinTimeRange.value = null
  queryParams.page = 1
  fetchData()
}

// 即時切換前台顯示（AC5-邊界條件）
const handleToggleVisible = async (row: PromoCampaign, val: boolean) => {
  const res = await promoCampaignApi.toggleFrontendVisible(row.id, val)
  if (res.code === 0) {
    row.frontendVisible = val
    message.success('前台顯示已更新')
  } else {
    message.error('更新失敗')
  }
}

// 即時切換前台申請
const handleToggleApply = async (row: PromoCampaign, val: boolean) => {
  const res = await promoCampaignApi.toggleFrontendApply(row.id, val)
  if (res.code === 0) {
    row.frontendApply = val
    message.success('前台申請已更新')
  } else {
    message.error('更新失敗')
  }
}

// 複製活動（AC4）
const handleCopy = async (row: PromoCampaign) => {
  const res = await promoCampaignApi.copyCampaign(row.id)
  if (res.code === 0) {
    message.success(`已複製：${res.data?.name}`)
    fetchData()
  } else {
    message.error('複製失敗')
  }
}

// 檢視/編輯（AC2：有參加人數 => 唯讀）
const handleViewEdit = (row: PromoCampaign) => {
  router.push({ path: '/admin/promo-campaigns/wizard', query: { id: row.id } })
}

// 開啟圖片 Drawer
const openImageDrawer = (row: PromoCampaign) => {
  imageDrawer.targetId = row.id
  imageDrawer.targetName = row.name
  imageDrawer.listImageUrl = row.listImage || ''
  imageDrawer.bannerImageUrl = row.bannerImage || ''
  imageDrawer.show = true
}

// 強制關閉（開啟確認 Modal）
const openForceClose = (row: PromoCampaign) => {
  if (row.status !== 'Active' && row.status !== 'Inactive') return
  forceCloseModal.targetId = row.id
  forceCloseModal.targetName = row.name
  forceCloseModal.confirmInput = ''
  forceCloseModal.show = true
}

const handleForceClose = async () => {
  if (forceCloseModal.confirmInput !== 'FORCE_CLOSE') {
    message.warning('請輸入確認文字 FORCE_CLOSE')
    return
  }
  forceCloseModal.loading = true
  try {
    const res = await promoCampaignApi.forceClose(forceCloseModal.targetId)
    if (res.code === 0) {
      message.success('活動已強制關閉')
      forceCloseModal.show = false
      fetchData()
    } else {
      message.error(res.msg || '操作失敗')
    }
  } finally {
    forceCloseModal.loading = false
  }
}

// ──────────────────────────────────────────────────────────────
// 表格欄位定義
// ──────────────────────────────────────────────────────────────
const columns = computed<DataTableColumns<PromoCampaign>>(() => [
  // 活動 ID
  {
    title: '活動 ID',
    key: 'id',
    width: 190,
    fixed: 'left',
    render: (row) =>
      h('span', {
        class: 'font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 tracking-wide',
      }, row.id)
  },
  // 活動名稱
  {
    title: '活動名稱',
    key: 'name',
    minWidth: 200,
    ellipsis: { tooltip: false },
    render: (row) =>
      h('a', {
        class: `font-medium text-sm cursor-pointer transition-colors ${
          row.participants.joined > 0
            ? 'text-slate-600 hover:text-slate-800 dark:text-slate-300'
            : 'text-indigo-600 hover:text-indigo-800 dark:text-indigo-400'
        }`,
        title: row.participants.joined > 0 ? '已有會員參加，進入唯讀模式' : '點擊進入編輯',
        onClick: () => handleViewEdit(row)
      }, row.name)
  },
  // 活動標籤
  {
    title: '活動標籤',
    key: 'tags',
    width: 200,
    render: (row) => {
      const SHOW_MAX = 3
      const visible = row.tags.slice(0, SHOW_MAX)
      const extra = row.tags.slice(SHOW_MAX)

      const tagNodes = visible.map(t =>
        h(NTag, {
          size: 'small',
          round: true,
          bordered: false,
          style: { background: t.color + '22', color: t.color, fontWeight: '600', fontSize: '11px' }
        }, { default: () => t.name })
      )

      if (extra.length > 0) {
        tagNodes.push(
          h(NTooltip, {}, {
            trigger: () =>
              h(NTag, { size: 'small', round: true, bordered: false, style: 'cursor:pointer;background:#e2e8f0;color:#64748b' },
                { default: () => `+${extra.length}` }
              ),
            default: () =>
              h('div', { class: 'flex flex-col gap-1 py-1' },
                extra.map(t =>
                  h('span', { style: { color: t.color, fontWeight: '600' } }, t.name)
                )
              )
          })
        )
      }
      return h(NSpace, { size: 4, wrap: true }, { default: () => tagNodes })
    }
  },
  // 活動狀態
  {
    title: '活動狀態',
    key: 'status',
    width: 130,
    render: (row) => {
      const cfg = statusConfig[row.status]
      return h('span', {
        class: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold',
        style: { background: cfg.color + '22', color: cfg.color, border: `1px solid ${cfg.color}44` }
      }, [
        h('span', {
          class: 'w-1.5 h-1.5 rounded-full inline-block',
          style: { background: cfg.color }
        }),
        cfg.label
      ])
    }
  },
  // 前台顯示
  {
    title: '前台顯示',
    key: 'frontendVisible',
    width: 90,
    align: 'center',
    render: (row) =>
      h(NSwitch, {
        value: row.frontendVisible,
        size: 'small',
        disabled: row.status === 'Force Closed',
        onUpdateValue: (val: boolean) => handleToggleVisible(row, val)
      })
  },
  // 前台申請
  {
    title: '前台申請',
    key: 'frontendApply',
    width: 90,
    align: 'center',
    render: (row) =>
      h(NSwitch, {
        value: row.frontendApply,
        size: 'small',
        disabled: row.status === 'Force Closed',
        onUpdateValue: (val: boolean) => handleToggleApply(row, val)
      })
  },
  // 參加時間區間
  {
    title: '參加時間區間',
    key: 'joinTime',
    width: 200,
    render: (row) =>
      h('div', { class: 'text-xs leading-6 font-mono' }, [
        h('div', { class: 'text-slate-700 dark:text-slate-300' }, `起 ${fmtDt(row.joinStart)}`),
        h('div', { class: 'text-slate-500' }, `迄 ${fmtDt(row.joinEnd)}`),
      ])
  },
  // 最後結算時間
  {
    title: '最後結算時間',
    key: 'settlementDeadline',
    width: 175,
    render: (row) =>
      h('span', { class: 'text-xs font-mono text-slate-600 dark:text-slate-400' }, fmtDt(row.settlementDeadline))
  },
  // 參加人數（進度條）
  {
    title: '參加人數 (已/上限)',
    key: 'participants',
    width: 170,
    render: (row) => {
      const { joined, limit } = row.participants
      const pct = limit ? Math.min(Math.round((joined / limit) * 100), 100) : 0
      const barColor = limit
        ? (pct >= 90 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#10b981')
        : '#6366f1'

      return h('div', { class: 'space-y-1 pr-2' }, [
        h('div', { class: 'flex justify-between text-xs font-mono' }, [
          h('span', { class: 'font-bold text-slate-700 dark:text-slate-200' }, joined.toLocaleString()),
          h('span', { class: 'text-slate-400' }, limit ? ` / ${limit.toLocaleString()}` : ' / 不限'),
        ]),
        limit
          ? h('div', { style: 'height:5px;border-radius:3px;background:#e5e7eb;overflow:hidden' }, [
              h('div', {
                style: `width:${pct}%;height:100%;background:${barColor};border-radius:3px;transition:width .4s`
              })
            ])
          : h('div', { style: 'height:5px;border-radius:3px;background:#6366f122' }, [
              h('div', { style: 'width:100%;height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:3px;opacity:0.5' })
            ])
      ])
    }
  },
  // 建立資訊
  {
    title: '建立資訊',
    key: 'creatorInfo',
    width: 120,
    render: (row) =>
      h(NTooltip, {}, {
        trigger: () =>
          h('div', { class: 'flex items-center gap-1 cursor-default' }, [
            h(NIcon, { size: 14, class: 'text-slate-400' }, { default: () => h(PersonOutline) }),
            h('span', { class: 'text-xs text-slate-600 dark:text-slate-400 truncate max-w-[80px]' }, row.creatorInfo.creator)
          ]),
        default: () =>
          h('div', { class: 'text-xs space-y-1 py-1' }, [
            h('div', [h('span', { class: 'text-slate-400' }, '建立者：'), h('span', { class: 'font-medium' }, row.creatorInfo.creator)]),
            h('div', [h('span', { class: 'text-slate-400' }, '建立時間：'), h('span', { class: 'font-mono' }, row.creatorInfo.createdAt)]),
          ])
      })
  },
  // 修改資訊
  {
    title: '修改資訊',
    key: 'updatedInfo',
    width: 120,
    render: (row) =>
      h(NTooltip, {}, {
        trigger: () =>
          h('div', { class: 'flex items-center gap-1 cursor-default' }, [
            h(NIcon, { size: 14, class: 'text-slate-400' }, { default: () => h(TimeOutline) }),
            h('span', { class: 'text-xs text-slate-600 dark:text-slate-400 truncate max-w-[80px]' }, row.creatorInfo.updatedBy)
          ]),
        default: () =>
          h('div', { class: 'text-xs space-y-1 py-1' }, [
            h('div', [h('span', { class: 'text-slate-400' }, '修改者：'), h('span', { class: 'font-medium' }, row.creatorInfo.updatedBy)]),
            h('div', [h('span', { class: 'text-slate-400' }, '修改時間：'), h('span', { class: 'font-mono' }, row.creatorInfo.updatedAt)]),
          ])
      })
  },
  // 操作按鈕
  {
    title: '操作',
    key: 'actions',
    width: 180,
    fixed: 'right',
    render: (row) => {
      const isForceClosed = row.status === 'Force Closed'
      const isViewMode = row.participants.joined > 0
      const canForceClose = row.status === 'Active' || row.status === 'Inactive'

      return h(NSpace, { size: 6 }, {
        default: () => [
          // 複製
          h(NTooltip, {}, {
            trigger: () =>
              h(NButton, {
                size: 'tiny',
                quaternary: true,
                type: 'default',
                style: 'color:#6366f1',
                onClick: () => handleCopy(row)
              }, { icon: () => h(NIcon, { size: 15 }, { default: () => h(CopyOutline) }) }),
            default: () => '複製活動'
          }),

          // 檢視 / 編輯
          h(NTooltip, {}, {
            trigger: () =>
              h(NButton, {
                size: 'tiny',
                quaternary: true,
                type: isViewMode ? 'default' : 'info',
                onClick: () => handleViewEdit(row)
              }, {
                icon: () =>
                  h(NIcon, { size: 15 }, {
                    default: () => h(isViewMode ? EyeOutline : CreateOutline)
                  })
              }),
            default: () => isViewMode ? '檢視（唯讀）' : '編輯活動'
          }),

          // 編輯圖片（Force Closed 隱藏）
          !isForceClosed
            ? h(NTooltip, {}, {
                trigger: () =>
                  h(NButton, {
                    size: 'tiny',
                    quaternary: true,
                    type: 'warning',
                    onClick: () => openImageDrawer(row)
                  }, { icon: () => h(NIcon, { size: 15 }, { default: () => h(ImageOutline) }) }),
                default: () => '編輯圖片'
              })
            : null,

          // 強制關閉（只有 Active / Inactive 顯示）
          canForceClose
            ? h(NTooltip, {}, {
                trigger: () =>
                  h(NButton, {
                    size: 'tiny',
                    quaternary: true,
                    type: 'error',
                    onClick: () => openForceClose(row)
                  }, { icon: () => h(NIcon, { size: 15 }, { default: () => h(WarningOutline) }) }),
                default: () => '強制關閉'
              })
            : null,
        ].filter(Boolean)
      })
    }
  },
])

// ──────────────────────────────────────────────────────────────
// 分頁
// ──────────────────────────────────────────────────────────────
const pagination = computed(() => ({
  page: queryParams.page,
  pageSize: queryParams.pageSize,
  itemCount: total.value,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  prefix: ({ itemCount }: { itemCount: number }) => `共 ${itemCount} 筆`,
  onChange: (p: number) => { queryParams.page = p; fetchData() },
  onUpdatePageSize: (size: number) => { queryParams.pageSize = size; queryParams.page = 1; fetchData() },
}))

// ──────────────────────────────────────────────────────────────
// 初始化
// ──────────────────────────────────────────────────────────────
onMounted(async () => {
  const [tagsRes, agentRes] = await Promise.all([
    promoCampaignApi.getTags(),
    promoCampaignApi.getAgentChannels(),
  ])
  if (tagsRes.code === 0) allTags.value = tagsRes.data!
  if (agentRes.code === 0) agentChannels.value = agentRes.data!
  fetchData()
})
</script>

<template>
  <div class="p-6 space-y-5">
    <!-- ── 頁首 ────────────────────────────────────────────── -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <NIcon size="22" color="white"><GiftOutline /></NIcon>
        </div>
        <div>
          <h1 class="text-xl font-black text-slate-800 dark:text-white">優惠活動管理</h1>
          <p class="text-xs text-slate-500 mt-0.5">Promotion Campaign Management — 集中控制前台優惠活動的建立、狀態與分發策略</p>
        </div>
      </div>
      <NButton type="primary" size="medium" class="!rounded-xl !px-5" @click="router.push({ path: '/admin/promo-campaigns/wizard' })">
        <template #icon><NIcon><AddOutline /></NIcon></template>
        新增活動
      </NButton>
    </div>

    <!-- ── 搜尋篩選區 ─────────────────────────────────────── -->
    <NCard class="promo-glass rounded-2xl border-0 !shadow-sm">
      <div class="flex items-center gap-2 mb-4">
        <NIcon size="16" class="text-indigo-500"><FilterOutline /></NIcon>
        <span class="text-sm font-bold text-slate-700 dark:text-slate-200">搜尋與篩選</span>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <!-- 關鍵字搜尋 -->
        <div class="xl:col-span-1">
          <div class="filter-label">關鍵字搜尋</div>
          <NInput
            v-model:value="queryParams.keyword"
            placeholder="活動 ID 或 名稱"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <NIcon size="14" class="text-slate-400"><SearchOutline /></NIcon>
            </template>
          </NInput>
        </div>

        <!-- 活動標籤 -->
        <div>
          <div class="filter-label">活動標籤</div>
          <NSelect
            v-model:value="queryParams.tags"
            :options="tagOptions"
            multiple
            placeholder="全部"
            clearable
            filterable
            max-tag-count="responsive"
          />
        </div>

        <!-- 活動狀態 -->
        <div>
          <div class="filter-label">活動狀態</div>
          <NSelect
            v-model:value="queryParams.statuses"
            :options="statusOptions"
            multiple
            placeholder="全部"
            clearable
            max-tag-count="responsive"
          />
        </div>

        <!-- 前台顯示 -->
        <div>
          <div class="filter-label">前台顯示</div>
          <NSelect
            v-model:value="queryParams.frontendVisible"
            :options="visibleOptions"
            placeholder="全部"
          />
        </div>

        <!-- 前台申請 -->
        <div>
          <div class="filter-label">前台申請</div>
          <NSelect
            v-model:value="queryParams.frontendApply"
            :options="applyOptions"
            placeholder="全部"
          />
        </div>

        <!-- 參加時間區間 -->
        <div class="xl:col-span-2">
          <div class="filter-label">參加時間區間</div>
          <NDatePicker
            v-model:value="joinTimeRange"
            type="datetimerange"
            clearable
            style="width: 100%"
            start-placeholder="開始時間"
            end-placeholder="結束時間"
            format="yyyy-MM-dd HH:mm:ss"
          />
        </div>

        <!-- 代理商/渠道 -->
        <div>
          <div class="filter-label">代理商 / 渠道</div>
          <NSelect
            v-model:value="queryParams.agentChannel"
            :options="agentOptions"
            placeholder="全部"
            filterable
          />
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
        <NButton secondary @click="handleReset">
          <template #icon><NIcon><RefreshOutline /></NIcon></template>
          重置
        </NButton>
        <NButton type="primary" @click="handleSearch">
          <template #icon><NIcon><SearchOutline /></NIcon></template>
          搜尋
        </NButton>
      </div>
    </NCard>

    <!-- ── 統計徽章列 ───────────────────────────────────────── -->
    <div class="flex flex-wrap gap-3">
      <div
        v-for="(cfg, st) in statusConfig"
        :key="st"
        class="flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition-all hover:shadow-md"
        :style="{
          borderColor: cfg.color + '44',
          background: cfg.color + '11',
        }"
        @click="() => { queryParams.statuses = [st as CampaignStatus]; handleSearch() }"
      >
        <span class="w-2 h-2 rounded-full" :style="{ background: cfg.color }"></span>
        <span class="text-xs font-bold" :style="{ color: cfg.color }">{{ cfg.label }}</span>
        <span class="text-xs text-slate-400 font-mono">
          {{ tableData.filter(c => c.status === st).length }}
        </span>
      </div>
      <div class="flex-1" />
      <div class="text-xs text-slate-400 self-center">
        共 <strong class="text-slate-600">{{ total }}</strong> 筆活動 · 預設每頁 20 筆 · 建立時間倒序
      </div>
    </div>

    <!-- ── 資料表格 ─────────────────────────────────────────── -->
    <NCard class="promo-glass rounded-2xl border-0 !shadow-sm" :content-style="{ padding: 0 }">
      <NDataTable
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        :bordered="false"
        :striped="true"
        :scroll-x="1600"
        size="small"
        :row-class-name="(row: PromoCampaign) => row.status === 'Force Closed' ? 'force-closed-row' : ''"
      >
        <template #empty>
          <NEmpty description="暫無符合條件的優惠活動" class="py-12">
            <template #icon>
              <NIcon size="48" class="text-slate-300"><GiftOutline /></NIcon>
            </template>
          </NEmpty>
        </template>
      </NDataTable>
    </NCard>

    <!-- ── 強制關閉確認 Modal ──────────────────────────────── -->
    <NModal
      v-model:show="forceCloseModal.show"
      preset="card"
      style="width: 480px; border-radius: 16px"
      :mask-closable="false"
    >
      <template #header>
        <div class="flex items-center gap-2 text-red-500 font-bold">
          <NIcon size="20"><WarningOutline /></NIcon>
          強制關閉確認
        </div>
      </template>

      <div class="space-y-4">
        <!-- 警告說明框 -->
        <div class="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-4">
          <p class="text-sm text-red-700 dark:text-red-300 font-medium leading-6">
            ⚠ 確定要強制關閉此活動？
          </p>
          <ul class="mt-2 space-y-1 text-xs text-red-600 dark:text-red-400 list-disc list-inside">
            <li>關閉後將<strong>無法重新開啟</strong></li>
            <li>前台 API 將在 3 秒內停止回傳此活動</li>
            <li>已在活動中的會員將<strong>停止統計流水</strong></li>
            <li>關閉時間戳記後的注單<strong>不列入活動流水</strong></li>
          </ul>
        </div>

        <!-- 目標活動 -->
        <div class="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
          <div class="text-xs text-slate-400 mb-1">即將關閉的活動</div>
          <div class="font-mono text-xs text-indigo-600 dark:text-indigo-400">{{ forceCloseModal.targetId }}</div>
          <div class="text-sm font-bold text-slate-700 dark:text-slate-200 mt-1">{{ forceCloseModal.targetName }}</div>
        </div>

        <!-- 輸入確認 -->
        <NFormItem label="請輸入 FORCE_CLOSE 以確認操作" label-placement="top">
          <NInput
            v-model:value="forceCloseModal.confirmInput"
            placeholder="FORCE_CLOSE"
            :status="forceCloseModal.confirmInput && forceCloseModal.confirmInput !== 'FORCE_CLOSE' ? 'error' : undefined"
          />
        </NFormItem>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <NButton @click="forceCloseModal.show = false" :disabled="forceCloseModal.loading">
            取消
          </NButton>
          <NButton
            type="error"
            :loading="forceCloseModal.loading"
            :disabled="forceCloseModal.confirmInput !== 'FORCE_CLOSE'"
            @click="handleForceClose"
          >
            <template #icon><NIcon><WarningOutline /></NIcon></template>
            確認強制關閉
          </NButton>
        </div>
      </template>
    </NModal>

    <!-- ── 編輯圖片 Drawer ──────────────────────────────────── -->
    <NDrawer v-model:show="imageDrawer.show" width="460" placement="right">
      <NDrawerContent closable>
        <template #header>
          <div class="flex items-center gap-2">
            <NIcon size="18" class="text-amber-500"><ImageOutline /></NIcon>
            <span class="font-bold">編輯活動圖片</span>
          </div>
        </template>

        <div class="space-y-5 p-1">
          <!-- 活動名稱提示 -->
          <div class="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <div class="text-xs text-amber-600 dark:text-amber-400 mb-1">目標活動</div>
            <div class="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{{ imageDrawer.targetName }}</div>
            <div class="text-xs text-slate-400 mt-1">圖片更換不受已參加人數限制，隨時可換圖</div>
          </div>

          <!-- 前台優惠列表圖 -->
          <div>
            <div class="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
              前台優惠列表圖
              <span class="text-xs font-normal text-slate-400 ml-1">（推薦尺寸 600×400px）</span>
            </div>
            <NUpload
              accept="image/*"
              :max="1"
              :show-file-list="false"
              :before-upload="handleListImageUpload"
            >
              <NUploadDragger class="rounded-xl border-dashed" style="height: 150px">
                <div v-if="imageDrawer.listImageUrl" class="w-full h-full flex items-center justify-center">
                  <NImage
                    :src="imageDrawer.listImageUrl"
                    object-fit="contain"
                    style="max-width:100%;max-height:140px;border-radius:8px"
                    preview-disabled
                  />
                </div>
                <div v-else class="flex flex-col items-center justify-center gap-2 h-full text-slate-400">
                  <NIcon size="32"><CloudUploadOutline /></NIcon>
                  <span class="text-xs">點擊或拖曳上傳列表圖</span>
                </div>
              </NUploadDragger>
            </NUpload>
            <div v-if="imageDrawer.listImageUrl" class="mt-2">
              <NButton size="tiny" tertiary type="error" @click="imageDrawer.listImageUrl = ''">移除圖片</NButton>
            </div>
          </div>

          <NDivider dashed />

          <!-- Banner 圖 -->
          <div>
            <div class="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
              Banner 圖
              <span class="text-xs font-normal text-slate-400 ml-1">（推薦尺寸 1200×400px）</span>
            </div>
            <NUpload
              accept="image/*"
              :max="1"
              :show-file-list="false"
              :before-upload="handleBannerImageUpload"
            >
              <NUploadDragger class="rounded-xl border-dashed" style="height: 150px">
                <div v-if="imageDrawer.bannerImageUrl" class="w-full h-full flex items-center justify-center">
                  <NImage
                    :src="imageDrawer.bannerImageUrl"
                    object-fit="contain"
                    style="max-width:100%;max-height:140px;border-radius:8px"
                    preview-disabled
                  />
                </div>
                <div v-else class="flex flex-col items-center justify-center gap-2 h-full text-slate-400">
                  <NIcon size="32"><CloudUploadOutline /></NIcon>
                  <span class="text-xs">點擊或拖曳上傳 Banner 圖</span>
                </div>
              </NUploadDragger>
            </NUpload>
            <div v-if="imageDrawer.bannerImageUrl" class="mt-2">
              <NButton size="tiny" tertiary type="error" @click="imageDrawer.bannerImageUrl = ''">移除圖片</NButton>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3 w-full">
            <NButton @click="imageDrawer.show = false">取消</NButton>
            <NButton type="primary" :loading="imageDrawer.saving" @click="handleSaveImages">
              <template #icon><NIcon><ImageOutline /></NIcon></template>
              儲存圖片
            </NButton>
          </div>
        </template>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style scoped>
/* 玻璃擬態卡片 */
.promo-glass {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.dark .promo-glass {
  background: rgba(15, 23, 42, 0.78);
}

/* 篩選標籤 */
.filter-label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* 強制關閉列醒目顯示 */
:deep(.force-closed-row td) {
  background: rgba(239, 68, 68, 0.04) !important;
  opacity: 0.8;
}

/* 表格 row hover 效果 */
:deep(.n-data-table-tr:hover td) {
  background: rgba(99, 102, 241, 0.04) !important;
}

/* 統計徽章動畫 */
.flex > div[style] {
  transition: all 0.2s ease;
}
</style>
