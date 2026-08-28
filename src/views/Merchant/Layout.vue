<script setup lang="ts">
import { NLayout, NLayoutHeader, NLayoutContent, NLayoutSider, NMenu } from 'naive-ui'
import { RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const menuOptions = computed(() => [
  {
    label: t('navigation.dashboard'),
    key: 'merchant-dashboard',
    click: () => router.push('/merchant/dashboard')
  }
])

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <NLayout has-sider>
    <NLayoutSider collapse-mode="width" :width="240" :collapsed-width="0" show-trigger="bar">
      <NMenu :options="menuOptions" />
    </NLayoutSider>

    <NLayout>
      <NLayoutHeader class="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h1 class="text-xl font-bold">{{ t('navigation.dashboard') }}</h1>
        <button @click="handleLogout" class="text-sm text-red-600 hover:text-red-700">
          {{ t('auth.logout') }}
        </button>
      </NLayoutHeader>

      <NLayoutContent class="p-6">
        <RouterView />
      </NLayoutContent>
    </NLayout>
  </NLayout>
</template>
