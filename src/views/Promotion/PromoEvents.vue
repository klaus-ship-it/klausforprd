<template>
  <div class="p-6">
    <NCard class="mb-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <NIcon size="24" color="white"><GiftOutline /></NIcon>
          </div>
          <div>
            <h2 class="text-xl font-black text-slate-800">{{ t('navigation.promoEvents') }}</h2>
            <p class="text-xs text-slate-500">自定義組合註冊、儲值、流水等多模組活動，可自由排序與設定各階獎勵。</p>
          </div>
        </div>
        <NButton type="primary" @click="openDrawer">
          <template #icon><NIcon><AddOutline /></NIcon></template>
          新增活動
        </NButton>
      </div>
    </NCard>

    <NCard :content-style="{ padding: 0 }">
      <NDataTable
        :columns="columns"
        :data="events"
        :loading="loading"
        :pagination="pagination"
      />
    </NCard>

    <!-- Create/Edit Drawer -->
    <NDrawer v-model:show="showDrawer" width="700" placement="right">
      <NDrawerContent title="新增優惠活動" closable>
        <NForm ref="formRef" :model="formModel" :rules="rules" label-placement="top">
          <!-- Basic Info -->
          <NDivider title-placement="left">基本設定</NDivider>
          <NFormItem label="活動標題" path="title">
            <NInput v-model:value="formModel.title" placeholder="例如：新手七日衝刺特惠" />
          </NFormItem>
          
          <NGrid :cols="2" :x-gap="20">
            <NGi>
              <NFormItem label="活動開始時間" path="start_time">
                <NDatePicker v-model:value="dateRange.start" type="datetime" style="width: 100%" />
              </NFormItem>
            </NGi>
            <NGi>
              <NFormItem label="活動結束時間" path="end_time">
                <NDatePicker v-model:value="dateRange.end" type="datetime" style="width: 100%" />
              </NFormItem>
            </NGi>
          </NGrid>
          
          <NFormItem label="模組執行排序" path="is_sequential">
            <NSwitch v-model:value="formModel.is_sequential">
              <template #checked>強制依序完成</template>
              <template #unchecked>無順序限制</template>
            </NSwitch>
            <div class="text-xs text-gray-400 mt-1 ml-2">若開啟，玩家必須依照設定順序逐一完成條件，不可跳關。</div>
          </NFormItem>

          <!-- Modules -->
          <NDivider title-placement="left">活動模組設定</NDivider>
          
          <div class="flex gap-2 mb-4">
            <NButton dashed @click="addModule('REGISTER')">加入註冊</NButton>
            <NButton dashed @click="addModule('DEPOSIT')">加入儲值</NButton>
            <NButton dashed @click="addModule('TURNOVER')">加入流水</NButton>
          </div>

          <div v-if="formModel.modules.length === 0" class="py-10 text-center text-gray-400 border border-dashed rounded-lg bg-gray-50/50">
            尚未新增任何模組
          </div>

          <div class="flex flex-col gap-4">
            <NCard v-for="(mod, index) in formModel.modules" :key="mod.id" size="small" class="border shadow-sm relative">
              <template #header>
                <div class="flex items-center gap-2">
                  <NTag type="info" size="small">第 {{ index + 1 }} 關</NTag>
                  <span class="font-bold">{{ getModuleName(mod.type) }}任務</span>
                </div>
              </template>
              <template #header-extra>
                <div class="flex gap-2">
                  <NButton size="tiny" quaternary :disabled="index === 0" @click="moveModule(index, -1)">
                    <NIcon><ArrowUpOutline /></NIcon>
                  </NButton>
                  <NButton size="tiny" quaternary :disabled="index === formModel.modules.length - 1" @click="moveModule(index, 1)">
                    <NIcon><ArrowDownOutline /></NIcon>
                  </NButton>
                  <NButton size="tiny" type="error" quaternary @click="removeModule(index)">
                    <NIcon><TrashOutline /></NIcon>
                  </NButton>
                </div>
              </template>

              <!-- REGISTER specifics -->
              <div v-if="mod.type === 'REGISTER'" class="space-y-4">
                <NFormItem label="是否需要邀請碼" :show-feedback="false">
                  <NSwitch v-model:value="mod.require_invite_code" />
                </NFormItem>
                <NFormItem v-if="mod.require_invite_code" label="指定邀請碼 (留空為模糊匹配，填寫為精確匹配)">
                  <NInput v-model:value="mod.invite_code" placeholder="例如：VIP777" />
                </NFormItem>
              </div>

              <!-- DEPOSIT specifics -->
              <div v-if="mod.type === 'DEPOSIT'" class="space-y-4">
                <NFormItem label="目標儲值金額" :show-feedback="false" required>
                  <NInputNumber v-model:value="mod.target_amount" :min="1" />
                </NFormItem>
                <NFormItem label="可否重複領取" :show-feedback="false">
                  <NSwitch v-model:value="mod.is_repeatable" />
                </NFormItem>
              </div>

              <!-- TURNOVER specifics -->
              <div v-if="mod.type === 'TURNOVER'" class="space-y-4">
                <NFormItem label="目標流水金額" :show-feedback="false" required>
                  <NInputNumber v-model:value="mod.target_amount" :min="1" />
                </NFormItem>
                <NFormItem label="可否重複領取" :show-feedback="false">
                  <NSwitch v-model:value="mod.is_repeatable" />
                </NFormItem>
              </div>

              <NDivider dashed class="!my-3" />
              <div class="text-sm font-bold mb-2 text-amber-600">【雙軌】獎勵分發設定 (非必填)</div>
              
              <div class="mb-1 text-xs text-slate-500">完成者本人獎勵</div>
              <NGrid :cols="3" :x-gap="12" class="mb-3">
                <NGi><NInputNumber v-model:value="mod.completer_reward!.gold" placeholder="金幣" :min="0" :show-button="false">
                  <template #prefix>金</template>
                </NInputNumber></NGi>
                <NGi><NInputNumber v-model:value="mod.completer_reward!.silver" placeholder="銀幣" :min="0" :show-button="false">
                  <template #prefix>銀</template>
                </NInputNumber></NGi>
                <NGi><NInputNumber v-model:value="mod.completer_reward!.copper" placeholder="銅幣" :min="0" :show-button="false">
                  <template #prefix>銅</template>
                </NInputNumber></NGi>
              </NGrid>

              <div class="mb-1 text-xs text-slate-500">上級邀請人(老玩家)獎勵</div>
              <NGrid :cols="3" :x-gap="12">
                <NGi><NInputNumber v-model:value="mod.inviter_reward!.gold" placeholder="金幣" :min="0" :show-button="false">
                  <template #prefix>金</template>
                </NInputNumber></NGi>
                <NGi><NInputNumber v-model:value="mod.inviter_reward!.silver" placeholder="銀幣" :min="0" :show-button="false">
                  <template #prefix>銀</template>
                </NInputNumber></NGi>
                <NGi><NInputNumber v-model:value="mod.inviter_reward!.copper" placeholder="銅幣" :min="0" :show-button="false">
                  <template #prefix>銅</template>
                </NInputNumber></NGi>
              </NGrid>
            </NCard>
          </div>

          <!-- Final Reward -->
          <NDivider title-placement="left">全案通關大獎 (完成所有模組後派發)</NDivider>
          
          <div class="mb-2 text-sm font-bold text-slate-700">新玩家最終大獎</div>
          <NGrid :cols="3" :x-gap="12" class="mb-4">
            <NGi>
              <NFormItem label="儲值金幣" :show-feedback="false">
                <NInputNumber v-model:value="formModel.final_completer_reward!.gold" :min="0" />
              </NFormItem>
            </NGi>
            <NGi>
              <NFormItem label="儲值銀幣" :show-feedback="false">
                <NInputNumber v-model:value="formModel.final_completer_reward!.silver" :min="0" />
              </NFormItem>
            </NGi>
            <NGi>
              <NFormItem label="遊戲銅幣" :show-feedback="false">
                <NInputNumber v-model:value="formModel.final_completer_reward!.copper" :min="0" />
              </NFormItem>
            </NGi>
          </NGrid>

          <div class="mb-2 text-sm font-bold text-slate-700">老玩家最終大獎</div>
          <NGrid :cols="3" :x-gap="12">
            <NGi>
              <NFormItem label="儲值金幣" :show-feedback="false">
                <NInputNumber v-model:value="formModel.final_inviter_reward!.gold" :min="0" />
              </NFormItem>
            </NGi>
            <NGi>
              <NFormItem label="儲值銀幣" :show-feedback="false">
                <NInputNumber v-model:value="formModel.final_inviter_reward!.silver" :min="0" />
              </NFormItem>
            </NGi>
            <NGi>
              <NFormItem label="遊戲銅幣" :show-feedback="false">
                <NInputNumber v-model:value="formModel.final_inviter_reward!.copper" :min="0" />
              </NFormItem>
            </NGi>
          </NGrid>
        </NForm>
        <template #footer>
          <div class="flex justify-end gap-3 w-full">
            <NButton @click="showDrawer = false">取消</NButton>
            <NButton type="primary" :loading="saving" @click="handleSave">確認新增</NButton>
          </div>
        </template>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { 
  NCard, NIcon, NButton, NDataTable, NDrawer, NDrawerContent, NForm, NFormItem, 
  NInput, NDatePicker, NSwitch, NDivider, NGrid, NGi, NTag, NInputNumber, useMessage
} from 'naive-ui'
import { 
  GiftOutline, AddOutline, ArrowUpOutline, ArrowDownOutline, TrashOutline
} from '@vicons/ionicons5'
import { promoEventApi } from '@/api/promoEvent'
import { PromoEvent, PromoModule, PromoModuleType } from '@/types/promoEvent'

