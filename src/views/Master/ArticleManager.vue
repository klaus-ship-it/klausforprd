<template>
  <div class="article-manager">
    <n-card :title="t('navigation.articleManagement')" class="shadow-sm rounded-lg border-none">
      <template #header-extra>
        <n-button type="info" @click="openDrawer()">{{ t('common.add') }}</n-button>
      </template>

      <n-space vertical size="large">
        <!-- Access Operation Button -->
        <div class="flex gap-2">
          <n-button 
            type="warning" 
            :disabled="pendingChanges.length === 0" 
            @click="handleBatchSave"
            :loading="loading"
          >
            {{ t('game.list.accessOperation') }}
            <span v-if="pendingChanges.length" class="ml-1">({{ pendingChanges.length }})</span>
          </n-button>
        </div>

        <!-- Search Filters -->
        <n-card embedded :bordered="false" size="small">
          <n-form inline :model="searchParams" label-placement="left">
            <n-form-item :label="t('article.category')">
              <n-cascader
                v-model:value="searchParams.categories"
                multiple
                clearable
                expand-trigger="click"
                :options="categoryTree"
                check-strategy="child"
                placeholder="篩選類別"
                style="width: 260px"
              />
            </n-form-item>
            <n-form-item :label="t('article.timeRange')">
              <n-date-picker
                v-model:value="timeRange"
                type="datetimerange"
                clearable
                @update:value="handleTimeChange"
              />
            </n-form-item>
            <n-form-item>
              <n-button type="primary" @click="handleSearch">
                {{ t('common.search') }}
              </n-button>
            </n-form-item>
          </n-form>
        </n-card>

        <!-- Article List -->
        <n-data-table
          remote
          :columns="columns"
          :data="articles"
          :loading="loading"
          :pagination="pagination"
          @update:page="handlePageChange"
        />
      </n-space>
    </n-card>

    <!-- Edit/Add Drawer -->
    <n-drawer v-model:show="showDrawer" width="850" placement="right">
      <n-drawer-content :title="editingId ? '編輯文章' : '新增文章'" closable>
        <n-form
          ref="formRef"
          :model="formModel"
          :rules="dynamicRules"
          label-placement="top"
        >
          <n-grid :cols="2" :x-gap="20">
            <n-gi>
              <n-form-item label="文章類別" path="category">
                <n-cascader 
                  v-model:value="formModel.category" 
                  :options="categoryTree" 
                  expand-trigger="click"
                  check-strategy="child"
                  filterable
                  clearable
                  placeholder="請選擇文章類別"
                />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="文章語系" path="language">
                <n-select v-model:value="formModel.language" :options="languageOptions" />
              </n-form-item>
            </n-gi>
          </n-grid>

          <n-form-item label="文章標題" path="title" v-if="currentModel >= 1">
            <n-input v-model:value="formModel.title" placeholder="建議 30 字內" count-text-style="true" maxlength="50" show-count />
            <template #label>
              文章標題 <span v-if="currentModel === 3" class="text-red-500">*</span>
            </template>
          </n-form-item>

          <template v-if="isGameIntro">
             <n-form-item label="內容簡介" path="summary">
                 <n-input type="textarea" v-model:value="formModel.summary" placeholder="請輸入遊戲內容簡介" :rows="3" />
             </n-form-item>
             <n-grid :cols="2" :x-gap="20">
                 <n-gi>
                     <n-form-item label="RTP" path="rtp">
                         <n-input-number v-model:value="formModel.rtp" placeholder="例如: 96.5" :precision="2" :step="0.1" style="width: 100%">
                             <template #suffix>%</template>
                         </n-input-number>
                     </n-form-item>
                 </n-gi>
                 <n-gi>
                     <n-form-item label="遊戲ID" path="game_id">
                         <n-input v-model:value="formModel.game_id" placeholder="對接的遊戲ID (如: pg-slot-01)" />
                     </n-form-item>
                 </n-gi>
             </n-grid>
          </template>

          <n-form-item label="封面縮圖" path="cover_url" v-if="currentModel >= 2">
            <n-upload
              action="#"
              list-type="image-card"
              :max="1"
              :default-file-list="fileList"
              @change="handleUploadChange"
            >
              點擊上傳
            </n-upload>
            <template #label>
              封面縮圖 <span class="text-red-500">*</span>
            </template>
          </n-form-item>

          <n-tabs type="line" animated>
            <n-tab-pane name="content" tab="內容編輯">
              <n-form-item label="富文本內容" path="content" :show-label="false">
                <TinymceEditor v-model="formModel.content" placeholder="請輸入文章內容" :height="500" />
              </n-form-item>
            </n-tab-pane>

            <n-tab-pane name="publish" tab="發佈與活動設定">
               <div class="font-bold mb-2">上架顯示時間</div>
               <n-grid :cols="2" :x-gap="20">
                    <n-gi>
                        <n-form-item label="發佈開始時間" path="publish_start">
                            <n-date-picker v-model:value="publishStartTimestamp" type="datetime" />
                        </n-form-item>
                    </n-gi>
                    <n-gi>
                        <n-form-item label="發佈結束時間 (永不下架則不填)" path="publish_end">
                            <n-date-picker v-model:value="publishEndTimestamp" type="datetime" clearable />
                        </n-form-item>
                    </n-gi>
               </n-grid>

               <div v-if="currentModel === 3" class="mt-4">
                 <div class="font-bold mb-2 text-blue-600">活動實際時間 (Model 3)</div>
                 <n-grid :cols="2" :x-gap="20">
                      <n-gi>
                          <n-form-item label="活動開始時間" path="event_start_time">
                              <n-date-picker v-model:value="eventStartTimestamp" type="datetime" />
                          </n-form-item>
                      </n-gi>
                      <n-gi>
                          <n-form-item label="活動結束時間" path="event_end_time">
                              <n-date-picker v-model:value="eventEndTimestamp" type="datetime" />
                          </n-form-item>
                      </n-gi>
                 </n-grid>
               </div>
            </n-tab-pane>

            <n-tab-pane name="seo" tab="SEO 優化">
               <n-form-item label="Meta Title" path="seo.meta_title">
                <n-input v-model:value="formModel.seo.meta_title" :placeholder="formModel.title || '留空則取用標題'" />
              </n-form-item>
              <n-form-item label="Meta Description" path="seo.meta_description">
                <n-input
                  v-model:value="formModel.seo.meta_description"
                  type="textarea"
                  placeholder="建議 150 字內"
                  :rows="3"
                />
              </n-form-item>
            </n-tab-pane>
          </n-tabs>
        </n-form>

        <template #footer>
          <n-space justify="end">
            <n-button @click="showDrawer = false">取消</n-button>
            <n-button type="primary" :loading="saving" @click="handleSave">提交發佈</n-button>
          </n-space>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, h, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { 
  NCard, NSpace, NForm, NFormItem, NSelect, NButton, NIcon, NDataTable, NTag,
  NDrawer, NDrawerContent, NInput, NGrid, NGi, NTabs, NTabPane, NDatePicker,
  NSwitch, NAvatar, NUpload, NCascader, NInputNumber, useMessage, useDialog 
} from 'naive-ui'
import type { UploadFileInfo, CascaderOption, FormRules } from 'naive-ui'
import { CreateOutline, TrashOutline } from '@vicons/ionicons5'
import { articleApi } from '@/api/article'
import { Article } from '@/types/article'
import TinymceEditor from '@/components/TinymceEditor.vue'
import type { DataTableColumns } from 'naive-ui'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

