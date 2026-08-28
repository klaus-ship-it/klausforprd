import { DepositOrder, OrderStatus, PaymentChannel } from '@/types/depositOrder';

const channels: PaymentChannel[] = ['iOS-IAP', 'Android-IAP', 'Web-CreditCard', 'Web-ATM', 'MyCard'];
const statuses: OrderStatus[] = ['SUCCESS', 'SUCCESS', 'SUCCESS', 'FAILED', 'PENDING', 'EXPIRED', 'REFUNDED'];
const products = ['100 鑽石', '500 鑽石', '1000 鑽石', '新手特惠包', '月卡', '至尊禮包'];

function getFeeRate(channel: PaymentChannel): number {
    if (channel.includes('IAP')) return 0.3;
    if (channel === 'Web-CreditCard') return 0.03;
    return 0.05;
}

export const mockDepositOrders: DepositOrder[] = Array.from({ length: 150 }).map((_, i) => {
    const channel = channels[Math.floor(Math.random() * channels.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const amount = [100, 300, 500, 1000, 3000, 5000][Math.floor(Math.random() * 6)];
    const fee = Math.floor(amount * getFeeRate(channel));

    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 10));
    date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

    return {
        id: `ORD${20240000 + i}`,
        externalId: `TXN${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        playerId: `P${10000 + Math.floor(Math.random() * 1000)}`,
        account: `user_${Math.floor(Math.random() * 1000)}`,
        channel,
        productName: products[Math.floor(Math.random() * products.length)],
        amount,
        fee,
        netAmount: amount - fee,
        status,
        createdAt: date.toISOString(),
        updatedAt: new Date(date.getTime() + 3600000).toISOString(),
        isTest: i < 5 // 前 5 筆設為測試數據
    };
});
