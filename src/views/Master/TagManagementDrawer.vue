<template>
  <NDrawer v-model:show="visible" :width="600" placement="right">
    <NDrawerContent title="會員標籤管理" closable>
        <template #header>
            <div class="flex justify-between items-center w-full pr-8">
                <span class="text-lg font-bold">會員標籤管理</span>
                <NButton type="primary" size="small" @click="handleAdd">
                    <template #icon><AddIcon /></template>
                    新增標籤
                </NButton>
            </div>
        </template>

        <NDataTable
            :columns="columns"
            :data="tags"
            :loading="loading"
            :pagination="false"
            class="mb-4"
        />

    </NDrawerContent>

    <!-- Add/Edit Modal -->
    <NModal v-model:show="showModal" preset="card" :title="modalTitle" style="width: 400px">
        <NForm ref="formRef" :model="formModel" label-placement="left" label-width="60">
            <NFormItem label="名稱" path="name" required>
                <NInput 
                    v-model:value="formModel.name" 
                    placeholder="請輸入標籤名稱" 
                    :disabled="isSystemTag && isEdit" 
                />
            </NFormItem>
            <NFormItem label="備註" path="remark">
                <NInput v-model:value="formModel.remark" type="textarea" placeholder="請輸入備註" />
            </NFormItem>
        </NForm>
        <template #footer>
            <div class="flex justify-end gap-2">
                <NButton @click="showModal = false">取消</NButton>
                <NButton type="primary" :loading="submitting" @click="handleSubmit">儲存</NButton>
            </div>
        </template>
    </NModal>
  </NDrawer>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, h } from 'vue'
import { NDrawer, NDrawerContent, NDataTable, NButton, NTag, NSwitch, NSpace, NModal, NForm, NFormItem, NInput, useMessage, useDialog } from 'naive-ui'
import { AddOutline as AddIcon, CreateOutline as EditIcon, TrashOutline as DeleteIcon } from '@vicons/ionicons5'
import { tagApi } from '@/api/tag'
import type { MemberTag } from '@/types/player'

const props = defineProps<{
    show: boolean
}>()

const emit = defineEmits(['update:show', 'change'])

const message = useMessage()
const dialog = useDialog()

const visible = computed({
    get: () => props.show,
    set: (val) => emit('update:show', val)
})

const loading = ref(false)
const tags = ref<MemberTag[]>([])

// Modal State
const showModal = ref(false)
const submitting = ref(false)
const isEdit = ref(false)
const currentId = ref<number | null>(null)
const isSystemTag = ref(false)
const formModel = reactive({
    name: '',
    remark: ''
})

const modalTitle = computed(() => isEdit.value ? '編輯標籤' : '新增標籤')

const columns = [
    { 
        title: '類型', 
        key: 'type', 
        width: 100,
        render: (row: MemberTag) => {
            return h(NTag, { type: row.type === 'SYSTEM' ? 'info' : 'success', bordered: false }, 
                { default: () => row.type === 'SYSTEM' ? '系統預設' : '自定義' })
        }
    },
    { title: '名稱', key: 'name', width: 120 },
    { title: '備註', key: 'remark', ellipsis: { tooltip: true } },
    { 
        title: '啟用', 
        key: 'status', 
        width: 80,
        render: (row: MemberTag) => {
            return h(NSwitch, {
                value: row.status === 'ACTIVE',
                onUpdateValue: (val) => handleStatusChange(row, val)
            })
        }
    },
    {
        title: '操作',
        key: 'actions',
        width: 120,
        render(row: MemberTag) {
            return h(NSpace, {}, { default: () => [
                 h(NButton, { 
                     size: 'tiny', 
                     secondary: true,
                     onClick: () => handleEdit(row)
                 }, { icon: () => h(EditIcon) }),
                 h(NButton, { 
                     size: 'tiny', 
                     type: 'error',
                     secondary: true,
                     disabled: row.type === 'SYSTEM' || row.status === 'ACTIVE',
                     onClick: () => handleDelete(row)
                 }, { icon: () => h(DeleteIcon) })
            ]})
        }
    }
]

// API Actions
const fetchTags = async () => {
    loading.value = true
    try {
        const res = await tagApi.getTags()
        if (res.code === 0) {
            tags.value = res.data
        }
    } finally {
        loading.value = false
    }
}

const handleStatusChange = async (row: MemberTag, active: boolean) => {
    const newStatus = active ? 'ACTIVE' : 'INACTIVE'
    // Optimistic UI update or wait? Wait is safer for validation feedback.
    
    // Front-end block if disabling with active members?
    if (!active && row.member_count > 0) {
        message.error(`此標籤仍有 ${row.member_count} 位玩家使用，無法停用`)
        return
    }

    try {
        const res = await tagApi.updateTag(row.id, { status: newStatus })
        if (res.code === 0) {
            row.status = newStatus
            message.success('狀態已更新')
            emit('change') // Notify parent to reload dropdowns
        } else {
            message.error(res.msg)
        }
    } catch (e) {
        message.error('更新失敗')
    }
}

const handleAdd = () => {
    isEdit.value = false
    isSystemTag.value = false
    currentId.value = null
    formModel.name = ''
    formModel.remark = ''
    showModal.value = true
}

const handleEdit = (row: MemberTag) => {
    isEdit.value = true
    isSystemTag.value = row.type === 'SYSTEM'
    currentId.value = row.id
    formModel.name = row.name
    formModel.remark = row.remark
    showModal.value = true
}

const handleSubmit = async () => {
    if(!formModel.name) {
        message.warning('請輸入名稱')
        return
    }
    submitting.value = true
    try {
        let res
        if (isEdit.value && currentId.value) {
            res = await tagApi.updateTag(currentId.value, { 
                name: formModel.name, 
                remark: formModel.remark 
            })
        } else {
            res = await tagApi.createTag(formModel.name, formModel.remark)
        }

        if (res.code === 0) {
            message.success(isEdit.value ? '已儲存' : '已新增')
            showModal.value = false
            fetchTags()
            emit('change')
        } else {
            message.error(res.msg)
        }
    } catch (e) {
        message.error('操作失敗')
    } finally {
        submitting.value = false
    }
}

const handleDelete = (row: MemberTag) => {
    dialog.warning({
        title: '確認刪除',
        content: `確定要刪除標籤「${row.name}」嗎？`,
        positiveText: '刪除',
        negativeText: '取消',
        onPositiveClick: async () => {
            try {
                const res = await tagApi.deleteTag(row.id)
                if (res.code === 0) {
                    message.success('刪除成功')
                    fetchTags()
                    emit('change')
                } else {
                    message.error(res.msg)
                }
            } catch (e) {
                message.error('刪除失敗')
            }
        }
    })
}

// Watch visibility to load data
watch(visible, (val) => {
    if (val) {
        fetchTags()
    }
})
</script>
