<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, h, computed } from 'vue'
import { useRouter } from 'vue-router'
import { 
  NCard, NInput, NSelect, NDatePicker, NButton, NDataTable, NSpace, NTag,
  NBadge, NModal, NForm, NFormItem, useMessage, DataTableColumns, NRadioGroup, NRadio, NSwitch, NInputNumber, NCollapseTransition, NCheckbox, NAlert
} from 'naive-ui'
import { 
  SearchOutline, AddOutline, EyeOutline, ListOutline, GameControllerOutline, PricetagOutline,
  ChevronDownOutline, ChevronUpOutline
} from '@vicons/ionicons5'
import { playerApi } from '@/api/player'
import { tagApi } from '@/api/tag'
import { Player, PlayerSearchParams } from '@/types/player'
import { SelectOption } from 'naive-ui'
import TagManagementDrawer from './TagManagementDrawer.vue'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const message = useMessage()
const { t } = useI18n()

// Search State
const searchForm = reactive<PlayerSearchParams>({
  q: '',
  search_type: 'id',
  affiliation_type: 'invite_code', // Default to invite_code
  affiliation_query: '',
  status: undefined,
  tags: undefined,
  register_date_start: undefined,
  register_date_end: undefined,
  page: 1,
  page_size: 10
})

const registerDateRange = ref<[number, number] | null>(null)

const statusOptions = computed(() => [
  { label: t('player.status.ACTIVE'), value: 'ACTIVE' },
  { label: t('player.status.LOCKED'), value: 'LOCKED' },
  { label: t('player.status.FROZEN'), value: 'FROZEN' },
  { label: t('player.status.SUSPENDED'), value: 'SUSPENDED' }
])

const tagOptions = ref<SelectOption[]>([])
const showTagDrawer = ref(false)
const showAdvancedSearch = ref(false)

// Function to fetch tags for dropdowns
const fetchTagOptions = async () => {
    try {
        const res = await tagApi.getTags()
        if (res.code === 0) {
            // Only show ACTIVE tags in dropdowns, formatted with translation if available
            tagOptions.value = res.data
                .filter(t => t.status === 'ACTIVE')
                .map(tag => ({ 
                    label: t(`player.tags.${tag.name}`, tag.name), // Try translate, fallback to name
                    value: tag.name 
                }))
        }
    } catch (e) {
        console.error('Failed to load tags')
    }
}

// Data Table
const loading = ref(false)
const players = ref<Player[]>([])
const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  onChange: (page: number) => {
    pagination.page = page
    searchForm.page = page
    fetchData()
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize
    pagination.page = 1
    searchForm.page_size = pageSize
    searchForm.page = 1
    fetchData()
  }
})

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const columns = computed<DataTableColumns<Player>>(() => [
  { title: t('player.list.id'), key: 'id', width: 120 },
  { title: t('player.list.username'), key: 'username', width: 150 },
  { title: t('player.list.displayName'), key: 'display_name', width: 150 },
  { 
    title: t('player.list.tags'), 
    key: 'tags',
    render(row) {
      return row.tags.map(tag => {
        const translatedTag = t(`player.tags.${tag}`, tag)
        return h(NTag, { style: { marginRight: '6px' }, type: tag === 'TEST' ? 'warning' : 'default' }, { default: () => translatedTag })
      })
    }
  },
  { 
    title: t('navigation.rtp'),
    key: 'rtp',
    width: 100,
    render(row) {
      if (row.rtp === undefined) return '-'
      return h(
        'span', 
        { class: row.rtp < 100 ? 'text-green-600' : 'text-red-600' }, 
        `${row.rtp}%`
      )
    }
  },
  { 
    title: t('navigation.vipLevel'),
    key: 'vip_level',
    width: 100
  },
  { 
    title: t('player.list.accountStatus'), 
    key: 'status',
    width: 100,
    render(row) {
      const typeMap: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
        'ACTIVE': 'success',
        'LOCKED': 'warning',
        'FROZEN': 'info',
        'SUSPENDED': 'error'
      }
      return h(NTag, { type: typeMap[row.status] || 'default', bordered: false }, { default: () => t(`player.status.${row.status}`) })
    }
  },
  {
    title: t('player.list.onlineStatus'),
    key: 'is_online',
    width: 100,
    render(row) {
      return h(NBadge, { dot: true, type: row.is_online ? 'success' : 'default', style: { marginRight: '5px' } }, 
        () => h('span', row.is_online ? t('common.online') : t('common.offline'))
      )
    }
  },
  { 
    title: t('player.list.registerAt'), 
    key: 'register_at', 
    width: 180,
    render(row) {
      return formatDate(row.register_at)
    }
  },
  {
    title: t('common.action'),
    key: 'actions',
    width: 200,
    fixed: 'right',
    render(row) {
      return h(NButton, { 
        size: 'small', 
        secondary: true, 
        type: 'primary',
        onClick: () => router.push(`/admin/players/${row.id}`) 
      }, { 
        default: () => '檢視詳情',
        icon: () => h(EyeOutline) 
      })
    }
  }
])

