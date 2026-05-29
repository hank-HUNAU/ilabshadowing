#!/usr/bin/env node

/**
 * 新课件自动化处理工具
 * 
 * 一条命令完成：
 * 1. 解析 LRC 文件
 * 2. 添加到 data.json
 * 3. 生成练习题数据
 * 
 * 使用方法：
 * node tools/import-course.js <lrc-file> [options]
 * 
 * 示例：
 * node tools/import-course.js ./audio/NCE1/L001.lrc --book NCE1 --unit u001 --audio L001
 */

const fs = require('fs');
const path = require('path');

// 引入子模块
const { LRCParser, DataManager } = require('./parse-lrc.js');
const { PracticeGenerator } = require('./generate-practice-data.js');

// ============================================================================
// 主处理流程
// ============================================================================

class CourseImporter {
  constructor(options = {}) {
    this.options = {
      book: 'NCE1',
      unit: 'u001',
      title: 'Lesson 1',
      audio: 'L001',
      ...options,
    };
  }
  
  /**
   * 导入完整课程
   * @param {string} lrcFile - LRC 文件路径
   */
  async import(lrcFile) {
    console.log('🚀 开始导入课程...\n');
    
    // Step 1: 解析 LRC
    console.log('📄 Step 1: 解析 LRC 文件');
    const parser = new LRCParser();
    const lines = parser.parseFile(lrcFile);
    console.log(`   ✓ 解析完成：${lines.length} 行\n`);
    
    // Step 2: 添加到 data.json
    console.log('💾 Step 2: 更新 data.json');
    const unitData = parser.toJSON({
      bookKey: this.options.book,
      unitKey: this.options.unit,
      unitTitle: this.options.title,
      audioKey: this.options.audio,
    });
    
    const dataManager = new DataManager();
    dataManager.addUnit(this.options.book, unitData);
    dataManager.save();
    console.log('');
    
    // Step 3: 生成练习题
    console.log('📝 Step 3: 生成练习题数据');
    const generator = new PracticeGenerator();
    const questionCount = generator.generateForUnit(
      this.options.book,
      this.options.unit,
      this.options.audio
    );
    generator.save();
    console.log('');
    
    // 完成总结
    console.log('✅ 导入完成！\n');
    console.log('📊 统计:');
    console.log(`   - 课程：${this.options.book}_${this.options.unit}`);
    console.log(`   - 句子：${lines.length} 句`);
    console.log(`   - 题目：${questionCount} 道`);
    console.log('');
    console.log('🔗 访问地址:');
    console.log('   主应用：https://8080-2f8c3282c30e641a.monkeycode-ai.online');
    console.log('   学习中心：https://8080-2f8c3282c30e641a.monkeycode-ai.online/practice.html');
    console.log('');
    console.log('⚠️  建议人工检查:');
    console.log('   1. 检查练习题干扰项是否合理');
    console.log('   2. 检查中文翻译是否准确');
    console.log('   3. 测试音频播放是否正常');
    console.log('');
  }
}

// ============================================================================
// 命令行接口
// ============================================================================

function printUsage() {
  console.log(`
新课件自动化导入工具

用法:
  node tools/import-course.js <lrc-file> [options]

选项:
  --book <key>        书籍 key (默认：NCE1)
  --unit <key>        课程 key (默认：u001)
  --title <title>     课程标题 (默认：Lesson 1)
  --audio <key>       音频 key (默认：L001)
  --help              显示帮助

示例:
  # 导入新概念第一册第 1 课
  node tools/import-course.js ./audio/NCE1/L001.lrc --book NCE1 --unit u001 --audio L001 --title "Lesson 1-2"
  
  # 导入 Think Level 0 第 1 课
  node tools/import-course.js ./think-0/U01A.lrc --book THINK_0 --unit u001 --audio T0_U01A
`);
}

function parseArgs(args) {
  const options = {
    file: null,
    book: 'NCE1',
    unit: 'u001',
    title: 'Lesson 1',
    audio: 'L001',
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
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
    }
  }
  
  return options;
}

async function main() {
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
  
  const importer = new CourseImporter(options);
  
  try {
    await importer.import(options.file);
  } catch (error) {
    console.error('✗ 导入失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
