<template>
  <div class="flex flex-col gap-4 min-h-full">
    <!-- 浮動搜尋區塊 -->
    <div class="sticky top-0 z-30 transition-all duration-300" :class="{ 'pt-2': isSticky }">
      <n-card
        size="small"
        class="rounded-xl shadow-sm border-0 transition-all duration-300"
        :class="{ 'premium-glass shadow-xl mx-2': isSticky }"
      >
        <div class="flex items-center justify-between mb-6">
          <n-text tag="h2" style="margin: 0; font-size: 16px; font-weight: 700;">
            {{ t('gameLogs.title') }}
          </n-text>
        </div>

        <NForm :model="searchForm" label-placement="left" class="flex flex-col gap-4">
          <!-- 基礎搜尋條件 -->
          <div class="flex flex-wrap items-end gap-x-6 gap-y-4">
            <NFormItem :show-feedback="false" label-placement="top">
              <template #label>
                <NRadioGroup v-model:value="searchForm.searchType" name="searchType" size="small">
                  <NRadio value="id">{{ t('gameLogs.searchType.id') }}</NRadio>
                  <NRadio value="account">{{ t('gameLogs.searchType.account') }}</NRadio>
                </NRadioGroup>
              </template>
              <NInput 
                v-model:value="searchForm.player_id" 
                :placeholder="searchForm.searchType === 'id' ? '請輸入玩家 ID' : '請輸入玩家帳號'" 
                clearable 
                style="width: 200px"
              />
            </NFormItem>
            
            <NFormItem :label="t('gameLogs.gameName')" :show-feedback="false">
                 <NInput v-model:value="searchForm.game_name" :placeholder="t('gameLogs.gameNamePlaceholder')" clearable style="width: 150px" />
            </NFormItem>
  
            <NFormItem label="快速切換" :show-feedback="false">
              <NSpace wrap>
                <NButton size="small" @click="handleQuickSelect('today')">{{ t('operationReport.quickButtons.today') }}</NButton>
                <NButton size="small" @click="handleQuickSelect('yesterday')">{{ t('operationReport.quickButtons.yesterday') }}</NButton>
                <NButton size="small" @click="handleQuickSelect('thisWeek')">{{ t('operationReport.quickButtons.thisWeek') }}</NButton>
                <NButton size="small" @click="handleQuickSelect('lastWeek')">{{ t('operationReport.quickButtons.lastWeek') }}</NButton>
                <NButton size="small" @click="handleQuickSelect('thisMonth')">{{ t('operationReport.quickButtons.thisMonth') }}</NButton>
                <NButton size="small" @click="handleQuickSelect('lastMonth')">{{ t('operationReport.quickButtons.lastMonth') }}</NButton>
              </NSpace>
            </NFormItem>
  
            <NFormItem label="幣別" :show-feedback="false">
                <NSelect 
                  v-model:value="searchForm.currency" 
                  :options="currencyOptions" 
                  placeholder="全部" 
                  style="width: 120px"
                />
            </NFormItem>
  
            <div class="flex gap-2 mb-[2px]">
              <NButton type="primary" @click="handleSearch" :loading="loading">{{ t('gameLogs.search') }}</NButton>
              <NButton text icon-placement="right" @click="showAdvancedSearch = !showAdvancedSearch" class="ml-2">
                  <template #icon>
                      <NIcon>
                          <ChevronDownOutline v-if="!showAdvancedSearch" />
                          <ChevronUpOutline v-else />
                      </NIcon>
                  </template>
                  {{ showAdvancedSearch ? '收起搜尋' : '進階搜尋' }}
              </NButton>
            </div>
          </div>
  
          <!-- 進階搜尋條件 (可折疊) -->
          <NCollapseTransition :show="showAdvancedSearch">
              <div class="pt-4 border-t border-dashed flex flex-wrap items-end gap-x-6 gap-y-4">
                  <NFormItem :label="t('gameLogs.provider')" :show-feedback="false">
                      <NSelect 
                          v-model:value="searchForm.provider" 
                          :options="providerOptions" 
                          :placeholder="t('gameLogs.providerAll')" 
                          clearable 
                          style="width: 140px"
                      />
                  </NFormItem>
                  <NFormItem :label="t('gameLogs.roundId')" :show-feedback="false">
                      <NInput v-model:value="searchForm.round_id" :placeholder="t('gameLogs.roundIdPlaceholder')" clearable style="width: 220px" />
                  </NFormItem>
                  <NFormItem :label="t('operationReport.granularity')" :show-feedback="false" style="width: 140px">
                      <NSelect 
                          v-model:value="searchForm.granularity"
                          :options="granularityOptions"
                          class="bg-white/50"
                      />
                  </NFormItem>
                  <NFormItem :label="t('operationReport.timeRange')" :show-feedback="false" class="w-80">
                      <NDatePicker 
                          v-if="searchForm.granularity === 'hour'"
                          v-model:value="searchForm.timeRange" 
                          type="datetimerange" 
                          clearable 
                          format="yyyy-MM-dd HH:mm"
                          class="w-full bg-white/50"
                      />
                      <NDatePicker 
                          v-if="searchForm.granularity === 'day'"
                          v-model:value="searchForm.timeRange" 
                          type="daterange" 
                          clearable 
                          class="w-full bg-white/50"
                      />
                      <NDatePicker 
                          v-if="searchForm.granularity === 'month'"
                          v-model:value="searchForm.timeRange" 
                          type="monthrange" 
                          clearable 
                          class="w-full bg-white/50"
                      />
                  </NFormItem>
              </div>
          </NCollapseTransition>
        </NForm>
      </n-card>
    </div>

    <!-- 主要內容區 -->
    <div class="flex flex-col gap-4">
      <div v-if="searchForm.currency === 'all'" class="bg-white rounded-xl shadow-sm border-0 p-4 flex justify-around">
        <div class="text-center">
            <div class="text-xs text-gray-500 mb-1">轉折總投注 (Gold Unit)</div>
            <div class="text-lg font-bold text-blue-600">{{ formatNumber(gameSummary.bet) }}</div>
        </div>
        <div class="text-center">
            <div class="text-xs text-gray-500 mb-1">轉折總派彩 (Gold Unit)</div>
            <div class="text-lg font-bold text-orange-600">{{ formatNumber(gameSummary.win) }}</div>
        </div>
        <div class="text-center">
            <div class="text-xs text-gray-500 mb-1">轉折總盈虧 (Gold Unit)</div>
            <div class="text-lg font-bold" :class="gameSummary.net >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ gameSummary.net >= 0 ? '+' : '' }}{{ formatNumber(gameSummary.net) }}
            </div>
        </div>
      </div>

      <NCard class="rounded-xl shadow-sm border-0">
        <NDataTable
          :columns="columns"
          :data="logs"
          :loading="loading"
          :pagination="pagination"
          @update:page="handlePageChange"
        />
      </NCard>
    </div>

    <!-- Detail Modal -->
    <NModal
      v-model:show="showDetail"
      preset="card"
      :title="t('gameLogs.detailTitle')"
      style="width: 600px"
    >
      <div v-if="selectedLog">
          <div class="mb-4 grid grid-cols-2 gap-2 text-sm">
              <div><span class="text-gray-500">{{ t('gameLogs.detail.uid') }}</span> {{ selectedLog.id }}</div>
              <div><span class="text-gray-500">{{ t('gameLogs.detail.provider') }}</span> {{ selectedLog.provider_id }}</div>
              <div><span class="text-gray-500">{{ t('gameLogs.detail.roundId') }}</span> {{ selectedLog.provider_round_id }}</div>
              <div><span class="text-gray-500">{{ t('gameLogs.detail.settleTime') }}</span> {{ selectedLog.settle_time.replace('T', ' ').split('.')[0] }}</div>
          </div>
          <NDivider />
          <pre class="bg-gray-100 p-4 rounded text-xs font-mono overflow-auto max-h-[400px]">{{ formatJson(selectedLog.raw_json) }}</pre>
      </div>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, h, computed, watch } from 'vue'
