import { create } from 'zustand';
import type { GameState, Player, Stock, ModalState, LogEntry } from './types';
import { TAIWAN_MAP } from '../data/map';
import { CHARACTERS, type CharacterDef } from '../data/characters';
import { STOCK_DEFS } from '../data/stocks';
import { ITEMS_SHOP } from '../data/items';
import { getRandomCard } from '../data/cards';

// ---------- helpers ----------
let logIdCounter = 1;
let cashFlashId = 1;

const makeInitialStocks = (): Stock[] =>
  STOCK_DEFS.map((s) => ({
    symbol: s.symbol,
    name: s.name,
    price: s.basePrice,
    prevPrice: s.basePrice,
    history: [s.basePrice],
    trend: 'flat',
  }));

const makeInitialPlayers = (count: number): Player[] => {
  // 钱夫人位置 (index 2) 固定
  const chosen = CHARACTERS.slice(0, count);
  return chosen.map((char, i) => ({
    id: i,
    name: char.name,
    character: char,
    cash: char.cash,
    deposit: 0,
    position: 0,
    stocks: {},
    cards: [],
    isBankrupt: false,
    isAI: false, // 玩家控制的人类玩家；AI 通过 storeAction 单独判断
    inJail: false,
    jailTurns: 0,
    skipTurns: 0,
    immortalTurns: 0,
    parkStop: 0,
    consecutiveDoubles: 0,
    cashFlash: null,
  }));
};

const initialState = (count: number): GameState => ({
  playerCount: count,
  players: makeInitialPlayers(count),
  tiles: TAIWAN_MAP.map((t) => ({ ...t })),
  stocks: makeInitialStocks(),
  currentPlayerIndex: 0,
  round: 1,
  dice: [1, 1],
  diceRolling: false,
  phase: 'idle',
  log: [
    {
      id: logIdCounter++,
      turn: 0,
      playerId: -1,
      message: '🎮 大富翁 4 · 台湾之旅  游戏开始！',
      type: 'system',
      timestamp: Date.now(),
    },
  ],
  modal: { type: null },
  highlightedTile: null,
  winnerId: null,
  tools: { tool_roadblock: 2, tool_doll: 1, tool_bomb: 1 },
  movingFrom: 0,
  movingTo: 0,
  isPaused: false,
});

interface Actions {
  // 初始化 / 重置
  initGame: (count: number) => void;
  // 玩家 AI 设置
  setAI: (playerId: number, isAI: boolean) => void;
  // 投骰
  rollDice: () => void;
  // 移动
  movePlayer: (playerId: number, steps: number) => Promise<void>;
  // 落点处理
  handleLanding: (playerId: number) => void;
  // 购地
  buyProperty: (playerId: number, tileIndex: number) => void;
  // 盖房
  upgradeProperty: (playerId: number, tileIndex: number) => void;
  // 结束回合
  endTurn: () => void;
  // 弹窗
  openModal: (m: ModalState) => void;
  closeModal: () => void;
  // 卡片执行
  executeCard: (playerId: number, cardId: string) => void;
  // 商店
  buyItem: (playerId: number, itemId: string) => void;
  // 股票
  buyStock: (playerId: number, symbol: string, qty: number) => void;
  sellStock: (playerId: number, symbol: string, qty: number) => void;
  tickStocks: () => void;
  // 出狱
  payBail: (playerId: number) => void;
  useJailCard: (playerId: number) => void;
  // 通用
  addLog: (msg: string, type?: LogEntry['type'], playerId?: number) => void;
  cashChange: (playerId: number, delta: number) => void;
  setHighlight: (tileIndex: number | null) => void;
  // 弹窗具体行为
  resolveLanded: () => void;
  // 破产检查
  checkBankrupt: (playerId: number) => void;
  // 重置游戏
  reset: () => void;
  // 设置 AI
}