const { t } = useI18n()
const message = useMessage()

const loading = ref(false)
const events = ref<PromoEvent[]>([])
const pagination = reactive({ page: 1, pageSize: 10, itemCount: 0 })

const columns = [
  { title: '活動ID', key: 'id', width: 120 },
  { title: '活動標題', key: 'title' },
  { 
    title: '模組類型', 
    key: 'modules',
    render: (row: PromoEvent) => {
        return h('div', { class: 'flex flex-wrap gap-1' }, row.modules.map((m, i) => 
            h(NTag, { size: 'small', type: 'info' }, { default: () => `${i+1}.${getModuleName(m.type)}` })
        ))
    }
  },
  { 
    title: '是否排序', 
    key: 'is_sequential',
    width: 100,
    render: (row: PromoEvent) => row.is_sequential ? h(NTag, { type: 'warning', size: 'small' }, { default: () => '強制排序' }) : '無限制'
  },
  { 
    title: '起訖時間', 
    key: 'time',
    render: (row: PromoEvent) => h('div', { class: 'text-xs text-gray-500' }, [
        h('div', `起: ${new Date(row.start_time).toLocaleString()}`),
        h('div', `迄: ${new Date(row.end_time).toLocaleString()}`)
    ])
  },
  { 
    title: '狀態', 
    key: 'status', 
    width: 100,
    render: (row: PromoEvent) => h(NTag, { type: row.status === 'ACTIVE' ? 'success' : 'default' }, { default: () => row.status })
  }
]

