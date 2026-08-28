<template>
  <div class="guild-management">
    <n-space vertical size="large">
      <n-card title="公會全域設定">
        <n-spin :show="configLoading">
          <n-form
            ref="configFormRef"
            :model="configForm"
            label-placement="left"
            label-width="120px"
            inline
          >
            <n-form-item label="創建消耗金額 (Cash)" path="creation_cost">
              <n-input-number v-model:value="configForm.creation_cost" :min="0" />
            </n-form-item>
            <n-form-item label="創建等級門檻" path="creation_level_threshold">
              <n-input-number v-model:value="configForm.creation_level_threshold" :min="0" />
            </n-form-item>
            <n-form-item label="同公會手續費減免 (%)" path="fee_reduction_percentage">
              <n-input-number 
                v-model:value="configForm.fee_reduction_percentage" 
                :min="0" 
                :max="100" 
                :precision="1"
              />
            </n-form-item>
            <n-form-item>
              <n-button type="primary" @click="handleUpdateConfig" :loading="updatingConfig">
                更新設定
              </n-button>
            </n-form-item>
          </n-form>
        </n-spin>
      </n-card>

      <n-card title="公會清單管理">
        <n-space vertical size="medium">
          <n-form inline :model="searchParams" label-placement="left">
            <n-form-item label="公會名稱/ID">
              <n-input v-model:value="searchParams.guild_id_or_name" placeholder="搜尋公會..." clearable />
            </n-form-item>
            <n-form-item label="會長 ID">
              <n-input v-model:value="searchParams.leader_id" placeholder="搜尋會長..." clearable />
            </n-form-item>
            <n-form-item>
              <n-button type="primary" @click="handleSearch">
                <template #icon>
                  <n-icon><search-outline /></n-icon>
                </template>
                搜尋
              </n-button>
            </n-form-item>
          </n-form>

          <n-data-table
            remote
            ref="tableRef"
            :columns="columns"
            :data="data"
            :loading="loading"
            :pagination="pagination"
            @update:page="handlePageChange"
          />
        </n-space>
      </n-card>
    </n-space>

    <!-- Transfer Leader Modal -->
    <n-modal
      v-model:show="showTransferModal"
      preset="dialog"
      title="會長轉讓"
      positive-text="確認轉讓"
      negative-text="取消"
      @positive-click="confirmTransfer"
    >
      <n-form-item label="新會長玩家 ID">
        <n-input v-model:value="newLeaderId" placeholder="請輸入公會成員 ID" />
      </n-form-item>
      <n-text depth="3">
        轉讓後原會長將降為普通成員，新會長將獲得所有公會管理權限。
      </n-text>
    </n-modal>

    <!-- Members List Modal -->
    <n-modal
      v-model:show="showMembersModal"
      preset="card"
      :title="`公會成員名單 - ${selectedGuildName}`"
      style="width: 850px"
    >
      <n-data-table
        :columns="membersColumns"
        :data="membersData"
        :loading="membersLoading"
        :pagination="{ pageSize: 10 }"
        max-height="500px"
      />
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h } from 'vue'
import { 
  NSpace, NCard, NForm, NFormItem, NInput, NInputNumber, NButton, 
  NDataTable, NTag, NIcon, NText, NModal, NSpin, useMessage, useDialog 
} from 'naive-ui'
import { guildApi } from '@/api/guild'
import { Guild, GuildGlobalConfig, GuildMember } from '@/types/guild'
import type { DataTableColumns } from 'naive-ui'
import { SearchOutline, PeopleOutline } from '@vicons/ionicons5'

const message = useMessage()
const dialog = useDialog()

// Global Config
const configLoading = ref(false)
const updatingConfig = ref(false)
const configForm = reactive<GuildGlobalConfig>({
  creation_cost: 0,
  creation_level_threshold: 0,
  fee_reduction_percentage: 0
})

const fetchConfig = async () => {
  configLoading.value = true
  try {
    const res = await guildApi.getGlobalConfig()
    if (res.code === 0) {
      Object.assign(configForm, res.data)
    }
  } finally {
    configLoading.value = false
  }
}

const handleUpdateConfig = async () => {
  updatingConfig.value = true
  try {
    const res = await guildApi.updateGlobalConfig({ ...configForm })
    if (res.code === 0) {
      message.success('全域設定更新成功')
    }
  } finally {
    updatingConfig.value = false
  }
}

// Guild List
const loading = ref(false)
const data = ref<Guild[]>([])
const searchParams = reactive({
  guild_id_or_name: '',
  leader_id: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50]
})

