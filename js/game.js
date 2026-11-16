/* ============================================
 * game.js — 游戏引擎
 * 格子战场 + 植物/僵尸/子弹系统 + 单人生存 + 双人对战
 * ============================================ */
'use strict';

// ---------------- 常量与配置 ----------------
const ROWS = 5, COLS = 9, CELL_W = 88, CELL_H = 100;
const FIELD_W = COLS * CELL_W, FIELD_H = ROWS * CELL_H;

// 逐帧动画列表生成器（images/plants/..., images/zombies/...）
function frameList(dir, prefix, n, pad = 2) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(`images/${dir}/${prefix}_${String(i).padStart(pad, '0')}.png`);
  return arr;
}

// 原版风格卡片图
const CARD_IMG = {
  sunflower: 'SunFlower.png', wallnut: 'WallNut.png', peashooter: 'Peashooter.png',
  repeater: 'Repeater.png', cherrybomb: 'CherryBomb.png', gatlingpea: 'GatlingPea.png',
  chomper: 'Chomper.png',
};

const PLANT_TYPES = {
  sunflower:  { name: '向日葵',   cost: 50,  hp: 300,  produce: 9,
    idle: frameList('plants/sunflower/idle', 'idle', 18) },
  wallnut:    { name: '坚果墙',   cost: 50,  hp: 1200,
    idle: frameList('plants/wallnut/idleH', 'idleH', 16),
    idleM: frameList('plants/wallnut/idleM', 'idleM', 11),
    idleL: frameList('plants/wallnut/idleL', 'idleL', 15) },
  peashooter: { name: '豌豆射手', cost: 100, hp: 300,  dmg: 20, rate: 1.4,
    idle: frameList('plants/peashooter/idle', 'idle', 8),
    attack: frameList('plants/peashooter/attack', 'attack', 8) },
  gatlingpea: { name: '机枪豌豆', cost: 175, hp: 300,  dmg: 20, rate: 1.6, shots: 4,
    idle: frameList('plants/gatlingpea/idle', 'idle', 13),
    attack: frameList('plants/gatlingpea/attack', 'attack', 13) },
  cherrybomb: { name: '樱桃炸弹', cost: 150, hp: 100,  boom: true,
    idle: frameList('plants/cherrybomb/idle', 'idle', 7),
    attack: frameList('plants/cherrybomb/attack', 'attack', 5) },
  repeater:   { name: '双发射手', cost: 200, hp: 300,  dmg: 20, rate: 1.4, shots: 2,
    idle: frameList('plants/repeater/idle', 'idle', 15),
    attack: frameList('plants/repeater/attack', 'attack', 15) },
  chomper:    { name: '大嘴花',   cost: 150, hp: 300,  chomp: true, chewTime: 3.5, big: true,
    idle: frameList('plants/chomper/idle', 'idle', 13),
    attack: frameList('plants/chomper/attack', 'attack', 9),
    digest: frameList('plants/chomper/digest', 'digest', 6) },
};

const ZOMBIE_TYPES = {
  normal: { name: '普通僵尸', hp: 200, speed: 13, dmg: 25, hat: null },
  cone:   { name: '路障僵尸', hp: 420, speed: 13, dmg: 25, hat: 'images/hat_cone.svg' },
  bucket: { name: '铁桶僵尸', hp: 720, speed: 11, dmg: 30, hat: 'images/hat_bucket.svg' },
};

// 僵尸动画帧（三态共用尺寸 166×144）
const ZOMBIE_FRAMES = {
  run:    frameList('zombies/run', 'run', 31),
  attack: frameList('zombies/attack', 'attack', 21),
  die:    frameList('zombies/die', 'die', 10),
};

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
const cellX = c => c * CELL_W + CELL_W / 2;
const cellY = r => r * CELL_H + CELL_H / 2;

/* ============================================================
 * EduGame 主类
 * opts: { mode:'solo'|'battle', subject, grade, zombieSpeedMul,
 *         plantPowerMul, duration, answerMode, onFinish(report) }
 * ============================================================ */
class EduGame {
  constructor(root, opts) {
    this.root = root;
    this.o = Object.assign({
      mode: 'solo', subject: 'pinyin', grade: 2,
      zombieSpeedMul: 1, plantPowerMul: 1, duration: 300, answerMode: 'choice',
      onFinish: () => {},
    }, opts);
    QuestionEngine.config.subject = this.o.subject;
    QuestionEngine.config.grade = this.o.grade;
    QuestionEngine.config.answerMode = this.o.answerMode;

    this.time = 0;            // 已进行秒数
    this.paused = false;
    this.over = false;
    this.sun = 150;
    this.kills = 0;
    this.plants = []; this.zombies = []; this.peas = []; this.suns = [];
    this.mowers = [];         // 每行小推车
    this.dying = [];          // 播放死亡动画的僵尸
    this.selectedCard = null;
    this.cardCooldown = {};   // type -> 剩余秒
    this.attackLock = 0;      // 答错后植物停火剩余秒
    this.attackBuff = 0;      // 答对波次题后攻击加成剩余秒
    this.nextSunFall = 5;
    this.qStats = { total: 0, right: 0, timeSum: 0 };
    this.spawnPlan = this._makeSpawnPlan();
    this.waveFlag = {};       // 大波是否已弹题

    // 对战模式状态
    if (this.o.mode === 'battle') {
      this.baseHp = 5;
      this.p1 = { score: 0, correct: 0, total: 0, timeSum: 0, summons: 0, streak: 0, q: null, lockUntil: 0, buffUntil: 0 };
      this.p2 = { score: 0, correct: 0, total: 0, timeSum: 0, summons: 0, streak: 0, q: null, lockUntil: 0, buffUntil: 0 };
      this.roundId = 0;
      this.raceWinners = {};
      this.nextRound = 4;
      this.roundInterval = 7;
      this.o.duration = 180;
    } else {
      this.nextBigWaveTip = null;
    }

    this._build();
    this._last = performance.now();
    this._raf = requestAnimationFrame(t => this._loop(t));
  }

