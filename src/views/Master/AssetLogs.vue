<template>
  <div class="p-6 flex flex-col gap-4">
    <!-- 搜尋條件區塊 -->
    <div class="sticky top-0 z-30 transition-all duration-300" :class="{ 'pt-2': isSticky }">
      <NCard 
        title="資產與流水變動日誌" 
        class="rounded-xl shadow-sm border-0 premium-card transition-all duration-300" 
        :class="{ 'premium-glass shadow-xl mx-2': isSticky }"
        size="small"
      >
        <NForm :model="searchForm" label-placement="left" class="flex flex-col gap-4">
          <!-- 基礎搜尋條件 -->
          <div class="flex flex-wrap items-end gap-x-6 gap-y-4">
            <NFormItem label-placement="top" :show-feedback="false">
              <template #label>
                <div class="flex items-center gap-2">
                  <span class="text-slate-500 font-bold">玩家</span>
                  <NRadioGroup v-model:value="searchForm.searchType" name="searchType" size="small">
                    <NRadio value="id">ID</NRadio>
                    <NRadio value="account">帳號</NRadio>
                  </NRadioGroup>
                </div>
              </template>
              <NInput 
                v-model:value="searchForm.player_id" 
                :placeholder="searchForm.searchType === 'id' ? '請輸入玩家 ID' : '請輸入玩家帳號'" 
                clearable 
                style="width: 200px"
                class="tech-input-light"
              />
            </NFormItem>
            <NFormItem label="變動類型" :show-feedback="false">
               <NSelect 
                 v-model:value="searchForm.change_type" 
                 :options="typeOptions" 
                 placeholder="全部" 
                 clearable 
                 style="width: 150px"
                 class="tech-select-light"
               />
            </NFormItem>
            <NFormItem label="快速切換" :show-feedback="false">
              <NSpace wrap>
                <NButton size="small" @click="handleQuickSelect('today')">本日</NButton>
                <NButton size="small" @click="handleQuickSelect('yesterday')">昨日</NButton>
                <NButton size="small" @click="handleQuickSelect('thisWeek')">本週</NButton>
                <NButton size="small" @click="handleQuickSelect('lastWeek')">上週</NButton>
                <NButton size="small" @click="handleQuickSelect('thisMonth')">本月</NButton>
                <NButton size="small" @click="handleQuickSelect('lastMonth')">上個月</NButton>
              </NSpace>
            </NFormItem>
            <NFormItem label="幣別" :show-feedback="false">
               <NSelect 
                 v-model:value="searchForm.currency" 
                 :options="currencyOptions" 
                 placeholder="全部" 
                 clearable 
                 style="width: 120px"
                 class="tech-select-light"
               />
            </NFormItem>

            <div class="flex gap-2 mb-[2px]">
              <NButton type="primary" @click="handleSearch">查詢</NButton>
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
                  <NFormItem label="數據粒度" :show-feedback="false" style="width: 140px">
                      <NSelect 
                          v-model:value="searchForm.granularity"
                          :options="granularityOptions"
                          class="tech-select-light"
                      />
                  </NFormItem>

                  <NFormItem label="時間區間" :show-feedback="false" class="w-80">
                      <NDatePicker 
                          v-if="searchForm.granularity === 'hour'"
                          v-model:value="searchForm.timeRange" 
                          type="datetimerange" 
                          clearable 
                          format="yyyy-MM-dd HH:mm"
                          class="w-full tech-input-light"
                      />
                      <NDatePicker 
                          v-if="searchForm.granularity === 'day'"
                          v-model:value="searchForm.timeRange" 
                          type="daterange" 
                          clearable 
                          class="w-full tech-input-light"
                      />
                      <NDatePicker 
                          v-if="searchForm.granularity === 'month'"
                          v-model:value="searchForm.timeRange" 
                          type="monthrange" 
                          clearable 
                          class="w-full tech-input-light"
                      />
                  </NFormItem>
              </div>
          </NCollapseTransition>
        </NForm>
      </NCard>
    </div>

    <!-- 列表區塊 -->
    <NCard class="rounded-xl shadow-sm border-0 premium-card overflow-hidden" content-class="p-0">
      <NDataTable
        :columns="columns"
        :data="logs"
        :loading="loading"
        :pagination="pagination"
        :bordered="false"
        @update:page="handlePageChange"
      />
    </NCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, h, watch } from 'vue'
