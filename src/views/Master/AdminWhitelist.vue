<script setup lang="ts">
import { ref, reactive, onMounted, h, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { whitelistApi } from '@/api/whitelist'
import { WhitelistEntry, CreateWhitelistRequest } from '@/types/whitelist'
import { NCard, NDataTable, NButton, NModal, NForm, NFormItem, NInput, NSelect, NSwitch, useMessage, DataTableColumns, NSpace, NIcon, SelectOption } from 'naive-ui'
import { SearchOutline, CreateOutline } from '@vicons/ionicons5'

useI18n()
const message = useMessage()

const rawItems = ref<WhitelistEntry[]>([])
const items = ref<WhitelistEntry[]>([])
const loading = ref(false)

const searchForm = reactive({
  cidr: '',
  enabled: null as number | null
})

const statusOptions: SelectOption[] = [
  { label: '全部', value: null as any },
  { label: '啟用', value: 1 },
  { label: '停用', value: 0 }
]

const showModal = ref(false)
const editing = ref<WhitelistEntry | null>(null)

// Pending Changes Logic
const pendingChanges = ref<Record<string, boolean>>({})
const hasPendingChanges = computed(() => Object.keys(pendingChanges.value).length > 0)
const showSaveConfirmModal = ref(false)

const formModel = reactive<CreateWhitelistRequest>({ cidr: '', remark: '', enabled: true })

const columns = computed<DataTableColumns<WhitelistEntry>>(() => [
  {
    title: 'IP / 網段',
    key: 'cidr',
    width: 180,
    render: (row) => h('div', { class: 'font-mono' }, row.cidr)
  },
  {
    title: '備註',
    key: 'remark',
    width: 200,
    render: (row) => row.remark
  },
  {
    title: '建立者',
    key: 'creator',
    width: 120,
    render: (row) => row.creator || '-'
  },
  {
    title: '狀態',
    key: 'enabled',
    width: 100,
    render: (row) => {
      const currentStatus = pendingChanges.value[row.id] !== undefined ? pendingChanges.value[row.id] : row.enabled
      return h(NSwitch, {
        value: currentStatus,
        onUpdateValue: (val: boolean) => handleStatusChange(row, val)
      })
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    align: 'center',
    render: (row) => h(NSpace, {}, {
      default: () => [
        h(NButton, { size: 'small', onClick: () => openEdit(row) }, { default: () => '編輯' }),
        h(NButton, { size: 'small', type: 'error', onClick: () => remove(row.id) }, { default: () => '刪除' })
      ]
    })
  }
])

const load = async () => {
  loading.value = true
  pendingChanges.value = {}
  const res = await whitelistApi.list()
  if (res.code === 0) {
    rawItems.value = res.data || []
    handleSearch()
  }
  loading.value = false
}

const handleSearch = () => {
  items.value = rawItems.value.filter(item => {
    const matchCidr = !searchForm.cidr || item.cidr.includes(searchForm.cidr)
    const matchEnabled = searchForm.enabled === null || (item.enabled ? 1 : 0) === searchForm.enabled
    return matchCidr && matchEnabled
  })
}

const handleStatusChange = (row: WhitelistEntry, val: boolean) => {
  if (row.enabled === val) {
    delete pendingChanges.value[row.id]
  } else {
    pendingChanges.value[row.id] = val
  }
}

const handleBatchSave = async () => {
  loading.value = true
  try {
    const promises = Object.entries(pendingChanges.value).map(([id, enabled]) => 
      whitelistApi.update(id, { enabled })
    )
    await Promise.all(promises)
    message.success('存取成功')
    showSaveConfirmModal.value = false
    load()
  } catch (err) {
    message.error('存取失敗')
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editing.value = null
  Object.assign(formModel, { cidr: '', remark: '', enabled: true })
  showModal.value = true
}

const openEdit = (row: WhitelistEntry) => {
  editing.value = row
  Object.assign(formModel, { cidr: row.cidr, remark: row.remark, enabled: row.enabled })
  showModal.value = true
}

const save = async () => {
  if (!formModel.cidr || !formModel.remark) {
    message.warning('請填寫 IP / 網段 與 備註')
    return
  }

  if (editing.value) {
    const res = await whitelistApi.update(editing.value.id, formModel)
    if (res.code === 0) message.success('已更新')
    else message.error(res.msg)
  } else {
    const res = await whitelistApi.create(formModel)
    if (res.code === 0) message.success('已新增')
    else message.error(res.msg)
  }
  showModal.value = false
  load()
}

const remove = async (id: string) => {
  if (!confirm('確定刪除？')) return
  const res = await whitelistApi.remove(id)
  if (res.code === 0) {
    message.success('已刪除')
    load()
  } else {
    message.error(res.msg)
  }
}

onMounted(() => {
  load()
})
</script>

<template>
  <div class="p-6">
    <NCard title="查詢條件" class="mb-4">
      <NForm inline :model="searchForm" label-placement="left" label-width="auto">
        <NFormItem label="IP / 網段">
          <NInput v-model:value="searchForm.cidr" placeholder="搜尋 IP 或網段" clearable />
        </NFormItem>
        <NFormItem label="狀態">
          <NSelect v-model:value="searchForm.enabled" :options="statusOptions" style="width: 120px" />
        </NFormItem>
        <NFormItem>
          <NButton type="primary" @click="handleSearch">
            <template #icon><NIcon><SearchOutline /></NIcon></template>
            查詢
          </NButton>
        </NFormItem>
      </NForm>
    </NCard>

    <NCard title="後台白名單管理" class="mb-4">
      <template #header-extra>
        <div class="flex gap-2">
          <NButton 
            type="warning" 
            :disabled="!hasPendingChanges" 
            @click="showSaveConfirmModal = true"
            :loading="loading"
          >
            <template #icon><NIcon><CreateOutline /></NIcon></template>
            存取操作
            <span v-if="hasPendingChanges" class="ml-1">({{ Object.keys(pendingChanges).length }})</span>
          </NButton>
          <NButton type="primary" @click="openCreate">新增白名單</NButton>
        </div>
      </template>

      <NDataTable :columns="columns" :data="items" :loading="loading" :bordered="false" :single-line="false" />
    </NCard>

    <NModal v-model:show="showModal" title="白名單設定" preset="card" style="width:640px">
      <NForm :model="formModel">
        <NFormItem label="IP / 網段">
          <NInput v-model:value="formModel.cidr" placeholder="例如 1.2.3.4 或 1.2.3.0/24" />
        </NFormItem>
        <NFormItem label="備註">
          <NInput v-model:value="formModel.remark" />
        </NFormItem>
        <NFormItem label="啟用狀態">
          <NSwitch v-model:value="formModel.enabled" />
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton @click="showModal = false">取消</NButton>
          <NButton type="primary" @click="save">儲存</NButton>
        </div>
      </template>
    </NModal>

    <!-- Save Confirm Modal -->
    <NModal
      v-model:show="showSaveConfirmModal"
      preset="dialog"
      type="warning"
      title="警告"
      content="確定要存取狀態變更？"
      positive-text="確認"
      negative-text="取消"
      @positive-click="handleBatchSave"
    />
  </div>
</template>
