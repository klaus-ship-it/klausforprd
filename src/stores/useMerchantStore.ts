import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MerchantConfig } from '@/types'

export const useMerchantStore = defineStore('merchant', () => {
  const currentMerchantId = ref<string>('')
  const merchantDetail = ref<MerchantConfig | null>(null)

  const switchMerchant = (id: string) => {
    currentMerchantId.value = id
  }

  const setMerchantDetail = (detail: MerchantConfig) => {
    merchantDetail.value = detail
  }

  const loadMerchantConfig = async (id: string) => {
    // This will be replaced with actual API call
    currentMerchantId.value = id
  }

  return {
    currentMerchantId,
    merchantDetail,
    switchMerchant,
    setMerchantDetail,
    loadMerchantConfig
  }
})
