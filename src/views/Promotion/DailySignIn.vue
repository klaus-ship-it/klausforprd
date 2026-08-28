<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { NCard, NGrid, NGridItem, NButton, NIcon, NModal, NForm, NFormItem, NInputNumber, NSelect, useMessage, NSwitch } from 'naive-ui'
import { CalendarOutline, GiftOutline, RibbonOutline, TrophyOutline, MedalOutline, SaveOutline, RefreshOutline, AddOutline, TrashOutline } from '@vicons/ionicons5'

const { t } = useI18n()
const message = useMessage()

interface RewardSetting {
  day: number
  type: string
  amount: number
  rollover?: number
  conversionLimit?: number
}

interface ContinuousRewardSetting {
  id: number
  days: number
  type: string
  amount: number
  rollover?: number
  conversionLimit?: number
}

// 預設 30 天
const daysCount = 30
const settings = ref<RewardSetting[]>([])

const showEditModal = ref(false)
const editingDay = ref<number | null>(null)
const editForm = ref({
  type: 'GOLD',
  amount: 0,
  rollover: 0,
  conversionLimit: 0
})

const continuousSettings = ref<ContinuousRewardSetting[]>([
  { id: 1, days: 7, type: 'ACTIVITY_BONUS', amount: 500, rollover: 10, conversionLimit: 5000 },
  { id: 2, days: 14, type: 'ACTIVITY_BONUS', amount: 1000, rollover: 10, conversionLimit: 10000 },
])

const retroactiveSettings = ref({
  enabled: false,
  maxTimes: 3,
  costType: 'GOLD',
  costAmount: 100
})

const rewardTypeOptions = [
  { label: t('dailySignIn.rewardTypes.GOLD') || '金幣', value: 'GOLD' },
  { label: t('dailySignIn.rewardTypes.SILVER') || '銀幣', value: 'SILVER' },
  { label: t('dailySignIn.rewardTypes.BRONZE') || '銅幣', value: 'BRONZE' },
  { label: t('dailySignIn.rewardTypes.ACTIVITY_BONUS') || '活動金(銀幣)', value: 'ACTIVITY_BONUS' }
]

const getRewardIcon = (type: string) => {
  switch (type) {
    case 'GOLD': return TrophyOutline
    case 'SILVER': return MedalOutline
    case 'BRONZE': return RibbonOutline
    case 'ACTIVITY_BONUS': return GiftOutline
    default: return GiftOutline
  }
}

const getRewardColor = (type: string) => {
  switch (type) {
    case 'GOLD': return '#f59e0b' // amber-500
    case 'SILVER': return '#94a3b8' // slate-400
    case 'BRONZE': return '#b45309' // amber-700
    case 'ACTIVITY_BONUS': return '#10b981' // emerald-500
    default: return '#3b82f6'
  }
}

// 模擬初始化資料
onMounted(() => {
  const initData: RewardSetting[] = []
  for (let i = 1; i <= daysCount; i++) {
    initData.push({
      day: i,
      type: i % 7 === 0 ? 'ACTIVITY_BONUS' : 'GOLD',
      amount: i % 7 === 0 ? 100 : 10 * i,
      rollover: i % 7 === 0 ? 10 : 0,
      conversionLimit: i % 7 === 0 ? 1000 : 0
    })
  }
  settings.value = initData
})

const handleEdit = (day: number) => {
  const current = settings.value.find(s => s.day === day)
  if (current) {
    editingDay.value = day
    editForm.value = {
      type: current.type,
      amount: current.amount,
      rollover: current.rollover || 0,
      conversionLimit: current.conversionLimit || 0
    }
    showEditModal.value = true
  }
}

const handleSaveEdit = () => {
  if (editingDay.value !== null) {
    const index = settings.value.findIndex(s => s.day === editingDay.value)
    if (index !== -1) {
      settings.value[index].type = editForm.value.type
      settings.value[index].amount = editForm.value.amount
      settings.value[index].rollover = editForm.value.rollover
      settings.value[index].conversionLimit = editForm.value.conversionLimit
    }
    showEditModal.value = false
    message.success(t('common.success') || '成功')
  }
}

const handleSaveAll = () => {
  message.success(t('dailySignIn.saveSuccess') || '每日簽到設定已儲存')
  // Call API to save settings
}

const handleReset = () => {
  // Call API to reload original settings or clear modifications
  message.info(t('common.success') || '已重置')
}

