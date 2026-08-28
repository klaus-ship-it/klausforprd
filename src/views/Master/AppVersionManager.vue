<script setup lang="ts">
import { ref, reactive, onMounted, h, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { versionApi } from '@/api/version'
import { VersionRecord, CreateVersionRequest } from '@/types/version'
import { NCard, NDataTable, NButton, NModal, NForm, NFormItem, NInput, NSelect, NSwitch, useMessage, NInputNumber, DataTableColumns, NSpace, NTag } from 'naive-ui'

const { t } = useI18n()
const message = useMessage()

const items = ref<VersionRecord[]>([])
const loading = ref(false)

const showModal = ref(false)
const editing = ref<VersionRecord | null>(null)

const formModel = reactive<CreateVersionRequest>({
  platforms: ['IOS'],
  version: '1.0.0',
  build: 100,
  update_type: 'OPTION',
  download_link: '',
  title: '',
  changelog: { zh: '' },
  enabled: true
})

const platformOptions = [
  { label: 'iOS', value: 'IOS' },
  { label: 'Android', value: 'ANDROID' },
  { label: 'H5', value: 'H5' }
]

const updateTypeOptions = computed(() => [
  { label: t('appVersion.updateTypes.none'), value: 'NONE' },
  { label: t('appVersion.updateTypes.option'), value: 'OPTION' },
  { label: t('appVersion.updateTypes.force'), value: 'FORCE' }
])


const columns = computed<DataTableColumns<VersionRecord>>(() => [
  {
    title: t('appVersion.table.version'),
    key: 'version',
    width: 120,
    render: (row) => h('div', {}, [
      h('div', { class: 'font-bold' }, `v${row.version}`),
      h('div', { class: 'text-xs text-gray-500' }, `build ${row.build}`)
    ])
  },
  {
    title: t('appVersion.table.platform'),
    key: 'platforms',
    width: 150,
    render: (row) => row.platforms.map(p => h(NTag, { size: 'small', class: 'mr-1' }, { default: () => p }))
  },
  {
    title: t('appVersion.table.type'),
    key: 'update_type',
    width: 120,
    render: (row) => {
        const typeLabel = row.update_type === 'FORCE' ? t('appVersion.updateTypes.force') : 
                         row.update_type === 'OPTION' ? t('appVersion.updateTypes.option') : 
                         t('appVersion.updateTypes.none')
        return h(NTag, { type: row.update_type === 'FORCE' ? 'error' : row.update_type === 'OPTION' ? 'warning' : 'default' }, { default: () => typeLabel })
    }
  },
  {
    title: t('appVersion.table.status'),
    key: 'enabled',
    width: 100,
    render: (row) => h(NTag, { type: row.enabled ? 'success' : 'error' }, { default: () => row.enabled ? t('appVersion.statusText.enabled') : t('appVersion.statusText.disabled') })
  },
  {
    title: t('appVersion.table.title'),
    key: 'title',
    width: 200,
    render: (row) => row.title
  },
  {
    title: t('appVersion.table.action'),
    key: 'actions',
    width: 150,
    align: 'center',
    render: (row) => h(NSpace, {}, {
      default: () => [
        h(NButton, { size: 'small', onClick: () => openEdit(row) }, { default: () => t('common.edit') }),
        h(NButton, { size: 'small', type: 'error', onClick: () => remove(row.id) }, { default: () => t('common.delete') })
      ]
    })
  }
])

const load = async () => {
  loading.value = true
  const res = await versionApi.list()
  if (res.code === 0) items.value = res.data || []
  loading.value = false
}

const openCreate = () => {
  editing.value = null
  Object.assign(formModel, { platforms: ['IOS'], version: '1.0.0', build: 100, update_type: 'OPTION', download_link: '', title: '', changelog: { zh: '' }, enabled: true })
  showModal.value = true
}

const openEdit = (row: VersionRecord) => {
  editing.value = row
  Object.assign(formModel, { platforms: [...row.platforms], version: row.version, build: row.build, update_type: row.update_type, download_link: row.download_link, title: row.title, changelog: row.changelog, enabled: row.enabled })
  showModal.value = true
}

const save = async () => {
  if (!formModel.version || !formModel.build || !formModel.download_link) {
    message.warning(t('appVersion.fillRequired'))
    return
  }
  if (editing.value) {
    await versionApi.update(editing.value.id, formModel)
    message.success(t('appVersion.updateSuccess'))
  } else {
    await versionApi.create(formModel)
    message.success(t('appVersion.addSuccess'))
  }
  showModal.value = false
  load()
}

const remove = async (id: string) => {
  if (!confirm(t('appVersion.deleteConfirm'))) return
  await versionApi.remove(id)
  message.success(t('appVersion.deleteSuccess'))
  load()
}

onMounted(load)
</script>

<template>
  <div class="p-6">
    <NCard :title="t('appVersion.title')" class="mb-4">
      <template #header-extra>
        <div class="flex gap-2">
          <NButton type="primary" @click="openCreate">{{ t('appVersion.addVersion') }}</NButton>
        </div>
      </template>

      <NDataTable :columns="columns" :data="items" :loading="loading" :bordered="false" :single-line="false" />
    </NCard>

    <NModal v-model:show="showModal" :title="t('appVersion.editVersion')" preset="card" style="width:720px">
      <NForm :model="formModel">
        <NFormItem :label="t('appVersion.form.platform')">
          <NSelect v-model:value="formModel.platforms" multiple :options="platformOptions" />
        </NFormItem>

        <NFormItem :label="t('appVersion.form.version')">
          <NInput v-model:value="formModel.version" />
        </NFormItem>

        <NFormItem :label="t('appVersion.form.build')">
          <NInputNumber v-model:value="formModel.build" :min="1" style="width:120px" />
        </NFormItem>

        <NFormItem :label="t('appVersion.form.type')">
          <NSelect v-model:value="formModel.update_type" :options="updateTypeOptions" />
        </NFormItem>


        <NFormItem :label="t('appVersion.form.link')">
          <NInput v-model:value="formModel.download_link" />
        </NFormItem>

        <NFormItem :label="t('appVersion.form.title')">
          <NInput v-model:value="formModel.title" />
        </NFormItem>

        <NFormItem :label="t('appVersion.form.changelog')">
          <NInput v-model:value="formModel.changelog.zh" type="textarea" rows="6" />
        </NFormItem>

        <NFormItem :label="t('appVersion.form.enabled')">
          <NSwitch v-model:value="formModel.enabled" />
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton @click="showModal = false">{{ t('common.cancel') }}</NButton>
          <NButton type="primary" @click="save">{{ t('common.confirm') }}</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