// === Category Tree Definition ===
const categoryTree: CascaderOption[] = [
  {
    label: '新手教學',
    value: 'GUIDE',
    children: [
      {
        label: '遊戲介紹',
        value: 'GAME_INTRO',
        children: [
          { label: '最新遊戲', value: 'NEW_GAMES', model: 2 },
          { label: '轉輪遊戲', value: 'SLOTS', model: 2 },
          { label: '魚機遊戲', value: 'FISH', model: 2 },
          { label: '柏青遊戲', value: 'PACHINKO', model: 2 },
          { label: '棋牌遊戲', value: 'CARD', model: 2 },
        ]
      },
      {
        label: 'App 特色引導',
        value: 'APP_FEATURES',
        children: [
          { label: '保留機台規則', value: 'MACHINE_RULES', model: 1 },
          { label: '社群互動', value: 'SOCIAL', model: 1 },
        ]
      },
      {
        label: '下載安裝教學',
        value: 'DOWNLOAD_INSTALL',
        children: [
          { label: '桌面捷徑', value: 'SHORTCUT', model: 1 },
          { label: 'ios安裝教學', value: 'IOS', model: 1 },
          { label: 'Android安裝教學', value: 'ANDROID', model: 1 },
        ]
      }
    ]
  },
  {
    label: '儲值專區',
    value: 'DEPOSIT',
    children: [
      { label: '儲值教學', value: 'DEPOSIT_GUIDE', model: 1 }
    ]
  },
  {
    label: '熱門活動',
    value: 'HOT_EVENTS',
    children: [
      {
        label: '活動列表',
        value: 'EVENT_LIST',
        children: [
          { label: '進行中', value: 'ONGOING', model: 3 },
          { label: '即將開始', value: 'UPCOMING', model: 3 },
          { label: '已結束', value: 'ENDED', model: 3 },
        ]
      },
      { label: '獲獎名單', value: 'WINNER_LIST', model: 3 }
    ]
  },
  {
    label: '客服中心',
    value: 'CUSTOMER_SERVICE',
    children: [
      { label: '常見問題', value: 'FAQ', model: 1 },
      { label: '聯絡客服', value: 'CONTACT', model: 1 }
    ]
  }
]