const handleAddContinuousReward = () => {
  const newId = continuousSettings.value.length > 0 
    ? Math.max(...continuousSettings.value.map(s => s.id)) + 1 
    : 1
  continuousSettings.value.push({
    id: newId,
    days: 7,
    type: 'GOLD',
    amount: 100,
    rollover: 0,
    conversionLimit: 0
  })
}

const handleRemoveContinuousReward = (id: number) => {
  continuousSettings.value = continuousSettings.value.filter(s => s.id !== id)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header Area -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <NIcon :component="CalendarOutline" class="text-sky-500" />
          {{ t('dailySignIn.title') || '每日簽到獎勵設定' }}
        </h2>
        <p class="text-sm text-slate-500 mt-1">設定玩家累積登入每日可領取的獎勵內容（30 天循環）</p>
      </div>
      <div class="flex gap-3">
        <NButton secondary @click="handleReset">
          <template #icon>
            <NIcon><RefreshOutline /></NIcon>
          </template>
          {{ t('dailySignIn.resetSettings') || '重置' }}
        </NButton>
        <NButton type="primary" @click="handleSaveAll">
          <template #icon>
            <NIcon><SaveOutline /></NIcon>
          </template>
          {{ t('dailySignIn.saveSettings') || '儲存設定' }}
        </NButton>
      </div>
    </div>

    <!-- Calendar Grid -->
    <NCard class="rounded-2xl shadow-sm border-0 premium-glass">
      <NGrid :x-gap="16" :y-gap="16" cols="2 s:3 m:5 l:7" responsive="screen">
        <NGridItem v-for="setting in settings" :key="setting.day">
          <div 
            class="relative group bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer h-32 flex flex-col items-center justify-center overflow-hidden"
            @click="handleEdit(setting.day)"
          >
            <!-- Day Label -->
            <div class="absolute top-2 left-3 font-bold text-slate-400 text-sm">
              Day {{ setting.day }}
            </div>
            
            <!-- Edit Overlay on Hover -->
            <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
              <NButton type="info" size="small" round>
                {{ t('dailySignIn.editReward') || '編輯獎勵' }}
              </NButton>
            </div>

            <!-- Reward Content -->
            <div class="mt-4 flex flex-col items-center gap-2">
              <NIcon 
                :component="getRewardIcon(setting.type)" 
                size="36" 
                :style="{ color: getRewardColor(setting.type) }"
                class="drop-shadow-sm transition-transform group-hover:scale-110"
              />
              <div class="text-lg font-bold text-slate-700 dark:text-slate-200">
                x {{ setting.amount.toLocaleString() }}
              </div>
            </div>

            <!-- Special Milestone Indicator -->
            <div v-if="setting.day % 7 === 0" class="absolute top-0 right-0 w-0 h-0 border-t-[32px] border-l-[32px] border-t-red-500 border-l-transparent">
              <span class="absolute -top-[28px] -left-[14px] text-white text-[10px] font-black transform rotate-45">!</span>
            </div>
          </div>
        </NGridItem>
      </NGrid>
    </NCard>

    <!-- Continuous Sign-in Milestone Rewards -->
    <NCard class="rounded-2xl shadow-sm border-0 premium-glass mt-6">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <NIcon :component="GiftOutline" class="text-sky-500" />
            {{ t('dailySignIn.continuousRewards') || '累積簽到里程碑' }}
          </h3>
          <NButton size="small" type="primary" dashed @click="handleAddContinuousReward">
            <template #icon>
              <NIcon><AddOutline /></NIcon>
            </template>
            {{ t('dailySignIn.addContinuousReward') || '新增里程碑' }}
          </NButton>
        </div>
      </template>

      <div class="space-y-4">
        <div v-for="(reward, index) in continuousSettings" :key="reward.id" class="flex flex-wrap items-end gap-4 bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 transition-all hover:border-sky-200">
          <NFormItem :label="t('dailySignIn.continuousDays') || '累積天數'" class="mb-0 w-32">
            <NInputNumber v-model:value="reward.days" :min="1" />
          </NFormItem>
          <NFormItem :label="t('dailySignIn.rewardType') || '獎勵類型'" class="mb-0 w-40">
            <NSelect v-model:value="reward.type" :options="rewardTypeOptions" />
          </NFormItem>
          <NFormItem :label="t('dailySignIn.rewardAmount') || '獎勵數量'" class="mb-0 w-32">
            <NInputNumber v-model:value="reward.amount" :min="0" />
          </NFormItem>
          <template v-if="reward.type === 'ACTIVITY_BONUS'">
            <NFormItem :label="t('dailySignIn.rolloverRequirement') || '流水門檻'" class="mb-0 w-32">
              <NInputNumber v-model:value="reward.rollover" :min="0" />
            </NFormItem>
            <NFormItem :label="t('dailySignIn.conversionLimit') || '轉換上限'" class="mb-0 w-32">
              <NInputNumber v-model:value="reward.conversionLimit" :min="0" />
            </NFormItem>
          </template>
          <div class="pb-1 ml-auto">
            <NButton circle type="error" ghost @click="handleRemoveContinuousReward(reward.id)">
              <template #icon><NIcon><TrashOutline /></NIcon></template>
            </NButton>
          </div>
        </div>
        <div v-if="continuousSettings.length === 0" class="text-center py-8 text-slate-400">
          暫無累積簽到里程碑獎勵
        </div>
      </div>
    </NCard>

    <!-- Retroactive Sign-in Settings -->
    <NCard class="rounded-2xl shadow-sm border-0 premium-glass mt-6">
      <template #header>
        <div class="flex items-center gap-2">
          <h3 class="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <NIcon :component="CalendarOutline" class="text-sky-500" />
            {{ t('dailySignIn.retroactiveSignIn') || '補簽到設定' }}
          </h3>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-700">
        <NFormItem :label="t('dailySignIn.enableRetroactive') || '開放補簽到功能'" class="mb-0">
          <NSwitch v-model:value="retroactiveSettings.enabled" />
        </NFormItem>
        <NFormItem v-if="retroactiveSettings.enabled" :label="t('dailySignIn.maxRetroactiveTimes') || '週期內補簽次數上限'" class="mb-0">
          <NInputNumber v-model:value="retroactiveSettings.maxTimes" :min="1" :max="daysCount" class="w-full" />
        </NFormItem>
        <NFormItem v-if="retroactiveSettings.enabled" :label="t('dailySignIn.retroactiveCostType') || '補簽到扣除幣別'" class="mb-0">
          <NSelect v-model:value="retroactiveSettings.costType" :options="rewardTypeOptions" class="w-full" />
        </NFormItem>
        <NFormItem v-if="retroactiveSettings.enabled" :label="t('dailySignIn.retroactiveCostAmount') || '補簽到扣除數量'" class="mb-0">
          <NInputNumber v-model:value="retroactiveSettings.costAmount" :min="0" class="w-full" />
        </NFormItem>
      </div>
    </NCard>

    <!-- Edit Modal -->
    <NModal v-model:show="showEditModal" preset="card" class="w-[400px] rounded-2xl">
      <template #header>
        <div class="flex items-center gap-2">
          <NIcon :component="GiftOutline" class="text-sky-500" />
          <span class="font-bold">{{ t('dailySignIn.editReward') || '編輯獎勵' }} - Day {{ editingDay }}</span>
        </div>
      </template>

      <NForm :model="editForm" label-placement="left" label-width="100" require-mark-placement="right-hanging">
        <NFormItem :label="t('dailySignIn.rewardType') || '獎勵類型'">
          <NSelect v-model:value="editForm.type" :options="rewardTypeOptions" />
        </NFormItem>
        <NFormItem :label="t('dailySignIn.rewardAmount') || '獎勵數量'">
          <NInputNumber v-model:value="editForm.amount" :min="0" class="w-full" />
        </NFormItem>
        <template v-if="editForm.type === 'ACTIVITY_BONUS'">
          <NFormItem :label="t('dailySignIn.rolloverRequirement') || '流水門檻 (倍)'">
            <NInputNumber v-model:value="editForm.rollover" :min="0" class="w-full" />
          </NFormItem>
          <NFormItem :label="t('dailySignIn.conversionLimit') || '轉換上限'">
            <NInputNumber v-model:value="editForm.conversionLimit" :min="0" class="w-full" />
          </NFormItem>
        </template>
      </NForm>

      <template #footer>
        <div class="flex justify-end gap-3">
          <NButton @click="showEditModal = false">{{ t('common.cancel') || '取消' }}</NButton>
          <NButton type="primary" @click="handleSaveEdit">{{ t('common.confirm') || '確認' }}</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.premium-glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.dark .premium-glass {
  background: rgba(30, 41, 59, 0.7);
}
</style>
