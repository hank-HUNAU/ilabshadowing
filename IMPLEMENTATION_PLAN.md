# 词汇学习系统实施计划

## 🎯 复刻CET-MASTER核心功能

### **第一阶段：词汇预习模块**

#### 1.1 闪卡界面设计
```html
<!-- 在practice.html中新增词汇学习Tab -->
<section id="tab-vocabulary" class="tab-panel">
  <div class="vocabulary-learning-container">
    <!-- 闪卡容器 -->
    <div class="flashcard-container">
      <div class="flashcard" id="vocabularyCard">
        <!-- 卡片正面 -->
        <div class="flashcard-front">
          <div class="word-phonetic">/əˈbændən/</div>
          <div class="word-text">abandon</div>
          <div class="flip-hint">点击查看释义</div>
        </div>
        <!-- 卡片背面 -->
        <div class="flashcard-back">
          <div class="word-meaning">放弃，抛弃</div>
          <div class="word-example">He abandoned his plan.</div>
        </div>
      </div>
    </div>
    
    <!-- 操作按钮 -->
    <div class="action-buttons">
      <button id="btnUnknown" class="btn-unknown">不认识</button>
      <button id="btnKnown" class="btn-known">认识</button>
    </div>
    
    <!-- 进度显示 -->
    <div class="progress-indicator">
      <span id="vocabProgress">1/20</span>
    </div>
  </div>
</section>
```

#### 1.2 核心功能实现
```javascript
// 词汇学习管理器
class VocabularyLearningManager {
  constructor() {
    this.currentWords = [];
    this.currentIndex = 0;
    this.isFlipped = false;
    this.unknownWords = [];  // 不认识的词汇
    this.knownWords = [];    // 认识的词汇
  }
  
  // 加载课次词汇
  async loadLessonWords(courseId, lessonId) {
    const lessonData = await this.fetchLessonData(courseId, lessonId);
    this.currentWords = lessonData.vocabulary || [];
    this.currentIndex = 0;
    this.renderCard();
  }
  
  // 翻转卡片
  flipCard() {
    this.isFlipped = !this.isFlipped;
    const card = document.getElementById('vocabularyCard');
    card.classList.toggle('flipped', this.isFlipped);
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
    
    // 更新卡片内容
    card.querySelector('.word-phonetic').textContent = word.phonetic || '';
    card.querySelector('.word-text').textContent = word.word;
    card.querySelector('.word-meaning').textContent = word.meaning;
    card.querySelector('.word-example').textContent = word.example;
    
    // 更新进度
    document.getElementById('vocabProgress').textContent = 
      `${this.currentIndex + 1}/${this.currentWords.length}`;
  }
  
  // 保存进度
  saveProgress() {
    const progress = {
      courseId: currentCourse.id,
      lessonId: currentLesson.id,
      unknownWords: this.unknownWords.map(w => w.id),
      knownWords: this.knownWords.map(w => w.id),
      timestamp: Date.now()
    };
    
    localStorage.setItem('vocabulary_progress', JSON.stringify(progress));
  }
}
```

### **第二阶段：词汇复习模块（斯宾浩斯算法）**

#### 2.1 复习算法实现
```javascript
// 斯宾浩斯复习管理器
class EbbinghausReviewManager {
  constructor() {
    this.reviewQueue = [];
    this.vocabularyData = new Map();
  }
  
  // 初始化词汇数据
  initVocabulary(words) {
    words.forEach(word => {
      this.vocabularyData.set(word.id, {
        ...word,
        status: 'new',           // new, learning, reviewing, mastered
        reviewCount: 0,
        nextReview: null,
        lastReview: null,
        easeFactor: 2.5,         // SM-2算法参数
        interval: 0
      });
    });
  }
  
  // 计算下次复习时间（基于SM-2算法）
  calculateNextReview(wordId) {
    const word = this.vocabularyData.get(wordId);
    
    if (word.reviewCount === 0) {
      // 第一次复习：20分钟后
      word.interval = 20;
    } else {
      // 后续复习：基于SM-2算法
      word.interval = Math.round(word.interval * word.easeFactor);
    }
    
    word.nextReview = Date.now() + word.interval * 60 * 1000;
    word.lastReview = Date.now();
    word.reviewCount++;
    
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
  
  // 处理复习结果
  handleReviewResult(wordId, quality) {
    const word = this.vocabularyData.get(wordId);
    
    // quality: 0-5 (0=完全忘记, 5=完美记忆)
    if (quality >= 3) {
      // 记忆良好，更新间隔
      word.easeFactor = Math.max(1.3, 
        word.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      );
      this.calculateNextReview(wordId);
    } else {
      // 记忆不好，重置为学习状态
      word.status = 'learning';
      word.reviewCount = 0;
      word.interval = 0;
      word.nextReview = Date.now() + 10 * 60 * 1000; // 10分钟后重试
    }
    
    this.saveVocabularyData();
  }
  
  // 保存词汇数据
  saveVocabularyData() {
    const data = Array.from(this.vocabularyData.entries());
    localStorage.setItem('vocabulary_data', JSON.stringify(data));
  }
  
  // 加载词汇数据
  loadVocabularyData() {
    const data = JSON.parse(localStorage.getItem('vocabulary_data') || '[]');
    this.vocabularyData = new Map(data);
  }
}
```

