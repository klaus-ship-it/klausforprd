import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ConfigState } from '@/types'

export const useConfigStore = defineStore('config', () => {
  const locale = ref<'en' | 'zh-TW' | 'zh-CN'>('zh-TW')
  const theme = ref<'light' | 'dark'>('light')
  const serverTime = ref<Date>(new Date())

  const setLocale = (newLocale: 'en' | 'zh-TW' | 'zh-CN') => {
    locale.value = newLocale
    localStorage.setItem('locale', newLocale)
  }

  const setTheme = (newTheme: 'light' | 'dark') => {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
  }

  const syncServerTime = (time: Date) => {
    serverTime.value = time
  }

  const loadFromStorage = () => {
    const savedLocale = localStorage.getItem('locale')
    if (savedLocale) {
      locale.value = savedLocale as 'en' | 'zh-TW' | 'zh-CN'
    }

    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      theme.value = savedTheme as 'light' | 'dark'
    }
  }

  return {
    locale,
    theme,
    serverTime,
    setLocale,
    setTheme,
    syncServerTime,
    loadFromStorage
  }
})
