import { useGameStore } from '../../store/gameStore';

export default function Modal() {
  const modal = useGameStore((s) => s.modal);
  const closeModal = useGameStore((s) => s.closeModal);

  if (!modal.type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={closeModal}>
      <div
        className="bg-wood-100 rounded-2xl shadow-2xl border-4 border-wood-700 max-w-md w-[90%] max-h-[80vh] overflow-y-auto custom-scroll animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {modal.type === 'buyOrPass' && <BuyOrPass data={modal.data} />}
        {modal.type === 'rentPay' && <RentPay data={modal.data} />}
        {modal.type === 'chanceDetail' && <CardDetail data={modal.data} kind="chance" />}
        {modal.type === 'fateDetail' && <CardDetail data={modal.data} kind="fate" />}
        {modal.type === 'news' && <NewsFlash data={modal.data} />}
        {modal.type === 'shop' && <ShopPanel data={modal.data} />}
        {modal.type === 'lottery' && <Lottery data={modal.data} />}
        {modal.type === 'win' && <WinPanel data={modal.data} />}
        {modal.type === 'jail' && <JailAction />}
      </div>
    </div>
  );
}

function ModalHeader({ icon, title, color = 'amber' }: { icon: string; title: string; color?: string }) {
  const bg =
    color === 'red' ? 'bg-crimson' :
    color === 'green' ? 'bg-jade' :
    color === 'blue' ? 'bg-royal' :
    'bg-amber-500';
  return (
    <div className={`${bg} text-white text-center py-3 font-display text-xl text-glow-gold`}>
      <span className="text-2xl mr-2">{icon}</span>
      {title}
    </div>
  );
}

