/**
 * 词汇学习模块 - 复刻CET-MASTER闪卡功能
 * 版本：20260605-1
 */

// 词汇学习管理器
class VocabularyLearningManager {
  constructor() {
    this.currentWords = [];
    this.currentIndex = 0;
    this.isFlipped = false;
    this.unknownWords = [];
    this.knownWords = [];
    this.currentCourse = null;
    this.currentLesson = null;
  }
  
  // 初始化
  async init(courseId, lessonId) {
    this.currentCourse = courseId;
    this.currentLesson = lessonId;
    await this.loadLessonWords();
    this.bindEvents();
  }
  
  // 加载课次词汇
  async loadLessonWords() {
    try {
      // 尝试加载词汇数据
      const vocabData = await this.fetchVocabularyData();
      this.currentWords = vocabData || [];
      this.currentIndex = 0;
      this.isFlipped = false;
      this.unknownWords = [];
      this.knownWords = [];
      
      if (this.currentWords.length > 0) {
        this.renderCard();
      } else {
        this.showNoVocabularyMessage();
      }
    } catch (error) {
      console.error('加载词汇数据失败:', error);
      this.showErrorMessage();
    }
  }
  
  // 获取词汇数据
  async fetchVocabularyData() {
    // 这里可以根据实际的数据源获取词汇
    // 目前返回示例数据
    return [
      {
        id: 'v_001',
        word: 'abandon',
        phonetic: '/əˈbændən/',
        meaning: '放弃，抛弃',
        example: 'He abandoned his plan to travel abroad.'
      },
      {
        id: 'v_002',
        word: 'ability',
        phonetic: '/əˈbɪləti/',
        meaning: '能力，才能',
        example: 'She has the ability to solve complex problems.'
      },
      {
        id: 'v_003',
        word: 'absolute',
        phonetic: '/ˈæbsəluːt/',
        meaning: '绝对的，完全的',
        example: 'I have absolute confidence in her abilities.'
      }
    ];
  }
  
  // 翻转卡片
  flipCard() {
    this.isFlipped = !this.isFlipped;
    const card = document.getElementById('vocabularyCard');
    if (card) {
      card.classList.toggle('flipped', this.isFlipped);
    }
  }
  
  // 标记词汇状态
  markWord(status) {
    const word = this.currentWords[this.currentIndex];
    
    if (status === 'unknown') {
      this.unknownWords.push(word);
    } else {
      this.knownWords.push(word);
    }
    
    this.saveProgress();
    this.nextCard();
  }
  
  // 下一张卡片
  nextCard() {
    this.currentIndex++;
    this.isFlipped = false;
    
    if (this.currentIndex >= this.currentWords.length) {
      this.showSummary();
    } else {
      this.renderCard();
    }
  }
  
  // 渲染卡片
  renderCard() {
    const word = this.currentWords[this.currentIndex];
    const card = document.getElementById('vocabularyCard');
    
    if (!card) return;
    
    // 重置翻转状态
    card.classList.remove('flipped');
    this.isFlipped = false;
    
    // 更新卡片内容
    const phoneticEl = card.querySelector('.word-phonetic');
    const textEl = card.querySelector('.word-text');
    const meaningEl = card.querySelector('.word-meaning');
    const exampleEl = card.querySelector('.word-example');
    
    if (phoneticEl) phoneticEl.textContent = word.phonetic || '';
    if (textEl) textEl.textContent = word.word;
    if (meaningEl) meaningEl.textContent = word.meaning;
    if (exampleEl) exampleEl.textContent = word.example;
    
    // 更新进度
    const progressEl = document.getElementById('vocabProgress');
    if (progressEl) {
      progressEl.textContent = `${this.currentIndex + 1}/${this.currentWords.length}`;
    }
  }
  
  // 显示学习摘要
  showSummary() {
    const container = document.querySelector('.vocabulary-learning-container');
    if (!container) return;
    
    const summaryHTML = `
      <div class="vocabulary-summary">
        <h3 class="summary-title">词汇预习完成！</h3>
        <div class="summary-stats">
          <div class="summary-stat">
            <div class="summary-stat-value unknown">${this.unknownWords.length}</div>
            <div class="summary-stat-label">不认识</div>
          </div>
          <div class="summary-stat">
            <div class="summary-stat-value known">${this.knownWords.length}</div>
            <div class="summary-stat-label">已认识</div>
          </div>
        </div>
        <div class="summary-actions">
          <button class="btn-continue" onclick="vocabularyManager.continueToNext()">
            继续学习
          </button>
          <button class="btn-review" onclick="vocabularyManager.startReview()">
            开始复习
          </button>
        </div>
      </div>
    `;
    
    container.innerHTML = summaryHTML;
  }
  
