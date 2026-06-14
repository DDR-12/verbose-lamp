// 简单 AI 决策引擎
import type { GameState } from './types';
import { useGameStore } from './gameStore';
import { calcTotalAssets } from '../utils/helpers';
import { getRandomCard } from '../data/cards';

export const aiDecide = (playerId: number) => {
  const store = useGameStore.getState();
  const player = store.players[playerId];
  if (player.isBankrupt) return;

  const s = store;

  // 1. 落点决策：买地 / 盖房 / 商店购买
  const modal = s.modal;
  if (modal.type === 'buyOrPass') {
    const { tileIndex, price, mode } = modal.data;
    const tile = s.tiles[tileIndex];
    if (mode === 'upgrade') {
      // 盖房决策
      const perk = player.character.perk;
      const cost = perk.type === 'buildDiscount' ? Math.floor((tile.housePrice || 0) * 0.9) : (tile.housePrice || 0);
      const owned = s.tiles.filter((t) => t.ownerId === playerId && t.color === tile.color);
      const hasColorGroup = owned.length >= 2; // 同色已有 >=2 块
      if (player.cash > cost * 2 && hasColorGroup) {
        store.upgradeProperty(playerId, tileIndex);
        return;
      }
      store.resolveLanded();
      return;
    } else {
      // 购地决策
      if (player.cash > (price || 0) * 1.5 || player.cash > 5000) {
        store.buyProperty(playerId, tileIndex);
        return;
      }
      store.resolveLanded();
      return;
    }
  }

  if (modal.type === 'rentPay') {
    // 租金弹窗 - 等待人类玩家操作（AI 自动支付）
    const { ownerId, rent } = modal.data;
    const owner = s.players[ownerId];
    if (!owner) {
      store.resolveLanded();
      return;
    }
    if (player.cash < rent) {
      // 尝试卖股
      for (const sym in player.stocks) {
        if ((player.stocks[sym] || 0) > 0) {
          store.sellStock(playerId, sym, player.stocks[sym]);
        }
      }
    }
    const newCash = useGameStore.getState().players[playerId].cash;
    if (newCash >= rent) {
      // 转账
      useGameStore.setState((st) => ({
        players: st.players.map((p) => {
          if (p.id === playerId) return { ...p, cash: p.cash - rent };
          if (p.id === ownerId) return { ...p, cash: p.cash + rent };
          return p;
        }),
      }));
      store.addLog(`💸 ${player.name} 向 ${owner.name} 支付 $${rent} 过路费`, 'lose', playerId);
    } else {
      useGameStore.setState((st) => ({
        players: st.players.map((p) => p.id === playerId ? { ...p, isBankrupt: true, cash: 0 } : p),
      }));
      store.addLog(`💀 ${player.name} 破产！`, 'lose', playerId);
    }
    store.resolveLanded();
    return;
  }

  if (modal.type === 'chanceDetail' || modal.type === 'fateDetail') {
    const { card } = modal.data;
    // AI 自动执行
    setTimeout(() => {
      const cur = useGameStore.getState();
      if (cur.modal.type === 'chanceDetail' || cur.modal.type === 'fateDetail') {
        cur.executeCard(playerId, card.id);
      }
    }, 1500);
    return;
  }

  if (modal.type === 'shop') {
    // AI 简单：不买
    store.resolveLanded();
    return;
  }

  if (modal.type === 'lottery' || modal.type === 'news' || modal.type === 'win') {
    setTimeout(() => {
      const cur = useGameStore.getState();
      if (cur.modal.type === modal.type) {
        cur.resolveLanded();
      }
    }, 1500);
    return;
  }

  // 2. 投骰
  if (s.phase === 'idle' && s.currentPlayerIndex === playerId) {
    store.rollDice();
    return;
  }

  // 3. 股票操作（每回合在主面板有概率操作）
  // 由 UI 面板提供手动操作；AI 不主动操作
};

// AI 自动托管
export const startAILoop = () => {
  const tick = () => {
    const s = useGameStore.getState();
    const current = s.players[s.currentPlayerIndex];
    if (current && current.isAI && !current.isBankrupt) {
      // 等待弹窗关闭后继续
      if (s.modal.type === null && s.phase === 'idle') {
        aiDecide(current.id);
      } else if (s.modal.type !== null) {
        aiDecide(current.id);
      }
    }
  };
  return setInterval(tick, 700);
};
