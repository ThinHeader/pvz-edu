/* ============================================
 * questions.js — 出题引擎（拼音 / 英语 / 数学）
 * 依据科目 + 年级自动生成题目；支持自定义题库混入
 * 题目结构：{ text, sub, options, answer, tip, kp, input }
 *   - input=true 时为输入题（answer 为字符串）
 *   - 否则为选择题（answer 为正确选项文本）
 * ============================================ */
'use strict';

// 安全存储封装：localStorage 被浏览器禁用时（如沙箱 iframe）自动降级为内存存储，
// 保证游戏永不因存储问题卡死（本局数据仍在，仅刷新后不保留）
const SafeStore = {
  _mem: {},
  get(k) { try { return localStorage.getItem(k); } catch (e) { return this._mem[k] !== undefined ? this._mem[k] : null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { this._mem[k] = v; } },
  remove(k) { try { localStorage.removeItem(k); } catch (e) { delete this._mem[k]; } },
};

const QuestionEngine = {

  config: {
    subject: 'pinyin',   // pinyin | english | math
    grade: 2,            // 1-6
    answerMode: 'choice', // choice | input（仅英语"看中文拼英语"受影响）
    battleSpeed: true,   // 对战模式比拼答题速度
  },

  // 自定义题库（localStorage 加载 + 手动导入）
  custom: { pinyinChars: [], englishWords: [], mathQuestions: [] },

  _rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  _ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); },
  _shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },

  _choice(text, sub, correct, distractors, tip, kp) {
    const options = this._shuffle([correct, ...distractors].map(String));
    return { text, sub, options, answer: String(correct), tip: tip || '', kp, input: false };
  },
  _input(text, sub, answer, tip, kp) {
    return { text, sub, options: null, answer: String(answer), tip: tip || '', kp, input: true };
  },

  // ==================== 拼音 ====================
  _genPinyin(grade) {
    const P = BANKS.pinyin;
    const allYunmu = P.yunmu_single.concat(P.yunmu_compound);
    const types = ['char2p', 'p2char', 'classify', 'spell'];
    if (grade >= 2) types.push('zhengti', 'sanpin');
    if (grade >= 3) types.push('sanpin', 'biaodiao');
    const t = this._rand(types);

    if (t === 'char2p') { // 给汉字选拼音
      const pool = this.custom.pinyinChars.length && Math.random() < 0.5 ? this.custom.pinyinChars : P.chars;
      const w = this._rand(pool);
      const others = pool.filter(x => x.p !== w.p);
      const ds = this._shuffle(others).slice(0, 3).map(x => x.p);
      return this._choice(`" ${w.h} " 的正确拼音是？`, '给汉字选拼音', w.p, ds.length === 3 ? ds : P.chars.slice(0, 3).map(x => x.p), '', '拼音标注');
    }
    if (t === 'p2char') { // 给拼音选汉字
      const pool = this.custom.pinyinChars.length && Math.random() < 0.5 ? this.custom.pinyinChars : P.chars;
      const w = this._rand(pool);
      const ds = this._shuffle(pool.filter(x => x.h !== w.h)).slice(0, 3).map(x => x.h);
      return this._choice(`拼音" ${w.p} "对应的汉字是？`, '给拼音选汉字', w.h, ds, '', '拼音认读');
    }
    if (t === 'classify') { // 声母/韵母/整体认读分类
      const items = [
        { v: this._rand(P.shengmu), c: '声母' },
        { v: this._rand(allYunmu), c: '韵母' },
        { v: this._rand(P.zhengti), c: '整体认读音节' },
      ];
      const it = this._rand(items);
      return this._choice(`" ${it.v} " 属于哪一类？`, '字母分类', it.c, ['声母', '韵母', '整体认读音节'].filter(x => x !== it.c), '整体认读音节要整体记忆，不用拼读。', '拼音分类');
    }
    if (t === 'spell') { // 声母+韵母拼读组合
      const s = this._rand(P.shengmu.filter(x => x.length <= 1));
      const y = this._rand(allYunmu);
      const correct = s + y;
      const ds = [y + s, s + this._rand(allYunmu.filter(x => x !== y)), this._rand(P.zhengti)].filter(x => x !== correct);
      const two = P.yunmu_compound.includes(y);
      return this._choice(`声母" ${s} "和韵母" ${y} "拼在一起是？`, '拼音组合', correct, ds.slice(0, 3), two ? BANKS.pinyin.koujue.liangpin : '', '拼读组合');
    }
    if (t === 'zhengti') { // 找出整体认读音节
      const zt = this._rand(P.zhengti);
      const ds = [];
      while (ds.length < 3) {
        const s = this._rand(P.shengmu), y = this._rand(allYunmu);
        const c = s + y; if (c !== zt && !P.zhengti.includes(c) && !ds.includes(c)) ds.push(c);
      }
      return this._choice('下面哪一个是整体认读音节？', '整体认读', zt, ds, BANKS.pinyin.koujue.zhengti, '整体认读音节');
    }
    if (t === 'sanpin') { // 三拼音节判断
      const san = ['guā','huá','xià','jiā','kuài','shuō','guǒ','huā','jiǎo','xióng','zuò','huài'];
      const liang = ['bā','mǔ','dà','tì','nǚ','lè','pó','fǎ','sì','bǐ','mǎ','tè'];
      const pickSan = Math.random() < 0.5;
      const correct = pickSan ? this._rand(san) : this._rand(liang);
      const ds = this._shuffle(pickSan ? liang : san).slice(0, 3);
      return this._choice('下面哪一个音节是' + (pickSan ? '三' : '两') + '拼音节？', '拼读判断', correct, ds, BANKS.pinyin.koujue.sanpin, '三拼音节');
    }
    // biaodiao 标调规则
    const pairs = [['iu', 'u'], ['ui', 'i'], ['ao', 'a'], ['ou', 'o']];
    const pr = this._rand(pairs);
    return this._choice(`" ${pr[0]} " 两个字母并列时，声调应标在谁上面？`, '标调规则', pr[1], pr[0].split('').filter(x => x !== pr[1]), BANKS.pinyin.koujue.biaodiao, '标调规则');
  },

  // ==================== 英语 ====================
  _genEnglish(grade) {
    let pool = BANKS.english.filter(w => w.grade <= grade);
    if (pool.length < 8) pool = BANKS.english.filter(w => w.grade <= grade + 1);
    const words = this.custom.englishWords.length ? this.custom.englishWords.concat(pool) : pool;

    // 输入模式：看中文拼英语
    if (this.config.answerMode === 'input' && Math.random() < 0.6) {
      const w = this._rand(words);
      return this._input(`请拼写：" ${w.zh} " 的英语单词`, '看中文拼英语', w.en, '', '英译拼写');
    }
    const t = Math.random() < 0.5 ? 'e2z' : 'z2e';
    const w = this._rand(words);
    const others = words.filter(x => x.zh !== w.zh && x.en !== w.en);
    const ds = this._shuffle(others).slice(0, 3);
    if (t === 'e2z') {
      return this._choice(`" ${w.en} " 的中文意思是？`, '看英文选中文', w.zh, ds.map(x => x.zh), '', '英译中');
    }
    return this._choice(`" ${w.zh} " 的英语是？`, '看中文选英语', w.en, ds.map(x => x.en), '', '中译英');
  },

  // ==================== 数学 ====================
  _genMath(grade) {
    // 自定义数学题 50% 概率混入
    if (this.custom.mathQuestions.length && Math.random() < 0.5) {
      const q = this._rand(this.custom.mathQuestions);
      return { text: q.q, sub: '自定义题库', options: null, answer: String(q.a), tip: '', kp: q.kp || '自定义', input: true };
    }
    const g = grade;
    if (g === 1) {
      const t = Math.random() < 0.5 ? 'a10' : 'a20';
      if (t === 'a10') {
        const a = this._ri(1, 9), b = this._ri(1, 9 - a + 1);
        return Math.random() < 0.5
          ? this._input(`${a} + ${b} = ?`, '10以内加法', a + b, '', '10以内加减法')
          : this._input(`${a + b} - ${a} = ?`, '10以内减法', b, '', '10以内加减法');
      }
      const a = this._ri(5, 18), b = this._ri(2, 20 - a);
      return Math.random() < 0.5
        ? this._input(`${a} + ${b} = ?`, '20以内加法', a + b, '', '20以内加减法')
        : this._input(`${a + b} - ${b} = ?`, '20以内减法', a, '', '20以内加减法');
    }
    if (g === 2) {
      if (Math.random() < 0.5) { // 100以内加减
        const a = this._ri(11, 89), b = this._ri(11, 99 - a);
        return Math.random() < 0.5
          ? this._input(`${a} + ${b} = ?`, '100以内加法', a + b, '', '100以内加减法')
          : this._input(`${a + b} - ${b} = ?`, '100以内减法', a, '', '100以内加减法');
      }
      const a = this._ri(2, 9), b = this._ri(2, 9); // 表内乘法
      return this._input(`${a} × ${b} = ?`, '表内乘法', a * b, BANKS.math.koujue.chengfa, '表内乘法');
    }
    if (g === 3) {
      if (Math.random() < 0.5) { // 表内除法
        const a = this._ri(2, 9), b = this._ri(2, 9);
        return this._input(`${a * b} ÷ ${a} = ?`, '表内除法', b, BANKS.math.koujue.chufa, '表内除法');
      }
      const a = this._ri(2, 9), b = this._ri(2, 9), c = this._ri(2, 20); // 两步混合
      return this._input(`${a} × ${b} + ${c} = ?`, '两步混合运算', a * b + c, BANKS.math.koujue.yunsuan, '四则混合运算');
    }
    if (g === 4) {
      const t = Math.random();
      if (t < 0.4) { // (a+b)×c
        const a = this._ri(2, 15), b = this._ri(2, 15), c = this._ri(2, 6);
        return this._input(`(${a} + ${b}) × ${c} = ?`, '带括号混合运算', (a + b) * c, BANKS.math.koujue.yunsuan, '四则混合运算');
      }
      if (t < 0.7) { // a×b − c÷d
        const d = this._ri(2, 6), c = d * this._ri(2, 6), a = this._ri(3, 9), b = this._ri(3, 9);
        return this._input(`${a} × ${b} − ${c} ÷ ${d} = ?`, '乘除混合运算', a * b - c / d, BANKS.math.koujue.yunsuan, '四则混合运算');
      }
      const p = this._ri(2, 6), q = this._ri(2, 6); // 倍数应用题
      return this._input(`果园里有 ${p} 棵桃树，梨树的棵数是桃树的 ${q} 倍，梨树有多少棵？`, '倍数应用题', p * q, '', '简单应用题');
    }
    if (g === 5) { // 小数加减
      const a = (this._ri(10, 900) / 10).toFixed(1), b = (this._ri(10, 900) / 10).toFixed(1);
      const A = parseFloat(a), B = parseFloat(b);
      return Math.random() < 0.5
        ? this._input(`${a} + ${b} = ?`, '小数加法', +(A + B).toFixed(2), '', '小数加减法')
        : this._input(`${Math.max(A, B)} − ${Math.min(A, B)} = ?`, '小数减法', +Math.abs(A - B).toFixed(2), '', '小数加减法');
    }
    // g >= 6：混合运算 + 行程应用题
    const t = Math.random();
    if (t < 0.4) {
      const a = this._ri(2, 20), b = this._ri(2, 9), c = this._ri(2, 9), d = this._ri(2, 5);
      return this._input(`${a} × ${b} + ${c} × ${d} = ?`, '多步混合运算', a * b + c * d, BANKS.math.koujue.yunsuan, '四则混合运算');
    }
    const v = this._ri(20, 60), h = this._ri(2, 5); // 行程
    return this._input(`一辆汽车每小时行驶 ${v} 千米，行驶了 ${h} 小时，一共行驶多少千米？`, '行程应用题', v * h, '', '简单应用题');
  },

  // 生成一道题
  gen(subject, grade) {
    const s = subject || this.config.subject;
    const g = grade || this.config.grade;
    if (s === 'pinyin') return this._genPinyin(g);
    if (s === 'english') return this._genEnglish(g);
    return this._genMath(g);
  },

  // 输入题 → 选择题（对战模式 / 触屏场景使用）
  toChoice(q) {
    if (!q.input) return q;
    const ans = String(q.answer);
    let ds = [];
    const num = parseFloat(ans);
    if (!isNaN(num)) { // 数学答案 → 数值干扰项
      while (ds.length < 3) {
        const d = num + this._ri(-10, 10);
        if (d !== num && d >= 0 && !ds.includes(d)) ds.push(d);
      }
    } else { // 英语拼写 → 其他单词干扰项
      const pool = BANKS.english.map(w => w.en).filter(e => e !== ans.toLowerCase());
      ds = this._shuffle(pool).slice(0, 3);
    }
    return Object.assign({}, q, { input: false, options: this._shuffle([ans].concat(ds.map(String))) });
  },

  // 对战模式：双方各一道（触屏友好，选择题化）
  genPair(subject, grade) {
    const s = subject || this.config.subject;
    const g = grade || this.config.grade;
    return [this.toChoice(this.gen(s, g)), this.toChoice(this.gen(s, g))];
  },

  // ---------- 自定义题库导入 ----------
  _loadCustom() {
    try {
      const raw = SafeStore.get('pvzEduCustomBanks');
      if (raw) this.custom = Object.assign(this.custom, JSON.parse(raw));
    } catch (e) { console.warn('自定义题库读取失败', e); }
  },
  saveCustom() {
    SafeStore.set('pvzEduCustomBanks', JSON.stringify(this.custom));
  },
  importBank(subject, data) {
    let added = 0;
    if (subject === 'pinyin') {
      if (!Array.isArray(data)) throw new Error('拼音题库应为数组，元素格式 {h:汉字, p:拼音}');
      data.forEach(it => {
        if (it && it.h && it.p) { this.custom.pinyinChars.push({ h: String(it.h), p: String(it.p) }); added++; }
      });
    } else if (subject === 'english') {
      if (!Array.isArray(data)) throw new Error('英语题库应为数组，元素格式 {en:英文, zh:中文, grade:年级}');
      data.forEach(it => {
        if (it && it.en && it.zh) { this.custom.englishWords.push({ en: String(it.en).trim().toLowerCase(), zh: String(it.zh), grade: +it.grade || 3 }); added++; }
      });
    } else if (subject === 'math') {
      if (!Array.isArray(data)) throw new Error('数学题库应为数组，元素格式 {q:题目, a:答案, kp:知识点}');
      data.forEach(it => {
        if (it && it.q && it.a !== undefined) { this.custom.mathQuestions.push({ q: String(it.q), a: String(it.a), kp: it.kp || '自定义' }); added++; }
      });
    } else throw new Error('科目必须是 pinyin / english / math');
    this.saveCustom();
    return added;
  },
  clearCustom(subject) {
    if (subject === 'pinyin') this.custom.pinyinChars = [];
    if (subject === 'english') this.custom.englishWords = [];
    if (subject === 'math') this.custom.mathQuestions = [];
    this.saveCustom();
  },
  customCount() {
    return { pinyin: this.custom.pinyinChars.length, english: this.custom.englishWords.length, math: this.custom.mathQuestions.length };
  },
};

