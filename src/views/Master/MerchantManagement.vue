<script setup lang="ts">
import { NCard, NEmpty } from 'naive-ui'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <NCard :title="t('navigation.merchants')" size="large">
    <NEmpty description="Coming Soon..." />
  </NCard>
</template>
