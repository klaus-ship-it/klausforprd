<template>
  <div class="mt-4 flex flex-col h-[600px]">
    <div class="flex flex-wrap gap-4 mb-4">
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
    </div>

    <div class="flex flex-1 min-h-0 gap-4">
      <!-- 聯絡人列表 -->
      <div class="w-1/4 bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col">
        <div class="p-3 border-b border-gray-100 dark:border-gray-800 font-bold text-xs text-gray-500 uppercase tracking-wider">
          最近通訊
        </div>
        <n-scrollbar class="flex-1">
          <n-list hoverable clickable :bordered="false" class="bg-transparent">
            <n-list-item
              v-for="contact in mockContacts"
              :key="contact.id"
              :class="{ 'bg-sky-50 dark:bg-sky-900/10': selectedContactId === contact.id }"
              @click="selectedContactId = contact.id"
              class="!px-3 !py-4"
            >
              <div class="flex items-center gap-3">
                <n-badge :value="contact.unread" :max="99">
                  <n-avatar round :size="40" :src="contact.avatar" />
                </n-badge>
                <div class="flex-1 min-w-0">
                  <div class="flex justify-between items-center mb-0.5">
                    <span class="font-bold text-sm truncate pr-2">{{ contact.name }}</span>
                    <span class="text-[10px] text-gray-400 font-mono">{{ contact.time }}</span>
                  </div>
                  <div class="text-xs text-gray-400 truncate">{{ contact.lastMsg }}</div>
                </div>
              </div>
            </n-list-item>
          </n-list>
        </n-scrollbar>
      </div>
      
      <!-- 對話區 -->
      <div class="flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        <div v-if="selectedContact" class="flex-1 flex flex-col min-h-0">
          <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <n-avatar round :size="32" :src="selectedContact.avatar" />
              <span class="font-bold text-slate-800 dark:text-slate-100">{{ selectedContact.name }}</span>
              <n-tag size="small" :type="selectedContact.online ? 'success' : 'default'" round>
                {{ selectedContact.online ? '在線' : '離線' }}
              </n-tag>
            </div>
          </div>

          <n-scrollbar ref="chatScrollbarInst" class="flex-1 p-4">
            <div v-for="msg in mockHistory" :key="msg.id" class="flex flex-col mb-6" :class="msg.sender === 'me' ? 'items-end' : 'items-start'">
              <div class="max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm" 
                   :class="msg.sender === 'me' ? 'bg-sky-500 text-white rounded-tr-none' : 'bg-white dark:bg-gray-700 text-slate-800 dark:text-slate-200 rounded-tl-none border border-gray-100 dark:border-gray-600'">
                {{ msg.content }}
              </div>
              <div class="flex items-center gap-2 mt-1 px-1">
                <span class="text-[9px] text-gray-400 font-mono uppercase mr-2">{{ msg.time }}</span>
                <n-button v-if="msg.sender === 'other'" text size="tiny" type="primary" @click="triggerMute()">禁言</n-button>
                <n-button text size="tiny" type="error">刪除</n-button>
                <n-button text size="tiny">詳細資料</n-button>
              </div>
            </div>
          </n-scrollbar>
        </div>
        <div v-else class="flex-1 flex flex-col items-center justify-center text-gray-400 italic">
          <div class="i-heroicons-chat-bubble-left-right-20-solid text-4xl mb-2 opacity-20" />
          請選擇聯絡人開始私聊
        </div>
      </div>
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
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { NInput, NButton, NAvatar, NList, NListItem, NScrollbar, NBadge, NTag, NModal, NRadioGroup, NRadioButton, NSpace } from 'naive-ui'

const { t } = useI18n()
const searchQuery = ref('')
const selectedContactId = ref<number | null>(1)
const chatScrollbarInst = ref<any>(null)

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

interface Contact {
  id: number
  name: string
  avatar: string
  lastMsg: string
  time: string
  unread: number
  online: boolean
}

interface ChatMsg {
  id: number
  sender: 'me' | 'other'
  content: string
  time: string
}

const mockContacts = ref<Contact[]>([
  { id: 1, name: 'VIP_Gamer_Ace', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ace', lastMsg: '幫我查一下為什麼提款沒到帳', time: '16:40', unread: 2, online: true },
  { id: 2, name: '甜心寶貝', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sweety', lastMsg: '謝謝你的指導！', time: '16:35', unread: 0, online: false },
  { id: 3, name: '王者歸來', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=King', lastMsg: '明天還有儲值加碼嗎？', time: '昨天', unread: 0, online: true },
  { id: 4, name: '賭聖1990', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Saint', lastMsg: '我被檢舉禁言了...', time: '週一', unread: 5, online: false },
])

const mockHistory = ref<ChatMsg[]>([
  { id: 1, sender: 'other', content: '你好，在嗎？', time: '16:00:05' },
  { id: 2, sender: 'me', content: '您好，請問有什麼可以幫您的？', time: '16:01:20' },
  { id: 3, sender: 'other', content: '我剛才儲值了 1000 元，但帳戶還沒顯示。', time: '16:05:45' },
  { id: 4, sender: 'me', content: '收到，我幫您核實一下訂單編號。', time: '16:06:10' },
  { id: 5, sender: 'other', content: '幫我查一下為什麼提款沒到帳', time: '16:40:00' },
])

const selectedContact = computed(() => mockContacts.value.find(c => c.id === selectedContactId.value))

const handleSearch = () => {
  console.log('Search Private Chat:', searchQuery.value)
}

const triggerMute = (user?: string) => {
  targetUser.value = user || selectedContact.value?.name || '未知用戶'
  showMuteModal.value = true
}

const handleConfirmMute = () => {
  console.log(`Muting user ${targetUser.value} for ${selectedMuteDuration.value}`)
  showMuteModal.value = false
}

onMounted(() => {
  setTimeout(() => {
    chatScrollbarInst.value?.scrollTo({ position: 'bottom', silent: true })
  }, 100)
})
</script>

<style scoped>
:deep(.n-list-item) {
  border-radius: 8px;
  margin: 2px 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
:deep(.n-list-item:hover) {
  background-color: rgba(0, 168, 255, 0.05);
}
</style>
