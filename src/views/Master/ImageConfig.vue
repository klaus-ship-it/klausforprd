<script setup lang="ts">
import { ref, onMounted, reactive, h, computed } from 'vue'
import {
  NCard, NSpace, NInput, NSelect, NButton, NTag,
  NModal, NForm, NFormItem, NGrid, NGridItem, NDatePicker, NInputNumber,
  NImage, NUpload, UploadCustomRequestOptions,
  useMessage, useDialog, NTabs, NTab, NText, NEmpty, NIcon
} from 'naive-ui'
import { 
  AddOutline, 
  CreateOutline, 
  TrashOutline, 
  ArrowUpOutline, 
  ArrowDownOutline,
  PhonePortraitOutline,
  GlobeOutline
} from '@vicons/ionicons5'
import { useI18n } from 'vue-i18n'
import {
  ImageConfig, ImageType, PopupFrequency,
  ImageConfigQueryParams, CreateImageConfigData
} from '@/types/imageConfig'
import { imageConfigApi } from '@/api/imageConfig'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

// --- Helpers ---
const formatDate = (date: string | number | Date, pattern: string = 'yyyy-MM-dd') => {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '— — —'
  
  const pad = (n: number) => n.toString().padStart(2, '0')
  const Y = d.getFullYear()
  const M = pad(d.getMonth() + 1)
  const D = pad(d.getDate())
  
  return `${Y}/${M}/${D}`
}

// --- Data ---
const loading = ref(false)
const allData = ref<ImageConfig[]>([])
const activePlatform = ref<'APP' | 'WEB'>('APP')

// --- Types Config (Visual labels & limits) ---
const typeConfigs: Record<ImageType, { label: string; desc: string; ratio: string; max: number }> = {
  [ImageType.BANNER]: { label: '首頁輪播 Banner', desc: '首頁頂部輪播廣告，最多 5 張，可點擊跳轉', ratio: '16/9', max: 5 },
  [ImageType.LOBBY_BACKGROUND]: { label: 'Lobby 底圖', desc: 'APP 大廳背景圖', ratio: '9/16', max: 1 },
  [ImageType.EVENT_THUMBNAIL]: { label: '活動專區圖', desc: '活動入口視覺圖，最多 3 張', ratio: '4/3', max: 3 },
  [ImageType.POPUP]: { label: '彈窗公告圖', desc: '進入 APP / 官網時跳出的公告彈窗', ratio: '3/4', max: 1 },
  [ImageType.SPLASH]: { label: 'Splash 啟動頁', desc: 'APP 開啟時的啟動畫面', ratio: '9/16', max: 1 },
  [ImageType.DEPOSIT_PROMO]: { label: '儲值優惠廣告圖', desc: '儲值頁面的活動廣告圖，最多 3 張', ratio: '2/1', max: 3 }
}

const groupedData = computed(() => {
  const platformData = allData.value.filter(item => item.platform === activePlatform.value)
  const groups: Record<string, ImageConfig[]> = {}
  
  Object.values(ImageType).forEach(type => {
    groups[type] = platformData.filter(item => item.type === type).sort((a, b) => a.weight - b.weight)
  })
  
  return groups
})

// --- Options ---
const platformOptions = [
  { label: '📱 APP', value: 'APP' },
  { label: '🌐 官網', value: 'WEB' }
]

const typeOptions = [
  { label: '首頁 Banner', value: ImageType.BANNER },
  { label: 'Lobby 底圖', value: ImageType.LOBBY_BACKGROUND },
  { label: '活動專區圖', value: ImageType.EVENT_THUMBNAIL },
  { label: '彈窗公告', value: ImageType.POPUP },
  { label: 'Splash 啟動頁', value: ImageType.SPLASH },
  { label: '儲值優惠圖', value: ImageType.DEPOSIT_PROMO }
]

