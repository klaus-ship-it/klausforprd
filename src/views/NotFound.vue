<script setup lang="ts">
import { NEmpty, NButton } from 'naive-ui'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <NEmpty size="large" description="Not Found">
      <template #extra>
        <NButton @click="router.push('/')">{{ $t('common.confirm') }}</NButton>
      </template>
    </NEmpty>
  </div>
</template>