const getModuleName = (type: PromoModuleType) => {
    switch(type) {
        case 'REGISTER': return '註冊'
        case 'DEPOSIT': return '儲值'
        case 'TURNOVER': return '流水'
        default: return '未知'
    }
}

const fetchData = async () => {
    loading.value = true
    try {
        const res = await promoEventApi.getEvents({ page: pagination.page, pageSize: pagination.pageSize })
        if (res.code === 0) {
            events.value = res.data.items
            pagination.itemCount = res.data.total
        }
    } finally {
        loading.value = false
    }
}

// Drawer state
const showDrawer = ref(false)
const saving = ref(false)
const formRef = ref<any>(null)

const dateRange = reactive({ start: Date.now(), end: Date.now() + 7*24*3600*1000 })
const formModel = reactive<Omit<PromoEvent, 'id' | 'status' | 'created_at'>>({
    title: '',
    start_time: '',
    end_time: '',
    is_sequential: false,
    modules: [],
    final_completer_reward: { gold: 0, silver: 0, copper: 0 },
    final_inviter_reward: { gold: 0, silver: 0, copper: 0 }
})

const rules = {
    title: { required: true, message: '請輸入標題', trigger: 'blur' }
}

const openDrawer = () => {
    formModel.title = ''
    formModel.is_sequential = false
    formModel.modules = []
    formModel.final_completer_reward = { gold: 0, silver: 0, copper: 0 }
    formModel.final_inviter_reward = { gold: 0, silver: 0, copper: 0 }
    dateRange.start = Date.now()
    dateRange.end = Date.now() + 7*24*3600*1000
    showDrawer.value = true
}

