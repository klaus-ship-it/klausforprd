<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { useMessage } from 'naive-ui'
import {
  NCard,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NAlert,
  NSelect,
  NGrid,
  NGridItem,
  NDivider,
  NSwitch,
  NIcon
} from 'naive-ui'
import { CheckCircleOutlined as CheckIcon } from '@vicons/material'
import { useI18n } from 'vue-i18n'

const authStore = useAuthStore()
const message = useMessage()
const { t, locale } = useI18n()

const loading = ref(false)
const passwordChanged = ref(false)

// 個人資訊表單
const personalForm = reactive({
  username: '',
  displayName: '',
  email: '',
  language: 'zh-TW' as 'en' | 'zh-TW' | 'zh-CN',
  twoFactorAuth: false
})

// 密碼變更表單
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const personalFormRef = ref()

// 語言選項
const languageOptions = [
  { label: 'English', value: 'en' },
  { label: '繁體中文', value: 'zh-TW' },
  { label: '簡體中文', value: 'zh-CN' }
]

// 頁面初始化
onMounted(() => {
  if (authStore.user) {
    personalForm.username = authStore.user.user_id || ''
    personalForm.displayName = authStore.user.name || ''
    personalForm.email = authStore.user.email || ''
    personalForm.language = locale.value as 'en' | 'zh-TW' | 'zh-CN'
  }
})

// 更新個人資訊
const handleUpdateProfile = async () => {
  try {
    await personalFormRef.value?.validate()
    loading.value = true

    // 模擬 API 呼叫
    await new Promise(resolve => setTimeout(resolve, 500))

    // 更新語言偏好
    locale.value = personalForm.language

    message.success(t('permission.personalAccount.success'))
  } catch (error) {
    message.error(t('common.error'))
  } finally {
    loading.value = false
  }
}

// 變更密碼
const handleChangePassword = async () => {
  try {
    // 驗證表單
    if (!passwordForm.oldPassword) {
      message.warning(t('permission.personalAccount.oldPasswordRequired'))
      return
    }
    if (!passwordForm.newPassword) {
      message.warning(t('permission.personalAccount.newPasswordRequired'))
      return
    }
    if (!passwordForm.confirmPassword) {
      message.warning(t('permission.personalAccount.confirmPasswordRequired'))
      return
    }

    // 驗證新密碼是否相同
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      message.error(t('permission.personalAccount.passwordMismatch'))
      return
    }

    // 驗證新密碼是否與原密碼相同
    if (passwordForm.oldPassword === passwordForm.newPassword) {
      message.error(t('permission.personalAccount.passwordDuplicate'))
      return
    }

    // 驗證密碼複雜度 (8-16 位元，包含英數字)
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]{8,16}$/
    if (!passwordRegex.test(passwordForm.newPassword)) {
      message.error(t('permission.personalAccount.passwordInvalid'))
      return
    }

    loading.value = true

    // 模擬 API 呼叫
    await new Promise(resolve => setTimeout(resolve, 500))

    // 清空表單
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    passwordChanged.value = true

    message.success(`${t('permission.personalAccount.passwordChanged')}，將在 3 秒後刷新頁面`)

    // 3秒後刷新並重新登入
    setTimeout(() => {
      window.location.href = '/login'
    }, 3000)
  } catch (error) {
    message.error(t('common.error'))
  } finally {
    loading.value = false
  }
}

</script>

<template>
  <div class="w-full">
    <div class="p-6 space-y-6">
      <!-- 頁面標題 -->
      <div>
        <h1 class="text-3xl font-bold text-gray-900">{{ t('permission.personalAccount.title') }}</h1>
        <p class="text-gray-600 mt-1">{{ t('permission.personalAccount.description') }}</p>
      </div>

    <!-- 成功提示 -->
    <NAlert v-if="passwordChanged" type="success" closable>
      <template #icon>
        <NIcon>
          <CheckIcon />
        </NIcon>
      </template>
      {{ t('permission.personalAccount.passwordChanged') }}！{{ t('permission.personalAccount.passwordChangedDesc') }}。
    </NAlert>

    <NGrid :cols="1" responsive="screen">
      <!-- 個人資訊區塊 -->
      <NGridItem>
        <NCard :title="t('permission.personalAccount.personalInfo')" :bordered="true">
          <NForm
            ref="personalFormRef"
            :model="personalForm"
            label-placement="top"
            label-width="120"
          >
            <NFormItem :label="t('permission.personalAccount.accountNumber')" path="username">
              <NInput v-model:value="personalForm.username" disabled />
            </NFormItem>

            <NFormItem :label="t('permission.personalAccount.displayName')" path="displayName">
              <NInput
                v-model:value="personalForm.displayName"
                :placeholder="t('permission.personalAccount.displayName')"
                maxlength="20"
              />
            </NFormItem>

            <NFormItem :label="t('permission.personalAccount.email')" path="email">
              <NInput
                v-model:value="personalForm.email"
                :placeholder="t('permission.personalAccount.email')"
              />
            </NFormItem>

            <NFormItem :label="t('permission.personalAccount.language')" path="language">
              <NSelect
                v-model:value="personalForm.language"
                :options="languageOptions"
              />
            </NFormItem>

            <NButton
              type="primary"
              :loading="loading"
              @click="handleUpdateProfile"
              class="mt-4"
            >
              {{ t('common.save') }}
            </NButton>
          </NForm>
        </NCard>
      </NGridItem>

      <NDivider />

      <!-- 安全設定區塊 -->
      <NGridItem>
        <NCard :title="t('permission.personalAccount.securitySettings')" :bordered="true">
          <!-- 二階段驗證 -->
          <div class="mb-6">
            <div class="flex justify-between items-center">
              <div>
                <p class="font-semibold text-gray-900">{{ t('permission.personalAccount.twoFactorAuth') }}</p>
                <p class="text-sm text-gray-600 mt-1">
                  {{ t('permission.personalAccount.twoFactorAuthDesc') }}
                </p>
              </div>
              <NSwitch v-model:value="personalForm.twoFactorAuth" />
            </div>
          </div>

          <NDivider />

          <!-- 變更密碼 -->
          <div>
            <p class="font-semibold text-gray-900 mb-4">{{ t('permission.personalAccount.changePassword') }}</p>
            <NForm
              ref="passwordFormRef"
              :model="passwordForm"
              label-placement="top"
              label-width="120"
            >
              <NFormItem :label="t('permission.personalAccount.oldPassword')" path="oldPassword">
                <NInput
                  v-model:value="passwordForm.oldPassword"
                  type="password"
                  :placeholder="t('permission.personalAccount.oldPassword')"
                  show-password-on="click"
                />
              </NFormItem>

              <NFormItem :label="t('permission.personalAccount.newPassword')" path="newPassword">
                <NInput
                  v-model:value="passwordForm.newPassword"
                  type="password"
                  :placeholder="t('permission.personalAccount.passwordHint')"
                  show-password-on="click"
                />
              </NFormItem>

              <NFormItem :label="t('permission.personalAccount.confirmPassword')" path="confirmPassword">
                <NInput
                  v-model:value="passwordForm.confirmPassword"
                  type="password"
                  :placeholder="t('permission.personalAccount.confirmPassword')"
                  show-password-on="click"
                />
              </NFormItem>

              <NButton
                type="warning"
                :loading="loading"
                @click="handleChangePassword"
                class="mt-4"
              >
                {{ t('permission.personalAccount.changePassword') }}
              </NButton>
            </NForm>
          </div>
        </NCard>
      </NGridItem>
    </NGrid>
    </div>
  </div>
</template>

<style scoped>
:deep(.n-card) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
</style>
