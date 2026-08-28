<script setup lang="ts">
import { ref, onMounted, reactive, h, computed } from 'vue'
import {
  NCard, NSpace, NInput, NSelect, NButton, NDataTable, NTag, NSwitch,
  NModal, NForm, NFormItem, NGrid, NGridItem, NDatePicker, NInputNumber,
  NCheckbox, NCheckboxGroup, useMessage, useDialog
} from 'naive-ui'
import { useI18n } from 'vue-i18n'
import {
  Announcement, AnnouncementType, AnnouncementLanguage,
  AnnouncementQueryParams, CreateAnnouncementData
} from '@/types/announcement'
import { announcementApi } from '@/api/announcement'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

// --- Helpers ---
const formatDate = (date: string | number | Date, pattern: string = 'yyyy-MM-dd HH:mm') => {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  const pad = (n: number) => n.toString().padStart(2, '0')
  const Y = d.getFullYear()
  const M = pad(d.getMonth() + 1)
  const D = pad(d.getDate())
  const H = pad(d.getHours())
  const m = pad(d.getMinutes())
  const s = pad(d.getSeconds())
  
  if (pattern === 'yyyy-MM-dd HH:mm:ss') return `${Y}-${M}-${D} ${H}:${m}:${s}`
  if (pattern === 'yyyy-MM-dd HH:mm') return `${Y}-${M}-${D} ${H}:${m}`
  if (pattern === "yyyy-MM-dd'T'HH:mm:ss'Z'") return `${Y}-${M}-${D}T${H}:${m}:${s}Z`
  return `${Y}-${M}-${D} ${H}:${m}`
}

// --- Data ---
const loading = ref(false)
const data = ref<Announcement[]>([])
const total = ref(0)
const pagination = reactive({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  onChange: (page: number) => {
    pagination.page = page
    fetchData()
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize
    pagination.page = 1
    fetchData()
  }
})

const queryParams = reactive<AnnouncementQueryParams>({
  types: [],
  title: '',
  languages: [],
  startTime: undefined,
  endTime: undefined
})

const timeRange = ref<[number, number] | null>(null)

// --- Options ---
const typeOptions = [
  { label: t('announcement.types.MARQUEE'), value: AnnouncementType.MARQUEE },
  { label: t('announcement.types.SYSTEM_NOTIFICATION'), value: AnnouncementType.SYSTEM_NOTIFICATION },
  { label: t('announcement.types.OPERATION_ANNOUNCEMENT'), value: AnnouncementType.OPERATION_ANNOUNCEMENT }
]

const languageOptions = [
  { label: t('common.all'), value: AnnouncementLanguage.ALL },
  { label: '繁體中文', value: AnnouncementLanguage.ZH_TW },
  { label: '简体中文', value: AnnouncementLanguage.ZH_CN },
  { label: 'English', value: AnnouncementLanguage.EN }
]

// --- Modal State ---
const showModal = ref(false)
const modalType = ref<'add' | 'edit'>('add')
const editingId = ref<string | null>(null)

