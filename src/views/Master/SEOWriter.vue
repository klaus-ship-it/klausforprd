<template>
  <div class="seo-writer p-6">
    <!-- List View -->
    <div v-if="currentView === 'list'" class="animate-fade-in">
      <n-card :title="t('navigation.seoWriter')" class="shadow-sm rounded-2xl border-none">
        <template #header-extra>
          <n-button type="primary" size="large" class="rounded-xl" @click="handleAddNew">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            新增 SEO 文章
          </n-button>
        </template>

        <n-space vertical size="large">
          <!-- Search Filters -->
          <n-card embedded :bordered="false" size="small" class="rounded-xl">
            <n-form inline :model="searchParams" label-placement="left">
              <n-form-item label="核心關鍵字">
                <n-input v-model:value="searchParams.keyword" placeholder="搜尋關鍵字..." clearable />
              </n-form-item>
              <n-form-item label="文章類別">
                <n-select
                  v-model:value="searchParams.categories"
                  multiple
                  clearable
                  :options="dynamicCategoryOptions"
                  placeholder="篩選類別"
                  style="width: 260px"
                />
              </n-form-item>
              <n-form-item>
                <n-button type="primary" @click="handleSearch">
                  {{ t('common.search') }}
                </n-button>
              </n-form-item>
            </n-form>
          </n-card>

          <!-- Article Table -->
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
    </div>

    <!-- Editor View -->
    <div v-else class="animate-fade-in">
      <div class="flex justify-between items-center mb-6">
        <n-button quaternary @click="currentView = 'list'" class="rounded-xl">
          <template #icon><n-icon><ArrowBackOutline /></n-icon></template>
          返回列表
        </n-button>
        <div class="flex items-center gap-4">
          <n-tag v-if="editingId" type="info" round>正在編輯: {{ editingId }}</n-tag>
          <n-tag v-else type="success" round>新文章草稿</n-tag>
        </div>
      </div>

      <n-grid :cols="24" :x-gap="24">
        <!-- Left Column: Content Editor -->
        <n-gi :span="16">
          <n-space vertical size="large">
            <n-card class="shadow-sm rounded-2xl border-none">
              <template #header>
                <n-space align="center">
                  <n-icon size="24" color="#0ea5e9"><CreateOutline /></n-icon>
                  <span class="font-bold text-lg">內容編輯</span>
                </n-space>
              </template>
              
              <n-form :model="formModel" label-placement="top">
                <n-form-item label="文章標題" path="title" required>
                  <n-input 
                    v-model:value="formModel.title" 
                    placeholder="請輸入文章標題..." 
                    size="large"
                    class="rounded-xl"
                  />
                </n-form-item>
                
                <n-grid :cols="2" :x-gap="20">
                  <n-gi>
                    <n-form-item path="category" required>
                      <template #label>
                        <n-space align="center" justify="space-between" class="w-full">
                          <span>文章類別</span>
                          <n-checkbox v-model:checked="isNewCategory">新增</n-checkbox>
                        </n-space>
                      </template>
                      
                      <!-- New Category Input -->
                      <n-input 
                        v-if="isNewCategory"
                        v-model:value="formModel.newCategoryName"
                        placeholder="請輸入新類別名稱..."
                        class="rounded-lg"
                      />
                      
                      <!-- Existing Category Multi-Select -->
                      <n-select
                        v-else
                        v-model:value="formModel.categoryTags"
                        multiple
                        clearable
                        filterable
                        tag
                        :options="dynamicCategoryOptions"
                        placeholder="選擇過往類別 (可複選)"
                        class="rounded-lg"
                      />
                    </n-form-item>
                  </n-gi>
                  <n-gi>
                    <n-form-item label="文章語系" path="language" required>
                      <n-select v-model:value="formModel.language" :options="languageOptions" />
                    </n-form-item>
                  </n-gi>
                </n-grid>

                <n-form-item label="文章內容" path="content">
                  <TinymceEditor v-model="formModel.content" :height="600" />
                </n-form-item>
              </n-form>
            </n-card>
          </n-space>
        </n-gi>

        <!-- Right Column: SEO Tools -->
        <n-gi :span="8">
          <n-space vertical size="large">
            <!-- Google Preview Card -->
            <n-card class="shadow-sm rounded-2xl border-none bg-slate-50 dark:bg-slate-900/50">
              <template #header>
                <n-space align="center">
                  <n-icon size="20" color="#4285f4"><SearchOutline /></n-icon>
                  <span class="font-bold text-base">{{ t('seoWriter.searchPreview') }}</span>
                </n-space>
              </template>
              
              <div class="google-preview p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div class="text-[12px] text-[#202124] dark:text-slate-400 flex items-center gap-1 mb-1">
                  <span>https://yourdomain.com › articles › </span>
                  <span class="text-slate-500">{{ formModel.seo.slug || 'article-slug' }}</span>
                </div>
                <div class="text-[20px] text-[#1a0dab] dark:text-blue-400 hover:underline cursor-pointer mb-1 leading-tight">
                  {{ formModel.seo.meta_title || formModel.title || '請輸入文章標題' }}
                </div>
                <div class="text-[14px] text-[#4d5156] dark:text-slate-300 line-clamp-2 leading-normal">
                  <span class="text-slate-500">{{ today }} — </span>
                  {{ formModel.seo.meta_description || '請輸入 Meta Description，這段文字將會顯示在 Google 搜尋結果中，良好的描述能提高點擊率。' }}
                </div>
              </div>
            </n-card>

            <!-- SEO Optimization Card -->
            <n-card class="shadow-sm rounded-2xl border-none">
              <template #header>
                <n-space align="center">
                  <n-icon size="20" color="#10b981"><BarChartOutline /></n-icon>
                  <span class="font-bold text-base">SEO 優化設定</span>
                </n-space>
              </template>

              <n-space vertical size="medium">
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-bold text-slate-600 dark:text-slate-400">{{ t('seoWriter.focusKeyword') }}</span>
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <n-icon><HelpCircleOutline /></n-icon>
                      </template>
                      {{ t('seoWriter.focusKeywordTip') }}
                    </n-tooltip>
                  </div>
                  <n-input v-model:value="formModel.seo.focus_keyword" placeholder="例如：新手教學" />
                </div>

                <n-divider class="my-2" />

                <div>
                  <div class="flex justify-between items-center mb-1">
                    <span class="text-sm font-bold text-slate-600 dark:text-slate-400">{{ t('seoWriter.metaTitle') }}</span>
                    <span :class="titleHealthClass" class="text-xs font-bold">{{ titleLength }} / 60</span>
                  </div>
                  <n-input v-model:value="formModel.seo.meta_title" placeholder="留空則使用文章標題" />
                  <n-progress type="line" :percentage="titlePercentage" :status="titleHealthStatus" :show-indicator="false" class="mt-1" />
                </div>

                <div>
                  <div class="flex justify-between items-center mb-1">
                    <span class="text-sm font-bold text-slate-600 dark:text-slate-400">{{ t('seoWriter.metaDesc') }}</span>
                    <span :class="descHealthClass" class="text-xs font-bold">{{ descLength }} / 160</span>
                  </div>
                  <n-input 
                    type="textarea" 
                    v-model:value="formModel.seo.meta_description" 
                    placeholder="簡潔扼要的文章摘要..."
                    :rows="3"
                  />
                  <n-progress type="line" :percentage="descPercentage" :status="descHealthStatus" :show-indicator="false" class="mt-1" />
                </div>

                <div>
                  <span class="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2 block">{{ t('seoWriter.slug') }}</span>
                  <n-input v-model:value="formModel.seo.slug" placeholder="article-slug-example" />
                </div>
              </n-space>
            </n-card>

            <!-- SEO Checklist Card -->
            <n-card class="shadow-sm rounded-2xl border-none">
              <template #header>
                <div class="flex justify-between items-center w-full">
                  <n-space align="center">
                    <n-icon size="20" color="#f59e0b"><CheckmarkCircleOutline /></n-icon>
                    <span class="font-bold text-base">{{ t('seoWriter.checklist') }}</span>
                  </n-space>
                  <n-tag :type="seoScoreType" size="small" round class="font-bold">{{ seoScore }}%</n-tag>
                </div>
              </template>

              <n-space vertical size="small">
                <div v-for="(item, index) in checklistItems" :key="index" class="flex items-center gap-3 py-1">
                  <n-icon :color="item.active ? '#10b981' : '#cbd5e1'" size="18">
                    <CheckmarkCircle v-if="item.active" />
                    <EllipseOutline v-else />
                  </n-icon>
                  <span :class="item.active ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'" class="text-sm">
                    {{ item.label }}
                  </span>
                </div>
              </n-space>

              <template #footer>
                <n-button type="primary" block size="large" class="rounded-xl" :loading="saving" @click="handleSave">
                  {{ editingId ? '儲存更新' : t('seoWriter.publishArticle') }}
                </n-button>
                <n-button quaternary block class="mt-2" @click="handleSaveDraft">
                  {{ t('seoWriter.saveDraft') }}
                </n-button>
              </template>
            </n-card>
          </n-space>
        </n-gi>
      </n-grid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { 
  NCard, NSpace, NForm, NFormItem, NSelect, NButton, NIcon, NInput, 
  NGrid, NGi, NDivider, NProgress, NTooltip, NTag, NDataTable, NCheckbox,
  useMessage, useDialog
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { 
  CreateOutline, SearchOutline, BarChartOutline, CheckmarkCircleOutline, 
  HelpCircleOutline, CheckmarkCircle, EllipseOutline, AddOutline, 
  TrashOutline, ArrowBackOutline
} from '@vicons/ionicons5'
import { articleApi } from '@/api/article'
import { Article } from '@/types/article'
import TinymceEditor from '@/components/TinymceEditor.vue'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const currentView = ref<'list' | 'editor'>('list')
const editingId = ref<string | null>(null)
const isNewCategory = ref(false)
const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })

