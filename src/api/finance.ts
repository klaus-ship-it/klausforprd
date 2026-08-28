import { ApiResponse } from '@/types'

export interface FinanceStats {
    totalDeposit: number
    totalWithdraw: number
    netRevenue: number
    manualAddCash: number
    manualDeductCash: number
    manualAddBonus: number
    manualDeductBonus: number
    ggr: number
    depositCount: number
    activeUserCount: number
    channelStats: { name: string, value: number }[]
    withdrawChannelStats: { name: string, value: number }[]
    // New Fields for Refinement
    totalDistribution: number
    totalRecovery: number
    totalConversion: number
    totalInProgress: number
    depositUserCount: number // Distinct users who deposited
}

export interface FinanceSearchParams {
    startDate: string
    endDate: string
    excludeTest: boolean
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const financeApi = {
    async getStats(params: FinanceSearchParams): Promise<ApiResponse<FinanceStats>> {
        await delay(600)

        // Mock Data Generation based on date range
        let multiplier = params.excludeTest ? 1 : 1.2

        const start = new Date(params.startDate)
        const end = new Date(params.endDate)
        const diffTime = Math.abs(end.getTime() - start.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays > 2) {
            // Week or longer range -> Significantly higher volume
            multiplier *= 6.5
        } else {
            // Check if it's "Yesterday" (start date is not today)
            const today = new Date()
            const isToday = start.getDate() === today.getDate() && start.getMonth() === today.getMonth()

            if (!isToday) {
                multiplier *= 0.85 // Yesterday slightly lower
            }
        }

        // Base values
        const recovery = Math.floor(150000 * multiplier)
        const conversion = Math.floor(350000 * multiplier)
        const inProgress = Math.floor(200000 * multiplier)
        const manualAddBonus = Math.floor(12000 * multiplier)
        const distribution = recovery + conversion + inProgress

        return {
            code: 0,
            msg: 'success',
            data: {
                totalDeposit: Math.floor(1250000 * multiplier),
                totalWithdraw: Math.floor(450000 * multiplier),
                netRevenue: Math.floor((1250000 - 450000) * multiplier),
                manualAddCash: Math.floor(5000 * multiplier),
                manualDeductCash: 0,
                manualAddBonus: manualAddBonus,
                manualDeductBonus: 500,
                ggr: Math.floor(850000 * multiplier),
                depositCount: Math.floor(320 * multiplier),
                depositUserCount: Math.floor(280 * multiplier), // Less than transactions
                activeUserCount: Math.floor(1500 * multiplier),

                totalDistribution: distribution,
                totalRecovery: recovery,
                totalConversion: conversion,
                totalInProgress: inProgress,

                channelStats: [
                    { name: 'USDT', value: 800000 },
                    { name: 'Bank Transfer', value: 300000 },
                    { name: 'Credit Card', value: 150000 }
                ],
                withdrawChannelStats: [
                    { name: 'USDT', value: 400000 },
                    { name: 'Bank Transfer', value: 50000 }
                ]
            }
        }
    }
}
