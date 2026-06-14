import type { Tile } from '../data/map';
import type { CharacterDef } from '../data/characters';
import type { Card } from '../data/cards';

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  prevPrice: number;
  history: number[];
  trend: 'up' | 'down' | 'flat';
}

export interface Player {
  id: number;
  name: string;
  character: CharacterDef;
  cash: number;
  deposit: number;
  position: number;
  stocks: Record<string, number>;
  cards: Card[];
  isBankrupt: boolean;
  isAI: boolean;
  inJail: boolean;
  jailTurns: number;
  skipTurns: number;        // 乌龟
  immortalTurns: number;    // 仙药
  parkStop: number;         // 公园停留
  consecutiveDoubles: number;
  cashFlash: { id: number; sign: '+' | '-'; amount: number } | null;
}

export type GamePhase =
  | 'idle'          // 等待投骰
  | 'rolling'       // 投骰中
  | 'moving'        // 棋子移动中
  | 'landed'        // 落点处理
  | 'modal'         // 弹窗中（卡/事件/商店）
  | 'turnEnd';      // 回合结束

export interface LogEntry {
  id: number;
  turn: number;
  playerId: number;
  message: string;
  type: 'info' | 'gain' | 'lose' | 'event' | 'system';
  timestamp: number;
}

export interface ModalState {
  type:
    | null
    | 'card'
    | 'news'
    | 'shop'
    | 'lottery'
    | 'bankrupt'
    | 'buyOrPass'
    | 'rentPay'
    | 'useItem'
    | 'win'
    | 'trade'
    | 'chanceDetail'
    | 'fateDetail'
    | 'hospital'
    | 'park'
    | 'fortune'
    | 'misfortune'
    | 'turtle'
    | 'immortal'
    | 'jail'
    | 'itemConfirm'
    | 'stockChart'
    | 'help';
  data?: any;
}

export interface GameState {
  // 配置
  playerCount: number;
  // 玩家
  players: Player[];
  // 棋盘
  tiles: Tile[];
  // 股票
  stocks: Stock[];
  // 回合
  currentPlayerIndex: number;
  round: number;
  dice: [number, number];
  diceRolling: boolean;
  phase: GamePhase;
  // 日志
  log: LogEntry[];
  // 弹窗
  modal: ModalState;
  // 高亮
  highlightedTile: number | null;
  // 赢家
  winnerId: number | null;
  // 工具
  tools: Record<string, number>;
  // 移动进度
  movingFrom: number;
  movingTo: number;
  // 设置
  isPaused: boolean;
}