const DRAFT_KEY = 'seo_writer_local_draft'

// === List Logic ===
const loading = ref(false)
const articles = ref<Article[]>([])
const allKnownArticles = ref<Article[]>([]) // For category discovery
const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50]
})

const searchParams = reactive({
  keyword: '',
  categories: [] as string[]
})

// Dynamic Categories from existing articles
const dynamicCategoryOptions = computed(() => {
  const categories = new Set<string>()
  // Include some defaults
  categories.add('新手教學')
  categories.add('熱門活動')
  categories.add('遊戲介紹')
  
  // Extract from all known articles
  allKnownArticles.value.forEach(article => {
    if (article.category) {
      article.category.split(',').forEach(c => categories.add(c.trim()))
    }
  })
  
  return Array.from(categories).map(c => ({ label: c, value: c }))
})

const columns: DataTableColumns<Article> = [
  { title: '文章標題', key: 'title', ellipsis: { tooltip: true }, width: 250 },
  { title: '類別', key: 'category', render: (row) => h(NSpace, { size: 'small' }, {
      default: () => (row.category || '').split(',').map(c => h(NTag, { size: 'small', quaternary: true }, { default: () => c }))
  })},
  { title: '關鍵字', key: 'seo.focus_keyword', render: (row) => row.seo?.focus_keyword || h('span', { class: 'text-slate-300' }, '未設定') },
  { title: 'SEO 評分', key: 'score', render: (row) => {
      const score = calculateScore(row)
      const type = score >= 80 ? 'success' : score >= 50 ? 'warning' : 'error'
      return h(NTag, { type, size: 'small', round: true }, { default: () => `${score}%` })
  }},
  { title: '語言', key: 'language' },
  { title: '最後修改', key: 'last_modified_at', render: (row) => new Date(row.last_modified_at).toLocaleDateString() },
  {
    title: '操作',
    key: 'actions',
    render: (row) => h(NSpace, {}, {
      default: () => [
        h(NButton, { size: 'tiny', onClick: () => handleEdit(row.id) }, { icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) }),
        h(NButton, { size: 'tiny', type: 'error', onClick: () => handleDelete(row.id) }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) })
      ]
    })
  }
]

