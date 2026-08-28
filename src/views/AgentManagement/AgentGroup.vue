<script setup lang="ts">
import { ref, reactive, onMounted, h, computed } from 'vue'
import {
  NCard, NButton, NDataTable, NModal, NForm, NFormItem, NInput, NInputNumber,
  NSwitch, NTag, NIcon, NSpace, NGrid, NGridItem, NDivider, NPopconfirm,
  useMessage, DataTableColumns, NText, NBadge
} from 'naive-ui'
import {
  AddOutline, CreateOutline, TrashOutline, PeopleOutline, LayersOutline
} from '@vicons/ionicons5'
import { agentGroupApi } from '@/api/agent'
import { AgentGroup, CreateAgentGroupParams } from '@/types/agent'

const message = useMessage()
const loading = ref(false)
const groups = ref<AgentGroup[]>([])

// ── Fetch ──────────────────────────────────────────────────────────────────
const fetchGroups = async () => {
  loading.value = true
  try {
    const res = await agentGroupApi.getGroups()
    if (res.code === 0 && res.data) groups.value = res.data
  } catch {
    message.error('載入失敗')
  } finally {
    loading.value = false
  }
}

// ── Table Columns ──────────────────────────────────────────────────────────
const columns: DataTableColumns<AgentGroup> = [
  {
    title: '群組名稱',
    key: 'name',
    minWidth: 160,
    render(row) {
      return h('div', [
        h('div', { class: 'font-bold text-slate-800 dark:text-white' }, row.name),
        h('div', { class: 'text-xs text-gray-400 mt-0.5 line-clamp-1' }, row.description || '-')
      ])
    }
  },
  {
    title: 'CPA 設定',
    key: 'cpa',
    width: 180,
    render(row) {
      if (!row.cpa_enabled) return h(NTag, { type: 'default', size: 'small', bordered: false }, { default: () => '未啟用' })
      return h('div', { class: 'flex items-center gap-2' }, [
        h(NTag, { type: 'success', size: 'small', bordered: false }, { default: () => '啟用' }),
        h('span', { class: 'font-mono font-bold text-emerald-600' }, `$ ${row.cpa_price.toLocaleString()}`)
      ])
    }
  },
  {
    title: '儲值抽成',
    key: 'commission',
    width: 180,
    render(row) {
      if (!row.deposit_commission_enabled) return h(NTag, { type: 'default', size: 'small', bordered: false }, { default: () => '未啟用' })
      return h('div', { class: 'flex items-center gap-2' }, [
        h(NTag, { type: 'info', size: 'small', bordered: false }, { default: () => '啟用' }),
        h('span', { class: 'font-mono font-bold text-sky-600' }, `${row.deposit_commission_rate}%`)
      ])
    }
  },
  {
    title: '進階門檻',
    key: 'threshold',
    minWidth: 200,
    render(row) {
      const items = []
      if (row.data_binding_threshold.phone) items.push(h(NTag, { size: 'small', type: 'warning', bordered: false }, { default: () => '手機綁定' }))
      if (row.data_binding_threshold.google) items.push(h(NTag, { size: 'small', type: 'error', bordered: false }, { default: () => 'Google綁定' }))
      if (row.deposit_threshold > 0) items.push(h('span', { class: 'text-xs text-gray-500' }, `儲值 ≥ ${row.deposit_threshold.toLocaleString()}`))
      if (row.flow_threshold > 0) items.push(h('span', { class: 'text-xs text-gray-500' }, `流水 ≥ ${row.flow_threshold.toLocaleString()}`))
      if (items.length === 0) return h('span', { class: 'text-gray-400 text-xs' }, '無限制')
      return h(NSpace, { size: 4, wrap: true }, { default: () => items })
    }
  },
  {
    title: '使用代理數',
    key: 'agent_count',
    width: 110,
    align: 'center',
    render(row) {
      return h('div', { class: 'flex items-center justify-center gap-1' }, [
        h(NIcon, { size: 14, class: 'text-gray-400' }, { default: () => h(PeopleOutline) }),
        h('span', { class: 'font-bold' }, row.agent_count)
      ])
    }
  },
  {
    title: '建立時間',
    key: 'created_at',
    width: 160,
    render: (row) => new Date(row.created_at).toLocaleDateString('zh-TW')
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    fixed: 'right',
    render(row) {
      return h(NSpace, {}, {
        default: () => [
          h(NButton, {
            size: 'small', quaternary: true, type: 'primary',
            onClick: () => openEditModal(row)
          }, { default: () => [h(NIcon, { style: { marginRight: '4px' } }, { default: () => h(CreateOutline) }), '編輯'] }),
          h(NPopconfirm, {
            onPositiveClick: () => handleDelete(row.id)
          }, {
            trigger: () => h(NButton, {
              size: 'small', quaternary: true, type: 'error',
              disabled: row.agent_count > 0,
              title: row.agent_count > 0 ? `尚有 ${row.agent_count} 個代理使用中` : ''
            }, { default: () => [h(NIcon, { style: { marginRight: '4px' } }, { default: () => h(TrashOutline) }), '刪除'] }),
            default: () => '確定要刪除此群組嗎？'
          })
        ]
      })
    }
  }
]