  // 显示无词汇消息
  showNoVocabularyMessage() {
    const container = document.querySelector('.vocabulary-learning-container');
    if (!container) return;
    
    container.innerHTML = `
      <div class="vocabulary-summary">
        <h3 class="summary-title">暂无词汇数据</h3>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">
          当前课程暂无词汇预习内容
        </p>
        <button class="btn-continue" onclick="window.location.hash='course'">
          选择其他课程
        </button>
      </div>
    `;
  }
  
  // 显示错误消息
  showErrorMessage() {
    const container = document.querySelector('.vocabulary-learning-container');
    if (!container) return;
    
    container.innerHTML = `
      <div class="vocabulary-summary">
        <h3 class="summary-title">加载失败</h3>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">
          加载词汇数据时出现错误，请稍后重试
        </p>
        <button class="btn-continue" onclick="vocabularyManager.loadLessonWords()">
          重试
        </button>
      </div>
    `;
  }
  
  // 继续学习
  continueToNext() {
    // 切换到下一个学习步骤
    window.location.hash = 'shadowing';
  }
  
  // 开始复习
  startReview() {
    // 切换到复习Tab
    window.location.hash = 'review';
  }
  
  // 保存进度
  saveProgress() {
    const progress = {
      courseId: this.currentCourse,
      lessonId: this.currentLesson,
      unknownWords: this.unknownWords.map(w => w.id),
      knownWords: this.knownWords.map(w => w.id),
      timestamp: Date.now()
    };
    
    localStorage.setItem('vocabulary_progress', JSON.stringify(progress));
    
    // 同时更新学习流程进度
    this.updateLearningFlowProgress();
  }
  
  // 更新学习流程进度
  updateLearningFlowProgress() {
    const progressKey = `learning_progress_${this.currentCourse}_${this.currentLesson}`;
    const existingProgress = JSON.parse(localStorage.getItem(progressKey) || '{}');
    
    existingProgress.vocabularyCompleted = true;
    existingProgress.vocabularyStats = {
      total: this.currentWords.length,
      unknown: this.unknownWords.length,
      known: this.knownWords.length
    };
    existingProgress.updatedAt = Date.now();
    
    localStorage.setItem(progressKey, JSON.stringify(existingProgress));
  }
  
  // 绑定事件
  bindEvents() {
    // 闪卡翻转事件
    const card = document.getElementById('vocabularyCard');
    if (card) {
      card.addEventListener('click', () => this.flipCard());
    }
    
    // 按钮事件
    const btnUnknown = document.getElementById('btnUnknown');
    const btnKnown = document.getElementById('btnKnown');
    
    if (btnUnknown) {
      btnUnknown.addEventListener('click', () => this.markWord('unknown'));
    }
    
    if (btnKnown) {
      btnKnown.addEventListener('click', () => this.markWord('known'));
    }
    
    // 键盘事件
    document.addEventListener('keydown', (e) => {
      // 只有在词汇学习Tab激活时才响应
      if (!document.getElementById('tab-vocabulary').classList.contains('active')) {
        return;
      }
      
      switch(e.code) {
        case 'Space':
        case 'Enter':
          e.preventDefault();
          this.flipCard();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.markWord('unknown');
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.markWord('known');
          break;
      }
    });
  }
}

// 斯宾浩斯复习管理器
class EbbinghausReviewManager {
  constructor() {
    this.vocabularyData = new Map();
    this.reviewQueue = [];
    this.currentReviewIndex = 0;
  }
  
  // 初始化
  init() {
    this.loadVocabularyData();
    this.updateReviewStats();
    this.bindEvents();
  }
  
  // 加载词汇数据
  loadVocabularyData() {
    try {
      const data = JSON.parse(localStorage.getItem('vocabulary_data') || '[]');
      this.vocabularyData = new Map(data);
    } catch (error) {
      console.error('加载词汇数据失败:', error);
      this.vocabularyData = new Map();
    }
  }
  
  // 初始化词汇数据
  initVocabulary(words) {
    words.forEach(word => {
      this.vocabularyData.set(word.id, {
        ...word,
        status: 'new',
        reviewCount: 0,
        nextReview: null,
        lastReview: null,
        easeFactor: 2.5,
        interval: 0
      });
    });
    
    this.saveVocabularyData();
  }
  
  // 获取需要复习的词汇
  getDueReviews() {
    const now = Date.now();
    const dueWords = [];
    
    this.vocabularyData.forEach((word, id) => {
      if (word.nextReview && word.nextReview <= now) {
        dueWords.push(word);
      }
    });
    
    return dueWords.sort((a, b) => a.nextReview - b.nextReview);
  }
  
