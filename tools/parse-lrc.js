#!/usr/bin/env node

/**
 * LRC 歌词文件解析工具
 * 
 * 功能：
 * 1. 解析标准 LRC 格式
 * 2. 支持带中文翻译的扩展格式
 * 3. 输出 JSON 格式到 data.json
 * 
 * 使用方法：
 * node tools/parse-lrc.js <lrc-file> [options]
 * 
 * 示例：
 * node tools/parse-lrc.js ./audio/NCE1/L001.lrc --book NCE1 --unit u001 --audio L001
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// LRC 解析器（增强版）
// ============================================================================

class LRCParser {
  constructor() {
    this.lines = [];
  }
  
  /**
   * 解析 LRC 内容
   * @param {string} content - LRC 文件原始内容
   * @param {Object} options - 解析选项
   */
  parse(content, options = {}) {
    const {
      hasTranslation = false,
      translationMarker = '<cn>',
    } = options;
    
    this.lines = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    const rawLines = content.split('\n');
    
    let pendingTranslation = null;
    
    for (const line of rawLines) {
      const match = line.match(timeRegex);
      if (!match) continue;
      
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const milliseconds = parseInt(match[3].padEnd(3, '0'));
      const time = minutes * 60 + seconds + milliseconds / 1000;
      
      let text = line.replace(timeRegex, '').trim();
      
      // 处理带翻译标记的行
      if (text.startsWith(translationMarker)) {
        // 这是中文翻译
        const translation = text.replace(translationMarker, '').trim();
        
        // 找到上一行（英文），添加翻译
        if (this.lines.length > 0) {
          const lastLine = this.lines[this.lines.length - 1];
          if (lastLine.time === time || Math.abs(lastLine.time - time) < 0.01) {
            lastLine.cn = translation;
          }
        }
        continue;
      }
      
      // 跳过元数据标签
      if (text.startsWith('ti:') || text.startsWith('ar:') || 
          text.startsWith('al:') || text.startsWith('by:')) {
        continue;
      }
      
      if (text) {
        this.lines.push({
          time: parseFloat(time.toFixed(2)),
          en: text,
          cn: '', // 后续可能会填充中文
        });
      }
    }
    
    return this.lines;
  }
  
  /**
   * 解析文件
   * @param {string} filePath - LRC 文件路径
   */
  parseFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.parse(content);
  }
  
  /**
   * 输出为 data.json 格式
   * @param {Object} options
   */
  toJSON(options = {}) {
    const {
      bookKey = 'NCE1',
      unitKey = 'u001',
      unitTitle = 'Lesson 1',
      audioKey = 'L001',
    } = options;
    
    return {
      key: unitKey,
      title: unitTitle,
      audio: audioKey,
      lines: this.lines.map(line => ({
        time: line.time,
        en: line.en,
        cn: line.cn || line.en, // 如果没有中文，暂用英文填充
      })),
    };
  }
}

// ============================================================================
// Data.json 管理器
// ============================================================================

class DataManager {
  constructor(dataPath = './data.json') {
    this.dataPath = dataPath;
    this.data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  }
  
  /**
   * 添加新课到 data.json
   * @param {string} bookKey
   * @param {Object} unitData
   */
  addUnit(bookKey, unitData) {
    if (!this.data.units[bookKey]) {
      this.data.units[bookKey] = [];
    }
    
    // 检查是否已存在
    const existing = this.data.units[bookKey].find(u => u.key === unitData.key);
    if (existing) {
      console.warn(`⚠ 课程已存在：${bookKey}_${unitData.key}，将覆盖`);
      const idx = this.data.units[bookKey].findIndex(u => u.key === unitData.key);
      this.data.units[bookKey][idx] = unitData;
    } else {
      this.data.units[bookKey].push(unitData);
      console.log(`✓ 添加新课：${bookKey}_${unitData.key}`);
    }
  }
  
  /**
   * 保存
   */
  save() {
    fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2), 'utf-8');
    console.log('✓ 已保存到 data.json');
  }
}

// ============================================================================
// 命令行接口
// ============================================================================

function printUsage() {
  console.log(`
LRC 歌词文件解析器

用法:
  node tools/parse-lrc.js <lrc-file> [options]

选项:
  --book <key>        书籍 key (默认：NCE1)
  --unit <key>        课程 key (默认：u001)
  --title <title>     课程标题 (默认：Lesson 1)
  --audio <key>       音频 key (默认：L001)
  --output            输出到 data.json (默认：仅显示)
  --translate         LRC 文件包含中文翻译

示例:
  # 仅显示解析结果
  node tools/parse-lrc.js ./audio/NCE1/L001.lrc
  
  # 输出到 data.json
  node tools/parse-lrc.js ./audio/NCE1/L001.lrc --book NCE1 --unit u001 --audio L001 --output
  
  # 带中文翻译的 LRC
  node tools/parse-lrc.js ./audio/NCE1/L001.lrc --book NCE1 --unit u002 --audio L001 --output --translate
`);
}

function parseArgs(args) {
  const options = {
    file: null,
    book: 'NCE1',
    unit: 'u001',
    title: 'Lesson 1',
    audio: 'L001',
    output: false,
    translate: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (!arg.startsWith('-')) {
      options.file = arg;
      continue;
    }
    
    switch (arg) {
      case '--book':
        options.book = args[++i];
        break;
      case '--unit':
        options.unit = args[++i];
        break;
      case '--title':
        options.title = args[++i];
        break;
      case '--audio':
        options.audio = args[++i];
        break;
      case '--output':
        options.output = true;
        break;
      case '--translate':
        options.translate = true;
        break;
      case '-h':
      case '--help':
        printUsage();
        process.exit(0);
        break;
    }
  }
  
  return options;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }
  
  const options = parseArgs(args);
  
  if (!options.file) {
    console.error('✗ 错误：请指定 LRC 文件路径');
    printUsage();
    process.exit(1);
  }
  
  if (!fs.existsSync(options.file)) {
    console.error(`✗ 错误：文件不存在：${options.file}`);
    process.exit(1);
  }
  
  console.log(`📄 解析文件：${options.file}`);
  
  const parser = new LRCParser();
  const lines = parser.parseFile(options.file);
  
  console.log(`✓ 解析完成：${lines.length} 行\n`);
  
  // 预览结果
  console.log('预览（前 3 行）：');
  lines.slice(0, 3).forEach(line => {
    console.log(`  [${line.time.toFixed(2)}] ${line.en}`);
    if (line.cn) {
      console.log(`           → ${line.cn}`);
    }
  });
  console.log('');
  
  if (options.output) {
    // 输出到 data.json
    const unitData = parser.toJSON({
      bookKey: options.book,
      unitKey: options.unit,
      unitTitle: options.title,
      audioKey: options.audio,
    });
    
    const dataManager = new DataManager();
    dataManager.addUnit(options.book, unitData);
    dataManager.save();
    
    console.log('');
    console.log('下一步：生成练习题数据');
    console.log(`  node tools/generate-practice-data.js unit ${options.book}_${options.unit} ${options.audio}`);
  } else {
    // 仅显示 JSON 输出
    console.log('JSON 输出：');
    const unitData = parser.toJSON({
      bookKey: options.book,
      unitKey: options.unit,
      unitTitle: options.title,
      audioKey: options.audio,
    });
    console.log(JSON.stringify(unitData, null, 2));
  }
}

// 导出模块
module.exports = {
  LRCParser,
  DataManager,
};

// 运行 CLI
if (require.main === module) {
  main();
}
