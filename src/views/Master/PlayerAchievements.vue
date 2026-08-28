<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue'
import { NButton, NCard, NDataTable, NForm, NFormItem, NInput, NInputNumber, NModal, NPopconfirm, NRadio, NRadioGroup, NSelect, NSwitch, NTag, NUpload, useMessage, type DataTableColumns, type UploadFileInfo } from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import { achievementApi } from '@/api/achievement'
import type { AchievementCategory, AchievementInput, PlayerAchievement } from '@/types/achievement'

const message = useMessage()
const loading = ref(false)
const items = ref<PlayerAchievement[]>([])
const showModal = ref(false)
const editingId = ref<string | null>(null)
const badgeFiles = ref<UploadFileInfo[]>([])

const emptyModel = (): AchievementInput => ({ name: '', badge_url: '', category: 'DEPOSIT', target_amount: 0, reward_currency: 'SILVER', reward_amount: 0, turnover_multiplier: 0, conversion_cap: 0, is_active: false })
const model = reactive<AchievementInput>(emptyModel())
const categoryOptions = [
  { label: '儲值（台幣 TWD）', value: 'DEPOSIT' },
  { label: '流水（金幣）', value: 'TURNOVER' },
  { label: '存款（金幣）', value: 'SAVINGS' }
]
const categoryLabels: Record<AchievementCategory, string> = { DEPOSIT: '儲值', TURNOVER: '流水', SAVINGS: '存款' }

const fetchData = async () => {
  loading.value = true
  try { const res = await achievementApi.getAchievements(); if (res.code === 0) items.value = res.data } finally { loading.value = false }
}
const openCreate = () => { Object.assign(model, emptyModel()); editingId.value = null; badgeFiles.value = []; showModal.value = true }
const onBadgeChange = ({ fileList }: { fileList: UploadFileInfo[] }) => {
  badgeFiles.value = fileList
  const file = fileList[0]?.file
  if (file) model.badge_url = URL.createObjectURL(file)
}
const save = async () => {
  if (!model.name.trim() || model.name.length > 20 || !model.badge_url || model.target_amount <= 0 || model.reward_amount <= 0 || (model.reward_currency === 'SILVER' && (!model.turnover_multiplier || !model.conversion_cap))) { message.error('請完整填寫必填欄位與銀幣進階設定'); return }
  const normalized = { ...model, target_amount: Math.floor(model.target_amount), reward_amount: Math.floor(model.reward_amount) }
  const res = editingId.value ? await achievementApi.updateAchievement(editingId.value, normalized) : await achievementApi.createAchievement(normalized)
  if (res.code === 0) { message.success('儲存成功'); showModal.value = false; fetchData() } else message.error(res.msg)
}
const remove = async (row: PlayerAchievement) => { const res = await achievementApi.deleteAchievement(row.id); if (res.code === 0) { message.success('已刪除'); fetchData() } else message.error(res.msg) }
const columns: DataTableColumns<PlayerAchievement> = [
  { title: '稱號標籤', key: 'badge_url', width: 130, render: row => row.badge_url ? h('img', { src: row.badge_url, class: 'h-7 max-w-24 object-contain' }) : h(NTag, { size: 'small' }, { default: () => '未上傳' }) },
  { title: '成就名稱', key: 'name', width: 150 },
  { title: '達成條件', key: 'target_amount', render: row => `${categoryLabels[row.category]} ${row.target_amount.toLocaleString()} ${row.category === 'DEPOSIT' ? 'TWD' : '金幣'}` },
  { title: '一次性獎勵', key: 'reward_amount', render: row => row.reward_currency === 'SILVER' ? `活動銀幣 ${row.reward_amount.toLocaleString()}（${row.turnover_multiplier} 倍／上限 ${row.conversion_cap}）` : `遊戲銅幣 ${row.reward_amount.toLocaleString()}` },
  { title: '狀態', key: 'is_active', width: 100, render: row => h(NSwitch, { value: row.is_active, 'onUpdate:value': async (value: boolean) => { const res = await achievementApi.updateAchievement(row.id, { ...row, is_active: value }); if (res.code === 0) fetchData() } }) },
  { title: '操作', key: 'actions', width: 100, render: row => h(NPopconfirm, { onPositiveClick: () => remove(row) }, { trigger: () => h(NButton, { size: 'small', type: 'error', disabled: row.is_active }, { default: () => '刪除' }), default: () => '確定刪除停用中的成就？' }) }
]
onMounted(fetchData)
</script>

<template>
  <div class="p-6">
    <NCard class="premium-glass mb-4" title="玩家成就">
      <template #header-extra><NButton type="primary" @click="openCreate"><template #icon><AddOutline /></template>新增成就</NButton></template>
      <p class="text-sm text-slate-500">設定終生成就門檻、一次性獎勵與玩家可配戴的稱號標籤。已發布成就僅可啟用／停用，需變更門檻時請停用並刪除後重新建立。</p>
    </NCard>
    <NCard class="premium-glass" :content-style="{ padding: 0 }"><NDataTable :columns="columns" :data="items" :loading="loading" :bordered="false" /></NCard>

    <NModal v-model:show="showModal" preset="card" :title="editingId ? '檢視成就設定' : '新增成就'" style="width: 680px" :mask-closable="false">
      <NForm label-placement="top">
        <NFormItem label="成就名稱" required><NInput v-model:value="model.name" :maxlength="20" show-count placeholder="20 字內，例如：百萬富豪" /></NFormItem>
        <NFormItem label="稱號標籤圖檔" required><NUpload :max="1" accept="image/png,image/svg+xml,image/webp" :default-file-list="badgeFiles" @change="onBadgeChange"><NButton>上傳 PNG／SVG／WEBP（最大 2MB）</NButton></NUpload><img v-if="model.badge_url" :src="model.badge_url" class="mt-2 h-10 max-w-40 object-contain" /></NFormItem>
        <NFormItem label="成就類別" required><NSelect v-model:value="model.category" :options="categoryOptions" /></NFormItem>
        <NFormItem :label="`達成目標數量（${model.category === 'DEPOSIT' ? 'TWD' : '金幣'}）`" required><NInputNumber v-model:value="model.target_amount" :min="1" :precision="0" style="width: 100%" /></NFormItem>
        <NFormItem label="獎勵幣別" required><NRadioGroup v-model:value="model.reward_currency"><NRadio value="SILVER">活動銀幣</NRadio><NRadio value="BRONZE">遊戲銅幣</NRadio></NRadioGroup></NFormItem>
        <NFormItem label="獎勵數量" required><NInputNumber v-model:value="model.reward_amount" :min="1" :precision="0" style="width: 100%" /></NFormItem>
        <template v-if="model.reward_currency === 'SILVER'"><NFormItem label="流水門檻倍率" required><NInputNumber v-model:value="model.turnover_multiplier" :min="1" :precision="0" style="width: 100%" /></NFormItem><NFormItem label="轉換上限" required><NInputNumber v-model:value="model.conversion_cap" :min="1" style="width: 100%" /></NFormItem></template>
        <NFormItem label="成就狀態"><NSwitch v-model:value="model.is_active" /><span class="ml-2 text-sm text-slate-500">啟用後前台顯示並開始終生累計計算</span></NFormItem>
      </NForm>
      <template #footer><div class="flex justify-end gap-2"><NButton @click="showModal = false">取消</NButton><NButton type="primary" @click="save">儲存</NButton></div></template>
    </NModal>
  </div>
</template>