export const useGameStore = create<GameState & Actions>((set, get) => ({
  ...initialState(2),

  initGame: (count) => {
    logIdCounter = 1;
    cashFlashId = 1;
    set({ ...initialState(count), modal: { type: null } });
  },

  setAI: (playerId, isAI) => {
    set((s) => ({
      players: s.players.map((p) => (p.id === playerId ? { ...p, isAI } : p)),
    }));
  },

  addLog: (message, type = 'info', playerId = -1) => {
    set((s) => ({
      log: [
        ...s.log.slice(-200),
        {
          id: logIdCounter++,
          turn: s.round,
          playerId,
          message,
          type,
          timestamp: Date.now(),
        },
      ],
    }));
  },

  cashChange: (playerId, delta) => {
    set((s) => ({
      players: s.players.map((p) =>
        p.id === playerId
          ? { ...p, cash: p.cash + delta, cashFlash: { id: cashFlashId++, sign: delta >= 0 ? '+' : '-', amount: Math.abs(delta) } }
          : p,
      ),
    }));
  },

  setHighlight: (tileIndex) => set({ highlightedTile: tileIndex }),

  rollDice: () => {
    const s = get();
    if (s.phase !== 'idle') return;
    const player = s.players[s.currentPlayerIndex];
    if (player.isBankrupt) {
      get().endTurn();
      return;
    }
    // 监狱中 - 弹出监狱操作
    if (player.inJail) {
      get().openModal({ type: 'jail' });
      set({ phase: 'modal' });
      return;
    }
    set({ phase: 'rolling', diceRolling: true });
    get().addLog(`🎲 ${player.name} 投掷骰子...`, 'info', player.id);

    // 模拟投骰动画 600ms
    let count = 0;
    const tick = setInterval(() => {
      const d1 = 1 + Math.floor(Math.random() * 6);
      const d2 = 1 + Math.floor(Math.random() * 6);
      set({ dice: [d1, d2] });
      count++;
      if (count > 8) {
        clearInterval(tick);
        // 最终结果
        const finalD1 = 1 + Math.floor(Math.random() * 6);
        const finalD2 = 1 + Math.floor(Math.random() * 6);
        const total = finalD1 + finalD2;
        const isDouble = finalD1 === finalD2;
        set({ dice: [finalD1, finalD2], diceRolling: false });
        const cur = get();
        const curPlayer = cur.players[cur.currentPlayerIndex];
        get().addLog(
          `🎲 ${curPlayer.name} 投出 [${finalD1}][${finalD2}] = ${total}${isDouble ? ' (双倍！)' : ''}`,
          isDouble ? 'event' : 'info',
          curPlayer.id,
        );

        // 监狱处理
        if (curPlayer.inJail) {
          const newJailTurns = curPlayer.jailTurns - 1;
          if (isDouble || newJailTurns <= 0) {
            set((st) => ({
              players: st.players.map((p) =>
                p.id === curPlayer.id
                  ? { ...p, inJail: false, jailTurns: 0, consecutiveDoubles: p.consecutiveDoubles + 1 }
                  : p,
              ),
            }));
            get().addLog(
              isDouble ? '🔓 双倍点数，越狱成功！' : '🔓 刑期已满，出狱！',
              'event',
              curPlayer.id,
            );
            get().movePlayer(curPlayer.id, total);
          } else {
            set((st) => ({
              players: st.players.map((p) =>
                p.id === curPlayer.id ? { ...p, jailTurns: newJailTurns, consecutiveDoubles: 0 } : p,
              ),
            }));
            get().addLog(`🔒 仍在狱中（剩余 ${newJailTurns} 回合）`, 'info', curPlayer.id);
            get().endTurn();
          }
        } else if (curPlayer.parkStop > 0) {
          set((st) => ({
            players: st.players.map((p) =>
              p.id === curPlayer.id ? { ...p, parkStop: p.parkStop - 1, cash: p.cash + 500 } : p,
            ),
          }));
          get().addLog(`🌳 公园休息结束，奖励 $500`, 'gain', curPlayer.id);
          get().endTurn();
        } else if (curPlayer.skipTurns > 0) {
          set((st) => ({
            players: st.players.map((p) =>
              p.id === curPlayer.id ? { ...p, skipTurns: p.skipTurns - 1, consecutiveDoubles: isDouble ? p.consecutiveDoubles + 1 : 0 } : p,
            ),
          }));
          get().addLog(`🐢 乌龟减速，休息一回合`, 'info', curPlayer.id);
          if (isDouble) {
            get().movePlayer(curPlayer.id, total);
          } else {
            get().endTurn();
          }
        } else {
          // 正常移动
          if (isDouble) {
            set((st) => ({
              players: st.players.map((p) =>
                p.id === curPlayer.id ? { ...p, consecutiveDoubles: p.consecutiveDoubles + 1 } : p,
              ),
            }));
            if (curPlayer.consecutiveDoubles >= 2) {
              get().addLog('⚠️ 连续双倍三次，入狱！', 'event', curPlayer.id);
              set((st) => ({
                players: st.players.map((p) =>
                  p.id === curPlayer.id ? { ...p, position: 30, inJail: true, jailTurns: 3, consecutiveDoubles: 0 } : p,
                ),
              }));
              get().addLog('🔒 进入监狱', 'event', curPlayer.id);
              set({ phase: 'landed' });
              setTimeout(() => get().handleLanding(curPlayer.id), 500);
              return;
            }
          } else {
            set((st) => ({
              players: st.players.map((p) =>
                p.id === curPlayer.id ? { ...p, consecutiveDoubles: 0 } : p,
              ),
            }));
          }
          get().movePlayer(curPlayer.id, total);
        }
      }
    }, 60);
  },

  movePlayer: async (playerId, steps) => {
    const s = get();
    const player = s.players.find((p) => p.id === playerId)!;
    const startPos = player.position;
    const total = 36;
    const endPos = ((startPos + steps) % total + total) % total;
    const passedStart = endPos < startPos;

    set({ phase: 'moving', movingFrom: startPos, movingTo: endPos });
    get().setHighlight(null);

    // 移动动画 - 逐格走
    const direction = steps >= 0 ? 1 : -1;
    const absSteps = Math.abs(steps);
    for (let i = 1; i <= absSteps; i++) {
      const next = ((startPos + i * direction) % total + total) % total;
      set((st) => ({
        players: st.players.map((p) =>
          p.id === playerId ? { ...p, position: next } : p,
        ),
        highlightedTile: next,
      }));
      // 50ms per step
      await new Promise((r) => setTimeout(r, 60));
    }

    // 经过起点
    if (passedStart) {
      get().cashChange(playerId, 2000);
      get().addLog(`🚩 经过起点，获得 $2000`, 'gain', playerId);
    }

    set({ phase: 'landed' });
    setTimeout(() => get().handleLanding(playerId), 200);
  },

  handleLanding: (playerId) => {
    const s = get();
    const player = s.players[playerId];
    if (player.isBankrupt) {
      get().endTurn();
      return;
    }
    const tile = s.tiles[player.position];
    get().addLog(`📍 落在「${tile.name}」`, 'info', playerId);

    // 仙药保护
    if (player.immortalTurns > 0 && (tile.type === 'misfortune' || tile.type === 'jail' || tile.type === 'turtle')) {
      get().addLog('🧪 仙药保护，免疫本次负面事件', 'event', playerId);
      set((st) => ({
        players: st.players.map((p) =>
          p.id === playerId ? { ...p, immortalTurns: p.immortalTurns - 1 } : p,
        ),
      }));
      set({ phase: 'landed' });
      setTimeout(() => get().endTurn(), 500);
      return;
    }

    switch (tile.type) {
      case 'start': {
        get().cashChange(playerId, 2000);
        get().addLog('🚩 起点停留，奖励 $2000', 'gain', playerId);
        set({ phase: 'landed' });
        setTimeout(() => get().endTurn(), 500);
        break;
      }
      case 'property': {
        if (tile.ownerId === null) {
          if (player.cash < (tile.price || 0)) {
            get().addLog('💸 现金不足，无法购买', 'info', playerId);
            set({ phase: 'landed' });
            setTimeout(() => get().endTurn(), 500);
          } else {
            get().openModal({ type: 'buyOrPass', data: { tileIndex: tile.index, price: tile.price } });
            set({ phase: 'modal' });
          }
        } else if (tile.ownerId === playerId) {
          // 自有地产 - 可盖房
          if (tile.houses < 5) {
            get().openModal({ type: 'buyOrPass', data: { tileIndex: tile.index, price: tile.housePrice, mode: 'upgrade' } });
            set({ phase: 'modal' });
          } else {
            set({ phase: 'landed' });
            setTimeout(() => get().endTurn(), 500);
          }
        } else {
          // 他人地产 - 支付租金
          const owner = s.players[tile.ownerId];
          if (owner && !owner.isBankrupt) {
            const baseRent = (tile.rent || [0])[tile.houses] || 0;
            const perkBonus = owner.character.perk.type === 'rentBonus' ? (1 + owner.character.perk.value) : 1;
            const rent = Math.floor(baseRent * perkBonus);
            get().openModal({ type: 'rentPay', data: { tileIndex: tile.index, ownerId: owner.id, ownerName: owner.name, rent } });
            set({ phase: 'modal' });
          } else {
            set({ phase: 'landed' });
            setTimeout(() => get().endTurn(), 500);
          }
        }
        break;
      }
      case 'chance': {
        const card = getRandomCard('chance');
        get().openModal({ type: 'chanceDetail', data: { card, playerId } });
        set({ phase: 'modal' });
        break;
      }
      case 'fate': {
        const card = getRandomCard('fate');
        get().openModal({ type: 'fateDetail', data: { card, playerId } });
        set({ phase: 'modal' });
        break;
      }
      case 'news': {
        const events = [
          { text: '科技股大涨！', symbol: 'AAPL', delta: 0.3 },
          { text: '微软推出新产品！', symbol: 'MSFT', delta: 0.25 },
          { text: 'IBM 业绩下滑', symbol: 'IBM', delta: -0.2 },
          { text: '台积电订单爆满', symbol: 'TSM', delta: 0.4 },
          { text: '全球股灾', symbol: 'AAPL', delta: -0.3 },
        ];
        const ev = events[Math.floor(Math.random() * events.length)];
        set((st) => ({
          stocks: st.stocks.map((stk) => stk.symbol === ev.symbol
            ? { ...stk, price: Math.max(1, Math.round(stk.price * (1 + ev.delta))), prevPrice: stk.price }
            : stk),
        }));
        get().openModal({ type: 'news', data: ev });
        set({ phase: 'modal' });
        break;
      }
      case 'shop': {
        get().openModal({ type: 'shop', data: { isCardShop: false } });
        set({ phase: 'modal' });
        break;
      }
      case 'lottery': {
        const win = 1000 + Math.floor(Math.random() * 4000);
        get().cashChange(playerId, win);
        get().addLog(`🎰 乐透中奖，获得 $${win}`, 'gain', playerId);
        get().openModal({ type: 'lottery', data: { amount: win } });
        set({ phase: 'modal' });
        break;
      }
      case 'park': {
        get().cashChange(playerId, 500);
        get().addLog('🌳 公园休息 1 回合，奖励 $500', 'gain', playerId);
        set((st) => ({
          players: st.players.map((p) => p.id === playerId ? { ...p, parkStop: 1 } : p),
        }));
        set({ phase: 'landed' });
        setTimeout(() => get().endTurn(), 500);
        break;
      }
      case 'jail': {
        // 监狱不触发（需要通过卡片）
        get().addLog('🔒 探监，平安无事', 'info', playerId);
        set({ phase: 'landed' });
        setTimeout(() => get().endTurn(), 500);
        break;
      }
      case 'hospital': {
        get().addLog('🏥 探望病友', 'info', playerId);
        set({ phase: 'landed' });
        setTimeout(() => get().endTurn(), 500);
        break;
      }
      case 'immortal': {
        set((st) => ({
          players: st.players.map((p) => p.id === playerId ? { ...p, immortalTurns: 30 } : p),
        }));
        get().addLog('🧪 服用仙药，30 回合免疫负面事件', 'event', playerId);
        set({ phase: 'landed' });
        setTimeout(() => get().endTurn(), 500);
        break;
      }
      case 'turtle': {
        set((st) => ({
          players: st.players.map((p) => p.id === playerId ? { ...p, skipTurns: 2 } : p),
        }));
        get().addLog('🐢 遭遇乌龟，休息 2 回合', 'event', playerId);
        set({ phase: 'landed' });
        setTimeout(() => get().endTurn(), 500);
        break;
      }
      case 'fortune': {
        // 所有地产升级
        set((st) => ({
          tiles: st.tiles.map((t) =>
            t.ownerId === playerId && t.houses < 5 && t.housePrice
              ? { ...t, houses: Math.min(5, t.houses + 1) }
              : t,
          ),
        }));
        get().addLog('🧧 财神驾到！所有地产升级一档', 'event', playerId);
        set({ phase: 'landed' });
        setTimeout(() => get().endTurn(), 800);
        break;
      }
      case 'misfortune': {
        set((st) => ({
          players: st.players.map((p) => p.id === playerId ? { ...p, cash: Math.floor(p.cash / 2), deposit: 0 } : p),
        }));
        get().addLog('💀 穷神附身，现金减半，存款清零', 'lose', playerId);
        set({ phase: 'landed' });
        setTimeout(() => get().endTurn(), 800);
        break;
      }
      default: {
        set({ phase: 'landed' });
        setTimeout(() => get().endTurn(), 500);
      }
    }
  },

  buyProperty: (playerId, tileIndex) => {
    const s = get();
    const player = s.players[playerId];
    const tile = s.tiles[tileIndex];
    if (tile.type !== 'property' || tile.ownerId !== null) return;
    if (player.cash < (tile.price || 0)) return;

    set((st) => ({
      players: st.players.map((p) =>
        p.id === playerId ? { ...p, cash: p.cash - (tile.price || 0) } : p,
      ),
      tiles: st.tiles.map((t) =>
        t.index === tileIndex ? { ...t, ownerId: playerId, houses: 0 } : t,
      ),
    }));
    get().addLog(`🏠 购买「${tile.name}」，花费 $${tile.price}`, 'info', playerId);
    get().closeModal();
    set({ phase: 'landed' });
    setTimeout(() => get().endTurn(), 200);
  },

  upgradeProperty: (playerId, tileIndex) => {
    const s = get();
    const player = s.players[playerId];
    const tile = s.tiles[tileIndex];
    if (tile.ownerId !== playerId || tile.houses >= 5) return;
    const perkDiscount = player.character.perk.type === 'buildDiscount' ? (1 - player.character.perk.value) : 1;
    const cost = Math.floor((tile.housePrice || 0) * perkDiscount);
    if (player.cash < cost) return;

    set((st) => ({
      players: st.players.map((p) => p.id === playerId ? { ...p, cash: p.cash - cost } : p),
      tiles: st.tiles.map((t) => (t.index === tileIndex ? { ...t, houses: t.houses + 1 } : t)),
    }));
    const name = ['空地', '小房子', '中房子', '大房子', '豪华别墅', '旅馆'][tile.houses + 1];
    get().addLog(`🏗️「${tile.name}」升级为 ${name}，花费 $${cost}`, 'info', playerId);
    get().closeModal();
    set({ phase: 'landed' });
    setTimeout(() => get().endTurn(), 200);
  },

  resolveLanded: () => {
    set({ phase: 'landed' });
    get().closeModal();
    setTimeout(() => get().endTurn(), 100);
  },

  closeModal: () => set({ modal: { type: null } }),

  openModal: (m) => set({ modal: m }),

  executeCard: (playerId, cardId) => {
    const s = get();
    const player = s.players[playerId];
    const card = [...s.players.flatMap((p) => p.cards), ...ITEMS_SHOP].find(
      (c) => 'id' in c && c.id === cardId,
    ) as any;
    if (!card) return;

    const effect = card.effect;
    switch (effect.kind) {
      case 'gain':
        get().cashChange(playerId, effect.amount);
        get().addLog(`💰 获得 $${effect.amount}`, 'gain', playerId);
        break;
      case 'lose':
        get().cashChange(playerId, -effect.amount);
        get().addLog(`💸 支付 $${effect.amount}`, 'lose', playerId);
        break;
      case 'move': {
        if (effect.type === 'absolute') {
          get().movePlayer(playerId, ((effect.to - player.position) + 36) % 36);
        } else {
          get().movePlayer(playerId, effect.to);
        }
        return; // 移动结束会自动落点处理
      }
      case 'moveToStart': {
        get().cashChange(playerId, 2000);
        get().addLog('🚩 回到起点，奖励 $2000', 'gain', playerId);
        set((st) => ({
          players: st.players.map((p) => p.id === playerId ? { ...p, position: 0 } : p),
        }));
        break;
      }
      case 'goToJail':
        set((st) => ({
          players: st.players.map((p) => p.id === playerId ? { ...p, position: 30, inJail: true, jailTurns: 3 } : p),
        }));
        get().addLog('🔒 进入监狱', 'event', playerId);
        break;
      case 'outOfJail':
        set((st) => ({
          players: st.players.map((p) =>
            p.id === playerId
              ? { ...p, cards: [...p.cards.filter((c) => c.id !== 'c04' && c.id !== 'f10'), { id: 'getout', type: 'chance', title: '出狱卡', description: '可立即出狱', effect: { kind: 'outOfJail' } }] }
              : p,
          ),
        }));
        get().addLog('🃏 获得出狱卡', 'gain', playerId);
        break;
      case 'collectFromAll': {
        s.players.forEach((p) => {
          if (p.id !== playerId && !p.isBankrupt) {
            get().cashChange(p.id, -effect.amount);
            get().addLog(`💸 支付 $${effect.amount} 给 ${player.name}`, 'lose', p.id);
          }
        });
        const totalGain = effect.amount * s.players.filter((p) => p.id !== playerId && !p.isBankrupt).length;
        get().cashChange(playerId, totalGain);
        get().addLog(`💰 共获得 $${totalGain}`, 'gain', playerId);
        break;
      }
      case 'payToAll': {
        s.players.forEach((p) => {
          if (p.id !== playerId && !p.isBankrupt) {
            get().cashChange(p.id, effect.amount);
          }
        });
        const totalPay = effect.amount * s.players.filter((p) => p.id !== playerId && !p.isBankrupt).length;
        get().cashChange(playerId, -totalPay);
        get().addLog(`💸 共支付 $${totalPay}`, 'lose', playerId);
        break;
      }
      case 'stockUp':
        set((st) => ({
          stocks: st.stocks.map((sk) =>
            sk.symbol === effect.symbol
              ? { ...sk, price: Math.max(1, Math.round(sk.price * (1 + effect.percent))), prevPrice: sk.price }
              : sk,
          ),
        }));
        get().addLog(`📈 ${effect.symbol} 上涨 ${Math.round(effect.percent * 100)}%`, 'event', playerId);
        break;
      case 'stockDown':
        set((st) => ({
          stocks: st.stocks.map((sk) =>
            sk.symbol === effect.symbol
              ? { ...sk, price: Math.max(1, Math.round(sk.price * (1 + effect.percent))), prevPrice: sk.price }
              : sk,
          ),
        }));
        get().addLog(`📉 ${effect.symbol} 下跌 ${Math.round(Math.abs(effect.percent) * 100)}%`, 'event', playerId);
        break;
      case 'upgradeAllOwn':
        set((st) => ({
          tiles: st.tiles.map((t) =>
            t.ownerId === playerId && t.houses < 5 && t.housePrice
              ? { ...t, houses: Math.min(5, t.houses + 1) }
              : t,
          ),
        }));
        get().addLog('🏗️ 所有自有地产升级一档', 'event', playerId);
        break;
      case 'downgradeAllOwn':
        set((st) => ({
          tiles: st.tiles.map((t) =>
            t.ownerId === playerId && t.houses > 0 ? { ...t, houses: t.houses - 1 } : t,
          ),
        }));
        get().addLog('🔨 所有自有地产降一档（罚款）', 'lose', playerId);
        break;
      case 'teleportRandom': {
        const propIdx = s.tiles.filter((t) => t.type === 'property');
        const target = propIdx[Math.floor(Math.random() * propIdx.length)];
        get().movePlayer(playerId, ((target.index - player.position) + 36) % 36);
        return;
      }
    }

    // 从卡组移除（如果是抽到的卡）
    set((st) => ({
      players: st.players.map((p) => p.id === playerId ? { ...p, cards: p.cards.filter((c) => c.id !== cardId) } : p),
    }));
    get().resolveLanded();
  },

  buyItem: (playerId, itemId) => {
    const s = get();
    const item = ITEMS_SHOP.find((i) => i.id === itemId);
    if (!item) return;
    const player = s.players[playerId];
    if (player.cash < item.price) return;

    set((st) => ({
      players: st.players.map((p) =>
        p.id === playerId
          ? {
              ...p,
              cash: p.cash - item.price,
              tools: { ...(p.tools as any), [itemId]: ((p.tools as any)?.[itemId] || 0) + 1 },
            }
          : p,
      ),
    }));
    get().addLog(`🛒 购买 ${item.name}，花费 $${item.price}`, 'info', playerId);
    get().closeModal();
    set({ phase: 'landed' });
    setTimeout(() => get().endTurn(), 200);
  },

  buyStock: (playerId, symbol, qty) => {
    const s = get();
    const stock = s.stocks.find((sk) => sk.symbol === symbol);
    const player = s.players[playerId];
    if (!stock || qty <= 0) return;
    const cost = stock.price * qty;
    if (player.cash < cost) return;
    set((st) => ({
      players: st.players.map((p) =>
        p.id === playerId
          ? { ...p, cash: p.cash - cost, stocks: { ...p.stocks, [symbol]: (p.stocks[symbol] || 0) + qty } }
          : p,
      ),
    }));
    get().addLog(`📈 买入 ${stock.name} × ${qty}，花费 $${cost}`, 'info', playerId);
  },

  sellStock: (playerId, symbol, qty) => {
    const s = get();
    const stock = s.stocks.find((sk) => sk.symbol === symbol);
    const player = s.players[playerId];
    if (!stock || qty <= 0) return;
    const owned = player.stocks[symbol] || 0;
    if (owned < qty) return;
    const perkBonus = player.character.perk.type === 'stockBonus' ? (1 + player.character.perk.value) : 1;
    const gain = Math.floor(stock.price * qty * perkBonus);
    set((st) => ({
      players: st.players.map((p) =>
        p.id === playerId
          ? { ...p, cash: p.cash + gain, stocks: { ...p.stocks, [symbol]: owned - qty } }
          : p,
      ),
    }));
    get().addLog(`📉 卖出 ${stock.name} × ${qty}，获得 $${gain}`, 'gain', playerId);
  },

  tickStocks: () => {
    set((st) => ({
      stocks: st.stocks.map((sk) => {
        const def = STOCK_DEFS.find((d) => d.symbol === sk.symbol)!;
        const change = (Math.random() - 0.5) * 2 * def.volatility;
        const newPrice = Math.max(1, Math.round(sk.price * (1 + change)));
        const history = [...sk.history, newPrice].slice(-20);
        const trend: 'up' | 'down' | 'flat' = newPrice > sk.price ? 'up' : newPrice < sk.price ? 'down' : 'flat';
        return { ...sk, prevPrice: sk.price, price: newPrice, history, trend };
      }),
    }));
  },

  payBail: (playerId) => {
    const s = get();
    const player = s.players[playerId];
    if (player.cash < 500) return;
    get().cashChange(playerId, -500);
    set((st) => ({
      players: st.players.map((p) => p.id === playerId ? { ...p, inJail: false, jailTurns: 0 } : p),
    }));
    get().addLog('🔓 支付 $500 保释出狱', 'info', playerId);
  },

  useJailCard: (playerId) => {
    set((st) => ({
      players: st.players.map((p) => p.id === playerId ? { ...p, inJail: false, jailTurns: 0 } : p),
    }));
    get().addLog('🃏 使用出狱卡', 'info', playerId);
  },

  checkBankrupt: (playerId) => {
    const s = get();
    const player = s.players[playerId];
    if (player.cash < 0 && player.deposit <= 0) {
      set((st) => {
        const newPlayers = st.players.map((p) => p.id === playerId ? { ...p, isBankrupt: true, cash: 0, deposit: 0 } : p);
        const newTiles = st.tiles.map((t) => t.ownerId === playerId ? { ...t, ownerId: null, houses: 0 } : t);
        const alive = newPlayers.filter((p) => !p.isBankrupt);
        return {
          players: newPlayers,
          tiles: newTiles,
          winnerId: alive.length === 1 ? alive[0].id : st.winnerId,
        };
      });
      get().addLog(`💀 ${player.name} 破产了！`, 'lose', playerId);
      // 检查胜利
      const s2 = get();
      if (s2.winnerId !== null) {
        const alive = s2.players.filter((p) => !p.isBankrupt);
        if (alive.length === 1) {
          get().addLog(`🏆 ${alive[0].name} 获胜！`, 'event', -1);
          get().openModal({ type: 'win', data: { winnerId: alive[0].id } });
        }
      }
    }
  },

  endTurn: () => {
    const s = get();
    const currentId = s.currentPlayerIndex;
    get().checkBankrupt(currentId);
    const s2 = get();

    // 检查胜利
    if (s2.winnerId !== null) {
      set({ phase: 'turnEnd' });
      return;
    }

    // 双倍连投：再来一次
    const cur = s2.players[currentId];
    if (cur.consecutiveDoubles > 0 && !cur.inJail) {
      set({ phase: 'idle' });
      get().addLog(`🎲 双倍！${cur.name} 再投一次`, 'event', cur.id);
      return;
    }

    // 下一个玩家
    let next = (currentId + 1) % s2.players.length;
    let safety = 0;
    while (s2.players[next].isBankrupt && safety < s2.players.length) {
      next = (next + 1) % s2.players.length;
      safety++;
    }
    if (safety >= s2.players.length) {
      // 全员破产
      set({ winnerId: s2.players.find((p) => !p.isBankrupt)?.id ?? 0 });
      return;
    }
    const nextRound = next <= currentId ? s2.round + 1 : s2.round;
    set({ currentPlayerIndex: next, round: nextRound, phase: 'idle', highlightedTile: null });
  },

  reset: () => {
    logIdCounter = 1;
    cashFlashId = 1;
    set({ ...initialState(2), modal: { type: null } });
  },
}));

// 给 player 添加 tools 字段（兜底）
declare module './types' {
  interface Player {
    tools?: Record<string, number>;
  }
}
