<template>
  <div class="operation-config">
    <n-card :title="t('navigation.operationConfig')" :segmented="{ content: true, footer: 'soft' }">
      <!-- Access Operation Button -->
      <div class="mb-4 flex gap-2" v-if="!loading">
        <n-button 
          type="warning" 
          :disabled="pendingChangesCount === 0" 
          @click="handleSave"
          :loading="isSaving"
        >
          存取操作
          <span v-if="pendingChangesCount > 0" class="ml-1">({{ pendingChangesCount }})</span>
        </n-button>
      </div>

      <!-- Loading state -->
      <n-spin v-if="loading" />

      <template v-else>
        <n-form
          ref="formRef"
          :model="formModel"
          :rules="rules"
          label-placement="left"
          label-width="200px"
        >
          <n-grid :cols="24" :x-gap="24">
            <!-- 營運與維護 -->
            <n-form-item-gi :span="24">
              <n-divider title-placement="left">營運與維護</n-divider>
            </n-form-item-gi>

            <n-form-item-gi :span="12" label="全站維護開關" path="maintenance_enabled">
              <n-switch v-model:value="formModel.maintenance_enabled" />
              <n-text v-if="formModel.maintenance_enabled" type="warning" class="ml-2">
                維護中 (禁止訪問)
              </n-text>
            </n-form-item-gi>

            <n-form-item-gi :span="12" label="強制踢線時間" path="maintenance_kickout_at">
              <n-date-picker
                v-model:value="formModel.maintenance_kickout_at"
                type="datetime"
                placeholder="選擇強制踢線的絕對時間"
                clearable
                style="width: 100%"
              />
            </n-form-item-gi>

            <n-form-item-gi :span="12" label="停服前提示時間 (分)" path="maintenance_warning_minutes">
              <n-input-number
                v-model:value="formModel.maintenance_warning_minutes"
                :min="0"
                placeholder="停服前幾分鐘開始在遊戲內提示"
              />
              <n-text depth="3" class="ml-2" style="font-size:12px">分鐘前開始顯示維護提示</n-text>
            </n-form-item-gi>

            <n-form-item-gi :span="24" label="維護公告內容" path="maintenance_message.zh">
              <n-input
                v-model:value="formModel.maintenance_message.zh"
                type="textarea"
                placeholder="維護時前端顯示的自定義文字"
                :rows="2"
              />
            </n-form-item-gi>

            <n-form-item-gi :span="12" label="允許測試登入" path="allow_test_login">
              <n-switch v-model:value="formModel.allow_test_login" />
              <n-text depth="3" class="ml-2">管理員與測試帳號</n-text>
            </n-form-item-gi>

            <n-form-item-gi :span="12" label="註冊功能開關" path="registration_enabled">
              <n-switch v-model:value="formModel.registration_enabled" />
              <n-text :type="formModel.registration_enabled ? 'success' : 'error'" class="ml-2">
                {{ formModel.registration_enabled ? '開放註冊' : '關閉註冊' }}
              </n-text>
            </n-form-item-gi>

            <!-- 網站基礎設定 -->
            <n-form-item-gi :span="24">
              <n-divider title-placement="left">網站基礎設定</n-divider>
            </n-form-item-gi>

            <n-form-item-gi :span="24" label="網站標題" path="site_title">
              <n-input v-model:value="formModel.site_title" placeholder="瀏覽器分頁與標題" />
            </n-form-item-gi>

            <n-form-item-gi :span="12" label="預設語系" path="default_language">
              <n-select v-model:value="formModel.default_language" :options="languageOptions" />
            </n-form-item-gi>

            <!-- 推廣與財務參數 -->
            <n-form-item-gi :span="24">
              <n-divider title-placement="left">推廣與財務參數</n-divider>
            </n-form-item-gi>

            <n-form-item-gi :span="12" label="活動獎勵卡結算極小值" path="rollover_settlement_threshold">
              <n-input-number v-model:value="formModel.rollover_settlement_threshold" :min="0" :step="0.01" />
            </n-form-item-gi>

            <n-form-item-gi :span="12" label="註冊贈點金額" path="registration_bonus_amount">
              <n-input-number v-model:value="formModel.registration_bonus_amount" :min="0" style="width: 100%" />
            </n-form-item-gi>

            <n-form-item-gi :span="12" label="註冊贈點幣別" path="registration_bonus_currency">
              <n-select
                v-model:value="formModel.registration_bonus_currency"
                :options="currencyOptions"
                style="width: 100%"
              />
            </n-form-item-gi>

            <template v-if="isActivityCurrency">
              <n-form-item-gi :span="12" label="流水門檻倍率" path="registration_bonus_rollover_multiplier">
                <n-input-number
                  v-model:value="formModel.registration_bonus_rollover_multiplier"
                  :min="0"
                  :step="1"
                  placeholder="倍率"
                  style="width: 100%"
                />
              </n-form-item-gi>

              <n-form-item-gi :span="12" label="轉換上限" path="registration_bonus_conversion_cap">
                <n-input-number
                  v-model:value="formModel.registration_bonus_conversion_cap"
                  :min="0"
                  placeholder="最高可轉換金額，0 表示無上限"
                  style="width: 100%"
                >
                  <template #prefix>$</template>
                </n-input-number>
              </n-form-item-gi>
            </template>

            <!-- 安全性設定 -->
            <n-form-item-gi :span="24">
              <n-divider title-placement="left">安全性設定</n-divider>
            </n-form-item-gi>

            <n-form-item-gi :span="12" label="登入錯誤上限" path="login_error_limit">
              <n-input-number v-model:value="formModel.login_error_limit" :min="1" :max="20" />
            </n-form-item-gi>

            <n-form-item-gi :span="12" label="強制手機綁定" path="force_phone_binding">
              <n-switch v-model:value="formModel.force_phone_binding" />
            </n-form-item-gi>

            <n-form-item-gi :span="24" label="前台黑名單 IP" path="blacklist_ips">
              <n-input
                v-model:value="formModel.blacklist_ips"
                type="textarea"
                placeholder="輸入禁止前台訪問的 IP 或 IP 段（每行一個，例：192.168.1.1 或 10.0.0.0/24）"
                :rows="3"
              />
            </n-form-item-gi>
          </n-grid>
        </n-form>

        <!-- Audit Info -->
        <n-divider />
        <n-space justify="space-between" style="margin-top: 16px;">
          <n-text type="hint" v-if="config">
            最後更新：{{ formatDate(config.updated_at) }} by {{ config.updated_by }}
          </n-text>
          <n-button text type="primary" @click="showChangeReasonModal = true">
            查看變更歷史
          </n-button>
        </n-space>
      </template>
    </n-card>

    <!-- Change Reason Modal -->
    <n-modal
      v-model:show="showChangeReasonModal"
      title="編輯變更原因"
      preset="dialog"
      positive-text="確認"
      negative-text="取消"
      @positive-click="confirmSave"
      @negative-click="showChangeReasonModal = false"
    >
      <n-form-item label="變更原因">
        <n-input
          v-model:value="changeReason"
          type="textarea"
          placeholder="請填寫此次變更的原因（供審計日誌使用）"
          :rows="4"
          clearable
        />
      </n-form-item>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NCard, NButton, NSpin, NForm, NFormItem,
  NDivider, NSwitch, NText, NInput, NInputNumber, NSpace, NModal,
  NSelect, NGrid, NFormItemGi, NDatePicker,
  useMessage, useDialog
} from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { operationConfigApi } from '@/api/operationConfig'
import type { OperationConfig } from '@/types/operationConfig'

