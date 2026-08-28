<script setup lang="ts">
import { NLayout, NLayoutHeader, NLayoutContent, NLayoutSider, NMenu } from 'naive-ui'
import { RouterView, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useConfigStore } from '@/stores/useConfigStore'
import { useI18n } from 'vue-i18n'
import { computed, ref, watch, nextTick, h, onMounted, Component } from 'vue'
import { NIcon } from 'naive-ui'
import {
  HomeOutline,
  PeopleOutline,
  PersonOutline,
  GameControllerOutline,
  WalletOutline,
  GiftOutline,
  ExtensionPuzzleOutline,
  LayersOutline,
  ListOutline,
  OptionsOutline,
  PricetagsOutline,
  SettingsOutline,
  PeopleCircleOutline,
  ShieldCheckmarkOutline,
  ReaderOutline,
  ShieldOutline,
  BuildOutline,
  PulseOutline as PulseIcon,
  BarChartOutline as DataCenterIcon,
  MoonOutline,
  MailOutline as MailIcon,
  ChatbubbleEllipsesOutline as ChatIcon,
  SunnyOutline,
  PieChartOutline,
  CalendarOutline,
  TicketOutline,
  FlashOutline
} from '@vicons/ionicons5'
import { NBreadcrumb, NBreadcrumbItem, NButton, NAvatar, NDropdown, NTooltip } from 'naive-ui'

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const configStore = useConfigStore()
const { t } = useI18n()

const selectedKey = ref<string>('admin-dashboard')