const fetchData = async () => {
  loading.value = true
  try {
    const res = await playerApi.getPlayers(searchForm)
    if (res.code === 0 && res.data) {
      players.value = res.data.items
      pagination.itemCount = res.data.total
    } else {
      message.error(res.msg)
    }
  } catch (err) {
    message.error(t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

// Create Player Modal
const showCreateModal = ref(false)
const showVipRewardConfirmModal = ref(false)
const reissuePastVipRewards = ref(false)
const createModel = reactive({
  username: '',
  display_name: '',
  tags: ['測試帳號'], // Default to Test Account name if exists, relying on strings now
  phone: '',
  gender: undefined,
  birthday: undefined,
  email: '',
  password: '',
  vip_level: 0,
  is_muted: false,
  is_gift_disabled: false,
  is_retention_active: false,
  promo_code: ''
})

const handleCreate = async () => {
  if(!createModel.username || !createModel.display_name) {
        message.warning(t('common.fillRequired'))
        return
    }

    if (createModel.vip_level > 0) {
      reissuePastVipRewards.value = false
      showVipRewardConfirmModal.value = true
      return
    }

    await createPlayer()
}

const createPlayer = async () => {
    try {
    const res = await playerApi.createPlayer({
      username: createModel.username,
      display_name: createModel.display_name,
      password: createModel.password,
      phone: createModel.phone,
      gender: createModel.gender,
      birthday: createModel.birthday,
      email: createModel.email,
      vip_level: createModel.vip_level,
      reissue_past_vip_rewards: createModel.vip_level > 0 && reissuePastVipRewards.value,
      is_muted: createModel.is_muted,
      is_gift_disabled: createModel.is_gift_disabled,
      is_retention_active: createModel.is_retention_active,
      promo_code: createModel.promo_code,
      tags: createModel.tags
    })
        if(res.code === 0) {
            message.success(t('player.list.createSuccess'))
            showCreateModal.value = false
            reissuePastVipRewards.value = false
            fetchData()
        } else {
            message.error(res.msg)
        }
    } catch (e) {
        message.error(t('player.list.createFailed'))
    }
}

const confirmCreateWithVipRewards = async () => {
  await createPlayer()
  showVipRewardConfirmModal.value = false
}

const genderOptions = [
  { label: t('player.gender.MALE'), value: 'MALE' },
  { label: t('player.gender.FEMALE'), value: 'FEMALE' },
  { label: t('player.gender.UNKNOWN'), value: 'UNKNOWN' }
]

const isSticky = ref(false)
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  isSticky.value = target.scrollTop > 20
}

onMounted(() => {
  fetchTagOptions()
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

<template>
  <div class="p-6 flex flex-col gap-4">
    <!-- 搜尋條件區塊 -->
    <div class="sticky top-0 z-30 transition-all duration-300" :class="{ 'pt-2': isSticky }">
      <NCard 
        :title="t('navigation.playerManagement')" 
        class="rounded-xl shadow-sm border-0 premium-card transition-all duration-300" 
        :class="{ 'premium-glass shadow-xl mx-2': isSticky }"
        size="small"
      >
      <template #header-extra>
        <div class="flex gap-2">
            <NButton secondary @click="showTagDrawer = true">
                <template #icon><PricetagOutline /></template>
                {{ t('player.list.tagManagement') }}
            </NButton>
            <NButton type="primary" @click="showCreateModal = true">
                <template #icon><AddOutline /></template>
                {{ t('player.list.addTestPlayer') }}
            </NButton>
        </div>
      </template>
      
      <NForm :model="searchForm" label-placement="left" class="flex flex-col gap-4 mt-4">
        <!-- 基礎搜尋條件 -->
        <div class="flex flex-wrap items-end gap-x-6 gap-y-4">
            <NFormItem :label="t('common.search')" :show-feedback="false">
                <div class="relative">
                    <NRadioGroup v-model:value="searchForm.search_type" name="searchType" size="small" class="absolute -top-7 left-0 whitespace-nowrap">
                        <NRadio value="id">{{ t('common.id') }}</NRadio>
                        <NRadio value="username">{{ t('auth.username') }}</NRadio>
                        <NRadio value="phone">{{ t('common.phone') }}</NRadio>
                    </NRadioGroup>
                    <NInput v-model:value="searchForm.q" :placeholder="t('common.keywordPlaceholder')" style="width: 200px" />
                </div>
            </NFormItem>
            <NFormItem :label="t('navigation.affiliation')" :show-feedback="false">
                <div class="relative">
                    <NRadioGroup v-model:value="searchForm.affiliation_type" name="affiliationType" size="small" class="absolute -top-7 left-0 whitespace-nowrap">
                        <NRadio value="invite_code">{{ t('navigation.inviteCode') }}</NRadio>
                        <NRadio value="promo_code">{{ t('navigation.promoCode') }}</NRadio>
                    </NRadioGroup>
                    <NInput v-model:value="searchForm.affiliation_query" :placeholder="t('common.inputPlaceholder')" style="width: 180px" />
                </div>
            </NFormItem>
            <NFormItem :label="t('common.status')" :show-feedback="false">
                <NSelect v-model:value="searchForm.status" :options="statusOptions" :placeholder="t('common.all')" clearable style="width: 120px" />
            </NFormItem>

            <div class="flex gap-2 mb-[2px]">
                <NButton type="primary" attr-type="button" @click="fetchData">
                    <template #icon><SearchOutline /></template>
                    {{ t('common.search') }}
                </NButton>
                <NButton text icon-placement="right" @click="showAdvancedSearch = !showAdvancedSearch" class="ml-2">
                    <template #icon>
                        <ChevronDownOutline v-if="!showAdvancedSearch" />
                        <ChevronUpOutline v-else />
                    </template>
                    {{ showAdvancedSearch ? '收起搜尋' : '進階搜尋' }}
                </NButton>
            </div>
        </div>

        <!-- 進階搜尋條件 (可折疊) -->
        <NCollapseTransition :show="showAdvancedSearch">
            <div class="pt-4 border-t border-dashed flex flex-wrap items-end gap-x-6 gap-y-4">
                <NFormItem :label="t('player.list.tags')" :show-feedback="false">
                    <NSelect v-model:value="searchForm.tags" :options="tagOptions" multiple :placeholder="t('common.all')" clearable style="width: 180px" />
                </NFormItem>
                <NFormItem :label="t('player.list.registerIp')" :show-feedback="false">
                    <NInput v-model:value="searchForm.register_ip" :placeholder="t('common.keywordPlaceholder')" style="width: 150px" />
                </NFormItem>
                <NFormItem :label="t('player.list.registerDate')" :show-feedback="false">
                    <NDatePicker 
                        v-model:value="registerDateRange" 
                        type="daterange" 
                        clearable 
                        @update:value="([start, end]: [number, number]) => {
                            searchForm.register_date_start = start ? new Date(start).toISOString() : undefined
                            searchForm.register_date_end = end ? new Date(end).toISOString() : undefined
                        }"
                    />
                </NFormItem>
            </div>
        </NCollapseTransition>
      </NForm>
    </NCard>
  </div>

    <NDataTable
        remote
        :loading="loading"
        :columns="columns"
        :data="players"
        :pagination="pagination"
        :bordered="false"
        :single-line="false"
    />
    
    <!-- Create Modal -->
    <NModal v-model:show="showCreateModal" preset="card" :title="t('player.list.addTestAccount')" style="width: 500px">
        <NForm ref="createFormRef" :model="createModel" label-placement="left" label-width="80">
            <NFormItem :label="t('auth.username')" path="username" required>
                <NInput v-model:value="createModel.username" :placeholder="t('auth.username')" />
            </NFormItem>
            <NFormItem :label="t('player.list.displayName')" path="display_name" required>
              <NInput v-model:value="createModel.display_name" :placeholder="t('player.list.nicknamePlaceholder')" />
            </NFormItem>

            <NFormItem label="手機號碼">
              <NInput v-model:value="createModel.phone" placeholder="0912xxxxxx" />
            </NFormItem>

            <NFormItem :label="t('player.list.gender')">
              <NSelect v-model:value="createModel.gender" :options="genderOptions" clearable style="width: 140px" />
            </NFormItem>

            <NFormItem :label="t('player.list.birthday')">
              <NDatePicker v-model:formatted-value="createModel.birthday" value-format="yyyy-MM-dd" type="date" clearable />
            </NFormItem>

            <NFormItem :label="t('player.list.email')">
              <NInput v-model:value="createModel.email" placeholder="email@example.com" />
            </NFormItem>

            <NFormItem label="密碼">
              <NInput v-model:value="createModel.password" type="password" show-password-on="click" placeholder="留空則系統自動產生" clearable />
            </NFormItem>

            <NFormItem :label="t('player.list.vipLevel')">
              <NInputNumber v-model:value="createModel.vip_level" :min="0" style="width: 100%" />
            </NFormItem>

            <NFormItem label="全服禁言">
              <NSwitch v-model:value="createModel.is_muted" />
            </NFormItem>

            <NFormItem label="禁止贈禮">
              <NSwitch v-model:value="createModel.is_gift_disabled" />
            </NFormItem>

            <NFormItem :label="t('player.list.retentionCheck')">
              <NSwitch v-model:value="createModel.is_retention_active" />
            </NFormItem>

            <NFormItem :label="t('navigation.promoCode')">
              <NInput v-model:value="createModel.promo_code" placeholder="Promo Code" />
            </NFormItem>

            <NFormItem :label="t('player.list.tags')">
              <NSelect v-model:value="createModel.tags" multiple :options="tagOptions" />
            </NFormItem>
        </NForm>
        <template #footer>
            <div class="flex justify-end gap-2">
                <NButton @click="showCreateModal = false">{{ t('common.cancel') }}</NButton>
                <NButton type="primary" @click="handleCreate">{{ t('common.create') }}</NButton>
            </div>
        </template>
    </NModal>

    <NModal v-model:show="showVipRewardConfirmModal" preset="card" title="確認初始 VIP 等級" style="width: 460px" :mask-closable="false">
      <NAlert type="warning" class="mb-4">
        此玩家將以高於 VIP 0 的等級建立。請確認是否依照各 VIP 等級的設定，補發過往升級獎勵。
      </NAlert>
      <NCheckbox v-model:checked="reissuePastVipRewards">補發過往獎勵</NCheckbox>
      <p class="mt-2 text-xs text-gray-500">例如：新玩家設定為 VIP 10 時，勾選後將依設定派發 VIP 1 至 VIP 10 的升級獎勵。</p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton @click="showVipRewardConfirmModal = false">取消</NButton>
          <NButton type="primary" @click="confirmCreateWithVipRewards">確認建立</NButton>
        </div>
      </template>
    </NModal>

    <!-- Tag Drawer -->
    <TagManagementDrawer v-model:show="showTagDrawer" @change="fetchTagOptions" />
  </div>
</template>