const message = useMessage()
const dialog = useDialog()
const { t } = useI18n()
const formRef = ref<FormInst>()

const loading = ref(false)
const isSaving = ref(false)
const showChangeReasonModal = ref(false)
const changeReason = ref('')

const config = ref<OperationConfig | null>(null)

// 選項數據
const languageOptions = [
  { label: '繁體中文', value: 'zh-TW' },
  { label: '簡體中文', value: 'zh-CN' },
  { label: 'English', value: 'en' }
]

const currencyOptions = [
  { label: '儲值金幣', value: 'CASH_GOLD' },
  { label: '儲值銀幣', value: 'CASH_SILVER' },
  { label: '活動金幣', value: 'BONUS_GOLD' },
  { label: '活動銀幣', value: 'BONUS_SILVER' },
  { label: '遊戲銅幣', value: 'GAME_BRONZE' }
]

// 是否為活動幣別（需顯示流水與轉換上限）
const isActivityCurrency = computed(() =>
  formModel.registration_bonus_currency === 'BONUS_GOLD' ||
  formModel.registration_bonus_currency === 'BONUS_SILVER'
)

// Calculate pending changes dynamically
const pendingChanges = computed(() => {
  const changes: any = {}
  if (!config.value) return changes
  
  for (const key of Object.keys(formModel)) {
    const newVal = (formModel as any)[key]
    const oldVal = (config.value as any)[key]
    
    // Deep comparison for nested objects (maintenance_message)
    if (typeof newVal === 'object' && newVal !== null) {
      if (JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
        changes[key] = newVal
      }
    } else if (newVal !== oldVal) {
      changes[key] = newVal
    }
  }
  return changes
})

