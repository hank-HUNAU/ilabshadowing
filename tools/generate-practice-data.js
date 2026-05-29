#!/usr/bin/env node

/**
 * 练习题数据自动生成工具
 * 
 * 功能：
 * 1. 解析 LRC 歌词文件
 * 2. 自动提取英文句子和中文翻译
 * 3. 生成 5 种题型的练习数据
 * 
 * 使用方法：
 * node tools/generate-practice-data.js <audio-key> [options]
 * 
 * 示例：
 * node tools/generate-practice-data.js NCE1_u001
 * node tools/generate-practice-data.js NCE1_u001 --lrc ./audio/NCE1/L001.lrc
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// 配置项
// ============================================================================

const CONFIG = {
  // 干扰项生成策略
  distractors: {
    // 从同一课的其他句子中选择干扰项
    useSameUnit: true,
    // 从同本书的其他课中选择干扰项
    useSameBook: true,
    // 每个题目的干扰项数量
    count: 2,
  },
  
  // 补全训练策略
  fillBlank: {
    // 优先挖空词性
    priorityPOS: ['noun', 'verb', 'adjective', 'pronoun'],
    // 每个句子生成几个变体
    variantsPerSentence: 1,
  },
  
  // 音频 URL 模板
  audioURL: {
    NCE1: 'https://jikhdympaifsmubmwilp.supabase.co/storage/v1/object/public/nce1-audio/{audio}.mp3',
    THINK_0: 'https://jikhdympaifsmubmwilp.supabase.co/storage/v1/object/public/think0-audio/{audio}.mp3',
  },
};

// ============================================================================
// 词库（用于生成干扰项）
// ============================================================================

const WORD_BANKS = {
  // 常用肯定/否定词
  affirmations: [
    { en: 'Yes, it is.', cn: '是的，它是。' },
    { en: 'No, it isn\'t.', cn: '不，它不是。' },
    { en: 'Yes, please.', cn: '好的，请。' },
    { en: 'No, thank you.', cn: '不了，谢谢。' },
  ],
  
  // 常用问候语
  greetings: [
    { en: 'Good morning.', cn: '早上好。' },
    { en: 'Good afternoon.', cn: '下午好。' },
    { en: 'Good evening.', cn: '晚上好。' },
    { en: 'Hello!', cn: '你好！' },
    { en: 'Hi there!', cn: '嗨！' },
  ],
  
  // 常用疑问句
  questions: [
    { en: 'How are you?', cn: '你好吗？' },
    { en: 'What\'s your name?', cn: '你叫什么名字？' },
    { en: 'Where are you from?', cn: '你来自哪里？' },
    { en: 'How old are you?', cn: '你多大了？' },
  ],
  
  // 常用代词
  pronouns: ['my', 'your', 'his', 'her', 'its', 'our', 'their'],
  
  // 常用疑问词
  whWords: ['what', 'where', 'when', 'who', 'whose', 'which', 'why', 'how'],
  
  // 常用冠词
  articles: ['a', 'an', 'the'],
  
  // 常用介词
  prepositions: ['in', 'on', 'at', 'to', 'for', 'with', 'by', 'from'],
};

// ============================================================================
// LRC 解析器
// ============================================================================

class LRCParser {
  /**
   * 解析 LRC 文件内容
   * @param {string} lrcContent - LRC 文件原始内容
   * @returns {Array} - 解析后的歌词数组 [{time, text}]
   */
  static parse(lrcContent) {
    const lines = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    
    const rawLines = lrcContent.split('\n');
    
    for (const line of rawLines) {
      const match = line.match(timeRegex);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const milliseconds = parseInt(match[3].padEnd(3, '0'));
        const time = minutes * 60 + seconds + milliseconds / 1000;
        
        const text = line.replace(timeRegex, '').trim();
        if (text) {
          lines.push({ time, text });
        }
      }
    }
    
    return lines;
  }
  
  /**
   * 读取并解析 LRC 文件
   * @param {string} filePath - LRC 文件路径
   * @returns {Array}
   */
  static parseFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.parse(content);
  }
}

// ============================================================================
// 题目生成器
// ============================================================================