// ── Modal State ────────────────────────────────────────────────────────────
const showModal = ref(false)
const isEdit = ref(false)
const editId = ref('')
const saveLoading = ref(false)

const emptyForm = (): CreateAgentGroupParams => ({
  name: '',
  description: '',
  cpa_enabled: true,
  cpa_price: 500,
  deposit_commission_enabled: true,
  deposit_commission_rate: 3,
  data_binding_threshold: { phone: false, google: false },
  deposit_threshold: 0,
  flow_threshold: 0
})

const form = reactive<CreateAgentGroupParams>(emptyForm())

const openCreateModal = () => {
  isEdit.value = false
  editId.value = ''
  Object.assign(form, emptyForm())
  showModal.value = true
}

const openEditModal = (group: AgentGroup) => {
  isEdit.value = true
  editId.value = group.id
  Object.assign(form, {
    name: group.name,
    description: group.description,
    cpa_enabled: group.cpa_enabled,
    cpa_price: group.cpa_price,
    deposit_commission_enabled: group.deposit_commission_enabled,
    deposit_commission_rate: group.deposit_commission_rate,
    data_binding_threshold: { ...group.data_binding_threshold },
    deposit_threshold: group.deposit_threshold,
    flow_threshold: group.flow_threshold
  })
  showModal.value = true
}

const handleSave = async () => {
  if (!form.name.trim()) {
    message.warning('請輸入群組名稱')
    return
  }
  saveLoading.value = true
  try {
    const res = isEdit.value
      ? await agentGroupApi.updateGroup({ id: editId.value, ...form })
      : await agentGroupApi.createGroup(form)
    if (res.code === 0) {
      message.success(isEdit.value ? '更新成功' : '新增成功')
      showModal.value = false
      fetchGroups()
    } else {
      message.error(res.msg || '操作失敗')
    }
  } catch {
    message.error('操作失敗')
  } finally {
    saveLoading.value = false
  }
}

const handleDelete = async (id: string) => {
  try {
    const res = await agentGroupApi.deleteGroup(id)
    if (res.code === 0) {
      message.success('刪除成功')
      fetchGroups()
    } else {
      message.error(res.msg || '刪除失敗')
    }
  } catch {
    message.error('刪除失敗')
  }
}

const modalTitle = computed(() => isEdit.value ? `編輯群組：${form.name}` : '新增代理群組')

onMounted(fetchGroups)
</script>

