<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div class="flex flex-col">
        <h2 class="text-xl font-bold text-slate-800 dark:text-white">玩家訊息模板 (監管)</h2>
        <span class="text-sm text-gray-500">監控與管理幣商玩家自行設定的自動廣播與私訊模板</span>
      </div>
      <!-- 移除新增按鈕，因為是由玩家前台自行新增 -->
    </div>

    <!-- 列表卡片 -->
    <n-card class="rounded-xl border-gray-100 dark:border-gray-800 shadow-sm" :bordered="true">
      <div class="flex gap-2 mb-4">
        <n-input v-model:value="searchQuery" placeholder="搜尋 玩家ID / 帳號..." class="w-64" clearable @keyup.enter="handleSearch">
          <template #prefix>
            <div class="i-heroicons-magnifying-glass-20-solid" />
          </template>
        </n-input>
        <n-button type="primary" @click="handleSearch">搜尋</n-button>
        <n-button @click="handleReset">重置</n-button>
      </div>
      <n-data-table
        :columns="columns"
        :data="filteredTemplates"
        :pagination="pagination"
      />
    </n-card>

    <!-- 查看詳細彈窗 -->
    <n-modal
      v-model:show="showModal"
      preset="card"
      title="查看模板詳細資訊"
      class="w-[600px] rounded-xl"
      :segmented="{ content: 'soft', footer: 'soft' }"
    >
      <n-form
        :model="formModel"
        label-placement="top"
        require-mark-placement="right-hanging"
      >
        <div class="grid grid-cols-2 gap-4">
          <n-form-item label="建立玩家">
            <n-input disabled :value="formModel.creatorName + ' (ID: ' + formModel.creatorId + ')'" />
          </n-form-item>
          <n-form-item label="模板標題">
            <n-input disabled :value="formModel.title" />
          </n-form-item>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <n-form-item label="模板類型">
            <n-input disabled :value="formModel.type === 'private' ? '新玩家自動私訊' : '世界頻道自動廣播'" />
          </n-form-item>

          <n-form-item v-if="formModel.type === 'broadcast'" label="廣播間隔">
            <n-input disabled :value="'每 ' + formModel.intervalMinutes + ' 分鐘'" />
          </n-form-item>

          <n-form-item v-if="formModel.type === 'private'" label="發送時機">
            <n-input disabled value="新玩家註冊後自動發送" />
          </n-form-item>
        </div>

        <n-form-item label="訊息內容">
          <n-input
            :value="formModel.content"
            type="textarea"
            disabled
            :rows="5"
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <n-button @click="showModal = false">關閉</n-button>
          <n-button type="warning" @click="handleDisable" v-if="formModel.status">強制停用</n-button>
          <n-button type="primary" @click="handleEnable" v-else>解除限制 (啟用)</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, h, computed } from 'vue'