function BuyOrPass({ data }: { data: any }) {
  const players = useGameStore((s) => s.players);
  const tiles = useGameStore((s) => s.tiles);
  const currentId = useGameStore((s) => s.currentPlayerIndex);
  const buyProperty = useGameStore((s) => s.buyProperty);
  const upgradeProperty = useGameStore((s) => s.upgradeProperty);
  const resolveLanded = useGameStore((s) => s.resolveLanded);
  const player = players[currentId];
  const tile = tiles[data.tileIndex];
  const isUpgrade = data.mode === 'upgrade';
  const cost = data.price;
  const perk = player?.character.perk;
  const finalCost = isUpgrade && perk?.type === 'buildDiscount' ? Math.floor(cost * (1 - perk.value)) : cost;

  return (
    <div>
      <ModalHeader icon={isUpgrade ? '🏗️' : '🏠'} title={isUpgrade ? '升级地产' : '购买地产'} />
      <div className="p-5 text-wood-800">
        <div className="bg-paper rounded-lg p-3 mb-4 border-2 border-wood-300 text-center">
          <div className="font-display text-2xl mb-1">{tile.name}</div>
          {tile.color && (
            <div className="text-sm text-wood-600">类型：地产（{tile.color}）</div>
          )}
          {!isUpgrade && (
            <div className="mt-2 text-amber-800 font-display text-3xl">${cost.toLocaleString()}</div>
          )}
          {isUpgrade && (
            <div className="mt-2">
              <div className="text-sm text-wood-600 mb-1">当前：{['空地', '小房子', '中房子', '大房子', '豪华别墅', '旅馆'][tile.houses]}</div>
              <div className="text-amber-800 font-display text-3xl">${finalCost.toLocaleString()}</div>
              {perk?.type === 'buildDiscount' && (
                <div className="text-xs text-emerald-600 mt-1">{perk.label} 已生效</div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-between text-sm mb-3">
          <span>💵 你的现金：<b>${player.cash.toLocaleString()}</b></span>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-3d btn-jade flex-1"
            onClick={() => isUpgrade
              ? upgradeProperty(currentId, data.tileIndex)
              : buyProperty(currentId, data.tileIndex)
            }
            disabled={player.cash < finalCost}
          >
            {isUpgrade ? '🏗️ 升级' : '💰 购买'}
          </button>
          <button
            className="btn-3d btn-crimson flex-1"
            onClick={resolveLanded}
          >
            跳过
          </button>
        </div>
      </div>
    </div>
  );
}

function RentPay({ data }: { data: any }) {
  const players = useGameStore((s) => s.players);
  const tiles = useGameStore((s) => s.tiles);
  const currentId = useGameStore((s) => s.currentPlayerIndex);
  const resolveLanded = useGameStore((s) => s.resolveLanded);
  const sellStock = useGameStore((s) => s.sellStock);
  const set = useGameStore.setState;
  const player = players[currentId];
  const tile = tiles[data.tileIndex];
  const rent = data.rent;
  const canPay = player.cash >= rent;

  const handlePay = () => {
    set((s) => ({
      players: s.players.map((pp) => {
        if (pp.id === currentId) return { ...pp, cash: pp.cash - rent };
        if (pp.id === data.ownerId) return { ...pp, cash: pp.cash + rent };
        return pp;
      }),
    }));
    useGameStore.getState().addLog(`💸 ${player.name} 付给 ${data.ownerName} $${rent} 过路费`, 'lose', currentId);
    resolveLanded();
  };

  const handleSellAll = () => {
    for (const sym in player.stocks) {
      if ((player.stocks[sym] || 0) > 0) {
        sellStock(currentId, sym, player.stocks[sym]);
      }
    }
  };

  return (
    <div>
      <ModalHeader icon="💸" title="过路费" color="red" />
      <div className="p-5 text-wood-800">
        <div className="text-center mb-4">
          <div className="text-sm text-wood-600">踩到 <b>{data.ownerName}</b> 的地产</div>
          <div className="font-display text-2xl mt-1">{tile.name}</div>
          <div className="text-rose-700 font-display text-4xl mt-2">${rent.toLocaleString()}</div>
        </div>
        <div className="bg-paper rounded-lg p-3 mb-3 border border-wood-300 text-sm">
          <div>💵 现金：<b>${player.cash.toLocaleString()}</b></div>
          <div>📊 股票总值：<b>${Object.entries(player.stocks).reduce((s, [k, v]) => {
            const stock = useGameStore.getState().stocks.find((sk) => sk.symbol === k);
            return s + (stock?.price || 0) * (v as number);
          }, 0).toLocaleString()}</b></div>
        </div>
        {canPay ? (
          <button className="btn-3d btn-crimson w-full" onClick={handlePay}>
            💸 支付 ${rent.toLocaleString()}
          </button>
        ) : (
          <div className="space-y-2">
            <button className="btn-3d btn-jade w-full" onClick={handleSellAll}>
              📉 卖光股票套现
            </button>
            <button className="btn-3d btn-crimson w-full" onClick={() => {
              // 破产
              set((s) => ({
                players: s.players.map((p) => p.id === currentId ? { ...p, isBankrupt: true, cash: 0 } : p),
                tiles: s.tiles.map((t) => t.ownerId === currentId ? { ...t, ownerId: null, houses: 0 } : t),
              }));
              useGameStore.getState().addLog(`💀 ${player.name} 破产！`, 'lose', currentId);
              resolveLanded();
            }}>
              💀 宣布破产
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CardDetail({ data, kind }: { data: any; kind: 'chance' | 'fate' }) {
  const closeModal = useGameStore((s) => s.closeModal);
  const resolveLanded = useGameStore((s) => s.resolveLanded);
  const executeCard = useGameStore((s) => s.executeCard);
  const currentId = useGameStore((s) => s.currentPlayerIndex);
  const card = data.card;
  const playerId = data.playerId;
  const isChance = kind === 'chance';
  const bgGradient = isChance
    ? 'linear-gradient(135deg, #4A6FA8 0%, #2A4A7F 100%)'
    : 'linear-gradient(135deg, #E85A56 0%, #C73E3A 100%)';

  return (
    <div>
      <div style={{ background: bgGradient }} className="text-white text-center py-3 font-display text-xl text-glow-gold">
        <span className="text-2xl mr-2">{isChance ? '❓' : '🎴'}</span>
        {isChance ? '机会卡' : '命运卡'}
      </div>
      <div className="p-5 text-wood-800">
        <div className="bg-paper rounded-lg p-4 mb-4 border-2 border-wood-300 text-center">
          <div className="text-5xl mb-2">{isChance ? '❓' : '🎴'}</div>
          <div className="font-display text-2xl text-wood-800">{card.title}</div>
          <div className="text-wood-600 text-sm mt-2">{card.description}</div>
        </div>
        <button
          className="btn-3d w-full"
          onClick={() => {
            closeModal();
            setTimeout(() => executeCard(playerId ?? currentId, card.id), 100);
          }}
        >
          ✨ 执行
        </button>
      </div>
    </div>
  );
}

function NewsFlash({ data }: { data: any }) {
  const closeModal = useGameStore((s) => s.closeModal);
  const resolveLanded = useGameStore((s) => s.resolveLanded);
  const isUp = data.delta > 0;
  return (
    <div>
      <ModalHeader icon="📰" title="新闻" color="blue" />
      <div className="p-5 text-wood-800">
        <div className="bg-paper rounded-lg p-4 mb-4 border-2 border-wood-300 text-center" style={{ background: 'linear-gradient(180deg, #faf3d7 0%, #f0e5b8 100%)' }}>
          <div className="text-xs text-wood-500 mb-1">★ BREAKING NEWS ★</div>
          <div className="font-display text-2xl mb-2">{data.text}</div>
          <div className={`font-display text-3xl ${isUp ? 'text-rose-600' : 'text-green-700'}`}>
            {data.symbol} {isUp ? '↑' : '↓'} {Math.abs(data.delta * 100).toFixed(0)}%
          </div>
        </div>
        <button className="btn-3d w-full" onClick={() => { closeModal(); resolveLanded(); }}>
          知道了
        </button>
      </div>
    </div>
  );
}

function ShopPanel({ data }: { data: any }) {
  const players = useGameStore((s) => s.players);
  const currentId = useGameStore((s) => s.currentPlayerIndex);
  const buyItem = useGameStore((s) => s.buyItem);
  const resolveLanded = useGameStore((s) => s.resolveLanded);
  const player = players[currentId];
  return (
    <div>
      <ModalHeader icon="🏪" title="道具屋" />
      <div className="p-4 text-wood-800 space-y-2">
        <div className="text-sm text-wood-600 text-center mb-2">💰 你的现金：${player.cash.toLocaleString()}</div>
        {[
          { id: 'tool_roadblock', name: '路障', desc: '前方一格无法通过', price: 500, icon: '🚧' },
          { id: 'tool_doll', name: '机器娃娃', desc: '前方 10 格内随机传送敌人', price: 800, icon: '🤖' },
          { id: 'tool_bomb', name: '定时炸弹', desc: '前方 5 格爆炸收取过路费', price: 1200, icon: '💣' },
        ].map((item) => (
          <div key={item.id} className="bg-paper rounded-lg p-2 border-2 border-wood-300 flex items-center gap-2">
            <div className="text-3xl">{item.icon}</div>
            <div className="flex-1">
              <div className="font-bold">{item.name}</div>
              <div className="text-xs text-wood-600">{item.desc}</div>
            </div>
            <button
              className="btn-3d btn-crimson !py-1 !px-3 !text-sm"
              onClick={() => buyItem(currentId, item.id)}
              disabled={player.cash < item.price}
            >
              ${item.price}
            </button>
          </div>
        ))}
        <button className="btn-3d btn-jade w-full mt-3" onClick={resolveLanded}>
          离开商店
        </button>
      </div>
    </div>
  );
}

function Lottery({ data }: { data: any }) {
  const closeModal = useGameStore((s) => s.closeModal);
  const resolveLanded = useGameStore((s) => s.resolveLanded);
  return (
    <div>
      <ModalHeader icon="🎰" title="乐透开奖" color="green" />
      <div className="p-6 text-wood-800 text-center">
        <div className="text-6xl mb-3 animate-pop">🎉</div>
        <div className="font-display text-2xl">恭喜中奖！</div>
        <div className="font-display text-5xl text-amber-600 mt-2">+${data.amount.toLocaleString()}</div>
        <button className="btn-3d w-full mt-5" onClick={() => { closeModal(); resolveLanded(); }}>
          收下奖金
        </button>
      </div>
    </div>
  );
}

function WinPanel({ data }: { data: any }) {
  const players = useGameStore((s) => s.players);
  const winner = players[data.winnerId];
  const reset = useGameStore((s) => s.reset);
  if (!winner) return null;
  return (
    <div>
      <div className="text-center py-6 font-display text-3xl text-glow-gold text-amber-600 bg-gradient-to-r from-amber-300 to-amber-500">
        🏆 游戏结束 🏆
      </div>
      <div className="p-6 text-wood-800 text-center">
        <div className="text-7xl mb-3 animate-float">{winner.character.emoji}</div>
        <div className="text-xl text-wood-600">胜利者</div>
        <div className="font-display text-4xl text-amber-700 mt-1">{winner.name}</div>
        <div className="text-wood-600 mt-2">{winner.character.desc}</div>
        <button className="btn-3d btn-crimson w-full mt-6" onClick={reset}>
          🔄 再来一局
        </button>
      </div>
      <Confetti />
    </div>
  );
}

function Confetti() {
  const colors = ['#E85A56', '#E8C56A', '#4A8B5E', '#4A6FA8', '#7B3F99'];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="confetti"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: colors[i % colors.length],
            animationDuration: `${2 + Math.random() * 3}s`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  );
}

function JailAction() {
  const currentId = useGameStore((s) => s.currentPlayerIndex);
  const player = useGameStore((s) => s.players[currentId]);
  const payBail = useGameStore((s) => s.payBail);
  const useJailCard = useGameStore((s) => s.useJailCard);
  const closeModal = useGameStore((s) => s.closeModal);
  const rollDice = useGameStore((s) => s.rollDice);
  const hasJailCard = player?.cards.some((c) => c.id === 'getout');
  if (!player) return null;

  const handleTryDice = () => {
    closeModal();
    setTimeout(() => rollDice(), 100);
  };

  return (
    <div>
      <ModalHeader icon="🔒" title="在狱中" color="red" />
      <div className="p-5 text-wood-800">
        <div className="text-center mb-4">
          <div className="text-6xl mb-2">🔒</div>
          <div className="font-display text-2xl">你还需服刑 {player.jailTurns} 回合</div>
          <div className="text-sm text-wood-600 mt-1">掷出双倍可立即出狱</div>
        </div>
        <div className="space-y-2">
          {hasJailCard && (
            <button
              className="btn-3d btn-jade w-full"
              onClick={() => {
                useJailCard(currentId);
                closeModal();
                useGameStore.getState().addLog('🃏 使用出狱卡', 'info', currentId);
                useGameStore.getState().endTurn();
              }}
            >
              🃏 使用出狱卡
            </button>
          )}
          <button
            className="btn-3d w-full"
            disabled={player.cash < 500}
            onClick={() => {
              if (player.cash >= 500) {
                payBail(currentId);
                closeModal();
                useGameStore.getState().endTurn();
              }
            }}
          >
            💰 保释 ($500)
          </button>
          <button
            className="btn-3d btn-crimson w-full"
            onClick={handleTryDice}
          >
            🎲 掷骰子尝试越狱
          </button>
        </div>
      </div>
    </div>
  );
}
