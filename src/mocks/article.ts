import { Article } from '@/types/article'

export const mockArticles: Article[] = [
    {
        id: 'ART001',
        category: 'NEW_GAMES', // Model 2
        title: '全新轉輪遊戲《星際寶藏》上線！',
        language: 'zh-TW',
        cover_url: 'https://placehold.co/600x400/2563eb/ffffff?text=Star+Treasure',
        content: '<p>探索無垠宇宙，尋找屬於你的星際寶藏！</p>',
        publish_start: '2026-05-01T00:00:00Z',
        is_published: true,
        last_modified_at: '2026-04-28T10:00:00Z',
        last_modified_by: 'admin',
        seo: { meta_title: '星際寶藏上線', meta_description: '全新轉輪遊戲' }
    },
    {
        id: 'ART002',
        category: 'DEPOSIT_GUIDE', // Model 1
        title: '信用卡儲值教學', 
        language: 'zh-TW',
        content: '<h3>步驟一：綁定信用卡</h3><p>請前往個人中心...</p>',
        publish_start: '2026-01-01T00:00:00Z',
        is_published: true,
        last_modified_at: '2026-01-01T10:00:00Z',
        last_modified_by: 'system',
        seo: {}
    },
    {
        id: 'ART003',
        category: 'ONGOING', // Model 3
        title: '夏季狂歡：天天登入送大禮',
        language: 'zh-TW',
        cover_url: 'https://placehold.co/600x400/ef4444/ffffff?text=Summer+Event',
        content: '<p>炎炎夏日，登入就送好禮！</p>',
        publish_start: '2026-06-01T00:00:00Z',
        publish_end: '2026-06-30T23:59:59Z',
        event_start_time: '2026-06-01T00:00:00Z',
        event_end_time: '2026-06-30T23:59:59Z',
        is_published: false,
        last_modified_at: '2026-05-05T15:30:00Z',
        last_modified_by: 'marketing_team',
        seo: {}
    },
    {
        id: 'ART004',
        category: 'FAQ', // Model 1
        title: '忘記密碼怎麼辦？',
        language: 'zh-TW',
        content: '<p>您可以透過註冊信箱或手機號碼進行密碼重置...</p>',
        publish_start: '2026-01-01T00:00:00Z',
        is_published: true,
        last_modified_at: '2026-02-15T09:00:00Z',
        last_modified_by: 'cs_admin',
        seo: {}
    }
]
