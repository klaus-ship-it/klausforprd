import { ApiResponse, PaginatedResponse } from '@/types'
import { Article, ArticleQuery } from '@/types/article'
import { mockArticles } from '@/mocks/article'

const delay = (ms = 400) => new Promise(res => setTimeout(res, ms))

export const articleApi = {
    async list(query: ArticleQuery): Promise<ApiResponse<PaginatedResponse<Article>>> {
        await delay()
        let filtered = [...mockArticles]

        if (query.categories && query.categories.length > 0) {
            filtered = filtered.filter(a => query.categories!.includes(a.category))
        }

        if (query.start_time) {
            const start = new Date(query.start_time).getTime()
            filtered = filtered.filter(a => new Date(a.publish_start).getTime() >= start)
        }

        const page = query.page || 1
        const pageSize = query.pageSize || 10
        const startIdx = (page - 1) * pageSize
        const items = filtered.slice(startIdx, startIdx + pageSize)

        return {
            code: 0,
            msg: 'success',
            data: {
                items,
                total: filtered.length,
                page,
                pageSize
            }
        }
    },

    async get(id: string): Promise<ApiResponse<Article>> {
        await delay(100)
        const article = mockArticles.find(a => a.id === id)
        if (article) return { code: 0, msg: 'success', data: article }
        return { code: 404, msg: 'Article not found' }
    },

    async save(article: Partial<Article>): Promise<ApiResponse<Article>> {
        await delay()
        if (article.id) {
            const index = mockArticles.findIndex(a => a.id === article.id)
            if (index !== -1) {
                mockArticles[index] = {
                    ...mockArticles[index],
                    ...article,
                    last_modified_at: new Date().toISOString(),
                    last_modified_by: 'admin'
                } as Article
                return { code: 0, msg: 'success', data: mockArticles[index] }
            }
        }

        const newArticle = {
            ...article,
            id: `ART${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
            last_modified_at: new Date().toISOString(),
            last_modified_by: 'admin',
            is_published: article.is_published ?? false,
            seo: article.seo || {}
        } as Article
        mockArticles.unshift(newArticle)
        return { code: 0, msg: 'success', data: newArticle }
    },

    async delete(id: string): Promise<ApiResponse<void>> {
        await delay()
        const index = mockArticles.findIndex(a => a.id === id)
        if (index !== -1) {
            mockArticles.splice(index, 1)
        }
        return { code: 0, msg: 'success' }
    },

    async toggleStatus(id: string, status: boolean): Promise<ApiResponse<void>> {
        await delay(200)
        const index = mockArticles.findIndex(a => a.id === id)
        if (index !== -1) {
            mockArticles[index].is_published = status
        }
        return { code: 0, msg: 'success' }
    }
}
