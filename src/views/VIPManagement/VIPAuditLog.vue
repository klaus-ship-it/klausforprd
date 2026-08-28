<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import { NButton, NCard, NDataTable, NDescriptions, NDescriptionsItem, NInput, NModal, NTag, useMessage } from 'naive-ui'
import { vipApi } from '@/api/vip'
import { VIPAuditLog } from '@/types/vip'

const message = useMessage()
const loading = ref(false)
const keyword = ref('')
const logs = ref<VIPAuditLog[]>([])
const selectedLog = ref<VIPAuditLog | null>(null)
const showDetail = ref(false)

const actionLabel = (action: VIPAuditLog['action_type']) => ({
    AUTO_PROMOTE: '自動升級',
    AUTO_DEMOTE: '自動降級',
    RETAIN_SUCCESS: '保級成功',
    MANUAL_ADJUST: '人工調整',
    RESTORE: '降級後依一般升級條件升級',
    UPGRADE_PROTECTED: '當月升級不降級',
    DEMOTION_LIMIT_REACHED: '已達連續降級上限'
}[action])

const rewardResultLabel = (result?: VIPAuditLog['reward_result']) => ({
    ISSUED: '已發放',
    NOT_ISSUED: '不發放',
    ALREADY_RECEIVED: '已領取不重發',
    DEMOTION_NOT_APPLICABLE: '降級不適用升級獎勵',
    RETAIN_NOT_APPLICABLE: '保級不適用升級獎勵',
    NOT_APPLICABLE: '降級／保級不適用升級獎勵'
}[result || 'NOT_APPLICABLE'])

const loadLogs = async () => {
    loading.value = true
    try {
        const res = await vipApi.getVIPAuditLogs(keyword.value)
        if (res.code === 0 && res.data) logs.value = res.data
    } catch {
        message.error('VIP 稽核紀錄載入失敗')
    } finally {
        loading.value = false
    }
}

const columns = [
    { title: '時間（系統時間）', key: 'created_at', width: 180, render: (row: VIPAuditLog) => new Date(row.created_at).toLocaleString('zh-TW') },
    { title: '會員', key: 'player_username', width: 160, render: (row: VIPAuditLog) => `${row.player_username} (${row.player_id})` },
    { title: '原等級', key: 'old_level', render: (row: VIPAuditLog) => `VIP${row.old_level}` },
    { title: '新等級', key: 'new_level', render: (row: VIPAuditLog) => `VIP${row.new_level}` },
    { title: '動作', key: 'action_type', render: (row: VIPAuditLog) => h(NTag, { type: row.action_type === 'AUTO_DEMOTE' ? 'error' : row.action_type === 'AUTO_PROMOTE' ? 'success' : 'info' }, { default: () => actionLabel(row.action_type) }) },
    { title: '觸發原因', key: 'trigger_reason', minWidth: 260 },
    { title: '操作人員', key: 'operator', width: 140 },
    { title: '操作', key: 'actions', width: 90, render: (row: VIPAuditLog) => h(NButton, { size: 'small', quaternary: true, onClick: () => { selectedLog.value = row; showDetail.value = true } }, { default: () => '查看' }) }
]

onMounted(loadLogs)
</script>

<template>
  <div class="p-6 space-y-6">
    <NCard class="premium-glass" title="VIP 升降級稽核">
      <div class="flex gap-3">
        <NInput v-model:value="keyword" clearable placeholder="搜尋會員帳號或會員 ID" @keyup.enter="loadLogs" />
        <NButton type="primary" @click="loadLogs">搜尋</NButton>
      </div>
      <p class="text-xs text-slate-500 mt-3">完整保留每日升級、每月 1 日保級／降級、當月升級不降級與人工調整紀錄；降級後重新達標時依一般升級流程記錄。</p>
    </NCard>
    <NCard class="premium-glass">
      <NDataTable :columns="columns" :data="logs" :loading="loading" :bordered="false" />
    </NCard>
    <NModal v-model:show="showDetail" preset="card" title="VIP 異動詳細紀錄" style="width: 620px">
      <NDescriptions v-if="selectedLog" bordered :column="1">
        <NDescriptionsItem label="紀錄 ID">{{ selectedLog.id }}</NDescriptionsItem>
        <NDescriptionsItem label="會員">{{ selectedLog.player_username }}（{{ selectedLog.player_id }}）</NDescriptionsItem>
        <NDescriptionsItem label="等級變更">VIP{{ selectedLog.old_level }} → VIP{{ selectedLog.new_level }}</NDescriptionsItem>
        <NDescriptionsItem label="動作類型">{{ actionLabel(selectedLog.action_type) }}</NDescriptionsItem>
        <NDescriptionsItem label="觸發原因">{{ selectedLog.trigger_reason }}</NDescriptionsItem>
        <NDescriptionsItem label="獎勵結果">{{ rewardResultLabel(selectedLog.reward_result) }}</NDescriptionsItem>
        <NDescriptionsItem label="條件快照"><pre class="text-xs whitespace-pre-wrap">{{ JSON.stringify(selectedLog.snapshot, null, 2) }}</pre></NDescriptionsItem>
        <NDescriptionsItem label="操作人員">{{ selectedLog.operator }}</NDescriptionsItem>
        <NDescriptionsItem label="備註">{{ selectedLog.remark || '-' }}</NDescriptionsItem>
      </NDescriptions>
    </NModal>
  </div>
</template>

<style scoped>
.premium-glass { background: rgba(255,255,255,.7); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,.3); box-shadow: 0 8px 32px rgba(31,38,135,.07); border-radius: 16px; }
</style>
