# 驗證 TDD §3.1 checkPromotion 邏輯是否真的會讓「降級後立刻重升」
# 依 docs/spec/vip-v2-tdd.md 的虛擬碼原樣實作，不加任何修正

levels = {
    3: {'promo_deposit': 2800, 'promo_turnover': 32000, 'retain_deposit': 1400, 'retain_turnover': 16000},
    4: {'promo_deposit': 4800, 'promo_turnover': 56000, 'retain_deposit': 2400, 'retain_turnover': 28000},
    5: {'promo_deposit': 8100, 'promo_turnover': 99000, 'retain_deposit': 4000, 'retain_turnover': 50000},
}

player = {
    'vip_level': 5,
    'vip_lifetime_deposit': 9000,   # 終生數據已達 VIP5 門檻(8100)，此後不會再減少
    'vip_lifetime_turnover': 100000,
    'vip_historical_max_level': 5,
    'vip_current_month_deposit': 500,   # 這個月消費很少，保級會失敗
    'vip_current_month_turnover': 5000,
    'vip_current_month_active_days': 2,
    'vip_retention_grace': False,
}

def check_promotion_as_written_in_tdd(player):
    """完全依照 TDD §3.1 的虛擬碼：只看終生累積 vs promo 門檻"""
    current = player['vip_level']
    target = current
    for rank in sorted(k for k in levels if k > current):
        lv = levels[rank]
        if player['vip_lifetime_deposit'] >= lv['promo_deposit'] and player['vip_lifetime_turnover'] >= lv['promo_turnover']:
            target = rank
        else:
            break
    return target

def monthly_settlement(player):
    lv = levels[player['vip_level']]
    achieved = (player['vip_current_month_deposit'] >= lv['retain_deposit']
                and player['vip_current_month_turnover'] >= lv['retain_turnover'])
    if not achieved:
        old = player['vip_level']
        player['vip_level'] = max(0, old - 1)
        print(f"月結：VIP{old} 保級失敗 -> 降為 VIP{player['vip_level']}")
    else:
        print(f"月結：VIP{player['vip_level']} 保級成功")
    player['vip_current_month_deposit'] = 0
    player['vip_current_month_turnover'] = 0

print("=== 情境：玩家 VIP5，當月消費不夠，月底被降級 ===")
print(f"降級前狀態: level={player['vip_level']}, lifetime_deposit={player['vip_lifetime_deposit']}, historical_max={player['vip_historical_max_level']}")
monthly_settlement(player)
print(f"降級後狀態: level={player['vip_level']}")

print("\n=== 次月玩家隨便下一筆小注，觸發 checkPromotion（依 TDD 虛擬碼原樣執行）===")
target = check_promotion_as_written_in_tdd(player)
print(f"checkPromotion 判定結果應晉升到: VIP{target}")
if target == 5:
    print("*** 結果：降級的下一刻，只要玩家有任何觸發 checkPromotion 的動作，就立刻被打回 VIP5 ***")
    print("*** 降級機制形同虛設，因為 checkPromotion 只看終生累積數據，而終生數據從未低於 VIP5 門檻 ***")
else:
    print("未重現問題")
