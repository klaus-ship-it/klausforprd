import { Player, Wallet } from '@/types/player'
import { BonusCard, RolloverContainer, ContainerStatus, BonusCurrency } from '@/types/bonus'
import { AssetLog, AssetLogChangeType } from '@/types/log'
import { addLog } from './assetLogs'

export class RolloverEngine {
    // Helpers to get wallets
    private static getWallet(player: Player, type: 'CASH' | 'BONUS' | 'GAME') {
        return player.wallets.find(w => w.type === type)
    }

    // Helper to generate log
    private static createLog(
        player: Player,
        changeType: AssetLogChangeType,
        walletType: 'CASH' | 'BONUS' | 'GAME' | 'SAFE',
        amount: number,
        validTurnover: number,
        relatedId?: string
    ) {
        const wallet = player.wallets.find(w => w.type === walletType)
        const container = player.rollover_container

        const log: AssetLog = {
            log_id: `LOG_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            timestamp: new Date().toISOString(),
            player_id: player.id,
            username: player.username,
            currency: wallet ? wallet.currency : 'GOLD', // Default fallback
            wallet_type: walletType,
            change_type: changeType,
            amount: amount,
            post_balance: wallet ? wallet.balance : 0,
            valid_turnover: validTurnover,
            remain_target: (container && container.status === ContainerStatus.ACTIVE && walletType === 'BONUS')
                ? Math.max(0, container.target_wagering - container.current_wagering)
                : 0,
            related_id: relatedId
        }
        addLog(log)
    }

    // 1. Create Bonus Card
    static createBonusCard(amount: number, multiplier: number, cap: number, daysValid: number): BonusCard {
        const now = new Date()
        const endTime = new Date(now.getTime() + daysValid * 24 * 60 * 60 * 1000)

        return {
            id: `CARD_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            currency: BonusCurrency.SILVER,
            start_amount: amount,
            lave_amount: amount,
            multiplier: multiplier,
            target_current: amount * multiplier,
            current_wagering: 0,
            cap: cap,
            end_time: endTime.toISOString(),
            created_at: now.toISOString(),
            status: 'PENDING'
        }
    }

    // 2. Activate Bonus (Move from Queue to Container)
    static activateBonus(player: Player, card: BonusCard): boolean {
        if (!player.rollover_container) {
            player.rollover_container = {
                status: ContainerStatus.IDLE,
                start_balance: 0,
                lave_balance: 0,
                current_wagering: 0,
                target_wagering: 0,
                cap: 0
            }
        }

        const container = player.rollover_container
        if (container.status === ContainerStatus.ACTIVE) {
            return false // Busy
        }

        // Check expiry
        if (new Date(card.end_time) < new Date()) {
            // Log expiry? implementation detail, maybe separate job
            return false // Expired
        }

        // Setup Container
        container.status = ContainerStatus.ACTIVE
        card.status = 'ACTIVE'
        player.active_bonus_card = card
        container.active_card_id = card.id
        container.start_balance = card.lave_amount
        container.lave_balance = card.lave_amount
        container.current_wagering = 0
        container.target_wagering = card.target_current
        container.cap = card.cap

        // Update Wallet Balance (Bonus Wallet)
        const bonusWallet = this.getWallet(player, 'BONUS')
        if (bonusWallet) {
            bonusWallet.balance = card.lave_amount
            // Log Claim
            this.createLog(player, 'CLAIM', 'BONUS', card.lave_amount, 0, card.id)
        }

        return true
    }

    // Pause an active card and return it to the queue without losing its progress.
    static deactivateBonus(player: Player): boolean {
        const container = player.rollover_container
        const card = player.active_bonus_card
        if (!container || container.status !== ContainerStatus.ACTIVE || !card) return false

        card.status = 'DISABLED'
        card.lave_amount = container.lave_balance
        card.current_wagering = container.current_wagering
        card.target_current = container.target_wagering
        card.cap = container.cap
        player.bonus_queue = [...(player.bonus_queue || []), card]

        const bonusWallet = this.getWallet(player, 'BONUS')
        if (bonusWallet) bonusWallet.balance = 0
        this.resetContainer(player)
        return true
    }