const columns: DataTableColumns<Guild> = [
  { title: '公會名稱/ID', key: 'name', render: (row) => h('div', [h('div', { style: 'font-weight: bold' }, row.name), h(NText, { depth: 3, size: 'small' }, { default: () => row.id })]) },
  { 
    title: '會長 ID', 
    key: 'leader_id',
    render: (row) => h(NButton, { text: true, type: 'primary', onClick: () => window.open(`/admin/players/${row.leader_id}`) }, { default: () => row.leader_id })
  },
  { title: '成員數', key: 'member_count' },
  { title: '總流水', key: 'total_turnover', render: (row) => row.total_turnover.toLocaleString() },
  { title: '等級', key: 'level' },
  { 
    title: '狀態', 
    key: 'status',
    render: (row) => {
      const typeMap = { NORMAL: 'success', DISSOLVED: 'error', MUTED: 'warning' }
      const labelMap = { NORMAL: '正常', DISSOLVED: '已解散', MUTED: '禁言中' }
      return h(NTag, { type: typeMap[row.status] as any }, { default: () => labelMap[row.status] })
    }
  },
  {
    title: '操作',
    key: 'actions',
    render: (row) => {
      return h(NSpace, {}, {
        default: () => [
          h(NButton, { size: 'small', quaternary: true, type: 'primary', onClick: () => handleShowMembers(row) }, { 
            icon: () => h(NIcon, null, { default: () => h(PeopleOutline) }),
            default: () => '成員名單' 
          }),
          h(NButton, { size: 'small', onClick: () => handleMute(row) }, { default: () => '禁言' }),
          h(NButton, { size: 'small', type: 'error', onClick: () => handleDissolve(row) }, { default: () => '解散' }),
          h(NButton, { size: 'small', type: 'warning', onClick: () => handleTransfer(row) }, { default: () => '轉讓' })
        ]
      })
    }
  }
]

const fetchData = async () => {
  loading.value = true
  try {
    const res = await guildApi.list({
      ...searchParams,
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    if (res.code === 0 && res.data) {
      data.value = res.data.items
      pagination.itemCount = res.data.total
    }
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

const handlePageChange = (page: number) => {
  pagination.page = page
  fetchData()
}

// Actions
const handleMute = (guild: Guild) => {
  dialog.warning({
    title: '公會禁言',
    content: `確定要將公會「${guild.name}」設為禁言狀態嗎？執行後成員將無法在公會頻道發言。`,
    positiveText: '確認',
    negativeText: '取消',
    onPositiveClick: async () => {
      await guildApi.mute(guild.id)
      message.success('公會已禁言')
      fetchData()
    }
  })
}

const handleDissolve = (guild: Guild) => {
  dialog.error({
    title: '強制解散公會',
    content: `確定要解散公會「${guild.name}」嗎？此操作不可逆，清空所有成員關係。`,
    positiveText: '確認解散',
    negativeText: '再想想',
    onPositiveClick: async () => {
      await guildApi.dissolve(guild.id)
      message.success('公會已強制解散')
      fetchData()
    }
  })
}

const showTransferModal = ref(false)
const selectedGuildId = ref('')
const newLeaderId = ref('')

const handleTransfer = (guild: Guild) => {
  selectedGuildId.value = guild.id
  newLeaderId.value = ''
  showTransferModal.value = true
}

const confirmTransfer = async () => {
    if (!newLeaderId.value) {
        message.warning('請輸入新會長 ID')
        return false
    }
    await guildApi.transferLeader(selectedGuildId.value, newLeaderId.value)
    message.success('職位轉讓完成')
    fetchData()
    return true
}

// Members Modal
const showMembersModal = ref(false)
const membersLoading = ref(false)
const membersData = ref<GuildMember[]>([])
const selectedGuildName = ref('')

const membersColumns: DataTableColumns<GuildMember> = [
    { 
        title: '玩家 ID', 
        key: 'player_id',
        render: (row) => h(NButton, { text: true, type: 'primary', onClick: () => window.open(`/admin/players/${row.player_id}`) }, { default: () => row.player_id })
    },
    { title: '使用者名稱', key: 'username' },
    { 
        title: '職位', 
        key: 'rank',
        render: (row) => {
            const typeMap = { LEADER: 'error', ELDER: 'warning', MEMBER: 'default' }
            const labelMap = { LEADER: '會長', ELDER: '長老', MEMBER: '成員' }
            return h(NTag, { size: 'small', type: typeMap[row.rank] as any }, { default: () => labelMap[row.rank] })
        }
    },
    { title: '累積貢獻', key: 'total_contribution', render: (row) => row.total_contribution.toLocaleString() },
    { title: '加入時間', key: 'join_time' },
    { title: '最後在線', key: 'last_active' }
]

const handleShowMembers = async (guild: Guild) => {
    selectedGuildName.value = guild.name
    showMembersModal.value = true
    membersLoading.value = true
    try {
        const res = await guildApi.getMembers(guild.id)
        if (res.code === 0 && res.data) {
            membersData.value = res.data
        }
    } finally {
        membersLoading.value = false
    }
}

onMounted(() => {
  fetchConfig()
  fetchData()
})
</script>

<style scoped>
.guild-management {
  padding: 24px;
}
</style>