const formModel = reactive<CreateAnnouncementData>({
  type: AnnouncementType.MARQUEE,
  title: '',
  languages: [AnnouncementLanguage.ZH_TW],
  content: '',
  jumpUrl: '',
  startTime: formatDate(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
  endTime: formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
  weight: 1
})

const formTimeRange = ref<[number, number]>([
  new Date().getTime(),
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime()
])

const contentPlaceholder = computed(() => {
  if (formModel.type === AnnouncementType.MARQUEE) {
    return t('announcement.marqueeLimit')
  }
  return '支援 HTML 標籤'
})

// --- Methods ---
const fetchData = async () => {
  loading.value = true
  try {
    const res = await announcementApi.getAnnouncements({
      ...queryParams,
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    if (res.code === 0 && res.data) {
      data.value = res.data.items
      total.value = res.data.total
    }
  } catch (error) {
    message.error(t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  if (timeRange.value) {
    queryParams.startTime = new Date(timeRange.value[0]).toISOString()
    queryParams.endTime = new Date(timeRange.value[1]).toISOString()
  } else {
    queryParams.startTime = undefined
    queryParams.endTime = undefined
  }
  pagination.page = 1
  fetchData()
}

const handleAdd = () => {
  modalType.value = 'add'
  editingId.value = null
  Object.assign(formModel, {
    type: AnnouncementType.MARQUEE,
    title: '',
    languages: [AnnouncementLanguage.ZH_TW],
    content: '',
    jumpUrl: '',
    startTime: formatDate(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    endTime: formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    weight: 1
  })
  formTimeRange.value = [new Date().getTime(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime()]
  showModal.value = true
}

const handleEdit = (row: Announcement) => {
  modalType.value = 'edit'
  editingId.value = row.id
  Object.assign(formModel, {
    type: row.type,
    title: row.title,
    languages: [...row.languages],
    content: row.content,
    jumpUrl: row.jumpUrl || '',
    startTime: row.startTime,
    endTime: row.endTime,
    weight: row.weight
  })
  formTimeRange.value = [new Date(row.startTime).getTime(), new Date(row.endTime).getTime()]
  showModal.value = true
}

const handleDelete = (id: string) => {
  dialog.warning({
    title: t('common.warning'),
    content: t('announcement.deleteConfirm'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      try {
        const res = await announcementApi.deleteAnnouncement(id)
        if (res.code === 0) {
          message.success(t('announcement.deleteSuccess'))
          fetchData()
        }
      } catch (error) {
        message.error(t('common.error'))
      }
    }
  })
}

const handleSubmit = async () => {
  formModel.startTime = new Date(formTimeRange.value[0]).toISOString()
  formModel.endTime = new Date(formTimeRange.value[1]).toISOString()

  try {
    if (modalType.value === 'add') {
      const res = await announcementApi.createAnnouncement(formModel)
      if (res.code === 0) {
        message.success(t('announcement.addSuccess'))
        showModal.value = false
        fetchData()
      }
    } else if (editingId.value) {
      const res = await announcementApi.updateAnnouncement(editingId.value, formModel)
      if (res.code === 0) {
        message.success(t('announcement.updateSuccess'))
        showModal.value = false
        fetchData()
      }
    }
  } catch (error) {
    message.error(t('common.error'))
  }
}

// Pending changes tracking
const pendingChanges = ref<Record<string, { field: 'weight' | 'statusTest' | 'statusLive', value: any }>>({})
const hasPendingChanges = computed(() => Object.keys(pendingChanges.value).length > 0)
const showSaveConfirmModal = ref(false)

const handleWeightChange = (id: string, value: number) => {
  pendingChanges.value[`${id}_weight`] = { field: 'weight', value }
}

const handleStatusChange = (id: string, site: 'test' | 'live', value: boolean) => {
  pendingChanges.value[`${id}_${site}`] = { field: site === 'test' ? 'statusTest' : 'statusLive', value }
}

const handleBatchSave = async () => {
  loading.value = true
  try {
    const updates = new Map<string, any>()
    
    Object.entries(pendingChanges.value).forEach(([key, change]) => {
      const id = key.split('_')[0]
      if (!updates.has(id)) {
        updates.set(id, {})
      }
      updates.get(id)[change.field] = change.value
    })
    
    const promises = Array.from(updates.entries()).map(([id, data]) =>
      announcementApi.updateAnnouncement(id, data)
    )
    
    const results = await Promise.all(promises)
    const successCount = results.filter(r => r.code === 0).length
    
    if (successCount === results.length) {
      message.success(t('common.success'))
    } else {
      message.warning(`部分存取失敗 (${successCount}/${results.length})`)
    }
    
    showSaveConfirmModal.value = false
    pendingChanges.value = {}
    fetchData()
  } catch (err) {
    message.error(t('common.error'))
  } finally {
    loading.value = false
  }
}

// --- Columns ---
const columns = [
  {
    title: t('announcement.type'),
    key: 'type',
    width: 120,
    render(row: Announcement) {
      const typeMap: Record<string, { type: 'info' | 'success' | 'warning', label: string }> = {
        [AnnouncementType.MARQUEE]: { type: 'info', label: t('announcement.types.MARQUEE') },
        [AnnouncementType.SYSTEM_NOTIFICATION]: { type: 'success', label: t('announcement.types.SYSTEM_NOTIFICATION') },
        [AnnouncementType.OPERATION_ANNOUNCEMENT]: { type: 'warning', label: t('announcement.types.OPERATION_ANNOUNCEMENT') }
      }
      const config = typeMap[row.type]
      return h(NTag, { type: config.type, bordered: false }, { default: () => config.label })
    }
  },
  {
    title: t('announcement.announcementTitle'),
    key: 'title',
    width: 200,
    ellipsis: { tooltip: true }
  },
  {
    title: t('announcement.languages'),
    key: 'languages',
    width: 150,
    render(row: Announcement) {
      return h(NSpace, { size: 4 }, {
        default: () => row.languages.map(lang => {
          const label = languageOptions.find(opt => opt.value === lang)?.label || lang
          return h(NTag, { size: 'small', bordered: false }, { default: () => label })
        })
      })
    }
  },
  {
    title: t('announcement.weight'),
    key: 'weight',
    width: 100,
    render(row: Announcement) {
      return h(NInputNumber, {
        size: 'small',
        value: row.weight,
        min: 1,
        max: 999,
        'onUpdate:value': (v) => { 
          if (v) {
            row.weight = v
            handleWeightChange(row.id, v)
          }
        }
      })
    }
  },
  {
    title: t('announcement.publishInterval'),
    key: 'interval',
    width: 320,
    render(row: Announcement) {
      return `${formatDate(row.startTime)} - ${formatDate(row.endTime)}`
    }
  },
  {
    title: t('announcement.lastModified'),
    key: 'lastModifiedAt',
    width: 160,
    render(row: Announcement) {
      return formatDate(row.lastModifiedAt)
    }
  },
  {
    title: t('announcement.operator'),
    key: 'lastModifiedBy',
    width: 100
  },
  {
    title: t('announcement.statusTest'),
    key: 'statusTest',
    width: 120,
    render(row: Announcement) {
      return h(NSwitch, {
        value: row.statusTest,
        'onUpdate:value': (v) => {
          row.statusTest = v
          handleStatusChange(row.id, 'test', v)
        }
      })
    }
  },
  {
    title: t('announcement.statusLive'),
    key: 'statusLive',
    width: 120,
    render(row: Announcement) {
      return h(NSwitch, {
        value: row.statusLive,
        'onUpdate:value': (v) => {
          row.statusLive = v
          handleStatusChange(row.id, 'live', v)
        }
      })
    }
  },
  {
    title: t('common.action'),
    key: 'actions',
    width: 120,
    fixed: 'right' as const,
    render(row: Announcement) {
      return h(NSpace, null, {
        default: () => [
          h(NButton, { size: 'small', onClick: () => handleEdit(row) }, { default: () => t('common.edit') }),
          h(NButton, { size: 'small', type: 'error', ghost: true, onClick: () => handleDelete(row.id) }, { default: () => t('common.delete') })
        ]
      })
    }
  }
]

onMounted(fetchData)
</script>

<template>
  <div class="p-4">
    <NCard :title="t('announcement.title')" class="shadow-sm rounded-lg border-none">
      <template #header-extra>
        <NButton type="info" @click="handleAdd">{{ t('common.add') }}</NButton>
      </template>

      <NSpace vertical size="large">
        <!-- Access Operation Button -->
        <div class="flex gap-2">
          <NButton 
            type="warning" 
            :disabled="!hasPendingChanges" 
            @click="showSaveConfirmModal = true"
            :loading="loading"
          >
            {{ t('game.list.accessOperation') }}
            <span v-if="hasPendingChanges" class="ml-1">({{ Object.keys(pendingChanges).length }})</span>
          </NButton>
        </div>

        <!-- Search Filters -->
        <NCard embedded :bordered="false" size="small">
          <NSpace align="end" wrap>
            <div class="flex flex-col gap-1">
              <span class="text-xs text-gray-500">{{ t('announcement.type') }}</span>
              <NSelect
                v-model:value="queryParams.types"
                multiple
                :options="typeOptions"
                :placeholder="t('common.all')"
                style="width: 240px"
              />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs text-gray-500">{{ t('announcement.announcementTitle') }}</span>
              <NInput
                v-model:value="queryParams.title"
                :placeholder="t('common.keywordPlaceholder')"
                clearable
                style="width: 200px"
              />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs text-gray-500">{{ t('announcement.languages') }}</span>
              <NSelect
                v-model:value="queryParams.languages"
                multiple
                :options="languageOptions"
                :placeholder="t('common.all')"
                style="width: 200px"
              />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs text-gray-500">{{ t('announcement.publishInterval') }}</span>
              <NDatePicker
                v-model:value="timeRange"
                type="datetimerange"
                clearable
                style="width: 380px"
              />
            </div>
            <NButton type="primary" @click="handleSearch">{{ t('common.search') }}</NButton>
          </NSpace>
        </NCard>

        <!-- Data Table -->
        <NDataTable
          remote
          :loading="loading"
          :columns="columns"
          :data="data"
          :pagination="pagination"
          :row-key="(row) => row.id"
          scroll-x="1600"
        />
      </NSpace>
    </NCard>

    <!-- Status Batch Save Confirm -->
    <NModal
      v-model:show="showSaveConfirmModal"
      preset="dialog"
      type="warning"
      :title="t('common.warning')"
      :content="t('game.list.saveConfirm')"
      :positive-text="t('common.confirm')"
      :negative-text="t('common.cancel')"
      @positive-click="handleBatchSave"
    />

    <!-- Add/Edit Modal -->
    <NModal
      v-model:show="showModal"
      preset="card"
      :title="modalType === 'add' ? t('common.add') : t('common.edit')"
      style="width: 800px"
    >
      <NForm :model="formModel" label-placement="left" label-width="120" require-mark-placement="right-hanging">
        <NGrid :cols="2" :x-gap="24">
          <NGridItem :span="2">
            <NFormItem :label="t('announcement.type')" path="type">
              <NSelect v-model:value="formModel.type" :options="typeOptions" />
            </NFormItem>
          </NGridItem>
          
          <NGridItem :span="2">
            <NFormItem :label="t('announcement.announcementTitle')" path="title">
              <NInput v-model:value="formModel.title" :maxlength="50" show-count />
            </NFormItem>
          </NGridItem>

          <NGridItem :span="2">
            <NFormItem :label="t('announcement.languages')" path="languages">
              <NCheckboxGroup v-model:value="formModel.languages">
                <NSpace>
                  <NCheckbox
                    v-for="opt in languageOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </NCheckbox>
                </NSpace>
              </NCheckboxGroup>
            </NFormItem>
          </NGridItem>

          <NGridItem :span="2">
            <NFormItem :label="t('announcement.content')" path="content">
              <NInput
                v-model:value="formModel.content"
                type="textarea"
                :placeholder="contentPlaceholder"
                :autosize="{ minRows: 3, maxRows: 6 }"
                :maxlength="formModel.type === AnnouncementType.MARQUEE ? 200 : undefined"
                show-count
              />
            </NFormItem>
          </NGridItem>

          <NGridItem :span="2">
            <NFormItem :label="t('announcement.jumpUrl')" path="jumpUrl">
              <NInput v-model:value="formModel.jumpUrl" placeholder="URL 或 APP 路徑" />
            </NFormItem>
          </NGridItem>

          <NGridItem>
            <NFormItem :label="t('announcement.weight')" path="weight">
              <NInputNumber v-model:value="formModel.weight" :min="1" :max="999" />
              <template #feedback>
                <span class="text-xs text-gray-400">{{ t('announcement.weightTip') }}</span>
              </template>
            </NFormItem>
          </NGridItem>

          <NGridItem :span="2">
            <NFormItem :label="t('announcement.publishInterval')">
              <NDatePicker v-model:value="formTimeRange" type="datetimerange" />
            </NFormItem>
          </NGridItem>
        </NGrid>

        <div class="flex justify-end gap-3 mt-6">
          <NButton @click="showModal = false">{{ t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{ t('common.confirm') }}</NButton>
        </div>
      </NForm>
    </NModal>
  </div>
</template>

<style scoped>
:deep(.n-data-table-td) {
  white-space: nowrap;
}
</style>