  // ==================== DOM 构建 ====================
  _build() {
    this.root.innerHTML = '';
    const wrap = el('div', 'game-scale');
    this.scaleEl = wrap;
    this.root.appendChild(wrap);

    const stage = el('div', 'stage' + (this.o.mode === 'battle' ? ' battle' : ''));
    wrap.appendChild(stage);

    // 顶栏
    const top = el('div', 'topbar');
    this.timeEl = el('span', 'tb-item', '⏱ 0:00');
    this.killEl = el('span', 'tb-item', '💀 0');
    const btnFs = el('button', 'tb-btn fs-btn', document.fullscreenElement ? '⛶ 取消全屏' : '⛶ 全屏');
    btnFs.onclick = () => window.toggleFullscreen();
    const btnPause = el('button', 'tb-btn', '⏸ 暂停');
    btnPause.onclick = () => this.togglePause();
    const btnQuit = el('button', 'tb-btn', '🏠 退出');
    btnQuit.onclick = () => { this.destroy(); if (this.o.onQuit) this.o.onQuit(); };
    top.append(this.timeEl, this.killEl);
    if (this.o.mode === 'solo') {
      this.sunEl = el('span', 'tb-item sun-count', '☀ 150');
      top.appendChild(this.sunEl);
    } else {
      this.baseEl = el('span', 'tb-item', '🏠 基地血量: 5');
      top.appendChild(this.baseEl);
    }
    top.append(btnFs, btnPause, btnQuit);
    stage.appendChild(top);

    // 主区
    const main = el('div', 'main-area');
    stage.appendChild(main);

    // 对战面板 P1
    if (this.o.mode === 'battle') {
      this.p1Panel = this._buildPanel('p1', '🛡 玩家1 · 植物方');
      main.appendChild(this.p1Panel.box);
    }

    // 战场
    const fieldWrap = el('div', 'field-wrap');
    const field = el('div', 'field');
    field.style.width = FIELD_W + 'px';
    field.style.height = FIELD_H + 'px';
    this.field = field;
    fieldWrap.appendChild(field);
    main.appendChild(fieldWrap);

    // 格子
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const cell = el('div', 'grid-cell');
      cell.style.left = c * CELL_W + 'px';
      cell.style.top = r * CELL_H + 'px';
      cell.dataset.r = r; cell.dataset.c = c;
      cell.onclick = () => this._onCell(r, c);
      field.appendChild(cell);
    }

    // 小推车
    for (let r = 0; r < ROWS; r++) {
      const m = el('img', 'mower');
      m.src = 'images/car.png';
      m.style.left = '4px'; m.style.top = cellY(r) - 24 + 'px';
      field.appendChild(m);
      this.mowers.push({ row: r, alive: true, running: false, el: m, x: 4 });
    }

    // 对战面板 P2
    if (this.o.mode === 'battle') {
      this.p2Panel = this._buildPanel('p2', '🧟 玩家2 · 僵尸方');
      main.appendChild(this.p2Panel.box);
    }

    // 卡片栏（仅单人）
    if (this.o.mode === 'solo') {
      const bar = el('div', 'cardbar');
      Object.entries(PLANT_TYPES).forEach(([type, p]) => {
        const card = el('div', 'plant-card');
        card.innerHTML = `<img class="cardimg" src="images/cards/${CARD_IMG[type]}" alt="${p.name}"><span class="cost">☀${p.cost}</span><span class="pname">${p.name}</span>`;
        card.onclick = () => this._selectCard(type, card);
        card.dataset.type = type;
        bar.appendChild(card);
      });
      const shovel = el('div', 'plant-card shovel');
      shovel.innerHTML = '<img src="images/shovel.svg" alt="铲子"><span class="pname">铲子</span>';
      shovel.onclick = () => { this.selectedCard = 'shovel'; this._markCards(); };
      bar.appendChild(shovel);
      stage.appendChild(bar);
      this.cardEls = {};
      bar.querySelectorAll('.plant-card').forEach(c => { if (c.dataset.type) this.cardEls[c.dataset.type] = c; });
    }

    // 弹题模态框（单人）
    this.qmodal = el('div', 'qmodal hidden');
    stage.appendChild(this.qmodal);

    // 暂停遮罩（持久可见，避免“看似卡死”）
    this.pauseOverlay = el('div', 'pause-overlay hidden');
    const pbox = el('div', 'pause-box');
    pbox.innerHTML = '<div style="font-size:40px;margin-bottom:12px;">⏸</div><div style="font-size:26px;font-weight:bold;margin-bottom:20px;">游戏已暂停</div>';
    const resumeBtn = el('button', 'mbtn big', '▶ 继续游戏');
    resumeBtn.onclick = () => this.togglePause();
    pbox.appendChild(resumeBtn);
    this.pauseOverlay.appendChild(pbox);
    this.pauseOverlay.onclick = e => { if (e.target === this.pauseOverlay) this.togglePause(); };
    stage.appendChild(this.pauseOverlay);