import { NCard, NForm, NFormItem, NInput, NSelect, NButton, NDataTable, NTag, NModal, NDivider, NSpace, NDatePicker, NRadioGroup, NRadio, useMessage, NCollapseTransition, NIcon } from 'naive-ui'
import { ChevronDownOutline, ChevronUpOutline } from '@vicons/ionicons5'
import { useI18n } from 'vue-i18n'
import { gameApi } from '@/api/game'
import { GameLog, GameSearchParams } from '@/types/game'
import type { Granularity } from '@/types/operationReport'

const { t } = useI18n()
const message = useMessage()
const loading = ref(false)
const logs = ref<GameLog[]>([])
const showDetail = ref(false)
const selectedLog = ref<GameLog | null>(null)

const searchForm = reactive({
    player_id: '',
    searchType: 'id' as 'id' | 'account',
    provider: null as string | null,
    game_name: '',
    round_id: '',
    granularity: 'day' as Granularity,
    timeRange: null as [number, number] | null,
    currency: 'all' as string
})

const showAdvancedSearch = ref(false)

const granularityOptions = computed(() => [
  { label: t('operationReport.granularities.hour'), value: 'hour' },
  { label: t('operationReport.granularities.day'), value: 'day' },
  { label: t('operationReport.granularities.month'), value: 'month' }
])

