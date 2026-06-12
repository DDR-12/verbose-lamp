/* =========================================================
 * 像素机甲对战 · 核心脚本
 *  - Canvas 手绘像素素材（无外部图片依赖）
 *  - 固定逻辑步长 ~60FPS，渲染按 requestAnimationFrame
 *  - 状态机：ready → playing → paused → over
 *  - 两个玩家机甲：P1(RED BLAZE) / P2(AZURE THUNDER)
 * ========================================================= */
(() => {
  'use strict';

  // ---------- 基础常量 ----------
  const W = 960;                 // 画布逻辑宽度
  const H = 480;                 // 画布逻辑高度
  const GROUND_Y = 400;          // 地面 y（像素）
  const GRAVITY = 0.9;           // 每帧重力
  const JUMP_V = -15;            // 跳跃初速度
  const MOVE_SPEED = 3.6;        // 地面移动速度
  const ROUND_TIME = 60;         // 单局时长（秒）
  const MAX_HP = 100;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false; // 像素风：关闭平滑

  // HUD 元素
  const hp1El = document.getElementById('hp1');
  const hp2El = document.getElementById('hp2');
  const hp1Text = document.getElementById('hp1-text');
  const hp2Text = document.getElementById('hp2-text');
  const clockEl = document.getElementById('clock');
  const roundEl = document.getElementById('round');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlaySub = document.getElementById('overlay-sub');
  const stateTag = document.getElementById('state-tag');

  // ---------- 输入系统 ----------
  const keys = new Set();
  const pressed = new Set(); // 本帧新按下
  window.addEventListener('keydown', (e) => {
    // 避免方向键滚动页面
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
      e.preventDefault();
    }
    const k = normalize(e.key);
    if (!keys.has(k)) pressed.add(k);
    keys.add(k);

    // 全局键
    if (pressed.has('KeyR')) resetGame(true);
    if (pressed.has('KeyP')) togglePause();
    if (game.state === 'ready' && (pressed.has('Space') || pressed.has('Enter'))) {
      startRound();
    }
    if (game.state === 'over' && (pressed.has('Space') || pressed.has('Enter') || pressed.has('KeyR'))) {
      resetGame(true);
    }
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(normalize(e.key));
  });

  function normalize(k) {
    if (k === ' ') return 'Space';
    if (k === 'Enter') return 'Enter';
    if (k.length === 1) return 'Key' + k.toUpperCase();
    return k;
  }

  // P1 / P2 输入映射
  const P1_INPUTS = {
    left: 'KeyA',
    right: 'KeyD',
    jump: 'KeyW',
    block: 'KeyS',
    melee: 'KeyJ',
    ranged: 'KeyK',
  };
  const P2_INPUTS = {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    jump: 'ArrowUp',
    block: 'ArrowDown',
    melee: 'Key[',
    ranged: 'Key]',
  };

  // ---------- 游戏状态 ----------
  const game = {
    state: 'ready',          // ready | playing | paused | over
    round: 1,
    timeLeft: ROUND_TIME,
    timerAccum: 0,
    frame: 0,
    winner: null,
  };

  // ---------- 机甲工厂 ----------
  function createMech(id, x, color, palette) {
    return {
      id,
      x, y: GROUND_Y - 72,
      vx: 0, vy: 0,
      w: 44, h: 72,
      facing: id === 1 ? 1 : -1,
      hp: MAX_HP,
      onGround: true,
      blocking: false,
      // 冷却（帧数）
      meleeCD: 0,
      rangedCD: 0,
      // 动作持续
      meleeActive: 0,  // 近战判定窗口
      hurtFlash: 0,    // 受击闪烁
      // 动画帧（腿部摆动）
      walkPhase: 0,
      color,
      palette, // { body, dark, light, eye }
      // 状态
      alive: true,
    };
  }

  let p1, p2, projectiles, hits;
  function resetGame(showReady) {
    p1 = createMech(1, 240, '#ff4d6d', {
      body: '#ff4d6d', dark: '#7a1a2e', light: '#ffb3c0', eye: '#fff27a',
    });
    p2 = createMech(2, 720, '#4dc9ff', {
      body: '#4dc9ff', dark: '#1a5a7a', light: '#b3ecff', eye: '#fff27a',
    });
    p2.facing = -1;
    projectiles = [];
    hits = [];
    game.timeLeft = ROUND_TIME;
    game.timerAccum = 0;
    game.winner = null;
    game.state = showReady ? 'ready' : 'playing';
    updateHUD();
    if (showReady) {
      showOverlay('READY', '按 空格 / Enter 开始');
      stateTag.textContent = '准备中';
    } else {
      hideOverlay();
      stateTag.textContent = '对战中';
    }
  }

  function startRound() {
    game.state = 'playing';
    hideOverlay();
    stateTag.textContent = '对战中';
  }

  function togglePause() {
    if (game.state === 'playing') {
      game.state = 'paused';
      showOverlay('PAUSED', '按 P 继续');
      stateTag.textContent = '已暂停';
    } else if (game.state === 'paused') {
      game.state = 'playing';
      hideOverlay();
      stateTag.textContent = '对战中';
    }
  }

  function showOverlay(title, sub) {
    overlayTitle.textContent = title;
    overlaySub.textContent = sub;
    overlay.classList.remove('hidden');
  }
  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  // ---------- 主循环 ----------
  let last = performance.now();
  const STEP = 1000 / 60; // 固定步长
  let accum = 0;

  function loop(now) {
    const dt = Math.min(now - last, 100);
    last = now;
    accum += dt;
    while (accum >= STEP) {
      if (game.state === 'playing') tick();
      accum -= STEP;
    }
    render();
    // 清除本帧按下
    pressed.clear();
    requestAnimationFrame(loop);
  }

  function tick() {
    game.frame++;

    // 计时
    game.timerAccum += STEP;
    if (game.timerAccum >= 1000) {
      game.timerAccum -= 1000;
      game.timeLeft--;
      if (game.timeLeft <= 0) {
        game.timeLeft = 0;
        endByTime();
      }
      updateHUD();
    }

    stepMech(p1, p2, P1_INPUTS);
    stepMech(p2, p1, P2_INPUTS);
    stepProjectiles();
    stepHits();

    // 胜负：血量归零
    if (p1.hp <= 0 && game.state === 'playing') {
      game.winner = 2; finishGame();
    } else if (p2.hp <= 0 && game.state === 'playing') {
      game.winner = 1; finishGame();
    }
  }

  function endByTime() {
    if (p1.hp === p2.hp) {
      game.winner = 0; // 平局
    } else {
      game.winner = p1.hp > p2.hp ? 1 : 2;
    }
    finishGame();
  }

  function finishGame() {
    game.state = 'over';
    const name = game.winner === 0 ? 'DRAW'
               : game.winner === 1 ? 'P1 · RED BLAZE WINS'
                                    : 'P2 · AZURE THUNDER WINS';
    showOverlay(name, '按 空格 / R 再来一局');
    stateTag.textContent = '对局结束';
  }

  // ---------- 玩家更新 ----------
  function stepMech(m, enemy, map) {
    if (!m.alive) return;

    // 冷却 / 状态计时
    m.meleeCD = Math.max(0, m.meleeCD - 1);
    m.rangedCD = Math.max(0, m.rangedCD - 1);
    m.meleeActive = Math.max(0, m.meleeActive - 1);
    m.hurtFlash = Math.max(0, m.hurtFlash - 1);

    // 输入
    const leftKey  = keys.has(map.left);
    const rightKey = keys.has(map.right);
    const jumpKey  = pressed.has(map.jump);
    const blockKey = keys.has(map.block);
    const meleeKey = pressed.has(map.melee);
    const rangedKey = pressed.has(map.ranged);

    // 防御状态
    const canAct = !blockKey;
    m.blocking = blockKey && m.onGround;

    // 水平移动（防御时不能移动）
    let ax = 0;
    if (!m.blocking) {
      if (leftKey)  ax -= 1;
      if (rightKey) ax += 1;
    }
    m.vx = ax * MOVE_SPEED;
    if (ax !== 0) { m.facing = ax; m.walkPhase += 0.25; }

    // 跳跃
    if (jumpKey && m.onGround && !m.blocking) {
      m.vy = JUMP_V;
      m.onGround = false;
    }

    // 重力
    m.vy += GRAVITY;
    m.x += m.vx;
    m.y += m.vy;

    // 地面判定
    if (m.y + m.h >= GROUND_Y) {
      m.y = GROUND_Y - m.h;
      m.vy = 0;
      m.onGround = true;
    }

    // 左右边界
    if (m.x < 20) m.x = 20;
    if (m.x + m.w > W - 20) m.x = W - 20 - m.w;

    // 面向对手（静止时自动转身朝向敌人）
    if (ax === 0) {
      m.facing = enemy.x + enemy.w / 2 > m.x + m.w / 2 ? 1 : -1;
    }

    // 玩家-玩家 碰撞（简单排斥）
    if (rectsOverlap(m, enemy)) {
      const pushX = ((m.x + m.w / 2) < (enemy.x + enemy.w / 2)) ? -1 : 1;
      m.x     += pushX * 1.2;
      enemy.x -= pushX * 1.2;
    }

    // 攻击输入
    if (canAct && !m.blocking) {
      if (meleeKey && m.meleeCD === 0) {
        m.meleeCD = 28;
        m.meleeActive = 10;
        // 立即判断命中（允许前几帧），在 stepHits 处理
      }
      if (rangedKey && m.rangedCD === 0) {
        m.rangedCD = 55;
        spawnProjectile(m);
      }
    }
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ---------- 投射物 ----------
  function spawnProjectile(m) {
    projectiles.push({
      owner: m.id,
      x: m.x + m.w / 2 + m.facing * 22,
      y: m.y + 28,
      vx: m.facing * 7,
      life: 80,
      color: m.palette.body,
    });
  }

  function stepProjectiles() {
    for (const p of projectiles) {
      p.x += p.vx;
      p.life--;
    }
    // 投射物对撞：不同所有者 + 相向运动 + 重叠时互相抵消
    for (let i = 0; i < projectiles.length; i++) {
      const a = projectiles[i];
      if (a.life <= 0) continue;
      for (let j = i + 1; j < projectiles.length; j++) {
        const b = projectiles[j];
        if (b.life <= 0) continue;
        if (a.owner === b.owner) continue;
        if (Math.sign(a.vx) === Math.sign(b.vx)) continue; // 需相向
        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);
        if (dx < 14 && dy < 12) {
          a.life = 0; b.life = 0;
          hits.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, life: 18, kind: 'clash' });
        }
      }
    }
    // 命中判定
    for (const p of projectiles) {
      if (p.life <= 0) continue;
      const target = p.owner === 1 ? p2 : p1;
      if (p.x > target.x && p.x < target.x + target.w &&
          p.y > target.y && p.y < target.y + target.h) {
        applyDamage(target, 8, p.owner);
        p.life = 0;
        hits.push({ x: p.x, y: p.y, life: 14, kind: 'spark' });
      }
    }
    // 越界清除
    projectiles = projectiles.filter(p => p.life > 0 && p.x > -20 && p.x < W + 20);
  }

  // ---------- 近战命中 ----------
  function stepHits() {
    for (const m of [p1, p2]) {
      if (m.meleeActive <= 0) continue;
      // 命中区域：前方 44x40 矩形
      const hx = m.facing === 1 ? m.x + m.w : m.x - 44;
      const hy = m.y + 16;
      const hw = 44, hh = 40;
      const enemy = m.id === 1 ? p2 : p1;
      if (hx < enemy.x + enemy.w && hx + hw > enemy.x &&
          hy < enemy.y + enemy.h && hy + hh > enemy.y) {
        // 避免同一击内重复判定：记一次
        if (!m._hitThisSwing) {
          applyDamage(enemy, 14, m.id);
          hits.push({ x: hx + hw / 2, y: hy + hh / 2, life: 12, kind: 'hit' });
          m._hitThisSwing = true;
        }
      }
    }
    for (const m of [p1, p2]) {
      if (m.meleeActive === 0) m._hitThisSwing = false;
    }

    // 命中特效寿命
    for (const h of hits) h.life--;
    hits = hits.filter(h => h.life > 0);
  }

  function applyDamage(target, amount, attackerId) {
    // 防御减伤
    if (target.blocking) {
      amount = Math.max(1, Math.round(amount * 0.3));
      hits.push({ x: target.x + target.w / 2, y: target.y + 30, life: 10, kind: 'block' });
    }
    target.hp = Math.max(0, target.hp - amount);
    target.hurtFlash = 10;
    // 轻微击退
    const kb = attackerId === 1 ? 1 : -1;
    target.x += kb * 6;
    updateHUD();
  }

  // ---------- HUD ----------
  function updateHUD() {
    hp1El.style.width = (p1.hp / MAX_HP * 100) + '%';
    hp2El.style.width = (p2.hp / MAX_HP * 100) + '%';
    hp1Text.textContent = p1.hp;
    hp2Text.textContent = p2.hp;
    clockEl.textContent = game.timeLeft;
    roundEl.textContent = game.round;
  }

  /* ==========================================================
   * 渲染：像素风手绘
   *  - 场景：远景山/星星、中景建筑、地面格
   *  - 角色：多矩形拼装，含行走 / 攻击 / 受击动画
   * ========================================================== */

  function render() {
    // 背景
    drawSky();
    drawStars();
    drawMountains();
    drawBuildings();
    drawGround();

    // 角色与投射物
    drawMech(p1);
    drawMech(p2);

    for (const p of projectiles) drawProjectile(p);
    for (const h of hits) drawHitFx(h);

    // 冷却条
    drawCooldownBar(p1, 20);
    drawCooldownBar(p2, W - 160);
  }

  // --- 背景 ---
  function drawSky() {
    // 渐变夜空
    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, '#0b0e2a');
    g.addColorStop(0.6, '#1a1650');
    g.addColorStop(1, '#3b1c5a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, GROUND_Y);
  }

  // 用确定性伪随机分布“星星”
  const starSeed = [];
  (function initStars() {
    let s = 1337;
    for (let i = 0; i < 60; i++) {
      s = (s * 9301 + 49297) % 233280;
      const x = (s / 233280) * W;
      s = (s * 9301 + 49297) % 233280;
      const y = (s / 233280) * (GROUND_Y - 120);
      s = (s * 9301 + 49297) % 233280;
      const t = (s / 233280);
      starSeed.push({ x: Math.floor(x), y: Math.floor(y), tw: t });
    }
  })();
  function drawStars() {
    for (const s of starSeed) {
      const on = ((game.frame / 30 + s.tw * 6) | 0) % 3 !== 0;
      ctx.fillStyle = on ? '#ffffff' : '#6a74c9';
      ctx.fillRect(s.x, s.y, 2, 2);
    }
  }

  function drawMountains() {
    // 远景：锯齿山
    const baseY = GROUND_Y - 80;
    ctx.fillStyle = '#271b4a';
    for (let i = 0; i < W; i += 8) {
      const h = Math.abs(Math.sin(i * 0.012) * 40 + Math.sin(i * 0.05) * 14);
      ctx.fillRect(i, baseY - h, 8, 80 + h);
    }
    // 近景第二层
    ctx.fillStyle = '#3a2670';
    for (let i = 0; i < W; i += 6) {
      const h = Math.abs(Math.sin(i * 0.02 + 1.7) * 26 + Math.sin(i * 0.07) * 8);
      ctx.fillRect(i, baseY + 20 - h, 6, 60 + h);
    }
  }

  function drawBuildings() {
    // 中景：像素大楼剪影
    const colors = ['#1a1f4a', '#252b66', '#171a3d'];
    const lineY = GROUND_Y - 40;
    let x = 0;
    let seed = 7;
    while (x < W) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      const bw = 40 + (seed % 40);
      const bh = 80 + (seed % 110);
      const col = colors[seed % colors.length];
      ctx.fillStyle = col;
      ctx.fillRect(x, lineY - bh, bw, bh);
      // 窗户
      ctx.fillStyle = '#ffd166';
      for (let wy = lineY - bh + 10; wy < lineY - 10; wy += 14) {
        for (let wx = x + 6; wx < x + bw - 6; wx += 12) {
          if (((wx + wy + seed) % 7) < 3) ctx.fillRect(wx, wy, 4, 4);
        }
      }
      x += bw + 2;
    }
  }

  function drawGround() {
    // 地面主色
    ctx.fillStyle = '#0d0f24';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    // 顶部亮线
    ctx.fillStyle = '#5345b5';
    ctx.fillRect(0, GROUND_Y, W, 2);
    ctx.fillStyle = '#2a2e66';
    ctx.fillRect(0, GROUND_Y + 2, W, 6);
    // 地面网格
    ctx.fillStyle = '#1f234a';
    for (let i = 0; i < W; i += 24) ctx.fillRect(i, GROUND_Y + 12, 2, H - GROUND_Y);
    for (let j = GROUND_Y + 30; j < H; j += 22) ctx.fillRect(0, j, W, 2);
  }

  // --- 像素绘制辅助：以整数像素绘制 ---
  function px(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
  }

  // --- 机甲 ---
  function drawMech(m) {
    if (!m.alive) return;
    const cx = Math.floor(m.x);
    const cy = Math.floor(m.y);
    const pal = m.palette;

    // 受击闪烁：每 2 帧切换为白色
    const flash = m.hurtFlash > 0 && (game.frame % 4 < 2);
    const bodyCol = flash ? '#ffffff' : pal.body;
    const darkCol = flash ? '#ffffff' : pal.dark;
    const lightCol = flash ? '#ffffff' : pal.light;
    const eyeCol  = pal.eye;

    // 行走相位（仅地面移动时）
    const walk = Math.sin(m.walkPhase) * 3;
    const legOffL = m.onGround ? (m.vx !== 0 ? walk : 0) : -3;
    const legOffR = m.onGround ? (m.vx !== 0 ? -walk : 0) : -3;

    // 防御姿态：略微蹲下
    const crouch = m.blocking ? 6 : 0;
    const top = cy + crouch;

    // 阴影
    px(cx + 2, GROUND_Y - 3, m.w - 4, 3, 'rgba(0,0,0,0.45)');

    // 腿
    px(cx + 6,  top + 50, 10, 22 - crouch, darkCol);
    px(cx + 28, top + 50, 10, 22 - crouch, darkCol);
    // 脚
    px(cx + 4,  top + 70 - crouch + legOffL, 14, 4, bodyCol);
    px(cx + 26, top + 70 - crouch + legOffR, 14, 4, bodyCol);

    // 躯干
    px(cx + 6, top + 20, 32, 32, bodyCol);
    px(cx + 6, top + 20, 32, 4, lightCol); // 胸甲亮条
    px(cx + 6, top + 48, 32, 4, darkCol);  // 腰甲暗条
    // 胸甲核心
    px(cx + 18, top + 30, 8, 8, '#0b0d1a');
    px(cx + 20, top + 32, 4, 4, eyeCol);

    // 肩甲
    px(cx + 2, top + 20, 6, 14, darkCol);
    px(cx + 36, top + 20, 6, 14, darkCol);

    // 头
    px(cx + 12, top + 4, 20, 16, bodyCol);
    px(cx + 12, top + 4, 20, 3, darkCol);
    // 眼/护目镜
    const eyeX = m.facing === 1 ? cx + 20 : cx + 14;
    px(eyeX, top + 10, 10, 4, eyeCol);
    px(eyeX + 2, top + 11, 2, 2, '#ffffff');
    // 头顶天线
    px(cx + 20, top - 4, 2, 8, darkCol);
    px(cx + 19, top - 6, 4, 2, bodyCol);

    // 手臂 + 武器
    const armY = top + 24;
    // 后臂
    const backX = m.facing === 1 ? cx + 2 : cx + 36;
    px(backX, armY, 6, 20, bodyCol);

    // 前臂（朝向 facing，攻击时前伸）
    const swing = m.meleeActive > 0 ? 14 : 0;
    const frontX = m.facing === 1 ? cx + 36 + swing : cx - 8 - swing;
    px(frontX, armY, 10, 18, bodyCol);
    px(frontX, armY, 10, 4, lightCol);
    // 武器 / 拳头
    if (m.meleeActive > 0) {
      // 展开武器为“手刀”
      const bladeX = m.facing === 1 ? frontX + 10 : frontX - 18;
      px(bladeX, armY + 2, 18, 6, lightCol);
      px(bladeX, armY + 4, 18, 2, '#ffffff');
    } else {
      // 拳/炮口
      const gunX = m.facing === 1 ? frontX + 10 : frontX - 6;
      px(gunX, armY + 6, 6, 8, darkCol);
      px(gunX + (m.facing === 1 ? 4 : 0), armY + 8, 2, 4, eyeCol);
    }

    // 防御盾
    if (m.blocking) {
      const sx = m.facing === 1 ? cx - 10 : cx + m.w + 4;
      px(sx, top + 16, 10, 44, '#ffffff');
      px(sx + 2, top + 20, 6, 36, '#9ee3ff');
      px(sx + 3, top + 24, 4, 28, '#ffffff');
    }
  }

  function drawProjectile(p) {
    // 螺旋光弹
    px(p.x - 6, p.y - 4, 12, 8, '#ffffff');
    px(p.x - 4, p.y - 2, 8,  4, p.color);
    px(p.x + 6 * Math.sign(p.vx) * -1, p.y - 2, 4, 4, p.color);
    // 尾迹
    for (let i = 1; i <= 3; i++) {
      px(p.x - Math.sign(p.vx) * i * 4, p.y, 2, 2, '#ffffff');
    }
  }

  function drawHitFx(h) {
    const a = h.life;
    if (h.kind === 'hit') {
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(h.x - a, h.y - 1, a * 2, 2);
      ctx.fillRect(h.x - 1, h.y - a, 2, a * 2);
      ctx.fillStyle = '#ff4d6d';
      ctx.fillRect(h.x - a + 3, h.y - 3, 3, 3);
      ctx.fillRect(h.x + a - 6, h.y, 3, 3);
    } else if (h.kind === 'spark') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(h.x - a/2, h.y - a/2, a, a);
      ctx.fillStyle = '#9ee3ff';
      ctx.fillRect(h.x - a, h.y, a * 2, 2);
    } else if (h.kind === 'block') {
      ctx.strokeStyle = '#9ee3ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(h.x - a * 2, h.y - a * 2, a * 4, a * 4);
    } else if (h.kind === 'clash') {
      // 对撞爆炸：红黄十字 + 外扩方块
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(h.x - a, h.y - 2, a * 2, 4);
      ctx.fillRect(h.x - 2, h.y - a, 4, a * 2);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(h.x - a + 3, h.y - a + 3, 4, 4);
      ctx.fillRect(h.x + a - 7, h.y - a + 3, 4, 4);
      ctx.fillRect(h.x - a + 3, h.y + a - 7, 4, 4);
      ctx.fillRect(h.x + a - 7, h.y + a - 7, 4, 4);
      ctx.fillStyle = '#ff4d6d';
      ctx.fillRect(h.x - 3, h.y - 3, 6, 6);
    }
  }

  // 冷却条
  function drawCooldownBar(m, x) {
    const y = GROUND_Y + 20;
    px(x, y, 140, 8, '#0b0d1a');
    px(x, y, 140 * (1 - m.meleeCD / 28), 4, m.palette.body);
    px(x, y + 4, 140 * (1 - m.rangedCD / 55), 4, '#9ee3ff');
    ctx.fillStyle = '#9aa3d1';
    ctx.font = '10px "Courier New", monospace';
    ctx.fillText('MELEE / RANGED CD', x, y + 22);
  }

  // ---------- 启动 ----------
  resetGame(true);
  requestAnimationFrame(loop);
})();
