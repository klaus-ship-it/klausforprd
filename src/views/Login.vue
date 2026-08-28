<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { authApi } from '@/api/auth'
import { NForm, NFormItem, NInput, NButton, NCard, NCheckbox, NAlert, NGrid, NGridItem } from 'naive-ui'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const loading = ref(false)
const errorMessage = ref('')

const formData = reactive({
  username: '',
  password: '',
  rememberMe: false
})


// 預設身份列表
interface QuickLoginOption {
  id: string
  name: string
  tag: string
  description: string
  credentials: {
    username: string
    password: string
  }
}

const quickLoginOptions: QuickLoginOption[] = [
  {
    id: 'dev',
    name: '技術開發',
    tag: 'DEVELOPER',
    description: '開發人員 / 技術支持',
    credentials: {
      username: 'dev_admin',
      password: 'dev123456'
    }
  },
  {
    id: 'manager',
    name: '營運主管',
    tag: 'MANAGER',
    description: '營運管理 / 業務主管',
    credentials: {
      username: 'manager_admin',
      password: 'manager123456'
    }
  },
  {
    id: 'user',
    name: '一般職員',
    tag: 'USER',
    description: '一般員工 / 基礎權限',
    credentials: {
      username: 'service_user1',
      password: 'user123456'
    }
  }
]

const handleLogin = async () => {
  try {
    errorMessage.value = ''
    loading.value = true

    const response = await authApi.login(formData.username, formData.password)

    authStore.setAuth(response.token, response.user)

    // Redirect based on role
    if (['DEVELOPER', 'MANAGER', 'USER'].includes(response.user.role)) {
      await router.push('/admin/dashboard')
    } else if (response.user.role === 'MERCHANT') {
      await router.push('/merchant/dashboard')
    }
  } catch (error) {
    errorMessage.value = t('auth.invalidCredentials')
    console.error('Login error:', error)
  } finally {
    loading.value = false
  }
}

const handleQuickLogin = async (option: QuickLoginOption) => {
  try {
    errorMessage.value = ''
    loading.value = true

    // 自動帶入認證資訊
    formData.username = option.credentials.username
    formData.password = option.credentials.password

    // 執行登入
    const response = await authApi.login(formData.username, formData.password)

    authStore.setAuth(response.token, response.user)

    // Redirect based on role
    if (['DEVELOPER', 'MANAGER', 'USER'].includes(response.user.role)) {
      await router.push('/admin/dashboard')
    } else if (response.user.role === 'MERCHANT') {
      await router.push('/merchant/dashboard')
    }
  } catch (error) {
    errorMessage.value = t('auth.invalidCredentials')
    console.error('Quick login error:', error)
  } finally {
    loading.value = false
  }
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleLogin()
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
    <NCard class="w-full max-w-md" :bordered="false" :segmented="false">
      <template #header>
        <div class="text-center">
          <h1 class="text-2xl font-bold text-gray-900">{{ t('auth.login') }}</h1>
          <p class="text-gray-600 text-sm mt-1">Aggregator Platform</p>
        </div>
      </template>

      <NAlert v-if="errorMessage" type="error" class="mb-4" closable>
        {{ errorMessage }}
      </NAlert>

      <NForm ref="formRef" :model="formData" size="large">
        <NFormItem :label="t('auth.username')" path="username" label-placement="top">
          <NInput
            v-model:value="formData.username"
            :placeholder="t('auth.username')"
            clearable
            @keydown="handleKeyDown"
          />
        </NFormItem>

        <NFormItem :label="t('auth.password')" path="password" label-placement="top">
          <NInput
            v-model:value="formData.password"
            type="password"
            :placeholder="t('auth.password')"
            clearable
            show-password-on="click"
            @keydown="handleKeyDown"
          />
        </NFormItem>

        <NFormItem path="rememberMe">
          <NCheckbox v-model:checked="formData.rememberMe">
            {{ t('auth.rememberMe') }}
          </NCheckbox>
        </NFormItem>

        <NButton
          type="primary"
          block
          size="large"
          :loading="loading"
          @click="handleLogin"
          class="mt-4"
        >
          {{ t('auth.login') }}
        </NButton>
      </NForm>

      <!-- 快速登入身份列表 -->
      <div class="mt-6 pt-6 border-t border-gray-200">
        <p class="text-center text-sm font-semibold text-gray-700 mb-4">
          快速登入
        </p>
        <NGrid :cols="1" :x-gap="12" :y-gap="10">
          <NGridItem v-for="option in quickLoginOptions" :key="option.id">
            <NButton
              block
              type="default"
              :loading="loading"
              @click="handleQuickLogin(option)"
              class="quick-login-btn"
            >
              <template #default>
                <div class="text-left w-full">
                  <div class="font-semibold text-gray-800">{{ option.name }}</div>
                  <div class="text-xs text-gray-500 mt-1">
                    {{ option.description }}
                  </div>
                </div>
              </template>
            </NButton>
          </NGridItem>
        </NGrid>
      </div>

      <div class="mt-4 text-center">
        <a href="#" class="text-sm text-blue-600 hover:text-blue-700">
          {{ t('auth.forgotPassword') }}
        </a>
      </div>
    </NCard>
  </div>
</template>

<style scoped>
:deep(.n-card) {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.quick-login-btn {
  transition: all 0.3s ease;
}

.quick-login-btn:hover {
  border-color: #1890ff;
  background-color: #f0f7ff;
}
</style>