const pendingChangesCount = computed(() => Object.keys(pendingChanges.value).length)

const formModel = reactive({
  // 營運與維護
  maintenance_enabled: false,
  maintenance_message: { zh: '', 'zh-CN': '' },
  maintenance_kickout_at: null as number | null,         // 絕對時間 timestamp (ms)
  maintenance_warning_minutes: 15,                        // 停服前幾分鐘開始提示
  allow_test_login: true,
  registration_enabled: true,

  // 網站基礎設定
  site_title: '',
  default_language: 'zh-TW',

  // 推廣與財務參數
  registration_bonus_amount: 100,
  registration_bonus_currency: 'CASH_GOLD' as string,
  registration_bonus_rollover_multiplier: 1 as number,
  registration_bonus_conversion_cap: 0 as number,
  rollover_settlement_threshold: 0.99,

  // 安全性設定
  login_error_limit: 5,
  force_phone_binding: false,
  blacklist_ips: ''
})

const rules: FormRules = {
  site_title: { required: true, message: '請輸入網站標題', trigger: 'blur' },
  registration_bonus_amount: { type: 'number', min: 0, message: '金額不正確', trigger: ['blur', 'change'] },
  login_error_limit: { type: 'number', min: 1, max: 20, message: '錯誤上限應在 1-20 之間', trigger: ['blur', 'change'] },
  maintenance_warning_minutes: { type: 'number', min: 0, message: '請輸入有效分鐘數', trigger: ['blur', 'change'] }
}

const loadConfig = async () => {
  try {
    loading.value = true
    const res = await operationConfigApi.get()
    if (res.code === 0 && res.data) {
      config.value = res.data
      Object.assign(formModel, res.data)
    } else {
      message.error(res.msg || '載入設定失敗')
    }
  } catch (e) {
    message.error('載入設定異常')
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  try {
    await formRef.value?.validate()

    if (pendingChangesCount.value === 0) {
      message.info('沒有任何變更')
      return
    }

    changeReason.value = ''
    showChangeReasonModal.value = true
  } catch (e) {
    message.error('表單驗證失敗')
  }
}

const confirmSave = async () => {
  if (!changeReason.value.trim()) {
    message.warning('請填寫變更原因')
    return
  }

  if (!pendingChanges.value) return

  try {
    isSaving.value = true
    const res = await operationConfigApi.update(pendingChanges.value, changeReason.value)
    
    if (res.code === 0) {
      message.success('設定已更新')
      showChangeReasonModal.value = false
      await loadConfig()
    } else {
      message.error(res.msg || '更新失敗')
    }
  } catch (e) {
    message.error('更新異常')
    console.error(e)
  } finally {
    isSaving.value = false
  }
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-TW')
}

loadConfig()
</script>

<style scoped>
.operation-config {
  padding: 20px;
}

:deep(.n-form) {
  max-width: 900px;
}

:deep(.n-divider__title) {
  font-weight: 600;
  font-size: 14px;
}
</style>