<template>
  <div class="p-6 flex flex-col gap-4">

    <!-- Header -->
    <NCard class="premium-glass">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <NIcon size="22" color="white"><LayersOutline /></NIcon>
          </div>
          <div>
            <h2 class="text-xl font-black text-slate-800 dark:text-white">代理群組</h2>
            <p class="text-xs text-slate-500">預先定義合作模式與門檻設定，新增代理時快速套用。</p>
          </div>
        </div>
        <NButton type="primary" rounded @click="openCreateModal">
          <template #icon><NIcon><AddOutline /></NIcon></template>
          新增群組
        </NButton>
      </div>
    </NCard>

    <!-- Table -->
    <NCard class="premium-glass overflow-hidden" :content-style="{ padding: 0 }">
      <NDataTable
        :loading="loading"
        :columns="columns"
        :data="groups"
        :bordered="false"
        :pagination="false"
        class="premium-table"
        scroll-x="900"
      />
    </NCard>

    <!-- Create / Edit Modal -->
    <NModal
      v-model:show="showModal"
      preset="card"
      :title="modalTitle"
      style="width: 700px; border-radius: 20px;"
    >
      <div class="max-h-[70vh] overflow-y-auto px-2">
        <NForm :model="form" label-placement="left" label-width="130" label-align="right">

          <NDivider title-placement="left">基本資訊</NDivider>
          <NGrid :cols="1" :x-gap="24">
            <NGridItem>
              <NFormItem label="群組名稱" required>
                <NInput v-model:value="form.name" placeholder="請輸入群組名稱，例如：高級代理" />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="群組說明">
                <NInput v-model:value="form.description" type="textarea" :rows="2" placeholder="簡短描述此群組的適用對象或條件" />
              </NFormItem>
            </NGridItem>
          </NGrid>

          <NDivider title-placement="left">合作模式設定 (CPA 與儲值抽成)</NDivider>
          <NGrid :cols="2" :x-gap="24">
            <NGridItem>
              <NFormItem label="CPA 結算開關">
                <NSwitch v-model:value="form.cpa_enabled" />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="儲值抽成開關">
                <NSwitch v-model:value="form.deposit_commission_enabled" />
              </NFormItem>
            </NGridItem>
            <NGridItem v-if="form.cpa_enabled">
              <NFormItem label="CPA 單價">
                <NInputNumber v-model:value="form.cpa_price" :min="0" style="width: 100%" >
                  <template #prefix>$</template>
                </NInputNumber>
              </NFormItem>
            </NGridItem>
            <NGridItem v-if="form.deposit_commission_enabled">
              <NFormItem label="儲值抽成比率">
                <NInputNumber v-model:value="form.deposit_commission_rate" :min="0" :max="100" :precision="2" style="width: 100%">
                  <template #suffix>%</template>
                </NInputNumber>
              </NFormItem>
            </NGridItem>
          </NGrid>

          <NDivider title-placement="left">進階門檻設定</NDivider>
          <NFormItem label="資料綁定門檻">
            <NSpace>
              <NTag checkable v-model:checked="form.data_binding_threshold.phone" type="primary">
                手機號碼綁定
              </NTag>
              <NTag checkable v-model:checked="form.data_binding_threshold.google" type="error">
                Google綁定
              </NTag>
            </NSpace>
          </NFormItem>
          <NGrid :cols="2" :x-gap="24">
            <NGridItem>
              <NFormItem label="儲值門檻">
                <NInputNumber v-model:value="form.deposit_threshold" :min="0" style="width: 100%" placeholder="0 表示無限制" />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="流水門檻">
                <NInputNumber v-model:value="form.flow_threshold" :min="0" style="width: 100%" placeholder="0 表示無限制" />
              </NFormItem>
            </NGridItem>
          </NGrid>

        </NForm>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <NButton quaternary @click="showModal = false">取消</NButton>
          <NButton type="primary" rounded :loading="saveLoading" @click="handleSave">
            {{ isEdit ? '儲存變更' : '建立群組' }}
          </NButton>
        </div>
      </template>
    </NModal>

  </div>
</template>
