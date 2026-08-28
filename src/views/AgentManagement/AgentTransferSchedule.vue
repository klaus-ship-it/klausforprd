<script setup lang="ts">
import { ref, reactive, onMounted, h, computed } from 'vue'
import { 
  NCard, NInput, NSelect, NButton, NDataTable, NSpace, NTag, NIcon, useMessage,
  NPopconfirm
} from 'naive-ui'
import { SearchOutline, TrashOutline, TimeOutline } from '@vicons/ionicons5'
import { agentApi } from '@/api/agent'
import type { AgentTransferSchedule, AgentTransferSearchParams, TransferScheduleStatus } from '@/types/agent'
import { useI18n } from 'vue-i18n'

const message = useMessage()
const { t } = useI18n()

// Search State
const searchForm = reactive<AgentTransferSearchParams>({
  status: 'ALL',
  page: 1,
  page_size: 10
})

const statusOptions = computed(() => [
  { label: t('common.all'), value: 'ALL' },
  { label: '待執行', value: 'PENDING' },
  { label: '成功', value: 'SUCCESS' },
  { label: '失敗', value: 'FAILED' },
  { label: '已取消', value: 'CANCELED' }
])

// Data Table
const loading = ref(false)
const schedules = ref<AgentTransferSchedule[]>([])
const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  onChange: (page: number) => {
    pagination.page = page
    searchForm.page = page
    fetchData()
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize
    pagination.page = 1
    searchForm.page_size = pageSize
    searchForm.page = 1
    fetchData()
  }
})

const columns = computed(() => [
  { title: '排程單號', key: 'id', width: 150 },
  { 
    title: '目標代理', 
    key: 'agent', 
    render(row: AgentTransferSchedule) {
      return h('div', [
        h('div', { class: 'font-bold' }, row.agent_name),
        h('div', { class: 'text-xs text-gray-400' }, `UID: ${row.agent_uid}`)
      ])
    }
  },
  { 
    title: '原屬上級', 
    key: 'original_parent_name',
    render(row: AgentTransferSchedule) {
        return row.original_parent_name
    }
  },
  { 
    title: '新上級', 
    key: 'new_parent_name',
    render(row: AgentTransferSchedule) {
        return h('span', { class: 'text-sky-600 font-bold' }, row.new_parent_name)
    }
  },
  { title: '執行時間', key: 'execute_at', render: (row: AgentTransferSchedule) => new Date(row.execute_at).toLocaleString() },
  { title: '備註原因', key: 'reason', ellipsis: { tooltip: true }, maxWidth: 200 },
  { 
    title: '狀態', 
    key: 'status', 
    width: 100,
    render(row: AgentTransferSchedule) {
      const typeMap: Record<TransferScheduleStatus, 'warning' | 'success' | 'error' | 'default'> = {
        'PENDING': 'warning',
        'SUCCESS': 'success',
        'FAILED': 'error',
        'CANCELED': 'default'
      }
      const labelMap: Record<TransferScheduleStatus, string> = {
        'PENDING': '待執行',
        'SUCCESS': '成功',
        'FAILED': '失敗',
        'CANCELED': '已取消'
      }
      return h(NTag, { type: typeMap[row.status], bordered: false }, { default: () => labelMap[row.status] })
    }
  },
  { title: '建立時間', key: 'created_at', render: (row: AgentTransferSchedule) => new Date(row.created_at).toLocaleString() },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right' as const,
    render(row: AgentTransferSchedule) {
      if (row.status !== 'PENDING') return '-'
      
      return h(NPopconfirm, {
        onPositiveClick: () => handleCancel(row.id)
      }, {
        trigger: () => h(NButton, { size: 'small', type: 'error', quaternary: true }, {
          default: () => [h(NIcon, { style: { marginRight: '4px' } }, { default: () => h(TrashOutline) }), '取消預約']
        }),
        default: () => '確定要取消此轉線排程嗎？'
      })
    }
  }
])

const fetchData = async () => {
  loading.value = true
  try {
    const res = await agentApi.getTransferSchedules(searchForm)
    if (res.code === 0 && res.data) {
      schedules.value = res.data.items
      pagination.itemCount = res.data.total
    } else {
      message.error(res.msg || t('common.loadFailed'))
    }
  } catch (err) {
    message.error(t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

const handleCancel = async (id: string) => {
    try {
        const res = await agentApi.cancelTransferSchedule(id)
        if (res.code === 0) {
            message.success('已取消排程')
            fetchData()
        } else {
            message.error(res.msg || '取消失敗')
        }
    } catch (err) {
        message.error('取消失敗')
    }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="p-6 flex flex-col gap-4">
    <NCard class="rounded-xl shadow-sm border-0" size="small">
      <template #header>
        <div class="flex items-center gap-2">
            <NIcon size="24" color="#0ea5e9"><TimeOutline /></NIcon>
            <span class="text-lg font-black">預約轉線管理</span>
        </div>
      </template>

      <NForm inline :model="searchForm" label-placement="left" class="flex-wrap gap-x-8 gap-y-4 mt-4">
        <NFormItem label="狀態">
          <NSelect v-model:value="searchForm.status" :options="statusOptions" style="width: 140px" />
        </NFormItem>
        <NFormItem>
          <NButton type="primary" secondary @click="fetchData">
            <template #icon><SearchOutline /></template>
            {{ t('common.search') }}
          </NButton>
        </NFormItem>
      </NForm>
    </NCard>

    <NDataTable
        remote
        :loading="loading"
        :columns="columns"
        :data="schedules"
        :pagination="pagination"
        :bordered="false"
        :single-line="false"
        class="mt-2"
    />
  </div>
</template>