// 初始化預設時間 (根據粒度)
const setTimeRangeByGranularity = () => {
  const now = new Date()
  let start = new Date()
  let end = new Date()
  switch (searchForm.granularity) {
    case 'hour':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999)
      break
    case 'day':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      end = now
      break
    case 'month':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      end = now
      break
  }
  searchForm.timeRange = [start.getTime(), end.getTime()]
}

// 快速選擇時間
const handleQuickSelect = (type: string) => {
  const now = new Date()
  let start = new Date()
  let end = new Date()
  switch (type) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      end = now
      break
    case 'yesterday':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999)
      break
    case 'thisWeek':
      const day = now.getDay() || 7
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1, 0, 0, 0, 0)
      end = now
      break
    case 'lastWeek':
      const day2 = now.getDay() || 7
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day2 - 6, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day2, 23, 59, 59, 999)
      break
    case 'thisMonth':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      end = now
      break
    case 'lastMonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      break
  }
  searchForm.timeRange = [start.getTime(), end.getTime()]
}

watch(() => searchForm.granularity, () => {
  setTimeRangeByGranularity()
})

watch(() => searchForm.currency, () => {
  handleSearch()
})

const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50]
})

const providerOptions = [
    { label: 'PG Soft', value: 'PG' },
    { label: 'JILI', value: 'JILI' },
    { label: 'Evolution', value: 'EVOLUTION' },
    { label: 'Pragmatic Play', value: 'PP' },
    { label: 'JDB', value: 'JDB' }
]

const currencyOptions = [
    { label: '全部', value: 'all' },
    { label: '金幣 (Gold)', value: 'GOLD' },
    { label: '銀幣 (Silver)', value: 'SILVER' },
    { label: '銅幣 (Bronze)', value: 'BRONZE' }
]

const formatJson = (jsonStr: string) => {
    try {
        return JSON.stringify(JSON.parse(jsonStr), null, 2)
    } catch (e) {
        return jsonStr
    }
}

const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)
}

const handleDetail = (row: GameLog) => {
    selectedLog.value = row
    showDetail.value = true
}

// Logic for weighted amount and currency icon
const renderCurrencyIcon = (currency: string, small = false) => {
    const config: Record<string, { color: string; label: string; icon: string }> = {
        GOLD: { color: '#f0a020', label: '金', icon: '🟡' },
        SILVER: { color: '#909090', label: '銀', icon: '⚪' },
        BRONZE: { color: '#a05020', label: '銅', icon: '🟤' }
    }
    const c = config[currency] || { color: '#ccc', label: '?', icon: '❓' }
    
    if (small) {
        return h('span', { style: { color: c.color, fontSize: '12px' } }, c.icon)
    }

    return h(NTag, { size: 'small', bordered: false, style: { backgroundColor: c.color + '20', color: c.color } }, { 
        default: () => [h('span', { style: { marginRight: '4px' } }, c.icon), c.label] 
    })
}

const gameSummary = computed(() => {
    let bet = 0
    let win = 0
    let net = 0
    
    logs.value.forEach(log => {
        let factor = 0
        if (log.currency === 'GOLD') factor = 1
        else if (log.currency === 'SILVER') factor = 0.01
        
        bet += log.bet_amount * factor
        win += log.win_amount * factor
        net += log.net_amount * factor
    })
    
    return { 
        bet: parseFloat(bet.toFixed(2)), 
        win: parseFloat(win.toFixed(2)), 
        net: parseFloat(net.toFixed(2)) 
    }
})