// Helper to flatten categories for lookup
const flatCategories: Record<string, { label: string, model: number, path: string[] }> = {}
const buildFlat = (nodes: CascaderOption[], currentPath: string[] = []) => {
    nodes.forEach(node => {
        const path = [...currentPath, node.label as string]
        if (!node.children) {
            flatCategories[node.value as string] = { label: node.label as string, model: node.model as number, path }
        } else {
            buildFlat(node.children, path)
        }
    })
}
buildFlat(categoryTree)

const getCategoryPath = (value: string) => flatCategories[value]?.path.join(' > ') || value
const getCategoryModel = (value: string) => flatCategories[value]?.model || 1

// === Search ===
const searchParams = reactive({
  categories: [] as string[],
  start_time: undefined as string | undefined,
  end_time: undefined as string | undefined
})
const timeRange = ref<[number, number] | null>(null)

const languageOptions = [
  { label: '繁體中文 (zh-TW)', value: 'zh-TW' },
  { label: '簡體中文 (zh-CN)', value: 'zh-CN' },
  { label: 'English (en)', value: 'en' }
]

// Date Format helper
const formatDate = (isoStr: string | undefined) => {
  if (!isoStr) return '-'
  const date = new Date(isoStr)
  return date.toLocaleString('zh-TW', { 
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', hour12: false 
  }).replace(/\//g, '-')
}

// List Data
const loading = ref(false)
const articles = ref<Article[]>([])
const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50]
})