const frequencyOptions = [
  { label: '每次登入', value: PopupFrequency.EVERY_LOGIN },
  { label: '每日一次', value: PopupFrequency.DAILY_ONCE },
  { label: '永久一次', value: PopupFrequency.ONCE_FOREVER }
]

// --- Modal State ---
const showModal = ref(false)
const modalType = ref<'add' | 'edit'>('add')
const editingId = ref<string | null>(null)

const formModel = reactive<CreateImageConfigData>({
  type: ImageType.BANNER,
  platform: 'APP',
  title: '',
  imageUrl: '',
  jumpUrl: '',
  startTime: new Date().toISOString(),
  endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  weight: 1,
  frequency: PopupFrequency.EVERY_LOGIN
})

const formTimeRange = ref<[number, number]>([
  new Date().getTime(),
  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime()
])

// --- Methods ---
const fetchData = async () => {
  loading.value = true
  try {
    const res = await imageConfigApi.getImageConfigs({ page: 1, pageSize: 100 })
    if (res.code === 0 && res.data) {
      allData.value = res.data.items
    }
  } catch (error) {
    message.error(t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

const handleAdd = (type: ImageType) => {
  modalType.value = 'add'
  editingId.value = null
  Object.assign(formModel, {
    type,
    platform: activePlatform.value,
    title: '',
    imageUrl: '',
    jumpUrl: '',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    weight: groupedData.value[type].length + 1,
    frequency: PopupFrequency.EVERY_LOGIN
  })
  formTimeRange.value = [new Date().getTime(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime()]
  showModal.value = true
}

const handleEdit = (item: ImageConfig) => {
  modalType.value = 'edit'
  editingId.value = item.id
  Object.assign(formModel, {
    type: item.type,
    platform: item.platform,
    title: item.title,
    imageUrl: item.imageUrl,
    jumpUrl: item.jumpUrl || '',
    startTime: item.startTime,
    endTime: item.endTime,
    weight: item.weight,
    frequency: item.frequency || PopupFrequency.EVERY_LOGIN
  })
  formTimeRange.value = [new Date(item.startTime).getTime(), new Date(item.endTime).getTime()]
  showModal.value = true
}

const handleDelete = (id: string) => {
  dialog.warning({
    title: t('common.warning'),
    content: '確定要刪除這張圖片嗎？',
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      try {
        const res = await imageConfigApi.deleteImageConfig(id)
        if (res.code === 0) {
          message.success(t('announcement.deleteSuccess'))
          fetchData()
        }
      } catch (error) {
        message.error(t('common.error'))
      }
    }
  })
}

const handleMove = async (item: ImageConfig, direction: 'up' | 'down') => {
  const sameGroup = groupedData.value[item.type]
  const idx = sameGroup.findIndex(i => i.id === item.id)
  if (direction === 'up' && idx > 0) {
    const prev = sameGroup[idx - 1]
    await imageConfigApi.updateImageConfig(item.id, { weight: prev.weight })
    await imageConfigApi.updateImageConfig(prev.id, { weight: item.weight })
    fetchData()
  } else if (direction === 'down' && idx < sameGroup.length - 1) {
    const next = sameGroup[idx + 1]
    await imageConfigApi.updateImageConfig(item.id, { weight: next.weight })
    await imageConfigApi.updateImageConfig(next.id, { weight: item.weight })
    fetchData()
  }
}

const handleSubmit = async () => {
  formModel.startTime = new Date(formTimeRange.value[0]).toISOString()
  formModel.endTime = new Date(formTimeRange.value[1]).toISOString()

  try {
    if (modalType.value === 'add') {
      const res = await imageConfigApi.createImageConfig(formModel)
      if (res.code === 0) {
        message.success(t('announcement.addSuccess'))
        showModal.value = false
        fetchData()
      }
    } else if (editingId.value) {
      const res = await imageConfigApi.updateImageConfig(editingId.value, formModel)
      if (res.code === 0) {
        message.success(t('announcement.updateSuccess'))
        showModal.value = false
        fetchData()
      }
    }
  } catch (error) {
    message.error(t('common.error'))
  }
}

const handleUpload = async ({ file, onFinish, onError }: UploadCustomRequestOptions) => {
  try {
    const res = await imageConfigApi.uploadImage(file.file as File)
    if (res.code === 0 && res.data) {
      formModel.imageUrl = res.data.url
      onFinish()
    } else {
      onError()
    }
  } catch (e) {
    onError()
  }
}

const getStatusTag = (item: ImageConfig) => {
  const now = new Date().getTime()
  const start = new Date(item.startTime).getTime()
  const end = new Date(item.endTime).getTime()
  
  if (now < start) return { label: '排程中', type: 'info' }
  if (now > end) return { label: '已過期', type: 'error' }
  return { label: '上線中', type: 'success' }
}

onMounted(fetchData)
</script>

<template>
  <div class="p-6 h-full flex flex-col gap-6 animate-fade-in-up">
    <!-- Platform Selection -->
    <NTabs 
      v-model:value="activePlatform" 
      type="segment" 
      class="w-full max-w-md mx-auto"
      :pane-style="{ padding: 0 }"
    >
      <NTab name="APP">
        <template #default>
          <div class="flex items-center gap-2">
            <NIcon><PhonePortraitOutline /></NIcon>
            <span>APP 平台</span>
          </div>
        </template>
      </NTab>
      <NTab name="WEB">
        <template #default>
          <div class="flex items-center gap-2">
            <NIcon><GlobeOutline /></NIcon>
            <span>官網平台</span>
          </div>
        </template>
      </NTab>
    </NTabs>

    <!-- Content Sections -->
    <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
      <div class="space-y-8 pb-10">
        <div v-for="(items, type) in groupedData" :key="type" class="group/section">
          <div class="flex items-center justify-between mb-4 px-2">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <span class="text-lg font-bold text-gray-800">{{ typeConfigs[type as ImageType].label }}</span>
                <NTag size="small" :bordered="false" round type="primary">
                  {{ typeConfigs[type as ImageType].ratio }}
                </NTag>
              </div>
              <p class="text-xs text-gray-400">{{ typeConfigs[type as ImageType].desc }}</p>
            </div>
            <NButton 
              size="small" 
              type="primary" 
              secondary 
              round
              :disabled="items.length >= typeConfigs[type as ImageType].max"
              @click="handleAdd(type as ImageType)"
            >
              <template #icon><NIcon><AddOutline /></NIcon></template>
              新增（{{ items.length }}/{{ typeConfigs[type as ImageType].max }}）
            </NButton>
          </div>

          <!-- Cards Grid -->
          <div v-if="items.length > 0" class="flex flex-wrap gap-5 px-2">
            <div 
              v-for="(item, index) in items" 
              :key="item.id"
              class="group relative w-[240px] rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              <!-- Image Preview -->
              <div class="relative overflow-hidden bg-gray-100" :style="{ aspectRatio: typeConfigs[type as ImageType].ratio }">
                <img 
                  :src="item.imageUrl" 
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt="preview"
                >
                <!-- Index Tag -->
                <div class="absolute top-3 left-3 px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-full">
                  #{{ index + 1 }}
                </div>
                <!-- Status Tag -->
                <div class="absolute top-3 right-3">
                  <NTag :type="getStatusTag(item).type as any" size="small" :bordered="false" round>
                    {{ getStatusTag(item).label }}
                  </NTag>
                </div>
                
                <!-- Hover Overlay -->
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                  <NButton circle type="primary" size="medium" @click="handleEdit(item)">
                    <template #icon><NIcon><CreateOutline /></NIcon></template>
                  </NButton>
                  <NButton circle secondary size="medium" :disabled="index === 0" @click="handleMove(item, 'up')">
                    <template #icon><NIcon><ArrowUpOutline /></NIcon></template>
                  </NButton>
                  <NButton circle secondary size="medium" :disabled="index === items.length - 1" @click="handleMove(item, 'down')">
                    <template #icon><NIcon><ArrowDownOutline /></NIcon></template>
                  </NButton>
                  <NButton circle type="error" size="medium" @click="handleDelete(item.id)">
                    <template #icon><NIcon><TrashOutline /></NIcon></template>
                  </NButton>
                </div>
              </div>

              <!-- Details Area -->
              <div class="p-3">
                <h3 class="text-sm font-bold text-gray-700 truncate mb-1">{{ item.title }}</h3>
                <div class="flex items-center justify-between">
                   <p class="text-[10px] text-gray-400 font-mono">{{ formatDate(item.startTime) }} - {{ formatDate(item.endTime) }}</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Empty State -->
          <div v-else class="h-32 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl mx-2">
            <NEmpty description="目前無圖片內容" size="small" />
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <NModal
      v-model:show="showModal"
      preset="card"
      :title="modalType === 'add' ? '新增圖片內容' : '編輯圖片內容'"
      style="width: 600px; border-radius: 20px"
      class="premium-glass"
    >
      <NForm :model="formModel" label-placement="left" label-width="100" require-mark-placement="right-hanging">
        <NGrid :cols="1" :y-gap="12">
          <NGridItem>
            <NFormItem label="平台與類型">
               <NSpace>
                 <NTag :bordered="false" type="info">{{ formModel.platform }}</NTag>
                 <NTag :bordered="false" type="success">{{ typeConfigs[formModel.type].label }}</NTag>
               </NSpace>
            </NFormItem>
          </NGridItem>
          
          <NGridItem>
            <NFormItem label="標題" path="title">
              <NInput v-model:value="formModel.title" placeholder="例如：春季慶典第一波" />
            </NFormItem>
          </NGridItem>

          <NGridItem>
            <NFormItem label="圖片素材" path="imageUrl">
               <NUpload
                 action="#"
                 :custom-request="handleUpload"
                 :show-file-list="false"
                 class="w-full"
               >
                 <div class="w-full border-2 border-dashed border-gray-200 rounded-xl overflow-hidden hover:border-blue-400 transition-colors bg-gray-50/50">
                   <div v-if="formModel.imageUrl" class="relative group aspect-video">
                      <img :src="formModel.imageUrl" class="w-full h-full object-contain" />
                      <div class="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white">點擊更換圖片</div>
                   </div>
                   <div v-else class="h-32 flex flex-col items-center justify-center gap-2 text-gray-400">
                     <NIcon size="32"><CreateOutline /></NIcon>
                     <span class="text-sm">點擊或拖入圖片進行上傳</span>
                   </div>
                 </div>
               </NUpload>
            </NFormItem>
          </NGridItem>

          <NGridItem>
            <NFormItem label="跳轉路徑" path="jumpUrl">
              <NInput v-model:value="formModel.jumpUrl" placeholder="輸入 APP 路徑或外部 URL" />
            </NFormItem>
          </NGridItem>

          <NGridItem v-if="formModel.type === ImageType.POPUP">
             <NFormItem label="彈出頻率" path="frequency">
               <NSelect v-model:value="formModel.frequency" :options="frequencyOptions" />
             </NFormItem>
          </NGridItem>

          <NGridItem>
            <NFormItem label="顯示時段">
              <NDatePicker v-model:value="formTimeRange" type="datetimerange" class="w-full" />
            </NFormItem>
          </NGridItem>
        </NGrid>

        <div class="flex justify-end gap-3 mt-8">
          <NButton round @click="showModal = false">{{ t('common.cancel') }}</NButton>
          <NButton round type="primary" style="padding: 0 32px" @click="handleSubmit">{{ t('common.confirm') }}</NButton>
        </div>
      </NForm>
    </NModal>
  </div>
</template>

<style scoped>
.premium-glass {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.animate-fade-in-up {
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