import {
  NCard, NButton, NDataTable, NModal, NForm, NFormItem,
  NInput, NSwitch, NTag, NSpace, useMessage, useDialog
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

const message = useMessage()
const dialog = useDialog()
const searchQuery = ref('')

interface Template {
  id: number
  creatorId: string
  creatorName: string
  title: string
  type: 'private' | 'broadcast'
  content: string
  intervalMinutes?: number
  status: boolean
}

// 假資料 (模擬玩家建立的模板)
const templates = ref<Template[]>([
  {
    id: 1,
    creatorId: 'VIP_001',
    creatorName: '幣商_Ace',
    title: '歡迎新玩家',
    type: 'private',
    content: '歡迎來到我們遊戲，如果您需要遊戲幣，可以隨時找我。目前儲值享有折扣！',
    status: true
  },
  {
    id: 2,
    creatorId: 'VIP_002',
    creatorName: '老司機',
    title: '每日好康廣播',
    type: 'broadcast',
    content: '【幣商廣播】每日好康大放送！現正舉辦儲值回饋活動，請加 Line: xxx_xxx 詳談。',
    intervalMinutes: 60,
    status: true
  },
  {
    id: 3,
    creatorId: 'VIP_001',
    creatorName: '幣商_Ace',
    title: '週末加碼優惠',
    type: 'broadcast',
    content: '週末狂歡！現在找我儲值，即享 10% 額外加碼，限時兩天！',
    intervalMinutes: 120,
    status: false
  }
])

const activeSearchQuery = ref('')

const handleSearch = () => {
  activeSearchQuery.value = searchQuery.value
}

const handleReset = () => {
  searchQuery.value = ''
  activeSearchQuery.value = ''
}

const filteredTemplates = computed(() => {
  if (!activeSearchQuery.value) return templates.value
  const query = activeSearchQuery.value.toLowerCase()
  return templates.value.filter(t => 
    t.creatorId.toLowerCase().includes(query) || 
    t.creatorName.toLowerCase().includes(query)
  )
})

const pagination = { pageSize: 10 }

// DataTable Columns
const columns: DataTableColumns<Template> = [
  {
    title: '建立玩家',
    key: 'creator',
    width: 150,
    render(row: Template) {
      return h('div', { class: 'flex flex-col' }, [
        h('span', { class: 'font-bold' }, row.creatorName),
        h('span', { class: 'text-xs text-gray-500' }, row.creatorId)
      ])
    }
  },
  {
    title: '模板標題',
    key: 'title',
    width: 180
  },
  {
    title: '類型',
    key: 'type',
    width: 120,
    render(row: Template) {
      if (row.type === 'private') {
        return h(NTag, { type: 'info', size: 'small', round: true }, { default: () => '自動私訊' })
      }
      return h(NTag, { type: 'warning', size: 'small', round: true }, { default: () => '自動廣播' })
    }
  },
  {
    title: '內容預覽',
    key: 'content',
    ellipsis: { tooltip: true }
  },
  {
    title: '管理狀態',
    key: 'status',
    width: 100,
    align: 'center',
    render(row: Template) {
      return h(NSwitch, {
        value: row.status,
        onUpdateValue: (val: boolean) => {
          row.status = val
          message.success(`已強制${val ? '啟用' : '停用'}玩家模板 [${row.title}]`)
        }
      })
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    align: 'center',
    render(row: Template) {
      return h(NSpace, { justify: 'center' }, {
        default: () => [
          h(NButton, { size: 'small', type: 'primary', secondary: true, onClick: () => viewTemplate(row) }, { default: () => '查看' }),
          h(NButton, { size: 'small', type: 'error', onClick: () => deleteTemplate(row) }, { default: () => '刪除' })
        ]
      })
    }
  }
]

// Modal Logic
const showModal = ref(false)
const viewingId = ref<number | null>(null)

const formModel = ref<Template>({
  id: 0,
  creatorId: '',
  creatorName: '',
  title: '',
  type: 'private',
  content: '',
  intervalMinutes: 60,
  status: true
})

const viewTemplate = (row: Template) => {
  viewingId.value = row.id
  formModel.value = { ...row }
  showModal.value = true
}

const handleDisable = () => {
  const index = templates.value.findIndex(t => t.id === viewingId.value)
  if (index !== -1) {
    templates.value[index].status = false
    formModel.value.status = false
    message.success('已停用此模板')
  }
}

const handleEnable = () => {
  const index = templates.value.findIndex(t => t.id === viewingId.value)
  if (index !== -1) {
    templates.value[index].status = true
    formModel.value.status = true
    message.success('已解除限制並啟用此模板')
  }
}

const deleteTemplate = (row: Template) => {
  dialog.warning({
    title: '刪除玩家模板',
    content: `確定要強制刪除該玩家設定的模板「${row.title}」嗎？此操作無法還原。`,
    positiveText: '確認刪除',
    negativeText: '取消',
    onPositiveClick: () => {
      templates.value = templates.value.filter(t => t.id !== row.id)
      message.success('已刪除該模板')
    }
  })
}
</script>