const columns = computed(() => [
    { title: t('gameLogs.columns.uid'), key: 'id', width: 100, ellipsis: true },
    { 
        title: t('gameLogs.columns.time'), 
        key: 'settle_time', 
        width: 160,
        render: (row: GameLog) => row.settle_time.replace('T', ' ').slice(5, 16) // mm-dd HH:MM
    },
    { title: t('gameLogs.columns.player'), key: 'player_id', width: 100 },
    { 
        title: t('gameLogs.columns.game'), 
        key: 'game_name',
        width: 200,
        render: (row: GameLog) => h('div', [
             h(NTag, { size: 'small', class: 'mr-1' }, { default: () => row.provider_id }),
             h('span', row.game_name)
        ])
    },
    { title: '幣別', key: 'currency', width: 80, render: (row: GameLog) => renderCurrencyIcon(row.currency) },
    { 
        title: t('gameLogs.columns.bet'), 
        key: 'bet_amount', 
        align: 'right' as const,
        render: (row: GameLog) => h(NSpace, { align: 'center', justify: 'end', size: 4 }, { default: () => [h('span', formatNumber(row.bet_amount)), renderCurrencyIcon(row.currency, true)] })
    },
    { 
        title: t('gameLogs.columns.win'), 
        key: 'win_amount', 
        align: 'right' as const,
        render: (row: GameLog) => h(NSpace, { align: 'center', justify: 'end', size: 4 }, { default: () => [h('span', formatNumber(row.win_amount)), renderCurrencyIcon(row.currency, true)] })
    },
    { 
        title: t('gameLogs.columns.net'), 
        key: 'net_amount', 
        align: 'right' as const,
        render: (row: GameLog) => {
            const color = row.net_amount >= 0 ? 'text-green-600' : 'text-red-600'
            const prefix = row.net_amount > 0 ? '+' : ''
            return h(NSpace, { align: 'center', justify: 'end', size: 4 }, { 
                default: () => [
                    h('span', { class: ['font-bold', color] }, prefix + formatNumber(row.net_amount)), 
                    renderCurrencyIcon(row.currency, true)
                ] 
            })
        }
    },
    { 
        title: t('gameLogs.columns.validTurnover'), 
        key: 'valid_turnover', 
        align: 'right' as const,
        render: (row: GameLog) => {
           const formatted = formatNumber(row.valid_turnover)
           if (row.status === 'void') return h('span', { class: 'text-gray-400 line-through' }, formatted)
           return h(NSpace, { align: 'center', justify: 'end', size: 4 }, { default: () => [h('span', formatted), renderCurrencyIcon(row.currency, true)] })
        }
    },
    { 
        title: t('gameLogs.columns.status'), 
        key: 'status', 
        width: 80,
        render: (row: GameLog) => {
            if (row.status === 'void') return h(NTag, { type: 'error', size: 'small', bordered: false }, { default: () => t('gameLogs.statusText.void') })
            return h(NTag, { type: 'success', size: 'small', bordered: false }, { default: () => t('gameLogs.statusText.settle') })
        }
    },
    {
        title: t('gameLogs.columns.action'),
        key: 'action',
        width: 80,
        render: (row: GameLog) => h(NButton, { 
            size: 'tiny', 
            onClick: () => handleDetail(row)
        }, { default: () => t('gameLogs.actionText.detail') })
    }
])

const fetchData = async () => {
    loading.value = true
    try {
        const params: GameSearchParams = {
            page: pagination.page,
            page_size: pagination.pageSize,
            player_id: searchForm.player_id || undefined,
            provider: searchForm.provider || undefined,
            game_name: searchForm.game_name || undefined,
            round_id: searchForm.round_id || undefined,
            currency: searchForm.currency || undefined
        }
        const res = await gameApi.getLogs(params)
        if (res.code === 0) {
            logs.value = res.data.list
            pagination.itemCount = res.data.total
        } else {
            message.error(res.msg)
        }
    } catch (e) {
        message.error(t('gameLogs.loadFailed'))
    } finally {
        loading.value = false
    }
}

const handleSearch = () => {
    pagination.page = 1
    fetchData()
}

const handlePageChange = (page: number) => {
    pagination.page = page
    fetchData()
}

const isSticky = ref(false)
const handleScroll = (e: Event) => {
    const target = e.target as HTMLElement
    isSticky.value = target.scrollTop > 20
}

onMounted(() => {
    setTimeRangeByGranularity()
    fetchData()
    const container = document.getElementById('main-scroll-container')
    if (container) {
        container.addEventListener('scroll', handleScroll)
    }
})

onBeforeUnmount(() => {
    const container = document.getElementById('main-scroll-container')
    if (container) {
        container.removeEventListener('scroll', handleScroll)
    }
})
</script>
<style scoped>
.premium-glass {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(226, 232, 240, 0.6) !important;
}
</style>
