import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Dice5, Building2, TrendingUp, AlertTriangle, Trophy, Users } from 'lucide-react';

export default function Help() {
  const navigate = useNavigate();
  return (
    <div className="w-full h-full bg-wood overflow-y-auto custom-scroll">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <button className="btn-icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-3xl text-amber-300 text-glow-gold">游戏说明</h1>
        </div>

        <div className="bg-wood-100 text-wood-800 rounded-2xl p-6 border-4 border-wood-700 space-y-6">
          <section>
            <h2 className="font-display text-2xl text-amber-700 flex items-center gap-2 mb-2">
              <Dice5 className="w-6 h-6" />游戏目标
            </h2>
            <p>通过投掷骰子在台湾地图上前进，购买土地、建造房屋、买卖股票，让其他玩家破产，最终成为唯一的富翁！</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-amber-700 flex items-center gap-2 mb-2">
              <Users className="w-6 h-6" />角色
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>孙小美</b>：建筑费用 -10%</li>
              <li><b>阿土仔</b>：过路费 +20%</li>
              <li><b>钱夫人</b>：初始现金 +20%</li>
              <li><b>乌咪</b>：股票收益 +30%</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-amber-700 flex items-center gap-2 mb-2">
              <Building2 className="w-6 h-6" />地产
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>走到空地可选择购买（自动归你所有）</li>
              <li>走到他人土地需支付过路费（按房屋等级递增）</li>
              <li>可在自己土地上加盖房屋：Ⅰ → Ⅱ → Ⅲ → Ⅳ → 旅馆</li>
              <li>同色地全部拥有时，盖房费用不变但租金大幅上涨</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-amber-700 flex items-center gap-2 mb-2">
              <TrendingUp className="w-6 h-6" />股市
            </h2>
            <p>4 只股票（微软/IBM/苹果/台积电）每 8 秒自动涨跌，可随时在右侧面板买卖，赚取差价！</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-amber-700 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-6 h-6" />特殊格子
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>🚩 <b>起点</b>：经过或停留领 $2000</li>
              <li>❓ <b>机会</b>：抽一张机会卡</li>
              <li>🎴 <b>命运</b>：抽一张命运卡</li>
              <li>📰 <b>新闻</b>：某只股票大幅涨跌</li>
              <li>🏪 <b>道具屋</b>：购买路障/机器娃娃/炸弹</li>
              <li>🎰 <b>乐透</b>：随机赢得 $1000-$5000</li>
              <li>🌳 <b>公园</b>：停留一回合，奖励 $500</li>
              <li>🧪 <b>仙药</b>：30 回合免疫负面事件</li>
              <li>🐢 <b>乌龟</b>：停止 2 回合</li>
              <li>🧧 <b>财神</b>：所有地产升级一档</li>
              <li>💀 <b>穷神</b>：现金减半，存款清零</li>
              <li>🔒 <b>监狱</b>：入狱 3 回合（连投 3 次双倍也会入狱）</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-amber-700 flex items-center gap-2 mb-2">
              <Trophy className="w-6 h-6" />胜利条件
            </h2>
            <p>其他玩家全部破产时，你就是大富翁！</p>
          </section>
        </div>
      </div>
    </div>
  );
}
