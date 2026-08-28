<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  height?: number
}>()

const emit = defineEmits(['update:modelValue'])

const editorId = `tinymce-${Math.random().toString(36).substring(2, 9)}`
const editorInstance = ref<any>(null)

const loadScript = (src: string) => {
  return new Promise((resolve, reject) => {
    if ((window as any).tinyMCE) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.referrerPolicy = 'origin'
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

const initEditor = async () => {
  await loadScript('https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js')
  
  if ((window as any).tinymce) {
    (window as any).tinymce.init({
      selector: `#${editorId}`,
      height: props.height || 400,
      menubar: false,
      plugins: [
        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
        'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
      ],
      toolbar: 'undo redo | blocks | ' +
        'bold italic forecolor | alignleft aligncenter ' +
        'alignright alignjustify | bullist numlist outdent indent | ' +
        'removeformat | help',
      content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
      placeholder: props.placeholder,
      setup: (editor: any) => {
        editorInstance.value = editor
        editor.on('init', () => {
          editor.setContent(props.modelValue)
        })
        editor.on('change input undo redo', () => {
          const content = editor.getContent()
          emit('update:modelValue', content)
        })
      }
    })
  }
}

watch(() => props.modelValue, (newVal) => {
  if (editorInstance.value && newVal !== editorInstance.value.getContent()) {
    editorInstance.value.setContent(newVal)
  }
})

onMounted(() => {
  initEditor()
})

onBeforeUnmount(() => {
  if ((window as any).tinymce) {
    (window as any).tinymce.remove(`#${editorId}`)
  }
})
</script>

<template>
  <div class="tinymce-editor">
    <textarea :id="editorId"></textarea>
  </div>
</template>

<style scoped>
.tinymce-editor {
  width: 100%;
}
</style>