QuestionEngine._loadCustom();

// ---------- 学习数据统计（localStorage） ----------
const StatStore = {
  KEY: 'pvzEduStats',
  record(q, correct, seconds, mode) {
    try {
      let all = this.all();
      all.push({ kp: q.kp, subject: QuestionEngine.config.subject, correct: !!correct, t: Math.round(seconds), time: Date.now(), mode });
      if (all.length > 2000) all = all.slice(-2000);
      SafeStore.set(this.KEY, JSON.stringify(all));
    } catch (e) { console.warn('统计记录失败（不影响游戏）', e); }
  },
  all() { try { return JSON.parse(SafeStore.get(this.KEY)) || []; } catch (e) { return []; } },
  report() {
    const all = this.all();
    const byKp = {};
    all.forEach(r => {
      if (!byKp[r.kp]) byKp[r.kp] = { total: 0, right: 0, timeSum: 0 };
      byKp[r.kp].total++; if (r.correct) byKp[r.kp].right++; byKp[r.kp].timeSum += r.t;
    });
    const list = Object.entries(byKp).map(([kp, v]) => ({
      kp, total: v.total, right: v.right, acc: Math.round(v.right / v.total * 100), avgT: Math.round(v.timeSum / v.total),
    })).sort((a, b) => a.acc - b.acc);
    return {
      total: all.length,
      acc: all.length ? Math.round(all.filter(r => r.correct).length / all.length * 100) : 0,
      kps: list,
      weak: list.filter(x => x.total >= 3 && x.acc < 70).slice(0, 6),
    };
  },
  clear() { SafeStore.remove(this.KEY); },
};
