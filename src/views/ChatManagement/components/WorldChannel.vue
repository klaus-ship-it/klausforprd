<template>
  <div class="mt-4 flex flex-col h-[600px]">
    <!-- 搜尋與過濾 -->
    <div class="flex flex-wrap gap-4 mb-4 items-center">
      <div class="w-full md:w-64">
        <n-input v-model:value="searchQuery" :placeholder="t('chatManagement.roomManagement.searchPlaceholder')" clearable>
          <template #prefix>
            <div class="i-heroicons-magnifying-glass-20-solid" />
          </template>
        </n-input>
      </div>
      <n-button type="primary" @click="handleSearch">
        {{ t('chatManagement.roomManagement.search') }}
      </n-button>
      <n-text depth="3" class="text-xs ml-auto">
        當前在線: 1,284 | 今日發言: 15,920
      </n-text>
    </div>

    <!-- 訊息列表 -->
    <div class="flex-1 min-h-0 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
      <n-scrollbar ref="scrollbarInst" class="px-4 py-2">
        <n-list :bordered="false" class="bg-transparent">
          <n-list-item v-for="msg in mockMessages" :key="msg.id" class="!px-0 !py-3">
            <n-thing>
              <template #avatar>
                <n-avatar round :size="40" :color="msg.role === 'admin' ? '#f0a020' : '#18a058'">
                  {{ msg.user[0].toUpperCase() }}
                </n-avatar>
              </template>
              <template #header>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-800 dark:text-slate-200">{{ msg.user }}</span>
                  <n-tag v-if="msg.role === 'admin'" size="small" type="warning" round>管理員</n-tag>
                  <n-tag v-else-if="msg.vip" size="small" type="success" round>VIP {{ msg.vip }}</n-tag>
                  <span class="text-[10px] text-slate-400 font-mono">{{ msg.time }}</span>
                </div>
              </template>
              <div class="mt-1 text-slate-600 dark:text-slate-400 break-all leading-relaxed">
                {{ msg.content }}
              </div>
              <template #action>
                <div class="flex gap-2">
                  <n-button text size="tiny" type="primary" @click="triggerMute(msg.user)">禁言</n-button>
                  <n-button text size="tiny" type="error">刪除</n-button>
                  <n-button text size="tiny">詳細資料</n-button>
                </div>
              </template>
            </n-thing>
          </n-list-item>
        </n-list>
      </n-scrollbar>
    </div>

    <!-- 即時發言區 -->
    <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-2">
      <n-input
        v-model:value="inputValue"
        type="text"
        :placeholder="t('chatManagement.roomManagement.replyPlaceholder')"
        @keypress.enter="handleSend"
      />
      <n-button type="primary" @click="handleSend">
        {{ t('chatManagement.roomManagement.send') }}
      </n-button>
    </div>

    <!-- 禁言彈窗 -->
    <n-modal
      v-model:show="showMuteModal"
      preset="card"
      title="玩家禁言"
      class="w-[400px]"
    >
      <div class="flex flex-col gap-4">
        <div class="text-sm">
          正在對玩家 <span class="font-bold text-sky-600">{{ targetUser }}</span> 執行禁言操作。
        </div>
        <n-radio-group v-model:value="selectedMuteDuration" name="muteDuration">
          <n-space vertical>
            <n-radio-button
              v-for="option in muteOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </n-radio-button>
          </n-space>
        </n-radio-group>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showMuteModal = false">取消</n-button>
          <n-button type="primary" @click="handleConfirmMute">確認禁言</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { NInput, NButton, NScrollbar, NList, NListItem, NThing, NAvatar, NTag, NText, NModal, NRadioGroup, NRadioButton, NSpace } from 'naive-ui'

const { t } = useI18n()
const searchQuery = ref('')
const inputValue = ref('')
const scrollbarInst = ref<any>(null)

// 禁言相關
const showMuteModal = ref(false)
const targetUser = ref<string | null>(null)
const selectedMuteDuration = ref('15m')
const muteOptions = [
  { label: '15分鐘', value: '15m' },
  { label: '1小時', value: '1h' },
  { label: '1天', value: '1d' },
  { label: '永久', value: 'perm' }
]

interface Message {
  id: number
  user: string
  content: string
  time: string
  role: 'user' | 'admin'
  vip?: number
}

const mockMessages = ref<Message[]>([
  { id: 1, user: 'LuckyGamer88', content: '剛在捕魚機大爆分！有人要一起玩嗎？', time: '16:30:05', role: 'user', vip: 3 },
  { id: 2, user: 'SystemAdmin', content: '歡迎來到官方聊天室，請遵守社群規則。', time: '16:30:12', role: 'admin' },
  { id: 3, user: '小明123', content: '今天的活動獎獎勵發了嗎？', time: '16:30:45', role: 'user' },
  { id: 4, user: '大眼歐巴', content: '儲值通道好像有點慢？', time: '16:31:02', role: 'user', vip: 1 },
  { id: 5, user: 'Player_666', content: '有人知道轉盤機率是多少嗎？', time: '16:31:20', role: 'user', vip: 5 },
  { id: 6, user: 'SystemAdmin', content: '轉盤機率均已在遊戲說明頁面公示，感謝您的支持。', time: '16:31:55', role: 'admin' },
  { id: 7, user: '追夢人', content: '加油！希望能中大獎', time: '16:32:10', role: 'user' },
])

const handleSearch = () => {
  console.log('Search World Channel:', searchQuery.value)
}

const triggerMute = (user: string) => {
  targetUser.value = user
  showMuteModal.value = true
}

const handleConfirmMute = () => {
  console.log(`Muting user ${targetUser.value} for ${selectedMuteDuration.value}`)
  showMuteModal.value = false
}

const handleSend = () => {
  if (!inputValue.value.trim()) return
  
  const now = new Date()
  const timeStr = now.toTimeString().split(' ')[0]
  
  mockMessages.value.push({
    id: Date.now(),
    user: 'AdminUser',
    content: inputValue.value,
    time: timeStr,
    role: 'admin'
  })
  
  inputValue.value = ''
  setTimeout(() => {
    scrollbarInst.value?.scrollTo({ position: 'bottom', silent: true })
  }, 100)
}

onMounted(() => {
  setTimeout(() => {
    scrollbarInst.value?.scrollTo({ position: 'bottom', silent: true })
  }, 100)
})
</script>

<style scoped>
:deep(.n-list-item) {
  transition: background-color 0.2s;
}
:deep(.n-list-item:hover) {
  background-color: rgba(0, 0, 0, 0.02);
}
.dark :deep(.n-list-item:hover) {
  background-color: rgba(255, 255, 255, 0.05);
}
</style>