    // 3. Process Bet (Wagering Logic)
    static processBet(player: Player, walletType: 'CASH' | 'BONUS' | 'GAME', amount: number): void {
        const container = player.rollover_container

        // Default turnover is 0
        let validTurnover = 0

        if (!container || container.status !== ContainerStatus.ACTIVE) {
            // No active bonus, just deduct balance
            const wallet = this.getWallet(player, walletType)
            if (wallet) {
                wallet.balance -= amount
                this.createLog(player, 'BET', walletType, -amount, 0)
            }
            return
        }

        // Logic: Only BONUS wallet bets count towards rollover
        if (walletType === 'BONUS') {
            const bonusWallet = this.getWallet(player, 'BONUS')!
            if (bonusWallet.balance < amount) {
                throw new Error('Insufficient Bonus Balance')
            }
            bonusWallet.balance -= amount
            container.lave_balance = bonusWallet.balance

            // Increase Wagering Progress
            container.current_wagering += amount
            if (player.active_bonus_card) player.active_bonus_card.current_wagering = container.current_wagering
            validTurnover = amount // It is valid for Bonus bet

            this.createLog(player, 'BET', 'BONUS', -amount, validTurnover)

            // Check for Settlement
            this.checkSettlement(player)
        } else {
            // Other wallets just deduct, validTurnover = 0
            const wallet = this.getWallet(player, walletType)
            if (wallet) {
                wallet.balance -= amount
                this.createLog(player, 'BET', walletType, -amount, 0)
            }
        }
    }

    // 4. Process Win
    static processWin(player: Player, walletType: 'CASH' | 'BONUS' | 'GAME', amount: number): void {
        const wallet = this.getWallet(player, walletType)
        if (!wallet) return

        wallet.balance += amount

        // If Bonus Win, update container balance tracking
        if (walletType === 'BONUS' && player.rollover_container?.status === ContainerStatus.ACTIVE) {
            player.rollover_container.lave_balance = wallet.balance
        }

        this.createLog(player, 'WIN', walletType, amount, 0)

        if (walletType === 'BONUS') {
            this.checkSettlement(player)
        }
    }

    // 5. Settlement / Bankruptcy Check
    static checkSettlement(player: Player): void {
        const container = player.rollover_container
        if (!container || container.status !== ContainerStatus.ACTIVE) return

        // A. Target Reached
        if (container.current_wagering >= container.target_wagering) {
            const bonusWallet = this.getWallet(player, 'BONUS')!
            const cashWallet = this.getWallet(player, 'CASH')!

            // Transfer Logic
            const transferAmount = Math.min(bonusWallet.balance, container.cap)
            const overflow = Math.max(0, bonusWallet.balance - container.cap)

            // 1. Deduct from Bonus (Unlock)
            bonusWallet.balance = 0
            this.createLog(player, 'UNLOCK', 'BONUS', -transferAmount, 0, container.active_card_id)

            // 2. Add to Cash (Unlock)
            cashWallet.balance += transferAmount
            this.createLog(player, 'UNLOCK', 'CASH', transferAmount, 0, container.active_card_id)

            // 3. Wipe Overflow if any
            if (overflow > 0) {
                this.createLog(player, 'WIPE', 'BONUS', -overflow, 0, 'System Cap Wipe')
            }

            console.log(`[Engine] Success: Transferred ${transferAmount}, Burned ${overflow}`)

            // Reset Container
            this.resetContainer(player)

            // Try activate next
            this.tryActivateNext(player)
            return
        }

        // B. Bankruptcy (Balance < 1 and assumes no pending bets for mock)
        if (container.lave_balance < 1) {
            console.log(`[Engine] Bankruptcy: Balance < 1, Resetting`)
            const bonusWallet = this.getWallet(player, 'BONUS')!

            // Log WIPE of remainder if any (e.g. 0.5)
            if (bonusWallet.balance > 0) {
                this.createLog(player, 'WIPE', 'BONUS', -bonusWallet.balance, 0, 'Bankruptcy')
            }

            bonusWallet.balance = 0
            this.resetContainer(player)
            this.tryActivateNext(player)
        }
    }

    // 6. Abandon / Forfeit
    static abandonBonus(player: Player): void {
        if (player.rollover_container?.status === ContainerStatus.ACTIVE) {
            const bonusWallet = this.getWallet(player, 'BONUS')!
            const amount = bonusWallet.balance

            bonusWallet.balance = 0
            this.createLog(player, 'WIPE', 'BONUS', -amount, 0, 'User Abandon')

            this.resetContainer(player)
            this.tryActivateNext(player)
        }
    }