  // 计算下次复习时间（基于SM-2算法）
  calculateNextReview(wordId, quality) {
    const word = this.vocabularyData.get(wordId);
    
    if (quality >= 3) {
      // 记忆良好，更新间隔和难度因子
      word.easeFactor = Math.max(1.3, 
        word.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      );
      
      if (word.reviewCount === 0) {
        word.interval = 20; // 第一次复习：20分钟后
      } else {
        word.interval = Math.round(word.interval * word.easeFactor);
      }
      
      word.nextReview = Date.now() + word.interval * 60 * 1000;
      word.lastReview = Date.now();
      word.reviewCount++;
      word.status = 'reviewing';
    } else {
      // 记忆不好，重置为学习状态
      word.status = 'learning';
      word.reviewCount = 0;
      word.interval = 0;
      word.nextReview = Date.now() + 10 * 60 * 1000; // 10分钟后重试
    }
    
    this.saveVocabularyData();
  }
  
  // 处理复习结果
  handleReviewResult(wordId, quality) {
    this.calculateNextReview(wordId, quality);
    this.nextReviewCard();
  }
  
  // 下一张复习卡片
  nextReviewCard() {
    this.currentReviewIndex++;
    
    if (this.currentReviewIndex >= this.reviewQueue.length) {
      this.showReviewComplete();
    } else {
      this.renderReviewCard();
    }
  }
  
  // 渲染复习卡片
  renderReviewCard() {
    const word = this.reviewQueue[this.currentReviewIndex];
    const wordEl = document.getElementById('reviewWord');
    
    if (wordEl) {
      wordEl.textContent = word.word;
    }
  }
  
  // 显示复习完成
  showReviewComplete() {
    const container = document.querySelector('.review-container');
    if (!container) return;
    
    container.innerHTML = `
      <div class="vocabulary-summary">
        <h3 class="summary-title">复习完成！</h3>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">
          本次复习了 ${this.reviewQueue.length} 个词汇
        </p>
        <button class="btn-continue" onclick="window.location.hash='overview'">
          返回概览
        </button>
      </div>
    `;
  }
  
  // 更新复习统计
  updateReviewStats() {
    const dueWords = this.getDueReviews();
    const masteredCount = Array.from(this.vocabularyData.values()).filter(
      word => word.status === 'mastered'
    ).length;
    
    const dueCountEl = document.getElementById('dueCount');
    const masteredCountEl = document.getElementById('masteredCount');
    
    if (dueCountEl) {
      dueCountEl.textContent = dueWords.length;
    }
    
    if (masteredCountEl) {
      masteredCountEl.textContent = masteredCount;
    }
  }
  
  // 开始复习
  startReview() {
    this.reviewQueue = this.getDueReviews();
    this.currentReviewIndex = 0;
    
    if (this.reviewQueue.length === 0) {
      this.showNoReviewMessage();
    } else {
      this.renderReviewCard();
    }
  }
  
  // 显示无复习消息
  showNoReviewMessage() {
    const container = document.querySelector('.review-container');
    if (!container) return;
    
    container.innerHTML = `
      <div class="vocabulary-summary">
        <h3 class="summary-title">暂无需要复习的词汇</h3>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">
          当前没有需要复习的词汇
        </p>
        <button class="btn-continue" onclick="window.location.hash='vocabulary'">
          开始词汇预习
        </button>
      </div>
    `;
  }
  
  // 保存词汇数据
  saveVocabularyData() {
    const data = Array.from(this.vocabularyData.entries());
    localStorage.setItem('vocabulary_data', JSON.stringify(data));
  }
  
  // 绑定事件
  bindEvents() {
    // 评分按钮事件
    const ratingButtons = document.querySelectorAll('.rating-btn');
    ratingButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const quality = parseInt(e.target.dataset.quality);
        if (this.reviewQueue[this.currentReviewIndex]) {
          this.handleReviewResult(
            this.reviewQueue[this.currentReviewIndex].id,
            quality
          );
        }
      });
    });
  }
}

// 全局实例
let vocabularyManager = null;
let reviewManager = null;

// 初始化函数
function initVocabularySystem() {
  vocabularyManager = new VocabularyLearningManager();
  reviewManager = new EbbinghausReviewManager();
  
  // 在词汇学习Tab激活时初始化
  const vocabTab = document.getElementById('tab-vocabulary');
  if (vocabTab) {
    vocabTab.addEventListener('transitionend', () => {
      if (vocabTab.classList.contains('active')) {
        // 获取当前选择的课程和课次
        const currentCourse = window.currentCourse;
        const currentLesson = window.currentLesson;
        
        if (currentCourse && currentLesson) {
          vocabularyManager.init(currentCourse.id, currentLesson.id);
        }
      }
    });
  }
  
  // 在复习Tab激活时初始化
  const reviewTab = document.getElementById('tab-review');
  if (reviewTab) {
    reviewTab.addEventListener('transitionend', () => {
      if (reviewTab.classList.contains('active')) {
        reviewManager.init();
        reviewManager.startReview();
      }
    });
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  // 延迟初始化，确保其他模块已加载
  setTimeout(initVocabularySystem, 500);
});
