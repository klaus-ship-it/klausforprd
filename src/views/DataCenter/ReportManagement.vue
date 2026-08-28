<script setup lang="ts">
import { ref, reactive, onMounted, h } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NCard, NDataTable, NSpace, NButton, NTag, NModal, useMessage,
  NGrid, NGridItem, NFormItem, NSelect, NDatePicker, NIcon
} from 'naive-ui'
import { CloudDownloadOutline, TrashOutline, SearchOutline } from '@vicons/ionicons5'
import { reportManagementApi } from '@/api/reportManagement'
import type { ReportManagementRecord, ReportManagementQuery, ReportStatus } from '@/types/reportManagement'
import type { ReportType } from '@/types/operationReport'

const { t } = useI18n()
const message = useMessage()

// 搜尋條件
const searchModel = ref<{
  type: ReportType | null
  status: ReportStatus | null
  timeRange: [number, number] | null
}>({
  type: null,
  status: null,
  timeRange: null
})

const loading = ref(false)
const tableData = ref<ReportManagementRecord[]>([])
const totalItems = ref(0)

const pagination = reactive({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  itemCount: 0,
  prefix: ({ itemCount }: { itemCount: number | undefined }) => `${t('common.total')}: ${itemCount}`,
  onChange: (page: number) => {
    pagination.page = page
    handleSearch()
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize
    pagination.page = 1
    handleSearch()
  }
})

const reportTypeOptions = [
  { label: t('operationReport.reportTypes.ggr'), value: 'ggr' },
  { label: t('operationReport.reportTypes.deposit'), value: 'deposit' },
  { label: t('operationReport.reportTypes.activity'), value: 'activity' },
  { label: t('operationReport.reportTypes.activity_bonus'), value: 'activity_bonus' }
]

const statusOptions = [
  { label: t('reportManagement.status.pending'), value: 'pending' },
  { label: t('reportManagement.status.processing'), value: 'processing' },
  { label: t('reportManagement.status.completed'), value: 'completed' },
  { label: t('reportManagement.status.failed'), value: 'failed' }
]

const columns = [
  { title: t('reportManagement.columns.id'), key: 'id', width: 120 },
  { title: t('reportManagement.columns.name'), key: 'name', minWidth: 200 },
  { 
    title: t('reportManagement.columns.type'), 
    key: 'type',
    render: (row: ReportManagementRecord) => t(`operationReport.reportTypes.${row.type}`)
  },
  { 
    title: t('reportManagement.columns.status'), 
    key: 'status',
    render: (row: ReportManagementRecord) => {
      const typeMap: Record<ReportStatus, 'default' | 'info' | 'success' | 'error'> = {
        pending: 'default',
        processing: 'info',
        completed: 'success',
        failed: 'error'
      }
      return h(
        NTag,
        { type: typeMap[row.status], size: 'small' },
        { default: () => t(`reportManagement.status.${row.status}`) }
      )
    }
  },
  { 
    title: t('reportManagement.columns.fileSize'), 
    key: 'fileSize',
    render: (row: ReportManagementRecord) => row.fileSize ? `${(row.fileSize / 1024 / 1024).toFixed(2)} MB` : '-'
  },
  { 
    title: t('reportManagement.columns.createTime'), 
    key: 'createTime',
    render: (row: ReportManagementRecord) => new Date(row.createTime).toLocaleString()
  },
  { title: t('reportManagement.columns.operator'), key: 'operator' },
  {
    title: t('reportManagement.columns.actions'),
    key: 'actions',
    render: (row: ReportManagementRecord) => {
      return h(NSpace, {}, {
        default: () => [
          h(
            NButton,
            {
              size: 'tiny',
              type: 'primary',
              ghost: true,
              disabled: row.status !== 'completed',
              onClick: () => handleDownload(row)
            },
            { icon: () => h(NIcon, null, { default: () => h(CloudDownloadOutline) }) }
          ),
          h(
            NButton,
            {
              size: 'tiny',
              type: 'error',
              ghost: true,
              onClick: () => handleDelete(row)
            },
            { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) }
          )
        ]
      })
    }
  }
]

const handleSearch = async () => {
  loading.value = true
  try {
    const params: ReportManagementQuery = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      type: searchModel.value.type || undefined,
      status: searchModel.value.status || undefined,
      startTime: searchModel.value.timeRange?.[0],
      endTime: searchModel.value.timeRange?.[1]
    }
    const res = await reportManagementApi.getReportList(params)
    if (res.code === 0 && res.data) {
      tableData.value = res.data.list
      pagination.itemCount = res.data.total
    }
  } catch (err) {
    message.error(t('common.error'))
  } finally {
    loading.value = false
  }
}

const handleDownload = (row: ReportManagementRecord) => {
  if (row.downloadUrl) {
    window.open(row.downloadUrl)
  }
}

const handleDelete = (row: ReportManagementRecord) => {
  // 這裡應有確認彈窗
  message.info(`Delete report: ${row.id}`)
}

onMounted(() => {
  handleSearch()
})
</script>

<template>
  <div class="h-full flex flex-col gap-4">
    <NCard class="rounded-xl shadow-sm border-0 premium-card" size="small">
      <NGrid x-gap="16" y-gap="8" cols="1 768:4">
        <NGridItem>
          <NFormItem :label="t('reportManagement.columns.type')" :show-feedback="false">
            <NSelect v-model:value="searchModel.type" :options="reportTypeOptions" clearable />
          </NFormItem>
        </NGridItem>
        <NGridItem>
          <NFormItem :label="t('reportManagement.columns.status')" :show-feedback="false">
            <NSelect v-model:value="searchModel.status" :options="statusOptions" clearable />
          </NFormItem>
        </NGridItem>
        <NGridItem span="1 768:2" class="flex items-end justify-between">
            <NFormItem :label="t('reportManagement.columns.createTime')" :show-feedback="false" class="flex-1 mr-4">
                <NDatePicker v-model:value="searchModel.timeRange" type="daterange" clearable class="w-full" />
            </NFormItem>
            <NButton type="primary" @click="handleSearch" :loading="loading" class="mb-4">
                <template #icon><NIcon><SearchOutline /></NIcon></template>
                {{ t('common.search') }}
            </NButton>
        </NGridItem>
      </NGrid>
    </NCard>

    <NCard class="rounded-xl shadow-sm border-0 premium-card flex-1 overflow-hidden" content-class="p-0 flex flex-col">
      <div class="p-4 border-b border-gray-100 dark:border-gray-800 font-bold text-lg">
        {{ t('reportManagement.title') }}
      </div>
      <div class="flex-1 p-4 overflow-hidden">
        <NDataTable
          remote
          :columns="columns"
          :data="tableData"
          :loading="loading"
          :pagination="pagination"
          class="h-full"
          flex-height
        />
      </div>
    </NCard>
  </div>
</template>

<style scoped>
.premium-card {
  background: white;
}
.dark .premium-card {
  background: #18181c;
}
</style>
