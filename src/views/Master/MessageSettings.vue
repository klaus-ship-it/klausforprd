<script setup lang="ts">
import { ref, onMounted, reactive, h, computed } from 'vue'
import {
  NCard, NSpace, NInput, NButton, NDataTable, NSwitch,
  NModal, NForm, NFormItem, useMessage,
  NInputNumber, NAlert
} from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { MessageEvent, TestMessagePayload } from '@/types/messageSettings'
import { messageSettingsApi } from '@/api/messageSettings'
import TinymceEditor from '@/components/TinymceEditor.vue'

const { t } = useI18n()
const message = useMessage()

// --- Data ---
const loading = ref(false)
const data = ref<MessageEvent[]>([])

// --- Modal State ---
const showEditModal = ref(false)
const showPreviewModal = ref(false)
const showTestModal = ref(false)

const currentEvent = ref<MessageEvent | null>(null)
const editModel = reactive<{ subject: string, templateContent: string, bonusAmount: number }>({ subject: '', templateContent: '', bonusAmount: 0 })
const testModel = reactive<TestMessagePayload>({ playerId: '', eventCode: '' })

// Pending changes tracking
const pendingChanges = ref<Record<string, { field: keyof MessageEvent, value: any }>>({})
const hasPendingChanges = computed(() => Object.keys(pendingChanges.value).length > 0)
const showSaveConfirmModal = ref(false)

