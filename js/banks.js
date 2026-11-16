/* ============================================
 * banks.js — 内置题库数据（拼音 / 英语 / 数学口诀）
 * 可通过"题库管理"页面导入自定义题库进行扩充
 * ============================================ */
'use strict';

const BANKS = {
  // ---------- 拼音 ----------
  pinyin: {
    shengmu: ['b','p','m','f','d','t','n','l','g','k','h','j','q','x','zh','ch','sh','r','z','c','s','y','w'],
    yunmu_single: ['a','o','e','i','u','ü'],                       // 单韵母
    yunmu_compound: ['ai','ei','ui','ao','ou','iu','ie','üe','er','an','en','in','un','ün','ang','eng','ing','ong'], // 复鼻韵母
    zhengti: ['zhi','chi','shi','ri','zi','ci','si','yi','wu','yu','ye','yue','yuan','yin','yun','ying'], // 整体认读音节
    koujue: {
      sanpin: '三拼音节口诀：声轻介快韵母响，三音连读很顺当。',
      liangpin: '两拼音节口诀：前音轻短后音重，两音相连猛一碰。',
      zhengti: '整体认读音节口诀：整体认读一口气，不用拼读直接记。',
      biaodiao: '标调口诀：有 a 不放过，没 a 找 o、e，i、u 并列标在后。',
    },
    // 常用汉字（供"给汉字选拼音 / 给拼音选汉字"题型）
    chars: [
      {h:'花',p:'huā'},{h:'鸟',p:'niǎo'},{h:'水',p:'shuǐ'},{h:'山',p:'shān'},
      {h:'火',p:'huǒ'},{h:'木',p:'mù'},{h:'天',p:'tiān'},{h:'地',p:'dì'},
      {h:'人',p:'rén'},{h:'口',p:'kǒu'},{h:'目',p:'mù'},{h:'耳',p:'ěr'},
      {h:'手',p:'shǒu'},{h:'足',p:'zú'},{h:'日',p:'rì'},{h:'月',p:'yuè'},
      {h:'星',p:'xīng'},{h:'云',p:'yún'},{h:'雨',p:'yǔ'},{h:'风',p:'fēng'},
      {h:'春',p:'chūn'},{h:'夏',p:'xià'},{h:'秋',p:'qiū'},{h:'冬',p:'dōng'},
      {h:'书',p:'shū'},{h:'笔',p:'bǐ'},{h:'马',p:'mǎ'},{h:'牛',p:'niú'},
      {h:'羊',p:'yáng'},{h:'兔',p:'tù'},{h:'鱼',p:'yú'},{h:'虫',p:'chóng'},
      {h:'红',p:'hóng'},{h:'绿',p:'lǜ'},{h:'蓝',p:'lán'},{h:'黄',p:'huáng'},
      {h:'大',p:'dà'},{h:'小',p:'xiǎo'},{h:'多',p:'duō'},{h:'少',p:'shǎo'},
      {h:'高',p:'gāo'},{h:'矮',p:'ǎi'},{h:'快',p:'kuài'},{h:'慢',p:'màn'},
      {h:'吃',p:'chī'},{h:'喝',p:'hē'},{h:'跑',p:'pǎo'},{h:'跳',p:'tiào'},
      {h:'飞',p:'fēi'},{h:'游',p:'yóu'},{h:'笑',p:'xiào'},{h:'哭',p:'kū'},
      {h:'家',p:'jiā'},{h:'校',p:'xiào'},{h:'师',p:'shī'},{h:'友',p:'yǒu'},
      {h:'早',p:'zǎo'},{h:'晚',p:'wǎn'},{h:'好',p:'hǎo'},{h:'新',p:'xīn'},
    ],
  },

  // ---------- 英语（小学核心词汇，grade 为建议年级） ----------
  english: [
    // 一年级
    {en:'cat',   zh:'猫',   grade:1},{en:'dog',   zh:'狗',   grade:1},
    {en:'bird',  zh:'鸟',   grade:1},{en:'fish',  zh:'鱼',   grade:1},
    {en:'apple', zh:'苹果', grade:1},{en:'egg',   zh:'鸡蛋', grade:1},
    {en:'book',  zh:'书',   grade:1},{en:'pen',   zh:'钢笔', grade:1},
    {en:'one',   zh:'一',   grade:1},{en:'two',   zh:'二',   grade:1},
    {en:'red',   zh:'红色', grade:1},{en:'blue',  zh:'蓝色', grade:1},
    {en:'big',   zh:'大的', grade:1},{en:'small', zh:'小的', grade:1},
    {en:'hand',  zh:'手',   grade:1},{en:'eye',   zh:'眼睛', grade:1},
    // 二年级
    {en:'sun',   zh:'太阳', grade:2},{en:'moon',  zh:'月亮', grade:2},
    {en:'star',  zh:'星星', grade:2},{en:'tree',  zh:'树',   grade:2},
    {en:'flower',zh:'花',   grade:2},{en:'water', zh:'水',   grade:2},
    {en:'milk',  zh:'牛奶', grade:2},{en:'rice',  zh:'米饭', grade:2},
    {en:'three', zh:'三',   grade:2},{en:'four',  zh:'四',   grade:2},
    {en:'five',  zh:'五',   grade:2},{en:'six',   zh:'六',   grade:2},
    {en:'green', zh:'绿色', grade:2},{en:'yellow',zh:'黄色', grade:2},
    {en:'run',   zh:'跑',   grade:2},{en:'jump',  zh:'跳',   grade:2},
    {en:'family',zh:'家庭', grade:2},{en:'mother',zh:'妈妈', grade:2},
    // 三年级
    {en:'school',zh:'学校', grade:3},{en:'teacher',zh:'老师',grade:3},
    {en:'student',zh:'学生',grade:3},{en:'friend',zh:'朋友', grade:3},
    {en:'seven', zh:'七',   grade:3},{en:'eight', zh:'八',   grade:3},
    {en:'nine',  zh:'九',   grade:3},{en:'ten',   zh:'十',   grade:3},
    {en:'tiger', zh:'老虎', grade:3},{en:'monkey',zh:'猴子', grade:3},
    {en:'rabbit',zh:'兔子', grade:3},{en:'horse', zh:'马',   grade:3},
    {en:'breakfast',zh:'早餐',grade:3},{en:'lunch',zh:'午餐', grade:3},
    {en:'spring',zh:'春天', grade:3},{en:'winter',zh:'冬天', grade:3},
    // 四年级
    {en:'garden',zh:'花园', grade:4},{en:'kitchen',zh:'厨房',grade:4},
    {en:'window',zh:'窗户', grade:4},{en:'birthday',zh:'生日',grade:4},
    {en:'eleven',zh:'十一', grade:4},{en:'twelve',zh:'十二', grade:4},
    {en:'twenty',zh:'二十', grade:4},{en:'thirty',zh:'三十', grade:4},
    {en:'Monday',zh:'星期一',grade:4},{en:'Sunday',zh:'星期日',grade:4},
    {en:'autumn',zh:'秋天', grade:4},{en:'summer',zh:'夏天', grade:4},
    {en:'banana',zh:'香蕉', grade:4},{en:'grape', zh:'葡萄', grade:4},
    {en:'weather',zh:'天气',grade:4},{en:'cloudy',zh:'多云的',grade:4},
    // 五年级
    {en:'library',zh:'图书馆',grade:5},{en:'hospital',zh:'医院',grade:5},
    {en:'cinema',zh:'电影院',grade:5},{en:'station',zh:'车站', grade:5},
    {en:'February',zh:'二月',grade:5},{en:'August',zh:'八月', grade:5},
    {en:'December',zh:'十二月',grade:5},{en:'Wednesday',zh:'星期三',grade:5},
    {en:'vegetable',zh:'蔬菜',grade:5},{en:'tomato',zh:'西红柿',grade:5},
    {en:'potato',zh:'土豆',  grade:5},{en:'chicken',zh:'鸡肉', grade:5},
    {en:'beautiful',zh:'美丽的',grade:5},{en:'interesting',zh:'有趣的',grade:5},
    // 六年级
    {en:'September',zh:'九月', grade:6},{en:'November',zh:'十一月',grade:6},
    {en:'university',zh:'大学',grade:6},{en:'science',zh:'科学', grade:6},
    {en:'history',zh:'历史',  grade:6},{en:'music',  zh:'音乐', grade:6},
    {en:'picnic',zh:'野餐',   grade:6},{en:'holiday',zh:'假期', grade:6},
    {en:'umbrella',zh:'雨伞', grade:6},{en:'wallet', zh:'钱包', grade:6},
    {en:'mountain',zh:'高山', grade:6},{en:'island', zh:'岛屿', grade:6},
    {en:'delicious',zh:'美味的',grade:6},{en:'difficult',zh:'困难的',grade:6},
  ],

  // ---------- 数学（口诀与应用题模板） ----------
  math: {
    koujue: {
      chengfa: '乘法口诀示例：三七二十一，五八四十。',
      chufa: '除法是乘法的逆运算：想"几几得几"来算除法。',
      yunsuan: '四则运算顺序：先乘除后加减，有括号先算括号里的。',
    },
  },
};

// 供导入题库使用的格式示例
const BANK_TEMPLATE = {
  pinyin: {
    desc: '自定义汉字拼音题（给汉字选拼音 / 给拼音选汉字）',
    example: [{ h: '明', p: 'míng' }, { h: '亮', p: 'liàng' }],
  },
  english: {
    desc: '自定义英语词汇：en=英文, zh=中文, grade=建议年级(1-6)',
    example: [{ en: 'dragon', zh: '龙', grade: 3 }, { en: 'candy', zh: '糖果', grade: 2 }],
  },
  math: {
    desc: '自定义数学题：q=题目, a=答案, kp=知识点标签',
    example: [{ q: '小明有12颗糖，分给同学一半，还剩几颗？', a: '6', kp: '应用题' }],
  },
};