const calculateScore = (article: Article) => {
  const kw = (article.seo?.focus_keyword || '').toLowerCase()
  if (!kw) return 0
  const title = (article.title || '').toLowerCase()
  const content = (article.content || '').toLowerCase()
  const metaTitle = (article.seo?.meta_title || '').toLowerCase()
  const metaDesc = (article.seo?.meta_description || '').toLowerCase()
  
  let score = 0
  if (title.includes(kw)) score += 20
  if (metaTitle.includes(kw) || (metaTitle === '' && title.includes(kw))) score += 20
  if (metaDesc.includes(kw)) score += 20
  if (content.replace(/<[^>]*>/g, '').length > 300) score += 20
  if ((article.seo?.slug || '').length > 0) score += 20
  return score
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await articleApi.list({
      categories: searchParams.categories,
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    if (res.code === 0 && res.data) {
      articles.value = res.data.items
      pagination.itemCount = res.data.total
      
      // Also fetch a larger set for category discovery if needed, 
      // but for mock we can just use the current items + a separate call
      if (allKnownArticles.value.length === 0) {
        const allRes = await articleApi.list({ pageSize: 100 })
        if (allRes.data) allKnownArticles.value = allRes.data.items
      }
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

const handleAddNew = () => {
  editingId.value = null
  resetForm()
  isNewCategory.value = false
  currentView.value = 'editor'
  checkLocalDraft()
}

const handleEdit = async (id: string) => {
  const res = await articleApi.get(id)
  if (res.code === 0 && res.data) {
    editingId.value = id
    isNewCategory.value = false
    Object.assign(formModel, {
      title: res.data.title || '',
      categoryTags: (res.data.category || '').split(',').map(c => c.trim()).filter(c => c),
      newCategoryName: '',
      language: res.data.language,
      content: res.data.content,
      seo: {
        meta_title: res.data.seo?.meta_title || '',
        meta_description: res.data.seo?.meta_description || '',
        focus_keyword: res.data.seo?.focus_keyword || '',
        slug: res.data.seo?.slug || ''
      }
    })
    currentView.value = 'editor'
  }
}

const handleDelete = (id: string) => {
  dialog.warning({
    title: '確認刪除',
    content: '確定要刪除這篇 SEO 文章嗎？',
    positiveText: '確認',
    negativeText: '取消',
    onPositiveClick: async () => {
      await articleApi.delete(id)
      message.success('文章已刪除')
      fetchData()
    }
  })
}

// === Editor Logic ===
const formModel = reactive({
  title: '',
  categoryTags: [] as string[],
  newCategoryName: '',
  language: 'zh-TW',
  content: '',
  seo: {
    meta_title: '',
    meta_description: '',
    focus_keyword: '',
    slug: ''
  }
})

const resetForm = () => {
  Object.assign(formModel, {
    title: '',
    categoryTags: [],
    newCategoryName: '',
    language: 'zh-TW',
    content: '',
    seo: { meta_title: '', meta_description: '', focus_keyword: '', slug: '' }
  })
}

const saving = ref(false)

const languageOptions = [
  { label: '繁體中文 (zh-TW)', value: 'zh-TW' },
  { label: '簡體中文 (zh-CN)', value: 'zh-CN' },
  { label: 'English (en)', value: 'en' }
]

// SEO Health Calculations
const titleLength = computed(() => (formModel.seo.meta_title || formModel.title).length)
const titlePercentage = computed(() => Math.min((titleLength.value / 60) * 100, 100))
const titleHealthStatus = computed(() => {
  if (titleLength.value === 0) return 'default'
  if (titleLength.value > 60) return 'error'
  if (titleLength.value >= 40) return 'success'
  return 'warning'
})
const titleHealthClass = computed(() => {
  if (titleHealthStatus.value === 'success') return 'text-emerald-500'
  if (titleHealthStatus.value === 'error') return 'text-red-500'
  if (titleHealthStatus.value === 'warning') return 'text-amber-500'
  return 'text-slate-400'
})

const descLength = computed(() => formModel.seo.meta_description.length)
const descPercentage = computed(() => Math.min((descLength.value / 160) * 100, 100))
const descHealthStatus = computed(() => {
  if (descLength.value === 0) return 'default'
  if (descLength.value > 160) return 'error'
  if (descLength.value >= 120) return 'success'
  return 'warning'
})
const descHealthClass = computed(() => {
  if (descHealthStatus.value === 'success') return 'text-emerald-500'
  if (descHealthStatus.value === 'error') return 'text-red-500'
  if (descHealthStatus.value === 'warning') return 'text-amber-500'
  return 'text-slate-400'
})

const checklistItems = computed(() => {
  const kw = formModel.seo.focus_keyword.toLowerCase()
  const content = formModel.content.toLowerCase()
  const title = formModel.title.toLowerCase()
  const metaTitle = formModel.seo.meta_title.toLowerCase()
  const metaDesc = formModel.seo.meta_description.toLowerCase()

  return [
    { label: '設定核心關鍵字', active: kw.length > 0 },
    { label: '關鍵字出現在文章標題中', active: kw.length > 0 && title.includes(kw) },
    { label: 'SEO 標題包含關鍵字', active: kw.length > 0 && (metaTitle.includes(kw) || (metaTitle === '' && title.includes(kw))) },
    { label: 'Meta 描述包含關鍵字', active: kw.length > 0 && metaDesc.includes(kw) },
    { label: '內容長度大於 300 字', active: content.replace(/<[^>]*>/g, '').length > 300 },
    { label: 'SEO 標題長度適中', active: titleLength.value >= 40 && titleLength.value <= 60 },
    { label: 'Meta 描述長度適中', active: descLength.value >= 120 && descLength.value <= 160 },
    { label: '已設定網頁 Slug', active: formModel.seo.slug.length > 0 }
  ]
})

const seoScore = computed(() => {
  const activeCount = checklistItems.value.filter(i => i.active).length
  return Math.round((activeCount / checklistItems.value.length) * 100)
})

const seoScoreType = computed(() => {
  if (seoScore.value >= 80) return 'success'
  if (seoScore.value >= 50) return 'warning'
  return 'error'
})

const handleSave = async () => {
  // Validate category
  const finalCategory = isNewCategory.value ? formModel.newCategoryName : formModel.categoryTags.join(', ')
  
  if (!formModel.title || !finalCategory) {
    message.error('請填寫標題與文章類別')
    return
  }
  
  saving.value = true
  try {
    const res = await articleApi.save({
      ...formModel,
      category: finalCategory,
      id: editingId.value || undefined,
      publish_start: new Date().toISOString(),
      is_published: true
    })
    if (res.code === 0) {
      message.success(editingId.value ? '文章已更新' : '文章已發佈並優化 SEO')
      localStorage.removeItem(DRAFT_KEY) // Clear draft on success
      currentView.value = 'list'
      allKnownArticles.value = [] // Reset to re-fetch dynamic categories
      fetchData()
    }
  } finally {
    saving.value = false
  }
}

const handleSaveDraft = () => {
  const draftData = {
    formModel,
    isNewCategory: isNewCategory.value,
    timestamp: new Date().getTime()
  }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData))
  message.success('草稿已儲存到瀏覽器本地')
}

const checkLocalDraft = () => {
  const saved = localStorage.getItem(DRAFT_KEY)
  if (saved) {
    const draft = JSON.parse(saved)
    dialog.info({
      title: '發現未發佈的草稿',
      content: `系統發現您在 ${new Date(draft.timestamp).toLocaleString()} 有一份未完成的草稿，是否恢復？`,
      positiveText: '恢復草稿',
      negativeText: '放棄並刪除',
      onPositiveClick: () => {
        Object.assign(formModel, draft.formModel)
        isNewCategory.value = draft.isNewCategory
        message.success('已恢復草稿內容')
      },
      onNegativeClick: () => {
        localStorage.removeItem(DRAFT_KEY)
      }
    })
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.seo-writer {
  min-height: calc(100vh - 120px);
}
.google-preview {
  font-family: arial, sans-serif;
}
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
