import { createI18n } from 'vue-i18n'
import { zhTW, zhCN, en } from './index'

export type MessageSchema = typeof zhTW

const i18n = createI18n<{ message: MessageSchema }, 'zh-TW' | 'zh-CN' | 'en'>({
  legacy: false,
  locale: 'zh-TW',
  fallbackLocale: 'en',
  messages: {
    'zh-TW': zhTW,
    'zh-CN': zhCN,
    en
  }
})

export default i18n
