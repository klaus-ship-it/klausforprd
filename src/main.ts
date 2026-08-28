import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import i18n from './locales/i18n'
import './style.css'

const app = createApp(App)

// 全局错误处理
app.config.errorHandler = (err, instance, info) => {
  // 忽略 Teleport 相关的 DOM 错误
  if (err instanceof Error && err.message?.includes('parentNode')) {
    console.debug('Teleport cleanup error (harmless):', err.message)
    return
  }
  console.error('Global error:', err, info)
}

// 未捕获的 Promise 错误处理
app.config.warnHandler = (msg, instance, trace) => {
  // 忽略 Teleport 相关的警告
  if (msg?.includes('parentNode') || msg?.includes('Cannot read properties of null')) {
    console.debug('Teleport warning (harmless):', msg)
    return
  }
  console.warn(msg, trace)
}

app.use(router)
app.use(createPinia())
app.use(i18n)

app.mount('#app')