const toggleTheme = () => {
  const newTheme = configStore.theme === 'light' ? 'dark' : 'light'
  configStore.setTheme(newTheme)
  if (newTheme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

onMounted(() => {
  if (configStore.theme === 'dark') {
    document.documentElement.classList.add('dark')
  }
})

// 菜單結構類型定義
interface MenuOption {
  label: string
  key: string
  icon?: any
  children?: MenuOption[]
}

// 遞迴查找選單路徑
const findMenuPath = (menus: MenuOption[], targetKey: string): { label: string; key: string }[] | null => {
  for (const menu of menus) {
    if (menu.key === targetKey) {
      return [{ label: menu.label, key: menu.key }]
    }
    if (menu.children) {
      const childPath = findMenuPath(menu.children, targetKey)
      if (childPath) {
        return [{ label: menu.label, key: menu.key }, ...childPath]
      }
    }
  }
  return null
}

// 路由對照表
const menuKeyToRoute: Record<string, string> = {
  'admin-dashboard': '/admin/dashboard',
  'personal-account': '/admin/account',
  'group-management': '/admin/groups',
  'account-management': '/admin/accounts',
  'player-list': '/admin/players',
  'game-logs': '/admin/game-logs',
  'asset-logs': '/admin/asset-logs',
  'admin-operation-log': '/admin/logs',
  'bonus-history': '/admin/bonus-history',
  'deposit-orders': '/admin/deposit-orders',
  'game-providers': '/admin/game-providers',
  'game-list': '/admin/game-list',
  'game-settings': '/admin/game-settings',
  'thirdparty-keys': '/admin/thirdparty-keys',
  'app-versions': '/admin/app-versions',
  'admin-whitelist': '/admin/admin-whitelist',
  'frontend-blacklist': '/admin/frontend-blacklist',
  'operation-config': '/admin/operation-config',
  'announcement-manager': '/admin/announcements',
  'image-config': '/admin/image-config',
  'payment-channels': '/admin/payment-channels',
  'risk-alerts': '/admin/risk/alerts',
  'system-status': '/admin/system-status',
  'message-settings': '/admin/message-settings',
  'message-management': '/admin/message-management',
  'operation-report': '/admin/operation-report',
  'game-stats': '/admin/game-stats',
  'report-management': '/admin/report-management',
  'chat-keywords': '/admin/chat/keywords',
  'chat-audit': '/admin/chat/audit',
  'chat-management': '/admin/chat-management',
  'chat-tickets': '/admin/chat/tickets',
  'player-message-templates': '/admin/chat/templates',
  'financial-overview': '/admin/financial-overview',
  'manual-adjustment': '/admin/manual-adjustment',
  'commodity-config': '/admin/commodity-config',
  'guild-management': '/admin/guilds',
  'article-manager': '/admin/articles',
  'seo-writer': '/admin/seo-writer',
  'agent-list': '/admin/agent-list',
  'agent-group': '/admin/agent-group',
  'agent-withdrawal-audit': '/admin/agent-withdrawal-audit',
  'agent-transfer-schedule': '/admin/agent-transfer-schedule',
  'vip-settings': '/admin/vip-settings',
  'player-achievements': '/admin/player-achievements',
  'vip-stats': '/admin/vip-stats',
  'agent-report': '/admin/agent-report',
  'daily-sign-in': '/admin/daily-sign-in',
  'promo-codes': '/admin/promo-codes',
  'promo-events': '/admin/promo-events',
  'promo-campaigns': '/admin/promo-campaigns',
  'trigger-campaigns': '/admin/trigger-campaigns'
}

// 根據當前路由更新選中的菜單項
watch(() => route.path, (newPath) => {
  // 優先檢查是否有完全匹配的路由
  const exactMatch = Object.entries(menuKeyToRoute).find(([_, path]) => path === newPath)
  if (exactMatch) {
    selectedKey.value = exactMatch[0]
    return
  }

  // 模糊匹配：如果當前路徑包含某個基礎路徑（處理詳情頁）
  // 例如 /admin/players/123 應該選中 /admin/players (player-list)
  const partialMatch = Object.entries(menuKeyToRoute).find(([_, path]) => {
    // 忽略 dashboard 避免誤判
    if (path === '/admin/dashboard') return false
    return newPath.startsWith(path + '/')
  })
  
  if (partialMatch) {
    selectedKey.value = partialMatch[0]
  }
}, { immediate: true })

const menuOptions = computed(() => [
  {
    label: t('navigation.homepage'),
    key: 'admin-dashboard',
    icon: renderIcon(HomeOutline)
  },
  {
    label: t('navigation.dataCenter'),
    key: 'data-center-group',
    icon: renderIcon(DataCenterIcon),
    children: [
      {
        label: t('navigation.operationReport'),
        key: 'operation-report',
        icon: renderIcon(DataCenterIcon)
      },
      {
        label: t('navigation.gameStats'),
        key: 'game-stats',
        icon: renderIcon(DataCenterIcon)
      },
      {
        label: t('navigation.reportManagement'),
        key: 'report-management',
        icon: renderIcon(ReaderOutline)
      },
      {
        label: t('navigation.vipStats'),
        key: 'vip-stats',
        icon: renderIcon(PieChartOutline)
      },
      {
        label: t('navigation.agentReport'),
        key: 'agent-report',
        icon: renderIcon(PeopleCircleOutline)
      }
    ]
  },
  {
    label: t('navigation.userManagement'),
    key: 'user-management-group',
    icon: renderIcon(PeopleOutline),
    children: [
      {
        label: t('navigation.playerList'),
        key: 'player-list',
        icon: renderIcon(PersonOutline)
      },
      {
        label: t('navigation.vipSettings'),
        key: 'vip-settings',
        icon: renderIcon(SettingsOutline)
      },
      {
        label: '玩家成就',
        key: 'player-achievements',
        icon: renderIcon(GiftOutline)
      },
      {
        label: t('navigation.bonusHistory'),
        key: 'bonus-history',
        icon: renderIcon(GiftOutline)
      }
    ]
  },
  {
    label: t('navigation.agentManagement'),
    key: 'agent-management-group',
    icon: renderIcon(PeopleCircleOutline),
    children: [
      {
        label: t('navigation.agentList'),
        key: 'agent-list',
        icon: renderIcon(ListOutline)
      },
      {
        label: '代理群組',
        key: 'agent-group',
        icon: renderIcon(LayersOutline)
      },
      {
        label: t('navigation.agentWithdrawalAudit'),
        key: 'agent-withdrawal-audit',
        icon: renderIcon(ReaderOutline)
      }
    ]
  },
  {
    label: t('navigation.financeOperations'),
    key: 'finance-operations-group',
    icon: renderIcon(WalletOutline),
    children: [
      {
        label: t('navigation.financialOverview'),
        key: 'financial-overview',
        icon: renderIcon(WalletOutline)
      },
      {
        label: t('navigation.commodityConfig'),
        key: 'commodity-config',
        icon: renderIcon(PricetagsOutline)
      },
      {
        label: t('navigation.paymentChannelManagement'),
        key: 'payment-channels',
        icon: renderIcon(LayersOutline)
      }
    ]
  },
  {
    label: t('navigation.transactionAsset'),
    key: 'transaction-asset-group',
    icon: renderIcon(ReaderOutline),
    children: [
      {
        label: t('navigation.depositOrderManagement'),
        key: 'deposit-orders',
        icon: renderIcon(WalletOutline)
      },
      {
        label: t('navigation.manualAdjustment'),
        key: 'manual-adjustment',
        icon: renderIcon(WalletOutline)
      },
      {
        label: t('navigation.assetLogs'),
        key: 'asset-logs',
        icon: renderIcon(WalletOutline)
      }
    ]
  },
  {
    label: t('navigation.seoWriter'),
    key: 'seo-writer',
    icon: renderIcon(BuildOutline)
  },
  {
    label: t('navigation.gameManagement'),
    key: 'game-management',
    icon: renderIcon(ExtensionPuzzleOutline),
    children: [
      {
        label: t('navigation.gameProviders'),
        key: 'game-providers',
        icon: renderIcon(LayersOutline)
      },
      {
        label: t('navigation.gameList'),
        key: 'game-list',
        icon: renderIcon(ListOutline)
      },
      {
        label: t('navigation.gameSettings'),
        key: 'game-settings',
        icon: renderIcon(SettingsOutline)
      },
      {
        label: t('navigation.gameLogs'),
        key: 'game-logs',
        icon: renderIcon(GameControllerOutline)
      }
    ]
  },
  {
    label: t('navigation.messageCenter'),
    key: 'message-center-group',
    icon: renderIcon(MailIcon),
    children: [
      {
        label: t('navigation.systemMessage'),
        key: 'message-management',
        icon: renderIcon(MailIcon)
      },
      {
        label: t('navigation.messageSettings'),
        key: 'message-settings',
        icon: renderIcon(SettingsOutline)
      },
      {
        label: '玩家訊息模板',
        key: 'player-message-templates',
        icon: renderIcon(ListOutline)
      }
    ]
  },
  {
    label: t('navigation.chatAndSupport'),
    key: 'chat-support-group',
    icon: renderIcon(ChatIcon),
    children: [
      {
        label: t('navigation.chatRoomManagement'),
        key: 'chat-management',
        icon: renderIcon(ChatIcon)
      },
      {
        label: t('navigation.chatTicketManagement'),
        key: 'chat-tickets',
        icon: renderIcon(ListOutline)
      },
      {
        label: t('navigation.chatKeywordSettings'),
        key: 'chat-keywords',
        icon: renderIcon(OptionsOutline)
      },
      {
        label: t('navigation.chatTriggerAudit'),
        key: 'chat-audit',
        icon: renderIcon(ReaderOutline)
      }
    ]
  },
  {
    label: t('navigation.contentConfig'),
    key: 'content-config-group',
    icon: renderIcon(BuildOutline),
    children: [
      {
        label: t('navigation.operationConfig'),
        key: 'operation-config',
        icon: renderIcon(BuildOutline)
      },
      {
        label: t('navigation.announcement'),
        key: 'announcement-manager',
        icon: renderIcon(ListOutline)
      },
      {
        label: t('navigation.imageConfig'),
        key: 'image-config',
        icon: renderIcon(LayersOutline)
      },
      {
        label: t('navigation.articleManagement'),
        key: 'article-manager',
        icon: renderIcon(ReaderOutline)
      }
    ]
  },
  {
    label: t('navigation.promotions'),
    key: 'promotions-group',
    icon: renderIcon(GiftOutline),
    children: [
      {
        label: t('navigation.dailySignIn'),
        key: 'daily-sign-in',
        icon: renderIcon(CalendarOutline)
      },
      {
        label: t('navigation.promoEvents'),
        key: 'promo-events',
        icon: renderIcon(GiftOutline)
      },
      {
        label: '優惠活動管理',
        key: 'promo-campaigns',
        icon: renderIcon(GiftOutline)
      },
      {
        label: '自動觸發活動管理',
        key: 'trigger-campaigns',
        icon: renderIcon(FlashOutline)
      },
      {
        label: t('navigation.promoCodes'),
        key: 'promo-codes',
        icon: renderIcon(TicketOutline)
      }
    ]
  },
  {
    label: t('navigation.accessManagement'),
    key: 'access-management-group',
    icon: renderIcon(ShieldCheckmarkOutline),
    children: [
      {
        label: t('navigation.accountManagement'),
        key: 'account-management',
        icon: renderIcon(PeopleCircleOutline)
      },
      {
        label: t('navigation.groupManagement'),
        key: 'group-management',
        icon: renderIcon(ShieldCheckmarkOutline)
      },
      {
        label: t('navigation.adminWhitelist'),
        key: 'admin-whitelist',
        icon: renderIcon(ShieldOutline)
      },
      {
        label: t('navigation.frontendBlacklist'),
        key: 'frontend-blacklist',
        icon: renderIcon(ShieldOutline)
      }
    ]
  },
  {
    label: t('navigation.systemAudit'),
    key: 'system-audit-group',
    icon: renderIcon(PulseIcon),
    children: [
      {
        label: t('navigation.systemStatus'),
        key: 'system-status',
        icon: renderIcon(PulseIcon)
      },
      {
        label: t('navigation.operationLog'),
        key: 'admin-operation-log',
        icon: renderIcon(ReaderOutline)
      }
    ]
  }
])



// 計算麵包屑項目
const breadcrumbItems = computed(() => {
  const pathItems: { label: string, to?: string }[] = []
  
  // 1. 查找選單路徑
  const menuPath = findMenuPath(menuOptions.value, selectedKey.value)
  
  if (menuPath) {
    menuPath.forEach(item => {
      // 檢查該選單項是否有對應的路由連接
      const routePath = menuKeyToRoute[item.key]
      pathItems.push({
        label: item.label,
        to: routePath // 如果有的話就加上連結
      })
    })
  }

  // 2. 處理詳情頁等動態子頁面
  // 如果當前路由有 breadcrumb meta 且當前路徑不等於選中菜單的路徑
  if (route.meta.breadcrumb && menuKeyToRoute[selectedKey.value] !== route.path) {
    pathItems.push({
      label: route.meta.breadcrumb as string
    })
  }

  return pathItems
})

const handleMenuSelect = (key: string) => {
  const route = menuKeyToRoute[key]
  if (route) {
    selectedKey.value = key
    nextTick(() => {
      router.push(route)
    })
  }
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <NLayout has-sider class="h-screen premium-container bg-transparent">
    <!-- 側邊欄：玻璃擬態 -->
    <NLayoutSider 
      collapse-mode="width" 
      :width="260" 
      :collapsed-width="0" 
      show-trigger="bar" 
      class="premium-glass m-4 rounded-2xl h-[calc(100vh-32px)] overflow-hidden"
    >
      <div class="p-6 flex flex-col items-center justify-center border-b border-gray-100/10 mb-2">
        <div class="w-12 h-12 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20 mb-3">
          <NIcon size="28" color="white"><LayersOutline /></NIcon>
        </div>
        <div class="text-xs font-black uppercase tracking-[0.2em] text-sky-500 text-center">Antigravity Ops</div>
      </div>
      
      <NMenu 
        :options="menuOptions"
        :value="selectedKey"
        @update:value="handleMenuSelect"
        class="px-2"
        :indent="24"
      />
    </NLayoutSider>

    <NLayout class="bg-transparent">
      <!-- 標題列：玻璃擬態 -->
      <NLayoutHeader class="premium-glass my-4 rounded-2xl px-6 py-4 flex justify-between items-center h-20">
        <div class="flex flex-col">
          <h1 class="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-none mb-1">
            {{ breadcrumbItems[breadcrumbItems.length - 1]?.label || t('navigation.dashboard') }}
          </h1>
          <!-- 麵包屑導覽移入 Header 增加空間感 -->
          <NBreadcrumb separator=">">
            <NBreadcrumbItem v-for="(item, index) in breadcrumbItems" :key="index">
              <RouterLink v-if="item.to && index !== breadcrumbItems.length - 1" :to="item.to" class="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 hover:text-sky-500 transition-colors">
                {{ item.label }}
              </RouterLink>
              <span v-else class="text-[10px] uppercase font-bold text-slate-700 dark:text-slate-200">{{ item.label }}</span>
            </NBreadcrumbItem>
          </NBreadcrumb>
        </div>

        <div class="flex items-center gap-4">
          <!-- 主題切換按鈕 -->
          <NTooltip placement="bottom" trigger="hover">
            <template #trigger>
              <NButton 
                circle 
                quaternary 
                size="large"
                @click="toggleTheme" 
                class="hover:bg-sky-50 dark:hover:bg-sky-900/20"
              >
                <template #icon>
                  <NIcon size="22">
                    <SunnyOutline v-if="configStore.theme === 'light'" />
                    <MoonOutline v-else />
                  </NIcon>
                </template>
              </NButton>
            </template>
            {{ configStore.theme === 'light' ? t('common.lightMode') : t('common.darkMode') }}
          </NTooltip>

          <div class="w-[1px] h-8 bg-gray-100/10 mx-2"></div>

          <NDropdown trigger="click" :options="[
            { label: t('navigation.personalAccount'), key: 'profile' },
            { label: t('auth.logout'), key: 'logout' }
          ]" @select="(key) => {
            if (key === 'logout') handleLogout()
            if (key === 'profile') handleMenuSelect('personal-account')
          }">
            <div class="flex items-center gap-3 cursor-pointer group">
              <div class="text-right flex flex-col items-end">
                <span class="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-sky-500 transition-colors">{{ authStore.user?.name || 'Admin' }}</span>
                <span class="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase">Super Ops</span>
              </div>
              <NAvatar 
                circle 
                size="medium" 
                color="#0ea5e9"
                class="ring-2 ring-sky-500/20 group-hover:ring-sky-500/50 transition-all font-bold text-white"
              >
                {{ (authStore.user?.name?.[0] || 'A').toUpperCase() }}
              </NAvatar>
            </div>
          </NDropdown>
        </div>
      </NLayoutHeader>

      <NLayoutContent class="p-4 h-[calc(100vh-112px)] overflow-hidden">
        <!-- 內容容器 -->
        <div id="main-scroll-container" class="h-full overflow-y-auto overflow-x-hidden pr-2 animate-fade-in-up">
          <RouterView />
        </div>
      </NLayoutContent>
    </NLayout>
  </NLayout>
</template>

<style scoped>
:deep(.n-menu .n-menu-item-content) {
  border-radius: 12px !important;
  margin: 4px 0 !important;
}

:deep(.n-menu .n-menu-item-content--selected) {
  background: linear-gradient(to right, rgba(14, 165, 233, 0.1), transparent) !important;
}

:deep(.n-menu .n-menu-item-content--selected .n-menu-item-content__icon) {
  color: #0ea5e9 !important;
}

:deep(.n-menu .n-menu-item-content--selected .n-menu-item-content-header) {
  color: #0ea5e9 !important;
  font-weight: 800 !important;
}

:deep(.n-layout-sider-scroll-container) {
  overflow-x: hidden;
}

:deep(.n-breadcrumb .n-breadcrumb-item__separator) {
  font-size: 10px;
  color: #94a3b8;
}

.dark :deep(.n-breadcrumb .n-breadcrumb-item__separator) {
  color: #64748b;
}
</style>