// --- Methods ---
const fetchData = async () => {
  loading.value = true
  try {
    const res = await messageSettingsApi.getMessageEvents()
    if (res.code === 0 && res.data) {
      data.value = res.data
    }
  } catch (error) {
    message.error(t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

const handleStatusChange = (id: string, channel: 'siteMessageEnabled' | 'emailEnabled' | 'smsEnabled', value: boolean) => {
  pendingChanges.value[`${id}_${channel}`] = { field: channel, value }
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
    
    const promises = Array.from(updates.entries()).map(([id, payload]) =>
      messageSettingsApi.updateMessageEvent(id, payload)
    )
    
    const results = await Promise.all(promises)
    const successCount = results.filter(r => r.code === 0).length
    
    if (successCount === results.length) {
      message.success(t('messageSettings.saveSuccess'))
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

const handlePreview = (row: MessageEvent) => {
  currentEvent.value = row
  showPreviewModal.value = true
}

const handleEdit = (row: MessageEvent) => {
  currentEvent.value = row
  editModel.subject = row.subject || ''
  editModel.templateContent = row.templateContent || ''
  editModel.bonusAmount = row.bonusAmount || 0
  showEditModal.value = true
}

const copyVariable = async (variable: string) => {
  try {
    await navigator.clipboard.writeText(variable)
    message.success(t('messageSettings.copySuccess'))
  } catch (err) {
    message.error(t('common.error'))
  }
}

const replaceMockVariables = (text: string, event: MessageEvent) => {
  if (!text) return ''
  let result = text
  result = result.replace(/{PlayerID}/g, 'VIP_Player_001')
  result = result.replace(/{Amount}/g, '$10,000')
  result = result.replace(/{OrderNo}/g, 'ORD-20260304-123')
  result = result.replace(/{Date}/g, '2026-03-04 12:00:00')
  result = result.replace(/{RegisterDate}/g, '2026-03-04')
  result = result.replace(/{IP}/g, '192.168.1.1')
  if (event.bonusAmount) {
    result = result.replace(/{BonusAmount}/g, `$${event.bonusAmount}`)
  } else {
    result = result.replace(/{BonusAmount}/g, `$0`)
  }
  return result
}

const submitEdit = async () => {
  if (!currentEvent.value) return
  loading.value = true
  try {
    const res = await messageSettingsApi.updateMessageEvent(currentEvent.value.id, {
      subject: editModel.subject,
      templateContent: editModel.templateContent,
      bonusAmount: editModel.bonusAmount
    })
    if (res.code === 0) {
      message.success(t('common.success'))
      showEditModal.value = false
      fetchData()
    }
  } catch(error) {
    message.error(t('common.error'))
  } finally {
    loading.value = false
  }
}

const handleTest = (row: MessageEvent) => {
  testModel.playerId = ''
  testModel.eventCode = row.eventCode
  showTestModal.value = true
}

const submitTest = async () => {
  if (!testModel.playerId) {
    message.warning(t('common.inputPlaceholder'))
    return
  }
  loading.value = true
  try {
    const res = await messageSettingsApi.testMessageSend(testModel)
    if (res.code === 0) {
      message.success(t('messageSettings.sendSuccess'))
      showTestModal.value = false
    }
  } catch(error) {
    message.error(t('common.error'))
  } finally {
    loading.value = false
  }
}

// --- Columns ---
const columns = [
  {
    title: t('messageSettings.eventName'),
    key: 'eventName',
    width: 200,
    render(row: MessageEvent) {
      return t(`messageSettings.defaultEvents.${row.eventName}`)
    }
  },
  {
    title: t('messageSettings.siteMessage'),
    key: 'siteMessageEnabled',
    width: 120,
    render(row: MessageEvent) {
      return h(NSwitch, {
        value: row.siteMessageEnabled,
        'onUpdate:value': (v) => {
          row.siteMessageEnabled = v
          handleStatusChange(row.id, 'siteMessageEnabled', v)
        }
      })
    }
  },
  {
    title: t('messageSettings.email'),
    key: 'emailEnabled',
    width: 120,
    render(row: MessageEvent) {
      return h(NSwitch, {
        value: row.emailEnabled,
        'onUpdate:value': (v) => {
          row.emailEnabled = v
          handleStatusChange(row.id, 'emailEnabled', v)
        }
      })
    }
  },
  {
    title: t('messageSettings.sms'),
    key: 'smsEnabled',
    width: 120,
    render(row: MessageEvent) {
      return h(NSwitch, {
        value: row.smsEnabled,
        'onUpdate:value': (v) => {
          row.smsEnabled = v
          handleStatusChange(row.id, 'smsEnabled', v)
        }
      })
    }
  },
  {
    title: t('messageSettings.actions'),
    key: 'actions',
    width: 240,
    fixed: 'right' as const,
    render(row: MessageEvent) {
      return h(NSpace, null, {
        default: () => [
          h(NButton, { size: 'small', type: 'info', ghost: true, onClick: () => handlePreview(row) }, { default: () => t('messageSettings.preview') }),
          h(NButton, { size: 'small', onClick: () => handleEdit(row) }, { default: () => t('messageSettings.edit') }),
          h(NButton, { size: 'small', type: 'primary', ghost: true, onClick: () => handleTest(row) }, { default: () => t('messageSettings.test') })
        ]
      })
    }
  }
]

onMounted(fetchData)
</script>

<template>
  <div class="p-4">
    <NCard :title="t('messageSettings.title')" class="shadow-sm rounded-lg border-none">
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

        <!-- Data Table -->
        <NDataTable
          :loading="loading"
          :columns="columns"
          :data="data"
          :row-key="(row) => row.id"
          scroll-x="900"
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

    <!-- Preview Modal -->
    <NModal
      v-model:show="showPreviewModal"
      preset="card"
      :title="t('messageSettings.previewTitle')"
      style="width: 400px"
    >
      <div v-if="currentEvent" class="bg-gray-100 p-4 rounded-xl flex items-center justify-center min-h-[400px]">
        <!-- Mobile Simulation Frame -->
        <div class="w-[320px] bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
          <div class="bg-sky-500 text-white text-center py-3 font-bold text-sm">
             {{ t('messageSettings.mockPreview') }}
          </div>
          <div class="p-5 flex-1 flex flex-col">
            <h3 class="font-bold text-lg text-slate-800 mb-3" v-if="currentEvent.subject">
              {{ currentEvent.subject }}
            </h3>
            <div class="text-sm text-slate-600 whitespace-pre-line leading-relaxed flex-1">
              {{ replaceMockVariables(currentEvent.templateContent, currentEvent) }}
            </div>
            
            <div class="mt-6 pt-4 border-t border-gray-100" v-if="currentEvent.bonusAmount && currentEvent.bonusAmount > 0 && ['registrationSuccess', 'maintenanceComplete'].includes(currentEvent.eventName)">
               <NAlert type="success" :show-icon="false" class="text-center mb-3">
                 {{ t('messageSettings.claimBonusDesc', { amount: currentEvent.bonusAmount }) }}
               </NAlert>
               <NButton type="primary" block strong>
                 {{ t('messageSettings.claimBonus') }}
               </NButton>
            </div>
          </div>
        </div>
      </div>
    </NModal>

    <!-- Edit Modal -->
    <NModal
      v-model:show="showEditModal"
      preset="card"
      :title="t('messageSettings.editTitle')"
      style="width: 600px"
    >
      <NForm label-placement="top">
        <NFormItem :label="t('messageSettings.templateName')">
          <NInput :value="currentEvent ? t(`messageSettings.defaultEvents.${currentEvent.eventName}`) : ''" readonly />
        </NFormItem>
        <NFormItem :label="t('messageSettings.subject')">
          <NInput v-model:value="editModel.subject" :placeholder="t('messageSettings.subjectPlaceholder')" :maxlength="100" />
        </NFormItem>
        <NFormItem :label="t('messageSettings.variables')" v-if="currentEvent?.availableVariables?.length">
          <NSpace>
            <NButton 
              size="small" 
              type="info" 
              dashed 
              v-for="v in currentEvent.availableVariables" 
              :key="v"
              @click="copyVariable(v)"
            >
              {{ v }}
            </NButton>
          </NSpace>
        </NFormItem>
        <NFormItem :label="t('messageSettings.templateContent')">
          <div class="w-full relative">
            <TinymceEditor 
              v-model="editModel.templateContent" 
              :placeholder="t('messageSettings.templateHint')"
              :height="250"
            />
            <div class="absolute -bottom-6 right-0 text-xs text-gray-400 font-mono">
               {{ t('messageSettings.characterCount', { current: editModel.templateContent.replace(/<[^>]*>?/gm, '').length, max: 200 }) }}
            </div>
          </div>
        </NFormItem>
        <div class="flex justify-end gap-3 mt-6">
          <NButton @click="showEditModal = false">{{ t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="loading" @click="submitEdit">{{ t('common.save') }}</NButton>
        </div>
      </NForm>
    </NModal>

    <!-- Test Modal -->
    <NModal
      v-model:show="showTestModal"
      preset="card"
      :title="t('messageSettings.testTitle')"
      style="width: 400px"
    >
      <NForm label-placement="top">
        <NFormItem :label="t('messageSettings.testAccount')">
          <NInput v-model:value="testModel.playerId" :placeholder="t('messageSettings.testAccountPlaceholder')" />
        </NFormItem>
        <div class="flex justify-end gap-3 mt-6">
          <NButton @click="showTestModal = false">{{ t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="loading" @click="submitTest">{{ t('messageSettings.sendTest') }}</NButton>
        </div>
      </NForm>
    </NModal>

  </div>
</template>

<style scoped>
:deep(.n-data-table-td) {
  vertical-align: middle;
}
</style>