const addModule = (type: PromoModuleType) => {
    const mod: PromoModule = {
        id: `m_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        type,
        completer_reward: { gold: 0, silver: 0, copper: 0 },
        inviter_reward: { gold: 0, silver: 0, copper: 0 }
    }
    if (type === 'REGISTER') {
        mod.require_invite_code = false
        mod.invite_code = ''
    } else {
        mod.target_amount = 0
        mod.is_repeatable = false
    }
    formModel.modules.push(mod)
}

const removeModule = (index: number) => {
    formModel.modules.splice(index, 1)
}

const moveModule = (index: number, direction: number) => {
    if (index + direction < 0 || index + direction >= formModel.modules.length) return
    const temp = formModel.modules[index]
    formModel.modules[index] = formModel.modules[index + direction]
    formModel.modules[index + direction] = temp
}

const handleSave = () => {
    formRef.value?.validate(async (errors: any) => {
        if (errors) return
        if (formModel.modules.length === 0) {
            message.warning('請至少加入一個活動模組')
            return
        }

        let totalRewards = 0
        const calcReward = (r: any) => (r?.gold || 0) + (r?.silver || 0) + (r?.copper || 0)
        
        for (const mod of formModel.modules) {
            if (mod.type === 'DEPOSIT' || mod.type === 'TURNOVER') {
                if (!mod.target_amount || mod.target_amount <= 0) {
                    message.warning(`請確實填寫所有${getModuleName(mod.type)}任務的目標金額`)
                    return
                }
            }
            totalRewards += calcReward(mod.completer_reward)
            totalRewards += calcReward(mod.inviter_reward)
        }

        totalRewards += calcReward(formModel.final_completer_reward)
        totalRewards += calcReward(formModel.final_inviter_reward)

        if (totalRewards <= 0) {
            message.warning('無效的活動：請至少設定一項獎勵 (獎勵總和必須大於 0)')
            return
        }

        saving.value = true
        formModel.start_time = new Date(dateRange.start).toISOString()
        formModel.end_time = new Date(dateRange.end).toISOString()
        
        try {
            const res = await promoEventApi.createEvent(formModel)
            if (res.code === 0) {
                message.success('新增成功')
                showDrawer.value = false
                fetchData()
            } else {
                message.error(res.msg || '新增失敗')
            }
        } catch(e) {
            message.error('系統錯誤')
        } finally {
            saving.value = false
        }
    })
}

onMounted(() => {
    fetchData()
})
</script>
