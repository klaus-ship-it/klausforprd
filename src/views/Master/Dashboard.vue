<script setup lang="ts">
import { NCard, NSpace, NSpin } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { ref, onMounted } from 'vue'

const { t } = useI18n()
const loading = ref(true)

onMounted(() => {
  // Simulate loading
  setTimeout(() => {
    loading.value = false
  }, 1000)
})
</script>

<template>
  <NSpin :show="loading">
    <NSpace vertical>
      <NCard :title="t('navigation.dashboard')" size="large">
        <p>{{ t('common.loading') }}</p>
      </NCard>
    </NSpace>
  </NSpin>
</template>
