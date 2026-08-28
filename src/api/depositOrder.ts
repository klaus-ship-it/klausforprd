import { ApiResponse } from '@/types';
import { DepositOrder, DepositStats, TrendPoint, OrderLogEntry, OrderStatus } from '@/types/depositOrder';
import { mockDepositOrders } from '@/mocks/depositOrder';

const delay = (ms = 300) => new Promise(res => setTimeout(res, ms));

export const depositOrderApi = {
    async list(params: any): Promise<ApiResponse<{ items: DepositOrder[], total: number }>> {
        await delay();
        let filtered = [...mockDepositOrders];

        // 模擬過濾邏輯
        if (params.playerId) filtered = filtered.filter(o => o.playerId.includes(params.playerId) || o.account.includes(params.playerId));
        if (params.status && params.status.length) filtered = filtered.filter(o => params.status.includes(o.status));
        if (params.channel && params.channel.length) filtered = filtered.filter(o => params.channel.includes(o.channel));
        if (params.id) filtered = filtered.filter(o => o.id === params.id || o.externalId === params.id);
        if (!params.includeTest) filtered = filtered.filter(o => !o.isTest);

        return {
            code: 0,
            msg: 'success',
            data: {
                items: filtered.slice(0, 10), // 簡單分頁
                total: filtered.length
            }
        };
    },

    async stats(params: any): Promise<ApiResponse<DepositStats>> {
        await delay();
        const filtered = mockDepositOrders.filter(o => !o.isTest);
        const successOrders = filtered.filter(o => o.status === 'SUCCESS' || o.status === 'MANUAL');

        const totalAmount = successOrders.reduce((sum, o) => sum + o.amount, 0);
        const totalFee = successOrders.reduce((sum, o) => sum + o.fee, 0);

        // 模擬渠道佔比
        const channelMap: Record<string, number> = {};
        successOrders.forEach(o => {
            channelMap[o.channel] = (channelMap[o.channel] || 0) + o.amount;
        });

        return {
            code: 0,
            msg: 'success',
            data: {
                totalAmount,
                totalFee,
                totalCount: successOrders.length,
                channelDonut: Object.entries(channelMap).map(([name, value]) => ({ name, value })),
                costDonut: Object.entries(channelMap).map(([name, value]) => ({ name, value: Math.floor(value * 0.1) })),
                statusDonut: [
                    { name: '成功', value: successOrders.length },
                    { name: '失敗', value: filtered.filter(o => o.status === 'FAILED').length },
                    { name: '待處理', value: filtered.filter(o => o.status === 'PENDING').length }
                ]
            }
        };
    },

    async trend(params: any): Promise<ApiResponse<TrendPoint[]>> {
        await delay();
        // 模擬 7 天趨勢
        const trend: TrendPoint[] = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dateStr = d.toISOString().split('T')[0];
            return {
                time: dateStr,
                successAmount: 50000 + Math.random() * 50000,
                totalCount: 100 + Math.floor(Math.random() * 50),
                failedCount: Math.floor(Math.random() * 10)
            };
        });
        return { code: 0, msg: 'success', data: trend };
    },

    async sync(id: string): Promise<ApiResponse<void>> {
        await delay(1000);
        return { code: 0, msg: '查單完成，狀態已同步' };
    },

    async manualComplete(id: string, data: any): Promise<ApiResponse<void>> {
        await delay(500);
        return { code: 0, msg: '人工補單成功' };
    },

    async logs(id: string): Promise<ApiResponse<OrderLogEntry[]>> {
        await delay();
        const now = new Date().toISOString();
        return {
            code: 0,
            msg: 'success',
            data: [
                { time: now, action: '建立訂單', statusBefore: null, statusAfter: 'PENDING', operator: 'SYSTEM', ip: '127.0.0.1' },
                { time: now, action: '三方通知', statusBefore: 'PENDING', statusAfter: 'SUCCESS', operator: 'PAYMENT_GATEWAY', ip: '192.168.1.1', rawDetail: '{"status":"ok","txn_id":"ABC123"}' }
            ]
        };
    }
};