import { NCard, NForm, NFormItem, NInput, NSelect, NButton, NDataTable, NTag, NSpace, NDatePicker, NRadioGroup, NRadio, useMessage, NCollapseTransition, NIcon } from 'naive-ui'
import { ChevronDownOutline, ChevronUpOutline } from '@vicons/ionicons5'
import { logApi } from '@/api/log'
import { AssetLog, LogSearchParams } from '@/types/log'

const message = useMessage()
const loading = ref(false)
const logs = ref<AssetLog[]>([])

const searchForm = reactive({
    player_id: '',
    searchType: 'id' as 'id' | 'account',
    currency: null as string | null,
    change_type: null as string | null,
    granularity: 'day' as 'hour' | 'day' | 'month',
    timeRange: null as [number, number] | null
})

const showAdvancedSearch = ref(false)

const granularityOptions = [
  { label: '時', value: 'hour' },
  { label: '日', value: 'day' },
  { label: '月', value: 'month' }
]

// 初始化預設時間
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

const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50]
})

const currencyOptions = [
    { label: '金幣 (Gold)', value: 'GOLD' },
    { label: '銀幣 (Silver)', value: 'SILVER' },
    { label: '銅幣 (Bronze)', value: 'BRONZE' }
]

const typeOptions = [
    { label: '投注 (BET)', value: 'BET' },
    { label: '派彩 (WIN)', value: 'WIN' },
    { label: '領取 (CLAIM)', value: 'CLAIM' },
    { label: '解鎖 (UNLOCK)', value: 'UNLOCK' },
    { label: '清零 (WIPE)', value: 'WIPE' },
    { label: '互換 (EXCHANGE)', value: 'EXCHANGE' },
    { label: 'P2P 轉出', value: 'P2P_OUT' },
    { label: 'P2P 轉入', value: 'P2P_IN' }
]

const columns = [
    { title: 'Log ID', key: 'log_id', width: 150, ellipsis: true },
    { 
        title: '時間', 
        key: 'timestamp', 
        width: 180,
        render: (row: AssetLog) => row.timestamp.replace('T', ' ').split('.')[0]
    },
    { 
        title: '玩家', 
        key: 'username',
        render: (row: AssetLog) => h('div', [
            h('div', { class: 'font-bold' }, row.username),
            h('div', { class: 'text-xs text-gray-500' }, row.player_id)
        ])
    },
    { 
        title: '幣別/錢包', 
        key: 'currency',
        render: (row: AssetLog) => h('div', [
             h(NTag, { size: 'small', type: row.currency === 'GOLD' ? 'warning' : row.currency === 'SILVER' ? 'info' : 'default', class: 'mr-1' }, { default: () => row.currency }),
             h('span', { class: 'text-xs' }, row.wallet_type)
        ])
    },
    { 
        title: '類型', 
        key: 'change_type',
        render: (row: AssetLog) => {
            let type = 'default'
            if (['WIN', 'CLAIM', 'UNLOCK', 'P2P_IN'].includes(row.change_type)) type = 'success'
            if (['BET', 'WIPE', 'P2P_OUT'].includes(row.change_type)) type = 'error'
            return h(NTag, { type: type as any, bordered: false }, { default: () => row.change_type })
        }
    },
    { 
        title: '變動金額', 
        key: 'amount', 
        align: 'right' as const,
        render: (row: AssetLog) => {
            const isPos = row.amount > 0
            return h('span', { class: isPos ? 'text-green-600 font-bold' : 'text-red-600 font-bold' }, (isPos ? '+' : '') + row.amount)
        }
    },
    { title: '變更後餘額', key: 'post_balance', align: 'right' as const },
    { 
        title: '有效流水', 
        key: 'valid_turnover', 
        align: 'right' as const,
        render: (row: AssetLog) => {
            if (row.valid_turnover > 0) {
                return h('span', { class: 'text-blue-600 font-bold' }, row.valid_turnover)
            }
            return '-'
        }
    },
    { title: '關聯單號', key: 'related_id', ellipsis: true }
]

const fetchData = async () => {
    loading.value = true
    try {
        const params: LogSearchParams = {
            page: pagination.page,
            page_size: pagination.pageSize,
            player_id: searchForm.player_id || undefined,
            currency: searchForm.currency || undefined,
            change_type: searchForm.change_type || undefined
        }
        const res = await logApi.getLogs(params)
        if (res.code === 0) {
            logs.value = res.data.list
            pagination.itemCount = res.data.total
        } else {
            message.error(res.msg)
        }
    } catch (e) {
        message.error('載入失敗')
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
