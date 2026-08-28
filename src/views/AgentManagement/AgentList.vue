<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, h, computed, watch } from 'vue'
import { 
  NCard, NInput, NSelect, NDatePicker, NButton, NDataTable, NSpace, NTag,
  NModal, NForm, NFormItem, useMessage, DataTableColumns, NRadioGroup, NRadio, NSwitch, NInputNumber,
  NGrid, NGridItem, NIcon, NDivider, NAlert
} from 'naive-ui'
import { 
  SearchOutline, CreateOutline, CashOutline, InformationCircleOutline,
  PeopleOutline, AddOutline, SwapHorizontalOutline, LayersOutline
} from '@vicons/ionicons5'
import { agentApi, agentGroupApi } from '@/api/agent'
import { Agent, AgentSearchParams, AgentStatus, AgentIdentity, AgentGroup } from '@/types/agent'
import { useI18n } from 'vue-i18n'

const message = useMessage()
const { t } = useI18n()

// Search State
const searchForm = reactive<AgentSearchParams>({
  q: '',
  search_type: 'username',
  identity: undefined,
  status: undefined,
  start_time: undefined,
  end_time: undefined,
  page: 1,
  page_size: 10
})

const dateRange = ref<[number, number] | null>(null)

const identityOptions = computed(() => [
  { label: t('agent.identity.ADMIN'), value: 'ADMIN' },
  { label: t('agent.identity.MASTER'), value: 'MASTER' },
  { label: t('agent.identity.SUB'), value: 'SUB' },
  { label: t('agent.identity.ASSISTANT'), value: 'ASSISTANT' }
])

const editIdentityOptions = computed(() => [
  { label: t('agent.identity.MASTER'), value: 'MASTER' },
  { label: t('agent.identity.SUB'), value: 'SUB' }
])

const statusOptions = computed(() => [
  { label: t('agent.status.NORMAL'), value: 'NORMAL' },
  { label: t('agent.status.LOCKED'), value: 'LOCKED' },
  { label: t('agent.status.FROZEN'), value: 'FROZEN' },
  { label: t('agent.status.DISABLED'), value: 'DISABLED' }
])

// Data Table
const loading = ref(false)
const agents = ref<Agent[]>([])
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

const columns = computed<DataTableColumns<Agent>>(() => [
  { 
    title: t('agent.list.uid'), 
    key: 'uid', 
    width: 120,
    render(row) {
      return h('div', [
        h('div', { class: 'font-bold flex items-center gap-2' }, [
          row.username,
          (!row.cpa_enabled && !row.deposit_commission_enabled && row.identity !== 'ADMIN') 
            ? h(NTag, { type: 'error', size: 'small', round: true }, { default: () => '無佣金 (M-04)' }) 
            : null
        ]),
        h('div', { class: 'text-xs text-gray-400' }, `UID: ${row.uid}`)
      ])
    }
  },
  { 
    title: t('agent.list.identity'), 
    key: 'identity', 
    width: 120,
    render(row) {
      const typeMap: Record<string, 'info' | 'success' | 'warning' | 'default' | 'error'> = {
        'ADMIN': 'error',
        'MASTER': 'info',
        'SUB': 'success',
        'ASSISTANT': 'warning'
      }
      return h(NTag, { type: typeMap[row.identity] as any, bordered: false }, { default: () => t(`agent.identity.${row.identity}`) })
    }
  },
  { title: t('agent.list.promoCode'), key: 'promo_code', width: 100 },
  { title: t('agent.list.path'), key: 'path', minWidth: 200 },
  { 
    title: 'CPA 單價', 
    key: 'cpa_price', 
    width: 100,
    align: 'center',
    render(row) {
      if (row.identity === 'ADMIN') return '-'
      if (!row.cpa_enabled) return h(NTag, { type: 'default', size: 'small', bordered: false }, { default: () => 'OFF' })
      return `$ ${row.cpa_price}`
    }
  },
  { 
    title: t('agent.list.commissionRate'), 
    key: 'deposit_commission_rate', 
    width: 120,
    render: (row) => {
      if (row.identity === 'ADMIN') return '-'
      if (!row.deposit_commission_enabled) return h(NTag, { type: 'default', size: 'small', bordered: false }, { default: () => 'OFF' })
      return `${row.deposit_commission_rate}%`
    }
  },
  { 
    title: t('agent.list.commissionWallet'), 
    key: 'commission_wallet', 
    width: 120,
    render: (row) => `$ ${row.commission_wallet.toLocaleString()}`
  },
  { 
    title: t('agent.list.promoWallet'), 
    key: 'promo_wallet', 
    width: 120,
    render: (row) => row.identity === 'ADMIN' ? '-' : `$ ${row.promo_wallet.toLocaleString()}`
  },
  { title: t('agent.list.subAgentCount'), key: 'sub_agent_count', width: 120, align: 'center' },
  { title: t('agent.list.directPlayerCount'), key: 'direct_player_count', width: 100, align: 'center' },
  { 
    title: t('agent.list.status'), 
    key: 'status', 
    width: 100,
    render(row) {
      const typeMap: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
        'NORMAL': 'success',
        'LOCKED': 'warning',
        'FROZEN': 'info',
        'DISABLED': 'error'
      }
      return h(NTag, { type: typeMap[row.status] as any, bordered: false }, { default: () => t(`agent.status.${row.status}`) })
    }
  },
  { 
    title: t('agent.list.createdAt'), 
    key: 'created_at', 
    width: 170,
    render: (row) => new Date(row.created_at).toLocaleString()
  },
  {
    title: t('agent.list.actions'),
    key: 'actions',
    width: 260,
    fixed: 'right',
    render(row) {
      const actions = [
        h(NButton, { size: 'small', quaternary: true, type: 'primary', onClick: () => showEditModal(row) }, { 
          default: () => [h(NIcon, { style: { marginRight: '4px' } }, { default: () => h(CreateOutline) }), t('agent.list.edit')] 
        })
      ]
      if (row.identity !== 'ADMIN') {
        actions.push(
          h(NButton, { size: 'small', quaternary: true, type: 'warning', onClick: () => showPromoModal(row) }, { 
            default: () => [h(NIcon, { style: { marginRight: '4px' } }, { default: () => h(CashOutline) }), t('agent.list.promoMoney')] 
          }),
          h(NButton, { size: 'small', quaternary: true, type: 'error', onClick: () => openTransferModal(row) }, {
            default: () => [h(NIcon, { style: { marginRight: '4px' } }, { default: () => h(SwapHorizontalOutline) }), '轉線']
          })
        )
      }
      return h(NSpace, {}, { default: () => actions })
    }
  }
])