    // 提示横幅
    this.banner = el('div', 'banner hidden');
    stage.appendChild(this.banner);

    this._fitScale();
    this._onResize = () => this._fitScale();
    window.addEventListener('resize', this._onResize);
    // 全屏切换 / 可视区域变化时重新适配
    this._onFs = () => this._fitScale();
    document.addEventListener('fullscreenchange', this._onFs);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', this._onFs);
  }

  _buildPanel(id, title) {
    const box = el('div', 'battle-panel ' + id);
    box.innerHTML = `<div class="bp-title">${title}</div>
      <div class="bp-score">得分 <b>0</b></div>
      <div class="bp-streak">连击 ×0</div>
      <div class="bp-q"><div class="bp-qtext">等待出题…</div><div class="bp-qopts"></div></div>
      <div class="bp-buff"></div>`;
    const p = { box, scoreEl: box.querySelector('.bp-score b'), streakEl: box.querySelector('.bp-streak'),
      qtext: box.querySelector('.bp-qtext'), qopts: box.querySelector('.bp-qopts'), buffEl: box.querySelector('.bp-buff') };
    return p;
  }

  _fitScale() {
    const stage = this.scaleEl;
    const battle = this.o.mode === 'battle';
    const w = battle ? 1250 : 820, h = battle ? 760 : 700;
    // 取窗口与可视视口的较小值，避免窗口超出屏幕时算错高度
    const vv = window.visualViewport;
    const vw = Math.min(window.innerWidth, vv ? vv.width : window.innerWidth);
    const vh = Math.min(window.innerHeight, vv ? vv.height : window.innerHeight) - 8;
    const s = Math.min(vw / w, vh / h);
    stage.style.transform = `scale(${s})`;
    stage.style.transformOrigin = 'top left';
    stage.style.position = 'absolute';
    // 在可视区域内水平垂直居中
    stage.style.left = Math.max(0, (vw - w * s) / 2) + 'px';
    stage.style.top = Math.max(0, (vh - h * s) / 2) + 'px';
  }

  // ==================== 单人：卡片与种植 ====================
  _selectCard(type, cardEl) {
    if (this.cardCooldown[type] > 0 || this.sun < PLANT_TYPES[type].cost) return;
    this.selectedCard = type;
    this._markCards(cardEl);
  }
  _markCards(active) {
    Object.values(this.cardEls).forEach(c => c.classList.remove('active'));
    if (active) active.classList.add('active');
    else Object.values(this.cardEls).forEach(c => c.classList.remove('active'));
  }

  _onCell(r, c) {
    if (this.over) return;
    const existing = this.plants.find(p => p.row === r && p.col === c);
    if (this.selectedCard === 'shovel') {
      if (existing) { existing.el.remove(); this.plants = this.plants.filter(p => p !== existing); }
      this.selectedCard = null; this._markCards(); return;
    }
    if (this.o.mode !== 'solo') return;
    if (existing) { this._flash('这里已经有植物啦'); return; }

    if (this.selectedCard) {
      const type = this.selectedCard, info = PLANT_TYPES[type];
      if (this.sun < info.cost || this.cardCooldown[type] > 0) { this._flash('阳光不足或卡片冷却中'); return; }
      const q = QuestionEngine.gen();
      this._askSolo(q, ok => {
        if (ok) {
          this.sun -= info.cost;
          this.cardCooldown[type] = 4;
          this._placePlant(type, r, c);
          this.sun += 10; // 答题奖励
          this._updateSun();
        } else {
          this.cardCooldown[type] = 3;
        }
        this.selectedCard = null; this._markCards();
      }, '种植 ' + info.name);
    } else {
      // 直接点空格子：答题自动生成植物（植物类型由答题表现决定）
      const q = QuestionEngine.gen();
      this._askSolo(q, ok => {
        if (ok) {
          const auto = this.sun < 100 ? (Math.random() < 0.5 ? 'sunflower' : 'peashooter')
            : ['peashooter', 'gatlingpea', 'repeater'][this.qStats.right % 3];
          this._placePlant(auto, r, c);
          this.sun += 5;
          this._updateSun();
        }
      }, '召唤植物');
    }
  }

  _placePlant(type, r, c) {
    const info = PLANT_TYPES[type];
    const d = el('div', 'plant' + (info.big ? ' big' : ''));
    d.innerHTML = '<img>';
    d.style.left = cellX(c) - 36 + 'px';
    d.style.top = cellY(r) - 44 + 'px';
    this.field.appendChild(d);
    const p = { type, info, row: r, col: c, hp: info.hp, maxHp: info.hp,
      produceT: info.boom ? 1.2 : 3 + Math.random() * 3, shootT: Math.random(),
      chewT: 0, biteT: 0, chompTarget: null,
      el: d, img: d.querySelector('img'), curFrame: null, shooting: false, boomed: false, hpBar: null };
    // 血条
    const hb = el('div', 'hpbar'); d.appendChild(hb); p.hpBar = hb;
    this.plants.push(p);
    SFX.plant();
    d.classList.add('pop');
    setTimeout(() => d.classList.remove('pop'), 400);
    this._updateSun();
  }

  // ==================== 弹题（单人，暂停式） ====================
  _askSolo(q, onDone, purpose) {
    this.paused = true;
    const startT = performance.now();
    const m = this.qmodal;
    m.classList.remove('hidden');
    m.innerHTML = '';
    const box = el('div', 'qbox');
    box.appendChild(el('div', 'q-purpose', purpose || '完成题目'));
    box.appendChild(el('div', 'q-text', q.text));
    if (q.tip) box.appendChild(el('div', 'q-tip', '💡 ' + q.tip));
    const opts = el('div', 'q-opts');
    let answered = false;
    const finish = (ok) => {
      if (answered) return; answered = true;
      const secs = (performance.now() - startT) / 1000;
      this.qStats.total++; if (ok) { this.qStats.right++; this.qStats.timeSum += secs; }
      // 关键顺序：先关弹窗、恢复游戏，再做记录和回调——任何后续异常都不影响继续游玩
      m.classList.add('hidden');
      this.paused = false;
      try { StatStore.record(q, ok, secs, this.o.mode); } catch (e) { console.warn('统计记录失败（不影响游戏）', e); }
      try { onDone(ok); } catch (e) { console.error('答题后续处理异常', e); }
    };
    if (q.input) {
      const inp = el('input', 'q-input'); inp.placeholder = '请输入答案';
      const btn = el('button', 'q-btn', '提交');
      const fb = el('div', 'q-feedback');
      const submit = () => {
        const ok = inp.value.trim() !== '' && this._eqAnswer(inp.value, q.answer);
        fb.innerHTML = ok ? '<span class="fb-ok">✅ 回答正确，太棒了！</span>' : `<span class="fb-no">❌ 正确答案是：${q.answer}</span>`;
        SFX[ok ? 'correct' : 'wrong']();
        setTimeout(() => finish(ok), ok ? 600 : 1400);
      };
      btn.onclick = submit;
      inp.onkeydown = e => { if (e.key === 'Enter') submit(); };
      opts.append(inp, btn, fb);
      // 触屏友好：数值答案提供屏幕小键盘（数学题无需实体键盘）
      if (!isNaN(parseFloat(q.answer))) {
        const pad = el('div', 'keypad');
        ['7','8','9','4','5','6','1','2','3','0','.','⌫'].forEach(k => {
          const kb = el('button', 'key', k);
          kb.onclick = () => {
            if (k === '⌫') inp.value = inp.value.slice(0, -1);
            else if (k === '.') { if (!inp.value.includes('.')) inp.value += '.'; }
            else inp.value += k;
          };
          pad.appendChild(kb);
        });
        opts.appendChild(pad);
      }
      setTimeout(() => inp.focus(), 50);
    } else {
      q.options.forEach(op => {
        const b = el('button', 'q-opt', op);
        b.onclick = () => {
          const ok = op === q.answer;
          [...opts.querySelectorAll('.q-opt')].forEach(x => x.disabled = true);
          b.classList.add(ok ? 'right' : 'wrong');
          if (!ok) [...opts.querySelectorAll('.q-opt')].find(x => x.textContent === q.answer)?.classList.add('right');
          SFX[ok ? 'correct' : 'wrong']();
          const fb = el('div', 'q-feedback', ok ? '<span class="fb-ok">✅ 回答正确，太棒了！</span>' : `<span class="fb-no">❌ 正确答案是：${q.answer}</span>`);
          opts.appendChild(fb);
          setTimeout(() => finish(ok), ok ? 600 : 1500);
        };
        opts.appendChild(b);
      });
    }
    box.appendChild(opts);
    m.appendChild(box);
  }

  _eqAnswer(a, b) {
    const na = parseFloat(String(a).replace('×', '*').replace('÷', '/'));
    const nb = parseFloat(b);
    if (!isNaN(na) && !isNaN(nb)) return Math.abs(na - nb) < 1e-6;
    return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  }

  // ==================== 对战：面板出题 ====================
  _issueRound() {
    this.roundId++;
    const pair = QuestionEngine.genPair();
    [this.p1, this.p2].forEach((pl, i) => {
      pl.q = pair[i]; pl.qStart = performance.now(); pl.roundId = this.roundId;
      this._renderPanelQ(i === 0 ? this.p1Panel : this.p2Panel, pl);
    });
    SFX.wave();
  }

  _renderPanelQ(panel, pl) {
    const q = pl.q;
    panel.qtext.innerHTML = q.text + (q.tip ? `<div class="q-tip">💡 ${q.tip}</div>` : '');
    panel.qopts.innerHTML = '';
    if (q.input) {
      const inp = el('input', 'bp-input'); inp.placeholder = '输入答案';
      const btn = el('button', 'q-btn sm', '答');
      const submit = () => this._panelAnswer(pl, panel, inp.value);
      btn.onclick = submit;
      inp.onkeydown = e => { if (e.key === 'Enter') submit(); };
      panel.qopts.append(inp, btn);
      setTimeout(() => inp.focus(), 30);
    } else {
      q.options.forEach(op => {
        const b = el('button', 'q-opt sm', op);
        b.onclick = () => this._panelAnswer(pl, panel, op, b);
        panel.qopts.appendChild(b);
      });
    }
  }

  _panelAnswer(pl, panel, val, btn) {
    if (!pl.q || this.over) return;
    if (performance.now() < pl.lockUntil) return;
    const q = pl.q;
    const ok = this._eqAnswer(val, q.answer);
    const secs = (performance.now() - pl.qStart) / 1000;
    pl.total++; pl.q = null;
    if (ok) {
      pl.correct++; pl.timeSum += secs; pl.score += 10; pl.streak++;
      SFX.correct();
      this._raceWin(pl, q);
      this._summon(pl, panel);
    } else {
      pl.streak = 0;
      pl.lockUntil = performance.now() + 5000;
      SFX.wrong();
      panel.qtext.innerHTML = `答错啦，5 秒后继续。正确答案：<b>${q.answer}</b>`;
      panel.qopts.innerHTML = '';
    }
    this._updatePanel(panel, pl);
  }

  // 首答竞速：本轮先答对的一方获得战场优势，对方锁定 3 秒
  _raceWin(pl, q) {
    if (this.raceWinners[pl.roundId]) return; // 已有胜者
    this.raceWinners[pl.roundId] = (pl === this.p1) ? 'p1' : 'p2';
    pl.buffUntil = performance.now() + 10000;
    const opp = pl === this.p1 ? this.p2 : this.p1;
    opp.lockUntil = Math.max(opp.lockUntil, performance.now() + 3000);
    const oppPanel = pl === this.p1 ? this.p2Panel : this.p1Panel;
    if (opp.q) { opp.q = null; oppPanel.qtext.textContent = '⏳ 对方抢先答对，你被锁定 3 秒！'; oppPanel.qopts.innerHTML = ''; }
    this._updatePanel(oppPanel, opp);
    SFX.buff();
    this._flash('⚡ ' + (pl === this.p1 ? '玩家1' : '玩家2') + ' 抢先答对，获得战场优势 10 秒！');
  }

  _updatePanel(panel, pl) {
    panel.scoreEl.textContent = pl.score;
    panel.streakEl.textContent = '连击 ×' + pl.streak;
    panel.buffEl.textContent = performance.now() < pl.buffUntil ? '⚡ 战场优势生效中！' : '';
  }

  // ==================== 对战：召唤 ====================
  _summon(pl, panel) {
    pl.summons++;
    if (pl === this.p1) {
      // 植物方：种在僵尸最多的行（无僵尸则空行随机）
      const counts = Array(ROWS).fill(0);
      this.zombies.forEach(z => counts[z.row]++);
      let r = counts.indexOf(Math.max(...counts));
      if (counts[r] === 0) r = Math.floor(Math.random() * ROWS);
      const c = this._freeCol(r);
      if (c != null) {
        const type = pl.streak >= 4 ? 'gatlingpea' : (pl.streak >= 2 ? 'repeater' : 'peashooter');
        this._placePlant(type, r, c);
        panel.qtext.innerHTML = '<span class="fb-ok">✅ 种植了' + PLANT_TYPES[type].name + '！+10分</span>';
      }
    } else {
      // 僵尸方：随机行召唤，连击升级
      const r = Math.floor(Math.random() * ROWS);
      const type = pl.streak >= 5 ? 'bucket' : (pl.streak >= 3 ? 'cone' : 'normal');
      this._spawnZombie(type, r);
      SFX.summon();
      panel.qtext.innerHTML = '<span class="fb-ok">✅ 召唤了' + ZOMBIE_TYPES[type].name + '（第 ' + (r + 1) + ' 行）！+10分</span>';
    }
  }

  _freeCol(r) {
    for (let c = 0; c < COLS; c++) if (!this.plants.find(p => p.row === r && p.col === c)) return c;
    return null;
  }

  // ==================== 僵尸生成 ====================
  _spawnZombie(type, row) {
    const info = ZOMBIE_TYPES[type];
    const d = el('div', 'zombie');
    d.innerHTML = '<img class="zimg">' + (info.hat ? `<img class="zhat" src="${info.hat}">` : '');
    this.field.appendChild(d);
    const speed = info.speed * this.o.zombieSpeedMul;
    const z = { type, info, row, x: FIELD_W - 10, hp: info.hp, maxHp: info.hp,
      speed, dmg: info.dmg, slowT: 0, eating: null, el: d, img: d.querySelector('.zimg'),
      curFrame: null, animT: Math.random() * 3,
      hpBar: (() => { const hb = el('div', 'hpbar'); d.appendChild(hb); return hb; })() };
    this.zombies.push(z);
    return z;
  }

  _makeSpawnPlan() {
    // 单人生存：随时间加快，含三波"大波僵尸"
    const plan = [];
    let t = 20;
    while (t < this.o.duration - 30) {
      plan.push({ t, type: Math.random() < 0.15 ? 'cone' : 'normal' });
      t += Math.max(7, 17 - this.timeScale(t) * 0.02) + Math.random() * 4;
    }
    // 大波
    [[0.4, 'cone', 4], [0.68, 'cone', 6], [0.88, 'bucket', 8]].forEach(([f, type, n]) => {
      const bt = this.o.duration * f;
      for (let i = 0; i < n; i++) plan.push({ t: bt + i * 1.2, type });
      plan.push({ t: bt - 8, bigWave: true });
    });
    return plan.sort((a, b) => a.t - b.t);
  }
  timeScale(t) { return t; }

  // ==================== 主循环 ====================
  _loop(now) {
    if (this.over) return;
    this._raf = requestAnimationFrame(t => this._loop(t));
    let dt = (now - this._last) / 1000;
    this._last = now;
    if (dt > 0.1) dt = 0.1;
    if (this.paused) return;
    this.time += dt;
    try {
      this._update(dt);
      this._render();
    } catch (e) {
      // 防御：单帧异常不中断后续帧，并在控制台留下线索
      if (!this._errOnce) { this._errOnce = true; console.error('游戏循环异常：', e); }
    }
  }

  _update(dt) {
    const D = this.o.duration;
    // 倒计时/结束判定
    if (this.time >= D) { this._end(this.o.mode === 'battle' ? this.baseHp > 0 : true); return; }

    // 顶栏
    const left = Math.max(0, D - this.time);
    this.timeEl.textContent = `⏱ ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    this.killEl.textContent = '💀 ' + this.kills;
    if (this.o.mode === 'battle') this.baseEl.textContent = '🏠 基地血量: ' + this.baseHp;

    // ---- 单人：出僵尸 & 大波弹题 ----
    if (this.o.mode === 'solo') {
      while (this.spawnPlan.length && this.spawnPlan[0].t <= this.time) {
        const s = this.spawnPlan.shift();
        if (s.bigWave) {
          if (!this.paused) {
            const q = QuestionEngine.gen();
            this._askSolo(q, ok => {
              if (ok) { this.attackBuff = 20; SFX.buff(); this._flash('⚡ 答对！植物攻击力提升 20 秒！'); }
              else { this.attackLock = 8; this._flash('植物短暂停火 8 秒，记住答案再战！'); }
            }, '🚨 大波僵尸来袭！答对可强化植物！');
            SFX.wave();
          }
        } else {
          this._spawnZombie(s.type, Math.floor(Math.random() * ROWS));
        }
      }
      // 卡片冷却
      Object.keys(this.cardCooldown).forEach(k => { if (this.cardCooldown[k] > 0) this.cardCooldown[k] -= dt; this._updateCardCd(k); });
      // 天降阳光
      this.nextSunFall -= dt;
      if (this.nextSunFall <= 0) { this._dropSun(); this.nextSunFall = 7 + Math.random() * 4; }
    }

    // ---- 对战：回合出题 ----
    if (this.o.mode === 'battle') {
      this.nextRound -= dt;
      if (this.nextRound <= 0) {
        const p1Free = !this.p1.q && performance.now() >= this.p1.lockUntil;
        const p2Free = !this.p2.q && performance.now() >= this.p2.lockUntil;
        if (p1Free && p2Free) { this._issueRound(); this.nextRound = this.roundInterval; }
        else this.nextRound = 1;
      }
      // 20 秒未答自动换题（不计错误）
      [this.p1, this.p2].forEach((pl, i) => {
        const panel = i === 0 ? this.p1Panel : this.p2Panel;
        if (pl.q && (performance.now() - pl.qStart) > 20000) {
          pl.q = null;
          panel.qtext.textContent = '超时换题…';
          panel.qopts.innerHTML = '';
        }
      });
    }

    // ---- 植物 ----
    const fireMul = this.attackLock > 0 ? 0 : (this.attackBuff > 0 ? 1.3 : 1);
    if (this.attackLock > 0) this.attackLock -= dt;
    if (this.attackBuff > 0) this.attackBuff -= dt;
    const p1Buff = this.o.mode === 'battle' && performance.now() < this.p1.buffUntil ? 1.3 : 1;
    const p2Buff = this.o.mode === 'battle' && performance.now() < this.p2.buffUntil ? 1.3 : 1;
    const powerMul = this.o.plantPowerMul;

    this.plants.slice().forEach(p => {
      // 向日葵产阳光
      if (p.info.produce) {
        p.produceT -= dt;
        if (p.produceT <= 0) { p.produceT = p.info.produce; this._makeSun(cellX(p.col) + (Math.random() * 30 - 15), cellY(p.row) - 10); }
      }
      // 攻击
      p.shooting = false;
      if (p.info.dmg && this.attackLock <= 0) {
        const target = this.zombies.some(z => z.row === p.row && z.x > cellX(p.col) - 20 && z.x < FIELD_W + 30);
        if (target) {
          p.shooting = true;
          p.shootT -= dt;
          if (p.shootT <= 0) {
            p.shootT = p.info.rate;
            const dmg = p.info.dmg * powerMul * (p.el.dataset.buffed ? 1 : 1) * (this.o.mode === 'solo' ? fireMul : p1Buff);
            const n = p.info.shots || 1;
            for (let i = 0; i < n; i++) this._firePea(p, dmg, p.info.slow, i * 0.12);
            SFX.shoot();
          }
        }
      }
      // 樱桃炸弹引信
      if (p.info.boom) {
        p.produceT -= dt;
        if (p.produceT <= 0) { this._explode(p); }
      }
      // 大嘴花：一口吞掉前方僵尸，随后咀嚼消化（期间无法再咬）
      if (p.info.chomp) {
        if (p.chewT > 0) {
          p.chewT -= dt;
        } else if (p.biteT > 0) {
          p.biteT -= dt;
          if (p.biteT <= 0) {
            const z = p.chompTarget;
            if (z && this.zombies.includes(z)) { z.hp = 0; this._killZombie(z); }
            p.chompTarget = null;
            p.chewT = p.info.chewTime;
          }
        } else if (this.attackLock <= 0) {
          // 咬合范围：自己所在格 + 紧邻前一格
          const t = this.zombies.find(z => z.row === p.row && z.x > cellX(p.col) - 24 && z.x < cellX(p.col) + CELL_W + 24);
          if (t) { p.chompTarget = t; p.biteT = 0.5; SFX.hit(); }
        }
      }
    });

    // ---- 子弹 ----
    this.peas.slice().forEach(pea => {
      if (pea.delay > 0) { pea.delay -= dt; return; }
      pea.x += 300 * dt;
      const hit = this.zombies.find(z => z.row === pea.row && Math.abs(z.x - pea.x) < 26);
      if (hit) {
        hit.hp -= pea.dmg;
        if (pea.slow) hit.slowT = 4;
        SFX.hit();
        pea.el.remove(); this.peas = this.peas.filter(x => x !== pea);
        if (hit.hp <= 0) this._killZombie(hit);
      } else if (pea.x > FIELD_W + 30) {
        pea.el.remove(); this.peas = this.peas.filter(x => x !== pea);
      }
    });

    // ---- 僵尸 ----
    this.zombies.slice().forEach(z => {
      let sp = z.speed * (z.slowT > 0 ? 0.5 : 1);
      if (this.o.mode === 'battle' && performance.now() < this.p2.buffUntil) sp *= 1.3;
      if (z.slowT > 0) z.slowT -= dt;
      const plant = this.plants.find(p => p.row === z.row && Math.abs(cellX(p.col) - z.x) < 34);
      if (plant) {
        z.eating = plant;
        plant.hp -= z.dmg * dt * 1.6;
        if (plant.hp <= 0) {
          plant.el.remove(); this.plants = this.plants.filter(x => x !== plant);
          z.eating = null;
        }
      } else {
        z.eating = null;
        z.x -= sp * dt;
      }
      // 到达最左
      if (z.x < 8) {
        if (this.o.mode === 'solo') {
          const mower = this.mowers.find(m => m.row === z.row && m.alive && !m.running);
          if (mower) { mower.running = true; SFX.buff(); }
          else { this._end(false); }
        } else {
          this.baseHp--;
          z.el.remove(); this.zombies = this.zombies.filter(x => x !== z);
          this._flash('🏠 基地被啃了一口！剩余血量 ' + this.baseHp);
          if (this.baseHp <= 0) { this._end(false); }
        }
      }
    });

    // 小推车
    this.mowers.forEach(m => {
      if (!m.alive) return;
      if (m.running) {
        m.x += 400 * dt;
        m.el.style.left = m.x + 'px';
        this.zombies.filter(z => z.row === m.row && Math.abs(z.x - m.x) < 40).forEach(z => this._killZombie(z));
        if (m.x > FIELD_W) { m.alive = false; m.el.remove(); }
      }
    });

    // 死亡动画计时
    this.dying.forEach(z => z.dieT += dt);

    // ---- 阳光 ----
    this.suns.slice().forEach(s => {
      if (s.vy) { s.y += s.vy * dt; if (s.y >= s.groundY) { s.vy = 0; } }
      s.el.style.left = s.x + 'px'; s.el.style.top = s.y + 'px';
      s.life -= dt;
      if (s.life <= 0) { s.el.remove(); this.suns = this.suns.filter(x => x !== s); }
    });
  }

  _firePea(p, dmg, slow, delay) {
    const d = el('div', 'pea' + (slow ? ' frozen' : ''));
    d.innerHTML = '<img src="images/bullet.png">';
    this.field.appendChild(d);
    this.peas.push({ x: cellX(p.col) + 24, y: cellY(p.row) - 14, row: p.row, dmg, slow, delay: delay || 0, el: d });
  }

  _explode(p) {
    if (p.boomed) return; p.boomed = true;
    this.plants = this.plants.filter(x => x !== p);
    SFX.wave();
    const boom = el('div', 'boom'); boom.style.left = cellX(p.col) - 70 + 'px'; boom.style.top = cellY(p.row) - 70 + 'px';
    this.field.appendChild(boom); setTimeout(() => boom.remove(), 600);
    this.zombies.slice().forEach(z => {
      if (Math.abs(z.row - p.row) <= 1 && Math.abs(z.x - cellX(p.col)) < 150) {
        z.hp -= 900; if (z.hp <= 0) this._killZombie(z);
      }
    });
    // 播放原版爆炸帧后移除
    p.el.classList.add('boomimg');
    let i = 0;
    const iv = setInterval(() => {
      if (i >= p.info.attack.length) { p.el.remove(); clearInterval(iv); return; }
      p.img.src = p.info.attack[i++];
    }, 70);
  }

  _killZombie(z) {
    this.kills++;
    SFX.zombieDown();
    this.zombies = this.zombies.filter(x => x !== z);
    z.dying = true; z.dieT = 0; z.curFrame = null;
    this.dying.push(z);
  }

  _dropSun() {
    const x = 60 + Math.random() * (FIELD_W - 120);
    this._makeSun(x, 0, true);
  }
  _makeSun(x, y, fall) {
    const d = el('div', 'sun-drop');
    d.innerHTML = '<img src="images/sun.gif">';
    this.field.appendChild(d);
    const s = { x, y, el: d, life: 10, vy: fall ? 35 : 0, groundY: fall ? 80 + Math.random() * (FIELD_H - 160) : y,
      collected: false };
    d.onclick = () => {
      if (s.collected || this.o.mode !== 'solo') return;
      s.collected = true;
      this.sun += 25; this._updateSun(); SFX.sun();
      d.classList.add('fly'); setTimeout(() => { d.remove(); this.suns = this.suns.filter(x2 => x2 !== s); }, 400);
    };
    this.suns.push(s);
  }
  _updateSun() { if (this.sunEl) this.sunEl.textContent = '☀ ' + this.sun; }

  _updateCardCd(type) {
    const card = this.cardEls[type]; if (!card) return;
    const cd = this.cardCooldown[type] || 0;
    const info = PLANT_TYPES[type];
    card.classList.toggle('cooldown', cd > 0 || this.sun < info.cost);
  }

  _flash(msg) {
    this.banner.textContent = msg;
    this.banner.classList.remove('hidden');
    clearTimeout(this._bannerT);
    this._bannerT = setTimeout(() => this.banner.classList.add('hidden'), 1800);
  }

  // ==================== 渲染 ====================
  _render() {
    const tick = Math.floor(this.time * 9);
    this.plants.forEach(p => {
      p.el.style.left = cellX(p.col) - 36 + 'px';
      p.el.style.top = cellY(p.row) - 44 + 'px';
      p.hpBar.style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
      p.hpBar.style.background = p.hp / p.maxHp > 0.5 ? '#4caf50' : '#ff9800';
      // 选帧：咬合/咀嚼→大嘴花专用帧；射击→攻击帧；坚果墙→按血量切换受损形态；其他→待机帧
      let frames;
      if (p.info.chomp) {
        frames = p.chewT > 0 ? p.info.digest : (p.biteT > 0 ? p.info.attack : p.info.idle);
      } else if (p.info.boom) frames = p.info.idle;
      else if (p.info.idleM) frames = p.hp / p.maxHp > 0.66 ? p.info.idle : (p.hp / p.maxHp > 0.33 ? p.info.idleM : p.info.idleL);
      else frames = (p.shooting && p.info.attack) ? p.info.attack : p.info.idle;
      const f = frames[tick % frames.length];
      if (p.curFrame !== f) { p.img.src = f; p.curFrame = f; }
    });
    this.zombies.forEach(z => {
      z.el.style.left = z.x - 50 + 'px';
      z.el.style.top = cellY(z.row) - 62 + 'px';
      z.hpBar.style.width = Math.max(0, z.hp / z.maxHp * 100) + '%';
      const frames = z.eating ? ZOMBIE_FRAMES.attack : ZOMBIE_FRAMES.run;
      const f = frames[Math.floor((this.time * 12 + z.animT * 9) % frames.length)];
      if (z.curFrame !== f) { z.img.src = f; z.curFrame = f; }
    });
    // 死亡动画
    this.dying.forEach(z => {
      const idx = Math.min(ZOMBIE_FRAMES.die.length - 1, Math.floor(z.dieT / 0.06));
      const f = ZOMBIE_FRAMES.die[idx];
      if (z.curFrame !== f) { z.img.src = f; z.curFrame = f; }
      if (idx >= 7) z.el.style.opacity = String(Math.max(0, 1 - (idx - 7) / 3));
    });
    this.dying = this.dying.filter(z => {
      if (z.dieT > 0.6) { z.el.remove(); return false; }
      return true;
    });
    this.peas.forEach(pea => {
      pea.el.style.left = pea.x - 11 + 'px';
      pea.el.style.top = pea.y - 7 + 'px';
    });
  }

  // ==================== 结束 ====================
  _end(win) {
    if (this.over) return;
    this.over = true;
    cancelAnimationFrame(this._raf);
    SFX[win ? 'win' : 'lose']();
    const acc = this.qStats.total ? Math.round(this.qStats.right / this.qStats.total * 100) : 0;
    const rep = {
      mode: this.o.mode, win, kills: this.kills, duration: Math.round(this.time),
      subject: this.o.subject, grade: this.o.grade,
      questions: { total: this.qStats.total, right: this.qStats.right, acc },
    };
    if (this.o.mode === 'battle') {
      rep.battle = {
        p1: { score: this.p1.score, correct: this.p1.correct, total: this.p1.total,
          acc: this.p1.total ? Math.round(this.p1.correct / this.p1.total * 100) : 0,
          avgT: this.p1.correct ? +(this.p1.timeSum / this.p1.correct).toFixed(1) : 0, summons: this.p1.summons },
        p2: { score: this.p2.score, correct: this.p2.correct, total: this.p2.total,
          acc: this.p2.total ? Math.round(this.p2.correct / this.p2.total * 100) : 0,
          avgT: this.p2.correct ? +(this.p2.timeSum / this.p2.correct).toFixed(1) : 0, summons: this.p2.summons },
        baseHp: this.baseHp,
      };
      rep.win = this.baseHp > 0 ? 'p1' : 'p2';
    }
    setTimeout(() => { this.destroy(); this.o.onFinish(rep); }, 900);
  }

  togglePause() {
    if (this.over) return;
    this.paused = !this.paused;
    this.pauseOverlay.classList.toggle('hidden', !this.paused);
    if (!this.paused) this._flash('▶ 继续游戏！');
  }

  destroy() {
    this.over = true;
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('fullscreenchange', this._onFs);
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', this._onFs);
    if (this.root) this.root.innerHTML = '';
  }
}