    // 7. Force Approve (Admin)
    static forceApproveBonus(player: Player, adminReason: string = 'Admin Force Approve'): void {
        const container = player.rollover_container
        if (container && container.status === ContainerStatus.ACTIVE) {
            const bonusWallet = this.getWallet(player, 'BONUS')!
            const cashWallet = this.getWallet(player, 'CASH')!

            // Transfer Logic (same as normal target reached but manual trigger)
            const transferAmount = Math.min(bonusWallet.balance, container.cap)
            const overflow = Math.max(0, bonusWallet.balance - container.cap)

            // 1. Deduct from Bonus (Unlock)
            bonusWallet.balance = 0
            this.createLog(player, 'UNLOCK', 'BONUS', -transferAmount, 0, `${adminReason} (${container.active_card_id})`)

            // 2. Add to Cash (Unlock)
            cashWallet.balance += transferAmount
            this.createLog(player, 'UNLOCK', 'CASH', transferAmount, 0, `${adminReason} (${container.active_card_id})`)

            // 3. Wipe Overflow if any
            if (overflow > 0) {
                this.createLog(player, 'WIPE', 'BONUS', -overflow, 0, `System Cap Wipe (${adminReason})`)
            }

            console.log(`[Engine] Force Approve: Transferred ${transferAmount}, Burned ${overflow}`)

            // Reset Container
            this.resetContainer(player)
            this.tryActivateNext(player)
        }
    }

    private static resetContainer(player: Player) {
        if (player.rollover_container) {
            player.rollover_container.status = ContainerStatus.IDLE
            player.rollover_container.active_card_id = undefined
            player.rollover_container.current_wagering = 0
            player.rollover_container.lave_balance = 0
            player.rollover_container.start_balance = 0
            player.rollover_container.target_wagering = 0
            player.active_bonus_card = undefined
        }
    }

    private static tryActivateNext(player: Player) {
        if (player.bonus_queue && player.bonus_queue.length > 0) {
            const nextCardIndex = player.bonus_queue.findIndex(card => card.status !== 'DISABLED')
            if (nextCardIndex >= 0) {
                const nextCard = player.bonus_queue.splice(nextCardIndex, 1)[0]
                console.log(`[Engine] Auto-activating next card: ${nextCard.id}`)
                this.activateBonus(player, nextCard)
            }
        }
    }

    // 7. Exchange (Gold to Silver or Silver to Gold)
    static exchangeCurrency(player: Player, from: 'GOLD' | 'SILVER', to: 'GOLD' | 'SILVER', amount: number): void {
        const rate = 100 // 1 Gold = 100 Silver

        const cashWallet = this.getWallet(player, 'CASH')! // Gold
        const bonusWallet = this.getWallet(player, 'BONUS')! // Silver

        if (from === 'GOLD' && to === 'SILVER') {
            // Gold -> Silver (1 -> 100)
            if (cashWallet.balance < amount) throw new Error('Insufficient Gold')

            cashWallet.balance -= amount
            this.createLog(player, 'EXCHANGE', 'CASH', -amount, 0, 'Exchange Out')

            const silverAmount = amount * rate
            bonusWallet.balance += silverAmount
            this.createLog(player, 'EXCHANGE', 'BONUS', silverAmount, 0, 'Exchange In')

            // Using Exchange to top up bonus wallet might affect rollover? Spec says "Exchange" type.
            // If active container exists, updating bonus wallet balance updates container?
            if (player.rollover_container?.status === ContainerStatus.ACTIVE) {
                player.rollover_container.lave_balance = bonusWallet.balance
            }

        } else if (from === 'SILVER' && to === 'GOLD') {
            // Silver -> Gold (100 -> 1)
            if (bonusWallet.balance < amount) throw new Error('Insufficient Silver')
            if (amount % rate !== 0) throw new Error(`Silver amount must be multiple of ${rate}`)

            bonusWallet.balance -= amount
            this.createLog(player, 'EXCHANGE', 'BONUS', -amount, 0, 'Exchange Out')

            if (player.rollover_container?.status === ContainerStatus.ACTIVE) {
                player.rollover_container.lave_balance = bonusWallet.balance
            }

            const goldAmount = amount / rate
            cashWallet.balance += goldAmount
            this.createLog(player, 'EXCHANGE', 'CASH', goldAmount, 0, 'Exchange In')
        }
    }

    // 8. P2P Transfer
    static p2pTransfer(sender: Player, receiver: Player, amount: number): void {
        const feeRate = 0.08
        const senderWallet = this.getWallet(sender, 'CASH')!
        const receiverWallet = this.getWallet(receiver, 'CASH')!

        const totalDedcution = amount * (1 + feeRate)

        if (senderWallet.balance < totalDedcution) throw new Error('Insufficient Balance for Transfer + Fee')

        // Sender
        senderWallet.balance -= totalDedcution
        this.createLog(sender, 'P2P_OUT', 'CASH', -totalDedcution, 0, receiver.id)

        // Receiver
        receiverWallet.balance += amount
        this.createLog(receiver, 'P2P_IN', 'CASH', amount, 0, sender.id)
    }
}