const columns: DataTableColumns<Article> = [
  { title: '文章類別', key: 'category', render: (row) => {
    return h(NTag, { type: 'info', size: 'small' }, { default: () => getCategoryPath(row.category) })
  }},
  { title: '文章標題', key: 'title', ellipsis: { tooltip: true }, width: 200, render: (row) => row.title || '-' },
  { title: '封面', key: 'cover_url', render: (row) => {
      const model = getCategoryModel(row.category)
      if (model === 1) return '-'
      return h(NAvatar, { src: row.cover_url, size: 'small', fallbackSrc: 'https://placehold.co/40x30' })
  }},
  { title: '發佈區間', key: 'publish_start', render: (row) => h('div', { style: 'font-size: 12px' }, [
    h('div', `起: ${formatDate(row.publish_start)}`),
    h('div', `止: ${row.publish_end ? formatDate(row.publish_end) : '永久上架'}`)
  ])},
  { title: '操作人', key: 'last_modified_by' },
  { title: '上架', key: 'is_published', render: (row) => h(NSwitch, { 
    value: row.is_published, 
    onUpdateValue: (v: boolean) => recordChange(row.id, v) 
  }) },
  {
    title: '操作',
    key: 'actions',
    render: (row) => h(NSpace, {}, {
        default: () => [
            h(NButton, { size: 'tiny', onClick: () => openDrawer(row.id) }, { icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) }),
            h(NButton, { size: 'tiny', type: 'error', onClick: () => handleDelete(row.id) }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) })
        ]
    })
  }
]