class PracticeGenerator {
  constructor(dataPath = './data.json') {
    this.dataPath = dataPath;
    this.data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  }
  
  /**
   * 保存数据
   */
  save() {
    fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2), 'utf-8');
    console.log('✓ 数据已保存到 data.json');
  }
  
  /**
   * 获取音频 URL
   * @param {string} bookKey - 书籍 key
   * @param {string} audioKey - 音频 key
   */
  getAudioURL(bookKey, audioKey) {
    const template = CONFIG.audioURL[bookKey];
    if (template) {
      return template.replace('{audio}', audioKey);
    }
    return null;
  }
  
  /**
   * 获取同一课的其他句子（用于生成干扰项）
   * @param {string} bookKey
   * @param {string} unitKey
   * @param {number} excludeIndex - 排除的句子索引
   */
  getOtherSentencesFromUnit(bookKey, unitKey, excludeIndex = -1) {
    const unit = this.data.units[bookKey]?.find(u => u.key === unitKey);
    if (!unit) return [];
    
    return unit.lines
      .filter((_, idx) => idx !== excludeIndex)
      .map(line => ({
        en: line.en,
        cn: line.cn,
      }));
  }
  
  /**
   * 获取同本书其他课的句子
   * @param {string} bookKey
   * @param {string} excludeUnitKey
   */
  getSentencesFromOtherUnits(bookKey, excludeUnitKey) {
    const unit = this.data.units[bookKey];
    if (!unit) return [];
    
    return unit
      .filter(u => u.key !== excludeUnitKey)
      .flatMap(u => u.lines.map(line => ({ en: line.en, cn: line.cn })));
  }
  
  /**
   * 生成听音辨意题型
   * @param {Object} sentence - 句子对象 {en, cn}
   * @param {Array} distractors - 干扰项池
   */
  generateListening(sentence, distractors = []) {
    const allDistractors = [
      ...distractors,
      ...WORD_BANKS.affirmations,
      ...WORD_BANKS.greetings,
    ];
    
    // 随机选择 2 个干扰项
    const shuffled = allDistractors.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, CONFIG.distractors.count);
    
    // 构建选项数组
    const options = [
      { text: sentence.cn, correct: true },
      ...selected.map(s => ({ text: s.cn, correct: false })),
    ];
    
    // 打乱选项顺序
    return {
      options: options.sort(() => Math.random() - 0.5),
    };
  }
  
  /**
   * 生成补全训练题型
   * @param {string} sentence - 英文句子
   * @param {string} translation - 中文翻译
   */
  generateFillBlank(sentence, translation) {
    // 移除标点，分词
    const words = sentence.replace(/[.,!?;:]/g, '').split(/\s+/);
    
    if (words.length < 3) {
      // 句子太短，不生成
      return null;
    }
    
    // 选择一个词挖空（优先选择实词）
    const realWordIndices = words
      .map((word, idx) => {
        const lower = word.toLowerCase();
        // 排除冠词、介词、连词
        if (['a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'and', 'or', 'but'].includes(lower)) {
          return -1;
        }
        return idx;
      })
      .filter(idx => idx >= 0);
    
    if (realWordIndices.length === 0) return null;
    
    const targetIdx = realWordIndices[Math.floor(Math.random() * realWordIndices.length)];
    const targetWord = words[targetIdx];
    
    // 生成干扰项（同词性的词）
    const options = this.generateWordOptions(targetWord);
    
    // 构建挖空模板
    const template = words
      .map((word, idx) => idx === targetIdx ? '______' : word)
      .join(' ');
    
    return {
      template,
      options,
      answer: targetWord,
      hint: this.generateHint(targetWord, translation),
    };
  }
  
  /**
   * 生成单词选项（补全训练用）
   * @param {string} targetWord
   */
  generateWordOptions(targetWord) {
    const word = targetWord.replace(/[.,!?;:]/g, '');
    const lower = word.toLowerCase();
    const capitalized = word[0] === word[0].toUpperCase();
    
    // 根据词性生成干扰项
    let distractors = [];
    
    if (WORD_BANKS.pronouns.includes(lower)) {
      distractors = WORD_BANKS.pronouns.filter(w => w !== lower);
    } else if (WORD_BANKS.whWords.includes(lower)) {
      distractors = WORD_BANKS.whWords.filter(w => w !== lower);
    } else if (WORD_BANKS.articles.includes(lower)) {
      distractors = WORD_BANKS.articles.filter(w => w !== lower);
    } else if (WORD_BANKS.prepositions.includes(lower)) {
      distractors = WORD_BANKS.prepositions.filter(w => w !== lower);
    } else {
      // 默认：使用常见动词/名词
      distractors = ['have', 'make', 'take', 'give', 'get'].filter(w => w !== lower);
    }
    
    // 选择 2 个干扰项
    const selected = distractors.slice(0, 2);
    
    // 保持首字母大写
    const options = [
      capitalized ? word[0].toUpperCase() + word.slice(1) : word,
      ...selected.map(w => capitalized ? w[0].toUpperCase() + w.slice(1) : w),
    ];
    
    return options.sort(() => Math.random() - 0.5);
  }
  
  /**
   * 生成提示（补全训练用）
   * @param {string} word
   * @param {string} translation
   */
  generateHint(word, translation) {
    const lower = word.toLowerCase().replace(/[.,!?;:]/g, '');
    
    if (WORD_BANKS.pronouns.includes(lower)) {
      return '人称代词';
    } else if (WORD_BANKS.whWords.includes(lower)) {
      return '疑问词';
    } else if (WORD_BANKS.articles.includes(lower)) {
      return '冠词';
    } else if (WORD_BANKS.prepositions.includes(lower)) {
      return '介词';
    } else if (lower === 'is' || lower === 'am' || lower === 'are') {
      return 'be 动词';
    } else if (lower === 'please' || lower === 'thank') {
      return '礼貌用语';
    }
    
    return '关键词';
  }
  
  /**
   * 生成句子重组题型
   * @param {string} sentence
   */
  generateOrdering(sentence) {
    // 分词
    const words = sentence.split(/\s+/);
    
    if (words.length < 3) {
      return null;
    }
    
    // 打乱单词顺序
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    
    return {
      words: shuffled,
      answer: words,
    };
  }
  
  /**
   * 生成单个句子的练习数据
   * @param {string} bookKey
   * @param {string} unitKey
   * @param {number} sentenceIndex
   * @param {string} audioKey
   */
  generateForSentence(bookKey, unitKey, sentenceIndex, audioKey) {
    const unit = this.data.units[bookKey]?.find(u => u.key === unitKey);
    if (!unit) {
      console.error(`✗ 未找到课程：${bookKey}_${unitKey}`);
      return null;
    }
    
    const sentence = unit.lines[sentenceIndex];
    if (!sentence) {
      console.error(`✗ 未找到句子索引：${sentenceIndex}`);
      return null;
    }
    
    // 生成各题型
    const otherSentences = this.getOtherSentencesFromUnit(bookKey, unitKey, sentenceIndex);
    const otherBookSentences = this.getSentencesFromOtherUnits(bookKey, unitKey);
    const allDistractors = [...otherSentences, ...otherBookSentences];
    
    const listening = this.generateListening(sentence, allDistractors);
    const fillBlank = this.generateFillBlank(sentence.en, sentence.cn);
    const ordering = this.generateOrdering(sentence.en);
    
    // 构建题目数据
    const questionId = `${bookKey}_${unitKey}_${sentenceIndex}`;
    const audioURL = this.getAudioURL(bookKey, audioKey);
    
    return {
      id: questionId,
      sentence: sentence.en,
      translation: sentence.cn,
      audio: audioURL || `./audio/${audioKey}.mp3`,
      listening,
      fillBlank: fillBlank || {
        template: sentence.en,
        options: [sentence.en],
        answer: sentence.en,
        hint: '完整句子',
      },
      ordering: ordering || {
        words: [sentence.en],
        answer: [sentence.en],
      },
      reference: sentence.cn,
    };
  }
  
  /**
   * 生成整课练习数据（双结构：practice_questions + course_practice）
   * @param {string} bookKey
   * @param {string} unitKey
   * @param {string} audioKey
   * @param {Array} sentenceIndices - 要生成的句子索引，不传则生成全部
   */
  generateForUnit(bookKey, unitKey, audioKey, sentenceIndices = null) {
    const unit = this.data.units[bookKey]?.find(u => u.key === unitKey);
    if (!unit) {
      console.error(`✗ 未找到课程：${bookKey}_${unitKey}`);
      return 0;
    }
    
    const indices = sentenceIndices || unit.lines.map((_, idx) => idx);
    let count = 0;
    
    // 初始化双结构
    if (!this.data.practice_questions) {
      this.data.practice_questions = {};
    }
    if (!this.data.course_practice) {
      this.data.course_practice = {};
    }
    
    // 构建课程练习数据（新结构）
    const coursePractice = {
      courseId: `${bookKey}_${unitKey}`,
      bookKey,
      unitKey,
      title: unit.title,
      audio: audioKey,
      audioURL: this.getAudioURL(bookKey, audioKey),
      sentences: [],
      progress: {
        currentSentence: 0,
        completedSentences: [],
        accuracy: 0,
        lastPractice: null,
      },
    };
    
    for (const idx of indices) {
      const question = this.generateForSentence(bookKey, unitKey, idx, audioKey);
      if (question) {
        // 旧结构：保持兼容
        this.data.practice_questions[question.id] = question;
        
        // 新结构：添加到课程练习
        coursePractice.sentences.push({
          index: idx,
          sentence: question.sentence,
          translation: question.translation,
          audio: question.audio,
          questions: {
            listening: question.listening,
            fillBlank: question.fillBlank,
            ordering: question.ordering,
            reference: question.reference,
          },
        });
        
        count++;
        console.log(`✓ 生成题目：${question.id}`);
      }
    }
    
    // 保存课程练习数据（新结构）
    this.data.course_practice[coursePractice.courseId] = coursePractice;
    console.log(`✓ 生成课程练习：${coursePractice.courseId} (${coursePractice.sentences.length}句)`);
    
    return count;
  }
  
  /**
   * 生成所有课程的练习数据
   */
  generateAll() {
    let totalCount = 0;
    
    for (const bookKey in this.data.units) {
      const units = this.data.units[bookKey];
      for (const unit of units) {
        const count = this.generateForUnit(bookKey, unit.key, unit.audio);
        totalCount += count;
      }
    }
    
    console.log(`\n✓ 共生成 ${totalCount} 道题目`);
    return totalCount;
  }
}

