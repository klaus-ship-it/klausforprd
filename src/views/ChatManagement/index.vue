<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ t('chatManagement.roomManagement.title') }}</h2>
    </div>

    <n-card :bordered="false" class="shadow-sm rounded-lg" size="large">
      <n-tabs type="line" size="large" justify-content="start">
        <n-tab-pane name="world" :tab="t('chatManagement.roomManagement.world')">
          <world-channel />
        </n-tab-pane>
        <n-tab-pane name="private" :tab="t('chatManagement.roomManagement.private')">
          <private-chat />
        </n-tab-pane>
        <n-tab-pane name="customer-service" :tab="t('chatManagement.roomManagement.customer')">
          <customer-service />
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NCard, NTabs, NTabPane } from 'naive-ui'
import WorldChannel from './components/WorldChannel.vue'
import PrivateChat from './components/PrivateChat.vue'
import CustomerService from './components/CustomerService.vue'

const { t } = useI18n()
</script>
