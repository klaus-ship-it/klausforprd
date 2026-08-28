import { PaymentChannel, PaymentChannelQuery } from '../types/paymentChannel';
import { mockChannels } from '../mocks/paymentChannel';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const paymentChannelApi = {
    async list(query: PaymentChannelQuery): Promise<{ code: number; data: { items: PaymentChannel[]; total: number }; msg: string }> {
        await sleep(600);
        let filtered = [...mockChannels];
        if (query.name) filtered = filtered.filter(c => c.name.includes(query.name!));
        if (query.provider) filtered = filtered.filter(c => c.provider === query.provider);
        if (query.status) filtered = filtered.filter(c => c.status === query.status);

        return {
            code: 0,
            data: {
                items: filtered,
                total: filtered.length
            },
            msg: 'success'
        };
    },

    async create(_data: Partial<PaymentChannel>): Promise<{ code: number; msg: string }> {
        await sleep(800);
        return { code: 0, msg: '通道已建立' };
    },

    async update(_id: string, _data: Partial<PaymentChannel>): Promise<{ code: number; msg: string }> {
        await sleep(500);
        return { code: 0, msg: '更新成功' };
    },

    async remove(_id: string): Promise<{ code: number; msg: string }> {
        await sleep(400);
        return { code: 0, msg: '已刪除通道' };
    },

    async resetLimit(_id: string): Promise<{ code: number; msg: string }> {
        await sleep(300);
        return { code: 0, msg: '累計額度已歸零' };
    }
};