#### 2.2 复习界面设计
```html
<section id="tab-review" class="tab-panel">
  <div class="review-container">
    <!-- 复习统计 -->
    <div class="review-stats">
      <div class="stat-item">
        <div class="stat-value" id="dueCount">0</div>
        <div class="stat-label">待复习</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" id="masteredCount">0</div>
        <div class="stat-label">已掌握</div>
      </div>
    </div>
    
    <!-- 复习卡片 -->
    <div class="review-flashcard" id="reviewCard">
      <div class="review-word" id="reviewWord">abandon</div>
      <div class="review-options" id="reviewOptions">
        <!-- 动态生成选项 -->
      </div>
    </div>
    
    <!-- 评分按钮 -->
    <div class="rating-buttons">
      <button class="rating-btn" data-quality="0">忘记</button>
      <button class="rating-btn" data-quality="3">模糊</button>
      <button class="rating-btn" data-quality="5">记得</button>
    </div>
  </div>
</section>
```

### **第三阶段：与现有学习中心整合**

#### 3.1 Tab结构扩展
```javascript
// 修改practice.js中的Tab切换逻辑
const tabs = [
  { id: 'overview', name: '学习概览', icon: 'chart' },
  { id: 'vocabulary', name: '词汇预习', icon: 'book' },      // 新增
  { id: 'review', name: '词汇复习', icon: 'refresh' },        // 新增
  { id: 'shadowing', name: '影子跟读', icon: 'headphones' }, // 新增
  { id: 'practice', name: '篇章测试', icon: 'pencil' },
  { id: 'course', name: '课程详情', icon: 'list' }
];
```

#### 3.2 学习流程整合
```javascript
// 学习流程管理器
class LearningFlowManager {
  constructor() {
    this.currentStep = 'vocabulary';
    this.progress = {};
    this.vocabularyManager = new VocabularyLearningManager();
    this.reviewManager = new EbbinghausReviewManager();
  }
  
  // 检查步骤完成状态
  isStepCompleted(step) {
    const courseId = currentCourse.id;
    const lessonId = currentLesson.id;
    const progress = this.getProgress(courseId, lessonId);
    
    switch(step) {
      case 'vocabulary':
        return progress.vocabularyCompleted;
      case 'review':
        return progress.reviewCompleted;
      case 'shadowing':
        return progress.shadowingCompleted;
      case 'practice':
        return progress.practiceCompleted;
      default:
        return false;
    }
  }
  
  // 更新步骤状态
  completeStep(step) {
    const courseId = currentCourse.id;
    const lessonId = currentLesson.id;
    
    if (!this.progress[courseId]) {
      this.progress[courseId] = {};
    }
    if (!this.progress[courseId][lessonId]) {
      this.progress[courseId][lessonId] = {};
    }
    
    this.progress[courseId][lessonId][`${step}Completed`] = true;
    this.saveProgress();
  }
  
  // 获取推荐下一步
  getNextStep() {
    const steps = ['vocabulary', 'review', 'shadowing', 'practice'];
    
    for (const step of steps) {
      if (!this.isStepCompleted(step)) {
        return step;
      }
    }
    
    return 'vocabulary'; // 全部完成，重新开始
  }
  
  // 保存进度
  saveProgress() {
    localStorage.setItem('learning_flow_progress', JSON.stringify(this.progress));
  }
  
  // 加载进度
  loadProgress() {
    this.progress = JSON.parse(localStorage.getItem('learning_flow_progress') || '{}');
  }
}
```

## 📋 实施步骤

### **Step 1: 基础架构搭建**
1. 创建词汇学习相关的CSS样式
2. 创建词汇学习相关的JavaScript模块
3. 在practice.html中添加新的Tab结构

### **Step 2: 词汇预习功能**
1. 实现闪卡界面和交互
2. 实现词汇识别功能
3. 实现词汇本管理
4. 集成课程数据

### **Step 3: 词汇复习功能**
1. 实现斯宾浩斯算法
2. 实现复习界面
3. 实现智能提醒
4. 实现复习统计

### **Step 4: 学习流程整合**
1. 重构Tab导航逻辑
2. 实现步骤间导航
3. 实现进度共享
4. 实现学习推荐

### **Step 5: 测试和优化**
1. 功能测试
2. 性能优化
3. 用户体验优化
4. 移动端适配

## 🎨 UI设计要点

1. **保持现有风格**：与当前学习中心界面保持一致
2. **移动端优先**：确保在移动设备上有良好体验
3. **交互动画**：添加翻转卡片等交互动画
4. **进度可视化**：清晰显示学习进度和复习计划

## 📊 数据结构设计

```javascript
// 词汇数据结构
{
  "id": "v_001",
  "word": "abandon",
  "phonetic": "/əˈbændən/",
  "meaning": "放弃，抛弃",
  "example": "He abandoned his plan.",
  "courseId": "think-0",
  "lessonId": "Unit 04-4"
}

// 学习进度结构
{
  "courseId": "think-0",
  "lessonId": "Unit 04-4",
  "vocabularyCompleted": true,
  "reviewCompleted": false,
  "shadowingCompleted": false,
  "practiceCompleted": false,
  "unknownWords": ["v_001", "v_003"],
  "knownWords": ["v_002", "v_004"],
  "timestamp": 1717564800000
}

// 复习计划结构
{
  "wordId": "v_001",
  "status": "reviewing",
  "reviewCount": 3,
  "nextReview": 1717568400000,
  "lastReview": 1717564800000,
  "easeFactor": 2.5,
  "interval": 480
}
```

## 🚀 开始实施

基于以上分析，我将立即开始实施第一阶段：词汇预习模块。
