<script setup lang="ts">
import { NCard, NSpin } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { ref, onMounted } from 'vue'

const { t } = useI18n()
const loading = ref(true)

onMounted(() => {
  setTimeout(() => {
    loading.value = false
  }, 1000)
})
</script>

<template>
  <NSpin :show="loading">
    <NCard :title="t('navigation.dashboard')" size="large">
      <p>{{ t('common.loading') }}</p>
    </NCard>
  </NSpin>
</template>
