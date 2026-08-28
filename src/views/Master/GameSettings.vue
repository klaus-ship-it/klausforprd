<template>
  <div class="animate-fade-in-up">
    <NCard :bordered="false" class="premium-glass overflow-hidden" size="small">
      <NTabs type="line" animated size="large" class="px-2">
        <!-- Tab 1: Game Type Configuration -->
        <NTabPane name="type" :tab="t('game.config.typeTitle')">
          <div class="py-4 space-y-4">
            <div class="flex justify-between items-center px-2">
              <div class="text-xs text-slate-500 flex items-center gap-2">
                <NIcon :component="InformationCircleOutline" size="18" class="text-sky-500" />
                {{ t('game.config.typeRateDesc') }}
              </div>
              <NButton secondary size="small" @click="fetchGameTypes" :loading="typeLoading">
                <template #icon><NIcon :component="RefreshOutline" /></template>
                重新整理
              </NButton>
            </div>

            <NDataTable
              :columns="typeColumns"
              :data="gameTypes"
              :loading="typeLoading"
              :pagination="false"
              :bordered="false"
              :single-line="false"
            />
          </div>
        </NTabPane>

        <!-- Tab 2: Marketing Tag Configuration -->
        <NTabPane name="tag" :tab="t('game.config.tagTitle')">
          <div class="py-4 space-y-4">
            <div class="flex justify-end items-center gap-3 px-2">
              <NButton secondary size="small" @click="fetchMarketingTags" :loading="tagLoading">
                <template #icon><NIcon :component="RefreshOutline" /></template>
                重新整理
              </NButton>
              <NButton type="primary" size="small" @click="handleAddTag">
                <template #icon><NIcon :component="AddOutline" /></template>
                {{ t('common.add') }}
              </NButton>
            </div>

            <NDataTable
              :columns="tagColumns"
              :data="marketingTags"
              :loading="tagLoading"
              :pagination="false"
              :bordered="false"
              :single-line="false"
            />
          </div>
        </NTabPane>
      </NTabs>
    </NCard>

    <!-- Modals remain the same structure but keep consistent styling -->
    <NModal v-model:show="showTypeEditModal" preset="card" :title="t('game.config.rate')" style="width: 450px" class="premium-glass">
      <div v-if="selectedType" class="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
        <div class="font-bold text-slate-800 dark:text-slate-200">{{ selectedType.name }}</div>
        <div class="text-xs text-slate-500 font-mono mt-1">{{ selectedType.code }} | ID: {{ selectedType.id }}</div>
      </div>
      <NForm :model="typeEditForm" label-placement="left" label-width="120">
        <NFormItem :label="t('game.config.rate')" required>
          <NInputNumber v-model:value="typeEditForm.rate" :min="0" :max="1000" :step="10" style="width: 100%" suffix="%" />
        </NFormItem>
      </NForm>
      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton @click="showTypeEditModal = false">{{ t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleTypeSubmit">{{ t('common.save') }}</NButton>
        </div>
      </template>
    </NModal>

    <NModal v-model:show="showTagModal" preset="card" :title="isTagEdit ? t('common.edit') : t('common.add')" style="width: 500px" class="premium-glass">
      <NForm :model="tagFormModel" label-placement="left" label-width="100">
        <NFormItem :label="t('game.list.tag')" required>
          <NInput v-model:value="tagFormModel.name" :placeholder="t('game.list.tag')" />
        </NFormItem>
        <NFormItem :label="t('game.config.rate')">
          <div class="w-full space-y-3">
            <NSwitch v-model:value="tagFormModel.has_rate">
              <template #checked>開啟比例設定</template>
              <template #unchecked>不調整比例</template>
            </NSwitch>
            <NCollapseTransition :show="tagFormModel.has_rate">
              <NInputNumber v-model:value="tagFormModel.rate" :min="0" :max="1000" :step="5" style="width: 100%" suffix="%" />
            </NCollapseTransition>
          </div>
        </NFormItem>
        <NFormItem :label="t('common.status')" required>
          <NSelect v-model:value="tagFormModel.status" :options="statusOptions" />
        </NFormItem>
        <NFormItem :label="t('permission.groupManagement.groupDesc')">
          <NInput type="textarea" v-model:value="tagFormModel.description" :placeholder="t('permission.groupManagement.groupDesc')" :rows="3" />
        </NFormItem>
      </NForm>
      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton @click="showTagModal = false">{{ t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleTagSubmit">{{ t('common.save') }}</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h, computed } from 'vue'
import { 
  NCard, NDataTable, NButton, NTag, NSwitch, NModal, NForm, NFormItem, 
  NInput, NInputNumber, useMessage, useDialog, DataTableColumns, NSpace, 
  NSelect, NIcon, NCollapseTransition, NTabs, NTabPane
} from 'naive-ui'
import { 
  RefreshOutline, AddOutline, CreateOutline, TrashOutline, 
  InformationCircleOutline, PricetagOutline, OptionsOutline 
} from '@vicons/ionicons5'
import { configApi } from '@/api/config'
import type { 
  GameType, GameTypeUpdateRequest, 
  MarketingTagConfig, MarketingTagCreateRequest, TagConfigStatus 
} from '@/types/game'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

// --- Game Type State ---
const typeLoading = ref(false)
const gameTypes = ref<GameType[]>([])
const showTypeEditModal = ref(false)
const selectedType = ref<GameType | null>(null)
const typeEditForm = ref<GameTypeUpdateRequest>({ rate: 100 })

const typeColumns: DataTableColumns<GameType> = [
  { title: 'ID', key: 'id', width: 80 },
  { 
    title: t('game.config.typeName'), 
    key: 'name', 
    width: 200,
    render: (row) => h('div', { class: 'flex items-center gap-2' }, [
      h(NIcon, { component: OptionsOutline, class: 'text-sky-500' }),
      h('span', { class: 'font-bold text-slate-700 dark:text-slate-200' }, row.name)
    ])
  },
  { title: t('game.config.typeCode'), key: 'code', width: 120, render: (row) => h('code', { class: 'text-xs text-slate-500 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700' }, row.code) },
  {
    title: t('game.config.rate'),
    key: 'rate',
    width: 150,
    render: (row) => h('span', { class: 'font-mono font-bold text-sky-600' }, `${row.rate}%`)
  },
  { title: t('game.provider.updatedAt'), key: 'updated_at', width: 180, render: (row) => row.updated_at.replace('T', ' ').replace('Z', '').slice(0, 19) },
  {
    title: t('common.action'),
    key: 'actions',
    width: 100,
    fixed: 'right',
    render: (row) => h(NButton, { size: 'small', quaternary: true, type: 'primary', onClick: () => handleTypeEdit(row) }, { default: () => t('common.edit'), icon: () => h(CreateOutline) })
  }
]

// --- Marketing Tag State ---
const tagLoading = ref(false)
const marketingTags = ref<MarketingTagConfig[]>([])
const showTagModal = ref(false)
const isTagEdit = ref(false)
const selectedTagId = ref<string | null>(null)
const tagFormModel = ref<MarketingTagCreateRequest>({
  name: '',
  has_rate: true,
  rate: 100,
  status: 'ACTIVE',
  description: ''
})

const statusOptions = computed(() => [
  { label: t('common.enable'), value: 'ACTIVE' },
  { label: t('common.disable'), value: 'DISABLED' }
])

const tagColumns: DataTableColumns<MarketingTagConfig> = [
  { title: 'ID', key: 'id', width: 80 },
  { 
    title: t('game.list.tag'), 
    key: 'name', 
    width: 150,
    render: (row) => h('div', { class: 'flex items-center gap-2' }, [
      h(NIcon, { component: PricetagOutline, class: 'text-emerald-500' }),
      h('span', { class: 'font-bold text-slate-700 dark:text-slate-200' }, row.name)
    ])
  },
  {
    title: t('game.provider.type'),
    key: 'tag_type',
    width: 100,
    render: (row) => h(NTag, { size: 'small', bordered: false, type: row.tag_type === 'SYSTEM' ? 'info' : 'success' }, { default: () => row.tag_type === 'SYSTEM' ? '系統' : '自定義' })
  },
  {
    title: t('game.config.rate'),
    key: 'rate',
    width: 120,
    render: (row) => row.has_rate ? h('span', { class: 'font-mono font-bold text-emerald-600' }, `${row.rate}%`) : h('span', { class: 'text-slate-400 italic' }, '不調整')
  },
  {
    title: t('common.status'),
    key: 'status',
    width: 100,
    render: (row) => h(NTag, { size: 'small', type: row.status === 'ACTIVE' ? 'success' : 'error' }, { default: () => row.status === 'ACTIVE' ? t('common.enable') : t('common.disable') })
  },
  { title: t('permission.groupManagement.groupDesc'), key: 'description', width: 250, ellipsis: { tooltip: true } },
  { title: '遊戲數', key: 'games_using', width: 80, align: 'center' },
  {
    title: t('common.action'),
    key: 'actions',
    width: 140,
    fixed: 'right',
    render: (row) => h(NSpace, { size: 'small' }, {
      default: () => [
        h(NButton, { size: 'small', quaternary: true, type: 'primary', onClick: () => handleTagEdit(row) }, { icon: () => h(CreateOutline), default: () => t('common.edit') }),
        row.tag_type === 'CUSTOM' ? h(NButton, { size: 'small', quaternary: true, type: 'error', onClick: () => handleTagDelete(row) }, { icon: () => h(TrashOutline) }) : null
      ]
    })
  }
]

// --- Logic ---
const fetchGameTypes = async () => {
  typeLoading.value = true
  try {
    const res = await configApi.getGameTypes()
    if (res.code === 0) gameTypes.value = res.data
  } finally { typeLoading.value = false }
}

const fetchMarketingTags = async () => {
  tagLoading.value = true
  try {
    const res = await configApi.getMarketingTags()
    if (res.code === 0) marketingTags.value = res.data
  } finally { tagLoading.value = false }
}

const handleTypeEdit = (type: GameType) => {
  selectedType.value = type
  typeEditForm.value = { rate: type.rate }
  showTypeEditModal.value = true
}

const handleTypeSubmit = async () => {
  if (!selectedType.value) return
  try {
    const res = await configApi.updateGameType(selectedType.value.id, typeEditForm.value)
    if (res.code === 0) {
      message.success(t('common.success'))
      showTypeEditModal.value = false
      fetchGameTypes()
    }
  } catch (err) { message.error(t('common.error')) }
}

const handleAddTag = () => {
  isTagEdit.value = false
  selectedTagId.value = null
  tagFormModel.value = { name: '', has_rate: true, rate: 100, status: 'ACTIVE', description: '' }
  showTagModal.value = true
}

const handleTagEdit = (tag: MarketingTagConfig) => {
  isTagEdit.value = true
  selectedTagId.value = tag.id
  tagFormModel.value = { name: tag.name, has_rate: tag.has_rate, rate: tag.rate, status: tag.status, description: tag.description }
  showTagModal.value = true
}

const handleTagDelete = (tag: MarketingTagConfig) => {
  if (tag.games_using > 0) {
    message.error('該標籤尚有遊戲正在使用中，無法刪除')
    return
  }
  dialog.warning({
    title: t('common.delete'),
    content: `確定要刪除標籤「${tag.name}」嗎？`,
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      try {
        const res = await configApi.deleteMarketingTag(tag.id)
        if (res.code === 0) {
          message.success(t('common.success'))
          fetchMarketingTags()
        }
      } catch (err) { message.error(t('common.error')) }
    }
  })
}

const handleTagSubmit = async () => {
  if (!tagFormModel.value.name) {
    message.warning('請輸入標籤名稱')
    return
  }
  try {
    let res
    if (isTagEdit.value && selectedTagId.value) {
      res = await configApi.updateMarketingTag(selectedTagId.value, tagFormModel.value)
    } else {
      res = await configApi.createMarketingTag(tagFormModel.value)
    }
    if (res.code === 0) {
      message.success(t('common.success'))
      showTagModal.value = false
      fetchMarketingTags()
    }
  } catch (err) { message.error(t('common.error')) }
}

onMounted(() => {
  fetchGameTypes()
  fetchMarketingTags()
})
</script>

<style scoped>
.premium-glass {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--card-shadow);
}
</style>