const fetchData = async () => {
  loading.value = true
  try {
    const res = await agentApi.getAgents(searchForm)
    if (res.code === 0 && res.data) {
      agents.value = res.data.items
      pagination.itemCount = res.data.total
    } else {
      message.error(res.msg || t('common.loadFailed'))
    }
  } catch (err) {
    message.error(t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

// Modal States
const showEdit = ref(false)
const showCreate = ref(false)
const showPromo = ref(false)
const showTransfer = ref(false)
const activeAgent = ref<Agent | null>(null)
const transferTarget = ref<Agent | null>(null)

// Forms
const editForm = reactive({
  password: '',
  identity: 'MASTER' as AgentIdentity,
  parent_id: '',
  two_fa_enabled: false,
  cpa_enabled: true,
  cpa_price: 0,
  deposit_commission_enabled: true,
  deposit_commission_rate: 0,
  data_binding_threshold: { phone: false, google: false },
  deposit_threshold: 0,
  flow_threshold: 0,
  status: 'NORMAL' as AgentStatus,
  name: '',
  phone: '',
  contact_info: '',
  sensitive_data_permission: false,
  remark: '',
  change_reason: '',
  group_id: '' as string | undefined
})

const createForm = reactive({
    username: '',
    parent_id: '',
    promo_code: '',
    identity: 'SUB' as AgentIdentity,
    password: '',
    two_fa_enabled: false,
    cpa_enabled: true,
    cpa_price: 0,
    deposit_commission_enabled: true,
    deposit_commission_rate: 0,
    data_binding_threshold: { phone: false, google: false },
    deposit_threshold: 0,
    flow_threshold: 0,
    status: 'NORMAL' as AgentStatus,
    name: '',
    phone: '',
    contact_info: '',
    sensitive_data_permission: false,
    remark: '',
    group_id: '' as string | undefined
})

// Agent Groups for create form
const agentGroups = ref<AgentGroup[]>([])
const selectedGroup = computed(() => agentGroups.value.find(g => g.id === createForm.group_id) ?? null)
const groupOptions = computed(() => [
    { label: '不使用群組（手動設定）', value: '' },
    ...agentGroups.value.map(g => ({ label: g.name, value: g.id }))
])

// When group selection changes, auto-fill form fields
watch(() => createForm.group_id, (gid) => {
    if (!gid) return
    const g = agentGroups.value.find(g => g.id === gid)
    if (!g) return
    createForm.cpa_enabled = g.cpa_enabled
    createForm.cpa_price = g.cpa_price
    createForm.deposit_commission_enabled = g.deposit_commission_enabled
    createForm.deposit_commission_rate = g.deposit_commission_rate
    createForm.data_binding_threshold = { ...g.data_binding_threshold }
    createForm.deposit_threshold = g.deposit_threshold
    createForm.flow_threshold = g.flow_threshold
})

const selectedEditGroup = computed(() => agentGroups.value.find(g => g.id === editForm.group_id) ?? null)

watch(() => editForm.group_id, (gid) => {
    if (!gid) return
    const g = agentGroups.value.find(g => g.id === gid)
    if (!g) return
    editForm.cpa_enabled = g.cpa_enabled
    editForm.cpa_price = g.cpa_price
    editForm.deposit_commission_enabled = g.deposit_commission_enabled
    editForm.deposit_commission_rate = g.deposit_commission_rate
    editForm.data_binding_threshold = { ...g.data_binding_threshold }
    editForm.deposit_threshold = g.deposit_threshold
    editForm.flow_threshold = g.flow_threshold
})

const fetchGroups = async () => {
    try {
        const res = await agentGroupApi.getGroups()
        if (res.code === 0 && res.data) agentGroups.value = res.data
    } catch { /* ignore */ }
}

// ── 子代理繼承邏輯 ─────────────────────────────────────────────────────────────
const createParentAgent = ref<Agent | null>(null)
const editParentAgent   = ref<Agent | null>(null)

// 新增：切換為子代理時清除群組選擇；切換離開時清除父代理
watch(() => createForm.identity, (newVal) => {
    if (newVal === 'SUB') {
        createForm.group_id = ''
    } else {
        createParentAgent.value = null
    }
})
watch(() => editForm.identity, (newVal) => {
    if (newVal === 'SUB') {
        editForm.group_id = ''
    } else {
        editParentAgent.value = null
    }
})

// 新增：監聽 parent_id 變化，自動取得上級代理資料並套用繼承
watch([() => createForm.parent_id, () => createForm.identity], async ([pid, identity]) => {
    if (identity !== 'SUB' || !pid) { createParentAgent.value = null; return }
    try {
        const res = await agentApi.searchAgent(pid)
        if (res.code === 0 && res.data) {
            createParentAgent.value = res.data
            createForm.cpa_enabled = res.data.cpa_enabled
            createForm.cpa_price = res.data.cpa_price
            createForm.deposit_commission_enabled = res.data.deposit_commission_enabled
            createForm.data_binding_threshold = { ...res.data.data_binding_threshold }
            createForm.deposit_threshold = res.data.deposit_threshold
            createForm.flow_threshold = res.data.flow_threshold
        } else {
            createParentAgent.value = null
        }
    } catch { createParentAgent.value = null }
})

watch([() => editForm.parent_id, () => editForm.identity], async ([pid, identity]) => {
    if (identity !== 'SUB' || !pid) { editParentAgent.value = null; return }
    try {
        const res = await agentApi.searchAgent(pid)
        if (res.code === 0 && res.data) {
            editParentAgent.value = res.data
            editForm.cpa_enabled = res.data.cpa_enabled
            editForm.cpa_price = res.data.cpa_price
            editForm.deposit_commission_enabled = res.data.deposit_commission_enabled
            editForm.data_binding_threshold = { ...res.data.data_binding_threshold }
            editForm.deposit_threshold = res.data.deposit_threshold
            editForm.flow_threshold = res.data.flow_threshold
        } else {
            editParentAgent.value = null
        }
    } catch { editParentAgent.value = null }
})

// Handlers

const transferForm = reactive<import('@/types/agent').TransferAgentParams>({
    agent_id: '',
    new_parent_id: '',
    execution_type: 'IMMEDIATE',
    execute_at: undefined,
    reason: ''
})
const newParentInfo = ref<Agent | null>(null)
const newParentKeyword = ref('')
const verifyLoading = ref(false)
const submitLoading = ref(false)

const openTransferModal = (agent: Agent) => {
    transferTarget.value = agent
    transferForm.agent_id = agent.id
    transferForm.new_parent_id = ''
    transferForm.execution_type = 'IMMEDIATE'
    transferForm.execute_at = undefined
    transferForm.reason = ''
    newParentKeyword.value = ''
    newParentInfo.value = null
    showTransfer.value = true
}

const handleVerifyNewParent = async () => {
    if (!newParentKeyword.value) {
        message.warning('請輸入新上級 UID 或帳號')
        return
    }
    verifyLoading.value = true
    try {
        const res = await agentApi.searchAgent(newParentKeyword.value)
        if (res.code === 0 && res.data) {
            newParentInfo.value = res.data
            transferForm.new_parent_id = res.data.id
            message.success('檢索成功')
        } else {
            message.error(res.msg || '找不到代理')
            newParentInfo.value = null
        }
    } catch (e) {
         message.error('檢索失敗')
         newParentInfo.value = null
    } finally {
        verifyLoading.value = false
    }
}

const handleSubmitTransfer = async () => {
    if (!transferForm.new_parent_id) {
        message.warning('請先檢索並確認新上級')
        return
    }
    if (transferForm.execution_type === 'SCHEDULED' && !transferForm.execute_at) {
        message.warning('請選擇預約時間')
        return
    }
    if (transferForm.execution_type === 'SCHEDULED' && transferForm.execute_at) {
        const executeTime = new Date(transferForm.execute_at).getTime()
        if (executeTime < Date.now() + 9 * 60 * 1000) {
            message.warning('預約時間必須大於當前時間至少 10 分鐘')
            return
        }
    }
    if (!transferForm.reason || transferForm.reason.length < 5 || transferForm.reason.length > 200) {
        message.warning('備註原因需在 5 到 200 字之間')
        return
    }
    
    if (newParentInfo.value && transferTarget.value) {
        if (newParentInfo.value.cpa_price < transferTarget.value.cpa_price) {
             message.error('風控阻斷：新上級的 CPA 單價不可低於目標代理的 CPA 單價！')
             return
        }
    }

    submitLoading.value = true
    try {
        const res = await agentApi.submitTransfer(transferForm)
        if (res.code === 0) {
            message.success(transferForm.execution_type === 'IMMEDIATE' ? '轉線成功' : '預約排程已建立')
            showTransfer.value = false
            fetchData()
        } else {
            message.error(res.msg || '轉線失敗')
        }
    } catch (e) {
        message.error('轉線失敗')
    } finally {
        submitLoading.value = false
    }
}

const openCreateModal = () => {
    Object.assign(createForm, {
        username: '',
        parent_id: '',
        promo_code: '',
        identity: 'SUB',
        password: '',
        two_fa_enabled: false,
        cpa_enabled: true,
        cpa_price: 0,
        deposit_commission_enabled: true,
        deposit_commission_rate: 0,
        data_binding_threshold: { phone: false, google: false },
        deposit_threshold: 0,
        flow_threshold: 0,
        status: 'NORMAL',
        name: '',
        phone: '',
        contact_info: '',
        sensitive_data_permission: false,
        remark: '',
        group_id: ''
    })
    fetchGroups()
    showCreate.value = true
}

const showEditModal = (agent: Agent) => {
  activeAgent.value = agent
  // 子代理：從 path 解析上級代理帳號，自動觸發繼承監聽
  let parsedParentId = ''
  if (agent.identity === 'SUB') {
    const parts = agent.path.split(' > ')
    if (parts.length >= 2) parsedParentId = parts[parts.length - 2]
  }
  Object.assign(editForm, {
    password: '',
    identity: agent.identity,
    parent_id: parsedParentId,
    two_fa_enabled: agent.two_fa_enabled,
    cpa_enabled: agent.cpa_enabled,
    cpa_price: agent.cpa_price,
    deposit_commission_enabled: agent.deposit_commission_enabled,
    deposit_commission_rate: agent.deposit_commission_rate,
    data_binding_threshold: { ...agent.data_binding_threshold },
    deposit_threshold: agent.deposit_threshold,
    flow_threshold: agent.flow_threshold,
    status: agent.status,
    name: agent.name,
    phone: agent.phone,
    contact_info: agent.contact_info,
    sensitive_data_permission: agent.sensitive_data_permission,
    remark: agent.remark,
    change_reason: '',
    group_id: agent.identity === 'SUB' ? '' : (agent.group_id || '')
  })
  fetchGroups()
  showEdit.value = true
}

const handleUpdate = async () => {
  if (editForm.identity === 'SUB' && activeAgent.value?.identity === 'MASTER' && !editForm.parent_id) {
    message.warning('轉變為子代理必須輸入所屬上級ID')
    return
  }
  if (!editForm.change_reason) {
    message.warning(t('agent.edit.reasonPlaceholder'))
    return
  }
  
  try {
    const res = await agentApi.updateAgent({
      id: activeAgent.value!.id,
      ...editForm
    })
    if (res.code === 0) {
        message.success(t('agent.edit.saveSuccess'))
        showEdit.value = false
        fetchData()
    }
  } catch (e) {}
}

const handleCreate = async () => {
    if (!createForm.username || !createForm.password) {
        message.warning('請填寫帳號與密碼')
        return
    }
    if (['SUB', 'ASSISTANT'].includes(createForm.identity) && !createForm.parent_id) {
        message.warning('請輸入所屬上級ID')
        return
    }
    try {
        const res = await agentApi.createAgent(createForm)
        if (res.code === 0) {
            message.success(t('common.success'))
            showCreate.value = false
            fetchData()
        }
    } catch (e) {}
}

const promoForm = reactive({ amount: 0, reason: '' })
const showPromoModal = (agent: Agent) => {
    activeAgent.value = agent
    promoForm.amount = 0
    promoForm.reason = ''
    showPromo.value = true
}
const handlePromoAdjust = async () => {
    if (!promoForm.reason) {
        message.warning(t('agent.edit.reasonPlaceholder'))
        return
    }
    try {
        const res = await agentApi.adjustPromoWallet(activeAgent.value!.id, promoForm.amount, promoForm.reason)
        if (res.code === 0) {
            message.success(t('common.success'))
            showPromo.value = false
            fetchData()
        }
    } catch(e) {}
}

const isSticky = ref(false)
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  isSticky.value = target.scrollTop > 20
}

onMounted(() => {
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
        class="rounded-xl shadow-sm border-0 premium-card transition-all duration-300" 
        :class="{ 'premium-glass shadow-xl mx-2': isSticky }"
        size="small"
      >
      <template #header>
        <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-2">
                <NIcon size="24" color="#0ea5e9"><PeopleOutline /></NIcon>
                <span class="text-lg font-black">{{ t('agent.list.title') }}</span>
            </div>
            <NButton type="primary" rounded @click="openCreateModal">
                <template #icon><NIcon><AddOutline /></NIcon></template>
                {{ t('agent.list.addAgent') }}
            </NButton>
        </div>
      </template>

      <NForm inline :model="searchForm" label-placement="left" class="flex-wrap gap-x-8 gap-y-6 mt-4">
        <NFormItem :label="t('common.search')">
            <div class="relative">
                <NRadioGroup v-model:value="searchForm.search_type" name="searchType" size="small" class="absolute -top-7 left-0 whitespace-nowrap">
                    <NRadio value="username">{{ t('agent.list.searchTypeAccount') }}</NRadio>
                    <NRadio value="uid">{{ t('agent.list.searchTypeUid') }}</NRadio>
                    <NRadio value="promo_code">{{ t('agent.list.searchTypePromo') }}</NRadio>
                </NRadioGroup>
                <NInput v-model:value="searchForm.q" :placeholder="t('common.keywordPlaceholder')" style="width: 200px" />
            </div>
        </NFormItem>

        <NFormItem :label="t('agent.list.identity')">
          <NSelect v-model:value="searchForm.identity" :options="identityOptions" :placeholder="t('common.all')" clearable style="width: 140px" />
        </NFormItem>

        <NFormItem :label="t('agent.list.status')">
          <NSelect v-model:value="searchForm.status" :options="statusOptions" :placeholder="t('common.all')" clearable style="width: 120px" />
        </NFormItem>

        <NFormItem :label="t('agent.list.createTime')">
            <NDatePicker 
                v-model:value="dateRange" 
                type="daterange" 
                clearable 
                @update:value="([start, end]: any) => {
                    searchForm.start_time = start ? new Date(start).toISOString() : undefined
                    searchForm.end_time = end ? new Date(end).toISOString() : undefined
                }"
            />
        </NFormItem>

        <NFormItem>
          <NButton type="primary" secondary @click="fetchData">
            <template #icon><SearchOutline /></template>
            {{ t('common.search') }}
          </NButton>
        </NFormItem>
      </NForm>
    </NCard>
  </div>

    <NDataTable
        remote
        :loading="loading"
        :columns="columns"
        :data="agents"
        :pagination="pagination"
        :bordered="false"
        :single-line="false"
        scroll-x="1800"
        class="premium-table"
    />

    <!-- Create Agent Modal -->
    <NModal 
        v-model:show="showCreate" 
        preset="card" 
        :title="t('agent.edit.createTitle')" 
        style="width: 850px; border-radius: 20px;"
    >
        <div class="max-h-[75vh] overflow-y-auto px-4">
            <NForm :model="createForm" label-placement="left" label-width="140" label-align="right">
                <NDivider title-placement="left">核心設定</NDivider>
                <NGrid :cols="2" :x-gap="24">
                    <NGridItem>
                        <NFormItem :label="t('agent.list.searchTypeAccount')" required>
                            <NInput v-model:value="createForm.username" placeholder="請輸入帳號" />
                        </NFormItem>
                    </NGridItem>
                    <NGridItem>
                        <NFormItem :label="t('agent.list.identity')" required>
                            <NSelect v-model:value="createForm.identity" :options="identityOptions" />
                        </NFormItem>
                    </NGridItem>
                    <NGridItem v-if="createForm.identity !== 'ADMIN'">
                        <NFormItem label="所屬代理群組">
                            <NSelect
                                v-model:value="createForm.group_id"
                                :options="groupOptions"
                                :disabled="createForm.identity === 'SUB'"
                                :placeholder="createForm.identity === 'SUB' ? '子代理繼承上級設定，不適用群組' : '請選擇代理群組'"
                                clearable
                            />
                        </NFormItem>
                    </NGridItem>
                    <NGridItem>
                        <NFormItem :label="t('agent.list.promoCode')">
                             <NInput v-model:value="createForm.promo_code" placeholder="請輸入推廣碼 (選填)" />
                        </NFormItem>
                    </NGridItem>
                    <NGridItem v-if="['SUB', 'ASSISTANT'].includes(createForm.identity)">
                        <NFormItem label="所屬上級ID" required>
                             <NInput v-model:value="createForm.parent_id" placeholder="請輸入上級代理ID" />
                        </NFormItem>
                    </NGridItem>
                    <NGridItem>
                        <NFormItem :label="t('agent.edit.password')" required>
                            <NInput 
                                v-model:value="createForm.password" 
                                type="password" 
                                show-password-on="click" 
                                :placeholder="t('agent.edit.createPasswordPlaceholder')" 
                            />
                        </NFormItem>
                    </NGridItem>
                </NGrid>

                <template v-if="createForm.identity !== 'ADMIN'">
                    <NDivider title-placement="left">
                        <NSpace align="center" :size="8">
                            <span>合作模式設定 (CPA 與儲值抽成)</span>
                            <NTag v-if="createForm.group_id" type="warning" size="small" round>已套用群組範本</NTag>
                            <NTag v-else-if="createForm.identity === 'SUB'" type="info" size="small" round>繼承上級代理</NTag>
                        </NSpace>
                    </NDivider>

                    <!-- 群組套用提示 -->
                    <NAlert v-if="createForm.group_id" type="warning" size="small" class="mb-4">
                        目前已套用代理群組範本「{{ selectedGroup?.name }}」，合作模式與門檻設定將自動填寫並鎖定為唯讀狀態。
                    </NAlert>
                    <!-- 子代理繼承提示 -->
                    <NAlert v-else-if="createForm.identity === 'SUB'" :type="createParentAgent ? 'info' : 'warning'" size="small" class="mb-4">
                        <span v-if="createParentAgent">
                            已連結上級代理「<strong>{{ createParentAgent.username }}</strong>」，CPA 設定、抽成開關及進階門檻已繼承上級設定（唯讀）。<br/>
                            儲值抽成比率可依需求自行設定。
                        </span>
                        <span v-else>請先在上方填入並確認上級代理ID，系統將自動繼承其合作模式與門檻設定。</span>
                    </NAlert>

                    <NGrid :cols="2" :x-gap="24">
                        <NGridItem>
                            <NFormItem label="CPA 結算開關">
                                <NSwitch v-model:value="createForm.cpa_enabled" :disabled="!!createForm.group_id || createForm.identity === 'SUB'" />
                            </NFormItem>
                        </NGridItem>
                        <NGridItem>
                            <NFormItem label="儲值抽成開關">
                                <NSwitch v-model:value="createForm.deposit_commission_enabled" :disabled="!!createForm.group_id || createForm.identity === 'SUB'" />
                            </NFormItem>
                        </NGridItem>

                        <NGridItem v-if="createForm.cpa_enabled">
                            <NFormItem label="CPA 單價">
                                <NInputNumber v-model:value="createForm.cpa_price" :min="0" :disabled="!!createForm.group_id || createForm.identity === 'SUB'" style="width: 100%" />
                            </NFormItem>
                        </NGridItem>

                        <NGridItem v-if="createForm.deposit_commission_enabled">
                            <NFormItem :label="t('agent.edit.commissionRate')">
                                <NInputNumber v-model:value="createForm.deposit_commission_rate" :min="0" :max="100" :disabled="!!createForm.group_id" style="width: 100%" />
                            </NFormItem>
                        </NGridItem>
                    </NGrid>

                    <NDivider title-placement="left" class="mt-6">進階門檻設定</NDivider>

                    <NFormItem :label="t('agent.edit.bindingThreshold')">
                        <NSpace>
                            <NTag checkable v-model:checked="createForm.data_binding_threshold.phone" :disabled="!!createForm.group_id || createForm.identity === 'SUB'" type="primary">
                                {{ t('agent.edit.phoneBinding') }}
                            </NTag>
                            <NTag checkable v-model:checked="createForm.data_binding_threshold.google" :disabled="!!createForm.group_id || createForm.identity === 'SUB'" type="error">
                                Google綁定
                            </NTag>
                        </NSpace>
                    </NFormItem>

                    <NGrid :cols="2" :x-gap="24">
                        <NGridItem>
                            <NFormItem :label="t('agent.edit.depositThreshold')">
                                <NInputNumber v-model:value="createForm.deposit_threshold" :min="0" :disabled="!!createForm.group_id || createForm.identity === 'SUB'" style="width: 100%" />
                            </NFormItem>
                        </NGridItem>
                        <NGridItem>
                            <NFormItem :label="t('agent.edit.flowThreshold')">
                                <NInputNumber v-model:value="createForm.flow_threshold" :min="0" :disabled="!!createForm.group_id || createForm.identity === 'SUB'" style="width: 100%" />
                            </NFormItem>
                        </NGridItem>
                    </NGrid>
                </template>

                <NDivider title-placement="left">{{ createForm.identity === 'ADMIN' ? '狀態與進階' : '基本資料與狀態' }}</NDivider>

                <NGrid :cols="2" :x-gap="24">
                    <NGridItem>
                        <NFormItem :label="t('agent.list.status')">
                            <NSelect v-model:value="createForm.status" :options="statusOptions" />
                        </NFormItem>
                    </NGridItem>
                    <NGridItem>
                        <NFormItem :label="t('agent.edit.twoFactor')">
                            <NSwitch v-model:value="createForm.two_fa_enabled" />
                        </NFormItem>
                    </NGridItem>
                    
                    <NGridItem v-if="createForm.identity !== 'ADMIN'">
                        <NFormItem :label="t('agent.edit.name')">
                            <NInput v-model:value="createForm.name" />
                        </NFormItem>
                    </NGridItem>
                    <NGridItem v-if="createForm.identity !== 'ADMIN'">
                        <NFormItem :label="t('agent.edit.phone')">
                            <NInput v-model:value="createForm.phone" />
                        </NFormItem>
                    </NGridItem>
                    <NGridItem v-if="createForm.identity !== 'ADMIN'">
                        <NFormItem :label="t('agent.edit.contact')">
                            <NInput v-model:value="createForm.contact_info" />
                        </NFormItem>
                    </NGridItem>
                </NGrid>

                <NFormItem v-if="createForm.identity !== 'ADMIN'" :label="t('agent.edit.sensitivePermission')">
                    <NSpace vertical>
                        <NSwitch v-model:value="createForm.sensitive_data_permission" />
                        <span class="text-xs text-gray-400">{{ t('agent.edit.sensitivePermissionDesc') }}</span>
                    </NSpace>
                </NFormItem>

                <NFormItem :label="t('agent.edit.remark')">
                    <NInput v-model:value="createForm.remark" type="textarea" :rows="2" />
                </NFormItem>
            </NForm>
        </div>
        <template #footer>
            <div class="flex justify-end gap-3">
                <NButton quaternary @click="showCreate = false">{{ t('common.cancel') }}</NButton>
                <NButton type="primary" rounded @click="handleCreate()">{{ t('common.save') }}</NButton>
            </div>
        </template>
    </NModal>

    <!-- Edit Agent Modal -->
    <NModal 
        v-model:show="showEdit" 
        preset="card" 
        :title="t('agent.edit.title')" 
        style="width: 850px; border-radius: 20px;"
    >
        <div class="max-h-[75vh] overflow-y-auto px-4">
            <NForm :model="editForm" label-placement="left" label-width="140" label-align="right">
                <NDivider title-placement="left">核心設定</NDivider>
                <NGrid :cols="2" :x-gap="24">
                    <NGridItem>
                        <NFormItem :label="t('agent.list.uid')">
                            <NInput :value="activeAgent?.uid" disabled />
                        </NFormItem>
                    </NGridItem>
                    <NGridItem>
                        <NFormItem :label="t('agent.list.identity')">
                            <NSelect v-if="activeAgent?.identity !== 'ADMIN'" v-model:value="editForm.identity" :options="editIdentityOptions" />
                            <NTag v-else type="info" :bordered="false">{{ t(`agent.identity.${activeAgent?.identity}`) }}</NTag>
                        </NFormItem>
                    </NGridItem>
                    <NGridItem v-if="editForm.identity === 'SUB' && activeAgent?.identity === 'MASTER'">
                        <NFormItem label="所屬上級ID" required>
                             <NInput v-model:value="editForm.parent_id" placeholder="請輸入上級代理ID" />
                        </NFormItem>
                    </NGridItem>
                    <NGridItem v-if="editForm.identity === 'SUB' && activeAgent?.identity === 'SUB'">
                        <NFormItem label="變更上級ID (選填)">
                             <NInput v-model:value="editForm.parent_id" placeholder="若要轉移體系請輸入，否則留空" />
                        </NFormItem>
                    </NGridItem>
                    <NGridItem v-if="activeAgent?.identity !== 'ADMIN'">
                        <NFormItem label="所屬代理群組">
                            <NSelect
                                v-model:value="editForm.group_id"
                                :options="groupOptions"
                                :disabled="activeAgent?.identity === 'SUB'"
                                :placeholder="activeAgent?.identity === 'SUB' ? '子代理繼承上級設定，不適用群組' : '請選擇代理群組'"
                                clearable
                            />
                        </NFormItem>
                    </NGridItem>
                    <NGridItem>
                        <NFormItem :label="t('agent.list.promoCode')">
                             <NInput :value="activeAgent?.promo_code" disabled />
                        </NFormItem>
                    </NGridItem>
                    <NGridItem>
                        <NFormItem :label="t('agent.edit.password')">
                            <NInput 
                                v-model:value="editForm.password" 
                                type="password" 
                                show-password-on="click" 
                                :placeholder="t('agent.edit.passwordPlaceholder')" 
                            />
                        </NFormItem>
                    </NGridItem>
                </NGrid>

                <template v-if="activeAgent?.identity !== 'ADMIN'">
                    <NDivider title-placement="left">
                        <NSpace align="center" :size="8">
                            <span>合作模式設定 (CPA 與儲值抽成)</span>
                            <NTag v-if="editForm.group_id" type="warning" size="small" round>已套用群組範本</NTag>
                            <NTag v-else-if="activeAgent?.identity === 'SUB'" type="info" size="small" round>繼承上級代理</NTag>
                        </NSpace>
                    </NDivider>

                    <!-- 群組套用提示 -->
                    <NAlert v-if="editForm.group_id" type="warning" size="small" class="mb-4">
                        目前已套用代理群組範本「{{ selectedEditGroup?.name }}」，合作模式與門檻設定將自動填寫並鎖定為唯讀狀態。
                    </NAlert>
                    <!-- 子代理繼承提示 -->
                    <NAlert v-else-if="activeAgent?.identity === 'SUB'" :type="editParentAgent ? 'info' : 'warning'" size="small" class="mb-4">
                        <span v-if="editParentAgent">
                            已連結上級代理「<strong>{{ editParentAgent.username }}</strong>」，CPA 設定、抽成開關及進階門檻已繼承上級設定（唯讀）。<br/>
                            儲值抽成比率可依需求自行設定。
                        </span>
                        <span v-else>正在載入上級代理資訊...</span>
                    </NAlert>

                    <NGrid :cols="2" :x-gap="24">
                        <NGridItem>
                            <NFormItem label="CPA 結算開關">
                                <NSwitch v-model:value="editForm.cpa_enabled" :disabled="!!editForm.group_id || activeAgent?.identity === 'SUB'" />
                            </NFormItem>
                        </NGridItem>
                        <NGridItem>
                            <NFormItem label="儲值抽成開關">
                                <NSwitch v-model:value="editForm.deposit_commission_enabled" :disabled="!!editForm.group_id || activeAgent?.identity === 'SUB'" />
                            </NFormItem>
                        </NGridItem>

                        <NGridItem v-if="editForm.cpa_enabled">
                            <NFormItem label="CPA 單價">
                                <NInputNumber v-model:value="editForm.cpa_price" :min="0" :disabled="!!editForm.group_id || activeAgent?.identity === 'SUB'" style="width: 100%" />
                            </NFormItem>
                        </NGridItem>

                        <NGridItem v-if="editForm.deposit_commission_enabled">
                            <NFormItem :label="t('agent.edit.commissionRate')">
                                <NInputNumber v-model:value="editForm.deposit_commission_rate" :min="0" :max="100" :disabled="!!editForm.group_id" style="width: 100%" />
                            </NFormItem>
                        </NGridItem>
                    </NGrid>

                    <NDivider title-placement="left" class="mt-6">進階門檻設定</NDivider>

                    <NFormItem :label="t('agent.edit.bindingThreshold')">
                        <NSpace>
                            <NTag checkable v-model:checked="editForm.data_binding_threshold.phone" :disabled="!!editForm.group_id || activeAgent?.identity === 'SUB'" type="primary">
                                {{ t('agent.edit.phoneBinding') }}
                            </NTag>
                            <NTag checkable v-model:checked="editForm.data_binding_threshold.google" :disabled="!!editForm.group_id || activeAgent?.identity === 'SUB'" type="error">
                                Google綁定
                            </NTag>
                        </NSpace>
                    </NFormItem>

                    <NGrid :cols="2" :x-gap="24">
                        <NGridItem>
                            <NFormItem :label="t('agent.edit.depositThreshold')">
                                <NInputNumber v-model:value="editForm.deposit_threshold" :min="0" :disabled="!!editForm.group_id || activeAgent?.identity === 'SUB'" style="width: 100%" />
                            </NFormItem>
                        </NGridItem>
                        <NGridItem>
                            <NFormItem :label="t('agent.edit.flowThreshold')">
                                <NInputNumber v-model:value="editForm.flow_threshold" :min="0" :disabled="!!editForm.group_id || activeAgent?.identity === 'SUB'" style="width: 100%" />
                            </NFormItem>
                        </NGridItem>
                    </NGrid>
                </template>

                <NDivider title-placement="left">{{ activeAgent?.identity === 'ADMIN' ? '狀態與進階' : '基本資料與狀態' }}</NDivider>

                <NGrid :cols="2" :x-gap="24">
                    <NGridItem>
                        <NFormItem :label="t('agent.list.status')">
                            <NSelect v-model:value="editForm.status" :options="statusOptions" />
                        </NFormItem>
                    </NGridItem>
                    <NGridItem>
                        <NFormItem :label="t('agent.edit.twoFactor')">
                            <NSwitch v-model:value="editForm.two_fa_enabled" />
                        </NFormItem>
                    </NGridItem>
                    
                    <NGridItem v-if="activeAgent?.identity !== 'ADMIN'">
                        <NFormItem :label="t('agent.edit.name')">
                            <NInput v-model:value="editForm.name" />
                        </NFormItem>
                    </NGridItem>
                    <NGridItem v-if="activeAgent?.identity !== 'ADMIN'">
                        <NFormItem :label="t('agent.edit.phone')">
                            <NInput v-model:value="editForm.phone" />
                        </NFormItem>
                    </NGridItem>
                    <NGridItem v-if="activeAgent?.identity !== 'ADMIN'">
                        <NFormItem :label="t('agent.edit.contact')">
                            <NInput v-model:value="editForm.contact_info" />
                        </NFormItem>
                    </NGridItem>
                </NGrid>

                <NFormItem v-if="activeAgent?.identity !== 'ADMIN'" :label="t('agent.edit.sensitivePermission')">
                    <NSpace vertical>
                        <NSwitch v-model:value="editForm.sensitive_data_permission" />
                        <span class="text-xs text-gray-400">{{ t('agent.edit.sensitivePermissionDesc') }}</span>
                    </NSpace>
                </NFormItem>

                <NFormItem :label="t('agent.edit.remark')">
                    <NInput v-model:value="editForm.remark" type="textarea" :rows="2" />
                </NFormItem>

                <NDivider title-placement="left" dashed>{{ t('agent.edit.reason') }}</NDivider>
                <NFormItem :label="t('agent.edit.reason')" required>
                    <NInput v-model:value="editForm.change_reason" type="textarea" :placeholder="t('agent.edit.reasonPlaceholder')" />
                </NFormItem>
            </NForm>
        </div>
        <template #footer>
            <div class="flex justify-end gap-3">
                <NButton quaternary @click="showEdit = false">{{ t('common.cancel') }}</NButton>
                <NButton type="primary" rounded @click="handleUpdate()">{{ t('common.save') }}</NButton>
            </div>
        </template>
    </NModal>


    <!-- Promotion Money Modal -->
    <NModal v-model:show="showPromo" preset="card" :title="t('agent.list.promoMoney')" style="width: 450px">
        <NForm label-placement="left" label-width="100">
            <NFormItem label="當前餘額">
                <span class="font-bold text-lg text-sky-600">$ {{ activeAgent?.promo_wallet.toLocaleString() }}</span>
            </NFormItem>
            <NFormItem label="調整金額">
                <NInputNumber v-model:value="promoForm.amount" :step="100" style="width: 100%" placeholder="正數增加，負數扣除" />
            </NFormItem>
            <NFormItem :label="t('agent.edit.reason')" required>
                <NInput v-model:value="promoForm.reason" type="textarea" :placeholder="t('agent.edit.reasonPlaceholder')" />
            </NFormItem>
        </NForm>
        <template #footer>
             <div class="flex justify-end gap-3">
                <NButton quaternary @click="showPromo = false">{{ t('common.cancel') }}</NButton>
                <NButton type="primary" @click="handlePromoAdjust">{{ t('common.confirm') }}</NButton>
            </div>
        </template>
    </NModal>

    <!-- Transfer Modal -->
    <NModal v-model:show="showTransfer" preset="card" title="代理轉線設定" style="width: 650px; border-radius: 20px;">
        <NForm :model="transferForm" label-placement="left" label-width="120">
            <NDivider title-placement="left">目標代理資訊</NDivider>
            <NFormItem label="欲轉線代理">
                <div class="flex items-center gap-2">
                    <span class="font-bold">{{ transferTarget?.username }}</span>
                    <span class="text-xs text-gray-500">(UID: {{ transferTarget?.uid }})</span>
                    <NTag size="small" type="info">當前 CPA: ${{ transferTarget?.cpa_price }}</NTag>
                </div>
            </NFormItem>
            <NFormItem label="原屬上級路徑">
                <span class="text-gray-600">{{ transferTarget?.path }}</span>
            </NFormItem>

            <NDivider title-placement="left">新上級設定</NDivider>
            <NFormItem label="目標新上級" required>
                <div class="flex gap-2 w-full">
                    <NInput v-model:value="newParentKeyword" placeholder="請輸入新上級 UID 或帳號" class="flex-1" />
                    <NButton type="primary" secondary @click="handleVerifyNewParent" :loading="verifyLoading">
                        檢索驗證
                    </NButton>
                </div>
            </NFormItem>
            <div v-if="newParentInfo" class="ml-[120px] mb-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div class="text-sm text-blue-800 flex flex-col gap-1">
                    <div><strong>檢索成功：</strong> {{ newParentInfo.username }} (UID: {{ newParentInfo.uid }})</div>
                    <div><strong>新上級體系：</strong> {{ newParentInfo.path }}</div>
                    <div class="flex items-center gap-2">
                        <strong>新上級 CPA 單價：</strong>
                        <NTag :type="newParentInfo.cpa_price >= (transferTarget?.cpa_price || 0) ? 'success' : 'error'" size="small">
                            ${{ newParentInfo.cpa_price }}
                        </NTag>
                        <span v-if="newParentInfo.cpa_price < (transferTarget?.cpa_price || 0)" class="text-red-500 text-xs font-bold">
                            (低於當前 CPA，無法轉線)
                        </span>
                    </div>
                </div>
            </div>

            <NDivider title-placement="left">執行設定</NDivider>
            <NFormItem label="執行類型">
                <NRadioGroup v-model:value="transferForm.execution_type">
                    <NRadio value="IMMEDIATE">立即執行</NRadio>
                    <NRadio value="SCHEDULED">預約執行</NRadio>
                </NRadioGroup>
            </NFormItem>
            
            <NFormItem v-if="transferForm.execution_type === 'SCHEDULED'" label="預定執行時間" required>
                <NDatePicker 
                    v-model:formatted-value="transferForm.execute_at" 
                    type="datetime" 
                    clearable 
                    value-format="yyyy-MM-dd HH:mm:ss"
                    style="width: 100%"
                    placeholder="請選擇未來時間 (至少大於目前 10 分鐘)"
                />
            </NFormItem>

            <NFormItem label="備註原因" required>
                <NInput v-model:value="transferForm.reason" type="textarea" :rows="3" placeholder="請輸入轉線原因 (5-200字)" />
            </NFormItem>
        </NForm>
        <template #footer>
            <div class="flex justify-end gap-3">
                <NButton quaternary @click="showTransfer = false">取消</NButton>
                <NButton type="primary" rounded @click="handleSubmitTransfer" :loading="submitLoading">確認轉線</NButton>
            </div>
        </template>
    </NModal>
  </div>
</template>

<style scoped>
.premium-glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
}

:deep(.premium-table .n-data-table-td) {
  padding: 16px;
}

:deep(.premium-table .n-data-table-th) {
  background-color: rgba(248, 250, 252, 0.8);
  font-weight: 800;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.05em;
  color: #64748b;
}

:deep(.n-modal.n-card) {
    border-radius: 24px !important;
}

:deep(.n-divider .n-divider__title) {
    font-weight: 700;
    color: #0ea5e9;
}
</style>