// ============================================================================
// 命令行接口
// ============================================================================

function printUsage() {
  console.log(`
练习题数据生成器

用法：
  node tools/generate-practice-data.js <command> [options]

命令:
  unit <bookKey_unitKey> <audioKey>   生成指定课程的练习数据
  all                                  生成所有课程的练习数据
  help                                 显示帮助信息

示例:
  node tools/generate-practice-data.js unit NCE1_u001 L001
  node tools/generate-practice-data.js all
`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }
  
  const command = args[0];
  const generator = new PracticeGenerator();
  
  switch (command) {
    case 'unit': {
      const unitId = args[1];
      const audioKey = args[2];
      
      if (!unitId || !audioKey) {
        console.error('✗ 错误：缺少参数');
        printUsage();
        process.exit(1);
      }
      
      const [bookKey, unitKey] = unitId.split('_');
      const count = generator.generateForUnit(bookKey, unitKey, audioKey);
      generator.save();
      console.log(`✓ 完成：生成 ${count} 道题目`);
      break;
    }
    
    case 'all': {
      const count = generator.generateAll();
      generator.save();
      break;
    }
    
    case 'help':
    case '-h':
    case '--help': {
      printUsage();
      break;
    }
    
    default: {
      console.error(`✗ 未知命令：${command}`);
      printUsage();
      process.exit(1);
    }
  }
}

// 导出模块（供其他脚本使用）
module.exports = {
  LRCParser,
  PracticeGenerator,
  CONFIG,
  WORD_BANKS,
};

// 运行 CLI
if (require.main === module) {
  main();
}
