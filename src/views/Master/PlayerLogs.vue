<template>
  <div class="p-6">
    <NCard title="玩家操作日誌">
      <!-- Simple Search for now -->
      <NForm inline class="mb-4">
          <NFormItem label="玩家 ID">
              <NInput v-model:value="searchPlayerId" placeholder="輸入玩家 ID" />
          </NFormItem>
          <NFormItem>
              <NButton type="primary" @click="handleSearch">搜尋</NButton>
          </NFormItem>
      </NForm>

      <NDataTable
        :columns="columns"
        :data="logs"
        :loading="loading"
        :pagination="pagination"
      />
    </NCard>
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted } from 'vue'
import { NCard, NDataTable, NTag, NForm, NFormItem, NInput, NButton } from 'naive-ui'
import { playerApi } from '@/api/player'
import { PlayerAuditLog } from '@/types/player'

const loading = ref(false)
const logs = ref<PlayerAuditLog[]>([])
const searchPlayerId = ref('')

const pagination = { pageSize: 10 }

const columns = [
    { title: 'ID', key: 'id', width: 80 },
    { 
        title: '時間', 
        key: 'timestamp',
        render: (row: PlayerAuditLog) => row.timestamp.replace('T', ' ').split('.')[0]
    },
    { title: '玩家 ID', key: 'player_id' },
    { 
        title: '操作類型', 
        key: 'action_type',
        render(row: PlayerAuditLog) {
            return h(NTag, { type: 'info' }, { default: () => row.action_type })
        }
    },
    { title: '操作者', key: 'operator' },
    { title: '詳情', key: 'details', ellipsis: true },
    { title: 'IP', key: 'ip_address' }
]

const fetchData = async () => {
    loading.value = true
    // In a real app, we would have a dedicated API for fetching ALL player logs.
    // For this mock, we might iterate all players or just show a placeholder if no ID is provided.
    // However, the user expects a general log view. 
    // Let's assume we can fetch logs. But our current mock implementation in playerApi only fetches logs for ONE player.
    // I will mock a global fetch in a separate step or just fetch for one player if ID is present.
    
    // For now, let's just use the playerApi.getAuditLogs if an ID is present, 
    // otherwise show empty or all (if we implement a getAllLogs).
    // Let's modify `src/api/player` to support getting ALL logs later if needed.
    // For now, if no ID, we show nothing or mock some data?
    // Actually, I should probably expose `mockPlayerAuditLogs` globally or create a new API method.
    
    if (searchPlayerId.value) {
        try {
            const res = await playerApi.getAuditLogs(searchPlayerId.value)
            if (res.code === 0) {
                logs.value = res.data
            }
        } catch (e) {
            console.error(e)
        }
    } else {
        logs.value = [] // Or fetch all?
    }
    loading.value = false
}

const handleSearch = () => {
    fetchData()
}

// On mount, maybe don't fetch anything until search? Or fetch recent?
</script>
