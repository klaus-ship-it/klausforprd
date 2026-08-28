<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useConfigStore } from '@/stores/useConfigStore'
import { onMounted } from 'vue'
import { 
  NMessageProvider, 
  NDialogProvider, 
  NNotificationProvider,
  NConfigProvider,
  GlobalThemeOverrides,
  zhTW,
  dateZhTW,
  darkTheme
} from 'naive-ui'
import { computed } from 'vue'

const authStore = useAuthStore()
const configStore = useConfigStore()

const currentTheme = computed(() => configStore.theme === 'dark' ? darkTheme : null)

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#0ea5e9',
    primaryColorHover: '#38bdf8',
    primaryColorPressed: '#0284c7',
    borderRadius: '12px',
  }
}

onMounted(() => {
  authStore.loadUserFromStorage()
  configStore.loadFromStorage()
})
</script>

<template>
  <NConfigProvider 
    :locale="zhTW" 
    :date-locale="dateZhTW" 
    :theme="currentTheme"
    :theme-overrides="themeOverrides"
  >
    <NMessageProvider>
      <NDialogProvider>
        <NNotificationProvider>
          <RouterView />
        </NNotificationProvider>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style scoped>
</style>