const fetchData = async () => {
  loading.value = true
  try {
    const res = await articleApi.list({
      ...searchParams,
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    if (res.code === 0 && res.data) {
      articles.value = res.data.items
      pagination.itemCount = res.data.total
    }
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

const handleTimeChange = (val: [number, number] | null) => {
  if (val) {
    searchParams.start_time = new Date(val[0]).toISOString()
    searchParams.end_time = new Date(val[1]).toISOString()
  } else {
    searchParams.start_time = undefined
    searchParams.end_time = undefined
  }
}

// Drawer & Form
const showDrawer = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const formRef = ref<any>(null)

const formModel = reactive({
  title: '',
  category: '',
  language: 'zh-TW',
  cover_url: '',
  content: '',
  publish_start: '',
  publish_end: '',
  event_start_time: '',
  event_end_time: '',
  summary: '',
  rtp: null as number | null,
  game_id: '',
  is_published: false,
  seo: {
    meta_title: '',
    meta_description: ''
  }
})

const publishStartTimestamp = ref<number>(Date.now())
const publishEndTimestamp = ref<number | null>(null)
const eventStartTimestamp = ref<number | null>(null)
const eventEndTimestamp = ref<number | null>(null)

const currentModel = computed(() => getCategoryModel(formModel.category))
const isGameIntro = computed(() => ['NEW_GAMES', 'SLOTS', 'FISH', 'PACHINKO', 'CARD'].includes(formModel.category))

const dynamicRules = computed<FormRules>(() => {
    const baseRules: FormRules = {
        category: { required: true, message: '請選擇類別', trigger: 'change' },
        language: { required: true, message: '請選擇語系', trigger: 'change' },
        content: { required: true, message: '請填寫內容', trigger: 'blur' }
    }

    if (currentModel.value >= 2) {
        baseRules.cover_url = { required: true, message: '請上傳封面圖片' }
    }
    
    if (currentModel.value === 3) {
        baseRules.title = { required: true, message: '請填寫活動標題', trigger: 'blur' }
        // For date pickers, we handle validation manually before save or bind them properly.
        // We'll validate them in handleSave for simplicity since they are bound to separate refs.
    }

    return baseRules
})

const fileList = computed(() => {
  if (!formModel.cover_url) return []
  return [{
    id: 'cover',
    name: 'cover.png',
    status: 'finished',
    url: formModel.cover_url
  }] as UploadFileInfo[]
})

const handleUploadChange = (data: { fileList: UploadFileInfo[] }) => {
  if (data.fileList.length > 0) {
    const file = data.fileList[0]
    if (file.file) {
      formModel.cover_url = URL.createObjectURL(file.file)
    } else if (file.url) {
      formModel.cover_url = file.url
    }
  } else {
    formModel.cover_url = ''
  }
}

const openDrawer = async (id?: string) => {
  editingId.value = id || null
  if (id) {
    const res = await articleApi.get(id)
    if (res.code === 0 && res.data) {
       Object.assign(formModel, {
           title: res.data.title || '',
           category: res.data.category,
           language: res.data.language,
           cover_url: res.data.cover_url || '',
           content: res.data.content,
           summary: res.data.summary || '',
           rtp: res.data.rtp || null,
           game_id: res.data.game_id || '',
           is_published: res.data.is_published,
           seo: res.data.seo || { meta_title: '', meta_description: '' }
       })
       publishStartTimestamp.value = new Date(res.data.publish_start).getTime()
       publishEndTimestamp.value = res.data.publish_end ? new Date(res.data.publish_end).getTime() : null
       eventStartTimestamp.value = res.data.event_start_time ? new Date(res.data.event_start_time).getTime() : null
       eventEndTimestamp.value = res.data.event_end_time ? new Date(res.data.event_end_time).getTime() : null
    }
  } else {
    Object.assign(formModel, {
      title: '',
      category: '',
      language: 'zh-TW',
      cover_url: '',
      content: '',
      summary: '',
      rtp: null,
      game_id: '',
      is_published: false,
      seo: { meta_title: '', meta_description: '' }
    })
    publishStartTimestamp.value = Date.now()
    publishEndTimestamp.value = null
    eventStartTimestamp.value = null
    eventEndTimestamp.value = null
  }
  showDrawer.value = true
}

const handleSave = async () => {
  formRef.value?.validate(async (errors: any) => {
    if (currentModel.value === 3) {
        if (!eventStartTimestamp.value || !eventEndTimestamp.value) {
            message.error('Model 3 文章必須填寫活動開始與結束時間')
            return
        }
    }

    if (!errors) {
      saving.value = true
      try {
        formModel.publish_start = new Date(publishStartTimestamp.value).toISOString()
        formModel.publish_end = publishEndTimestamp.value ? new Date(publishEndTimestamp.value).toISOString() : ''
        
        if (currentModel.value === 3) {
            formModel.event_start_time = new Date(eventStartTimestamp.value!).toISOString()
            formModel.event_end_time = new Date(eventEndTimestamp.value!).toISOString()
        }

        const payload = { ...formModel, id: editingId.value || undefined }
        
        // Clean up unneeded fields
        if (currentModel.value === 1) {
            delete payload.cover_url
            delete payload.event_start_time
            delete payload.event_end_time
        } else if (currentModel.value === 2) {
            delete payload.event_start_time
            delete payload.event_end_time
        }

        const res = await articleApi.save(payload)
        if (res.code === 0) {
          message.success('文章已儲存並發佈')
          showDrawer.value = false
          fetchData()
        }
      } finally {
        saving.value = false
      }
    }
  })
}

const handleDelete = (id: string) => {
  dialog.warning({
    title: '確認刪除',
    content: '確定要刪除這篇文章嗎？此操作不可恢復。',
    positiveText: '確認刪除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await articleApi.delete(id)
      message.success('文章已刪除')
      fetchData()
    }
  })
}

const pendingChanges = ref<{ id: string, status: boolean }[]>([])

const recordChange = (id: string, status: boolean) => {
    const idx = articles.value.findIndex(a => a.id === id)
    if (idx !== -1) {
        articles.value[idx].is_published = status
    }

    const existing = pendingChanges.value.findIndex(c => c.id === id)
    if (existing !== -1) {
        pendingChanges.value.splice(existing, 1)
    } else {
        pendingChanges.value.push({ id, status })
    }
}

const handleBatchSave = async () => {
    loading.value = true
    try {
        for (const change of pendingChanges.value) {
            await articleApi.toggleStatus(change.id, change.status)
        }
        message.success('變更已套用')
        pendingChanges.value = []
        fetchData()
    } finally {
        loading.value = false
    }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.article-manager {
  padding: 24px;
}
.ml-2 { margin-left: 8px; }
.ml-auto { margin-left: auto; }
</style>
