/* ============================================
 * main.js — 界面导航 / 配置 / 题库管理 / 统计 / 结算
 * ============================================ */
'use strict';

// ---------------- 屏幕切换 ----------------
const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

function show(id) {
  $$('.screen').forEach(s => s.classList.add('hidden'));
  $('#screen-' + id).classList.remove('hidden');
}

// 通用导航按钮
$$('[data-nav]').forEach(b => b.onclick = () => {
  show(b.dataset.nav);
  if (b.dataset.nav === 'stats') renderStats();
  if (b.dataset.nav === 'bank') renderBankInfo();
});

// ---------------- 全屏切换 ----------------
function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    (document.documentElement.requestFullscreen && document.documentElement.requestFullscreen() || Promise.resolve()).catch(() => {});
  }
}
window.toggleFullscreen = toggleFullscreen;
document.addEventListener('fullscreenchange', () => {
  $$('.fs-btn').forEach(b => b.textContent = document.fullscreenElement ? '⛶ 取消全屏' : '⛶ 全屏');
  setTimeout(() => { if (window.gameInstance) gameInstance._fitScale(); }, 60);
});
$$('.fs-btn').forEach(b => b.onclick = toggleFullscreen);

// ---------------- 分段选择器 ----------------
function segInit(id, onChange) {
  const box = $(id);
  box.querySelectorAll('button').forEach(b => b.onclick = () => {
    box.querySelectorAll('button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    if (onChange) onChange(b.dataset.v);
  });
}
const segVal = id => $(id).querySelector('.active').dataset.v;

// ---------------- 配置页 ----------------
const CFG = {
  subject: 'pinyin', mode: 'solo', grade: 2,
  zspeed: 1, ppower: 1, answer: 'choice', duration: 180,
};

segInit('#cfg-subject', v => { CFG.subject = v; });
segInit('#cfg-mode', v => {
  CFG.mode = v;
  $('#mode-hint').textContent = v === 'solo'
    ? '单人生存：答题种植物、答对强化攻击，守住 5 行草坪！'
    : '双人对战：左屏玩家1（植物方）、右屏玩家2（僵尸方），同题竞速，快者获得战场优势！';
  $('#row-answer').style.display = v === 'solo' && CFG.subject === 'english' ? '' : 'none';
});
segInit('#cfg-grade', v => { CFG.grade = +v; });
segInit('#cfg-zspeed', v => { CFG.zspeed = +v; });
segInit('#cfg-ppower', v => { CFG.ppower = +v; });
segInit('#cfg-answer', v => { CFG.answer = v; });
segInit('#cfg-duration', v => { CFG.duration = +v; });

// 科目切换时联动显示
$('#cfg-subject').addEventListener('click', () => {
  $('#row-answer').style.display = CFG.mode === 'solo' && CFG.subject === 'english' ? '' : 'none';
});

$('#btn-start').onclick = () => startGame();

function startGame() {
  show('game');
  const opts = {
    mode: CFG.mode, subject: CFG.subject, grade: CFG.grade,
    zombieSpeedMul: CFG.zspeed, plantPowerMul: CFG.ppower,
    answerMode: CFG.answer, duration: CFG.duration,
    onFinish: showResult,
    onQuit: () => show('menu'),
  };
  gameInstance = new EduGame($('#game-root'), opts);
}
let gameInstance = null;

// ---------------- 结算报告 ----------------
function showResult(rep) {
  show('result');
  const box = $('#result-body');
  const winText = rep.mode === 'battle'
    ? (rep.win === 'p1' ? '🛡 玩家1（植物方）获胜！基地守住了！' : '🧟 玩家2（僵尸方）获胜！攻陷了基地！')
    : (rep.win ? '🎉 挑战成功！你守住了草坪！' : '😢 僵尸吃掉了你的脑子…再试一次！');
  const subjName = { pinyin: '拼音', english: '英语', math: '数学' }[rep.subject];

  let html = `<h2>📋 对局报告</h2>
    <p style="font-size:22px;margin:10px 0;"><b>${winText}</b></p>
    <p>科目：${subjName} · 年级难度：${rep.grade} · 时长：${Math.floor(rep.duration / 60)} 分 ${rep.duration % 60} 秒 · 击杀僵尸：${rep.kills}</p>`;

  if (rep.mode === 'battle' && rep.battle) {
    const b = rep.battle;
    html += `<table class="stat-table"><tr><th></th><th>玩家1 · 植物方</th><th>玩家2 · 僵尸方</th></tr>
      <tr><td><b>得分</b></td><td>${b.p1.score}</td><td>${b.p2.score}</td></tr>
      <tr><td><b>答题数</b></td><td>${b.p1.total}</td><td>${b.p2.total}</td></tr>
      <tr><td><b>正确率</b></td><td>${b.p1.acc}%</td><td>${b.p2.acc}%</td></tr>
      <tr><td><b>平均答题速度</b></td><td>${b.p1.avgT} 秒</td><td>${b.p2.avgT} 秒</td></tr>
      <tr><td><b>召唤单位</b></td><td>${b.p1.summons} 个植物</td><td>${b.p2.summons} 个僵尸</td></tr>
      <tr><td><b>基地剩余血量</b></td><td colspan="2">${b.baseHp} / 5</td></tr></table>`;
    html += `<p class="cfg-hint">速度更快的一方：${(b.p1.avgT && (!b.p2.avgT || b.p1.avgT <= b.p2.avgT)) ? '玩家1' : '玩家2'}（平均答题用时更短，获得的战场优势次数更多）</p>`;
  } else {
    html += `<p style="margin-top:12px;font-size:18px;">答题统计：共 <b>${rep.questions.total}</b> 题，正确 <b>${rep.questions.right}</b> 题，正确率 <span class="acc-big">${rep.questions.acc}%</span></p>`;
  }

  html += `<div class="btn-row">
    <button class="mbtn big" id="btn-again">🔄 再来一局</button>
    <button class="mbtn ghost" id="btn-home">🏠 返回主页</button>
  </div>`;
  box.innerHTML = html;
  $('#btn-again').onclick = () => startGame();
  $('#btn-home').onclick = () => show('menu');
}

// ---------------- 题库管理 ----------------
let bankSubject = 'pinyin';
segInit('#bank-subject', v => { bankSubject = v; renderBankInfo(); });

function renderBankInfo() {
  const c = QuestionEngine.customCount();
  const names = { pinyin: '拼音', english: '英语', math: '数学' };
  $('#bank-count').textContent =
    `当前自定义题量：拼音 ${c.pinyin} 条 · 英语 ${c.english} 条 · 数学 ${c.math} 条`;
  const t = BANK_TEMPLATE[bankSubject];
  $('#bank-template').textContent =
    `${t.desc}\n示例：\n` + JSON.stringify(t.example, null, 2);
}

$('#btn-bank-import').onclick = () => {
  try {
    const raw = $('#bank-text').value.trim();
    if (!raw) return alert('请先选择 JSON 文件或粘贴题库内容');
    const data = JSON.parse(raw);
    const n = QuestionEngine.importBank(bankSubject, data);
    alert(`✅ 导入成功！${names()[bankSubject]}题库新增 ${n} 条`);
    $('#bank-text').value = '';
    renderBankInfo();
  } catch (e) {
    alert('❌ 导入失败：' + e.message);
  }
};
function names() { return { pinyin: '拼音', english: '英语', math: '数学' }; }

$('#btn-bank-clear').onclick = () => {
  if (confirm('确定清空' + names()[bankSubject] + '的自定义题库吗？')) {
    QuestionEngine.clearCustom(bankSubject);
    renderBankInfo();
  }
};

$('#bank-file').onchange = e => {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => { $('#bank-text').value = reader.result; };
  reader.readAsText(f, 'utf-8');
};

// ---------------- 学习统计 ----------------
function renderStats() {
  const box = $('#stats-body');
  const rep = StatStore.report();
  if (!rep.total) {
    box.innerHTML = '<h2>📊 学习统计</h2><p style="margin:16px 0;color:#888;">还没有答题记录，快去玩一局吧！</p><div class="btn-row"><button class="mbtn ghost" data-nav2="menu">返回</button></div>';
    bindBack(box); return;
  }
  let html = `<h2>📊 学习统计</h2>
    <p style="margin:12px 0;">累计答题 <b>${rep.total}</b> 次 · 总正确率 <span class="acc-big">${rep.acc}%</span></p>`;
  if (rep.weak.length) {
    html += `<p><b>⚠️ 薄弱知识点（正确率 &lt; 70%）：</b></p><div>${rep.weak.map(w => `<span class="weak-tag">${w.kp}（${w.acc}%）</span>`).join('')}</div>`;
  } else {
    html += '<p>✅ 暂无明显薄弱知识点，继续加油！</p>';
  }
  html += `<table class="stat-table"><tr><th>知识点</th><th>答题数</th><th>正确率</th><th>平均用时</th></tr>`;
  rep.kps.forEach(k => {
    html += `<tr><td>${k.kp}</td><td>${k.total}</td><td>${k.acc}%</td><td>${k.avgT} 秒</td></tr>`;
  });
  html += `</table><div class="btn-row">
    <button class="mbtn ghost" id="btn-stats-clear">🗑 清空统计数据</button>
    <button class="mbtn ghost" data-nav2="menu">返回</button></div>`;
  box.innerHTML = html;
  bindBack(box);
  $('#btn-stats-clear').onclick = () => { if (confirm('确定清空所有学习统计数据吗？')) { StatStore.clear(); renderStats(); } };
}
function bindBack(box) {
  box.querySelectorAll('[data-nav2]').forEach(b => b.onclick = () => show(b.dataset.nav2));
}

// ---------------- 初始化 ----------------
renderBankInfo();
show('menu');
