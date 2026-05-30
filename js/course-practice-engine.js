/**
 * 课程练习引擎 - 课程维度的卡片左右翻页练习
 * 支持手势滑动和左右箭头按钮
 */

class CoursePracticeEngine {
  constructor() {
    this.currentCourse = null;      // 当前课程数据
    this.currentSentenceIndex = 0;  // 当前句子索引
    this.questionType = null;       // 当前题型
    this.container = null;          // 渲染容器
    this.selectedAnswer = null;     // 用户选择的答案
    this.audioPlayer = null;        // 音频播放器
    this.touchStartX = 0;           // 手势起始 X 坐标
  }
  
  // 初始化练习（按课程）
  async init(type, courseId = null) {
    this.questionType = type;
    this.currentSentenceIndex = 0;
    this.selectedAnswer = null;
    
    // 获取渲染容器
    this.container = document.getElementById('practiceContainer');
    if (!this.container) {
      console.error('练习容器不存在');
      return;
    }
    
    // 加载课程数据
    if (courseId) {
      // 指定课程模式
      if (typeof courseId === 'object' && courseId.bookKey && courseId.unitKey) {
        // 从 my-courses.html 传来的课程对象
        this.currentCourse = await this.loadCourseByKeys(courseId.bookKey, courseId.unitKey);
      } else {
        // 传统的 courseId 字符串
        this.currentCourse = await this.loadCourse(courseId);
      }
    } else {
      // 默认：加载第一门课程
      const courses = await this.loadAllCourses();
      if (courses.length === 0) {
        toast.info('暂无可练习的课程');
        return;
      }
      this.currentCourse = courses[0];
    }
    
    if (!this.currentCourse || !this.currentCourse.sentences?.length) {
      toast.info('该课程暂无练习题');
      return;
    }
    
    // 显示练习界面（卡片左右翻页）
    this.showPracticeUI();
    
    // 绑定导航事件
    this.bindNavigation();
    
    // 渲染第一个句子
    this.renderSentence();
  }
  
  // 加载指定课程
  async loadCourse(courseId) {
    try {
      const response = await fetch('data.json');
      const data = await response.json();
      return data.course_practice?.[courseId] || null;
    } catch (error) {
      console.error('加载课程失败:', error);
      return null;
    }
  }
  
  // 通过 bookKey 和 unitKey 加载课程
  async loadCourseByKeys(bookKey, unitKey) {
    try {
      const response = await fetch('data.json');
      const data = await response.json();
      
      // 从 course_practice 中查找
      const courseId = `${bookKey}_${unitKey}`;
      if (data.course_practice?.[courseId]) {
        return data.course_practice[courseId];
      }
      
      // 降级：从 units 中动态构建课程
      const units = data.units?.[bookKey] || [];
      const unit = units.find(u => u.key === unitKey);
      
      if (!unit) {
        return null;
      }
      
      // 构建课程数据
      return {
        courseId,
        bookKey,
        unitKey,
        title: unit.title,
        sentences: unit.lines?.map((line, idx) => ({
          id: idx,
          en: line.en,
          zh: line.cn,
          audio: line.audio,
          time: line.time
        })) || []
      };
    } catch (error) {
      console.error('加载课程失败:', error);
      return null;
    }
  }
  
  // 加载所有课程
  async loadAllCourses() {
    try {
      const response = await fetch('data.json');
      const data = await response.json();
      return Object.values(data.course_practice || {});
    } catch (error) {
      console.error('加载课程失败:', error);
      return [];
    }
  }
  
  // 显示练习 UI（卡片左右翻页布局）
  showPracticeUI() {
    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="practice-card-wrapper">
        <!-- 顶部导航 -->
        <div class="card-nav-header">
          <button class="nav-btn" id="prevSentenceBtn" aria-label="上一句">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div class="card-progress">
            <span id="sentenceCounter">1/${this.currentCourse.sentences.length}</span>
            <span style="margin: 0 8px;">|</span>
            <span id="courseTitle">${this.currentCourse.title}</span>
          </div>
          <button class="nav-btn" id="nextSentenceBtn" aria-label="下一句">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
        
        <!-- 卡片内容区 -->
        <div class="card-content" id="cardContent">
          <!-- 动态渲染句子 -->
        </div>
        
        <!-- 底部操作区 -->
        <div class="card-actions">
          <button class="btn-secondary" id="exitPracticeBtn">
            退出练习
          </button>
          <button class="btn-primary" id="submitAnswerBtn" style="display: none;">
            提交答案
          </button>
        </div>
      </div>
    `;
    
    // 绑定退出按钮
    document.getElementById('exitPracticeBtn').addEventListener('click', () => {
      this.exit();
    });
    
    // 隐藏手势提示（2 秒后消失）
    this.showGestureHint();
  }
  
  // 显示手势提示
  showGestureHint() {
    const hint = document.createElement('div');
    hint.className = 'gesture-hint';
    hint.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8l4 4-4 4M6 16l-4-4 4-4"/>
      </svg>
      <span>左右滑动切换句子</span>
    `;
    this.container.appendChild(hint);
    
    setTimeout(() => hint.remove(), 3000);
  }
  
  // 绑定导航事件（按钮 + 手势）
  bindNavigation() {
    // 左右箭头按钮
    document.getElementById('prevSentenceBtn').addEventListener('click', () => {
      this.prevSentence();
    });
    
    document.getElementById('nextSentenceBtn').addEventListener('click', () => {
      this.nextSentence();
    });
    
    // 手势支持
    const cardContent = document.getElementById('cardContent');
    
    cardContent.addEventListener('touchstart', (e) => {
      this.touchStartX = e.touches[0].clientX;
    }, { passive: true });
    
    cardContent.addEventListener('touchend', (e) => {
      if (!this.touchStartX) return;
      
      const touchEndX = e.changedTouches[0].clientX;
      const diff = this.touchStartX - touchEndX;
      
      // 滑动距离超过 50px 才触发
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          // 左滑：下一句
          this.nextSentence();
        } else {
          // 右滑：上一句
          this.prevSentence();
        }
      }
      
      this.touchStartX = 0;
    }, { passive: true });
    
    // 键盘支持（左右箭头）
    document.addEventListener('keydown', (e) => {
      if (this.container.style.display === 'none') return;
      
      if (e.key === 'ArrowLeft') {
        this.prevSentence();
      } else if (e.key === 'ArrowRight') {
        this.nextSentence();
      } else if (e.key === 'Escape') {
        this.exit();
      }
    });
  }
  
  // 上一句
  prevSentence() {
    if (this.currentSentenceIndex > 0) {
      this.currentSentenceIndex--;
      this.renderSentence();
    } else {
      toast.info('已经是第一句了');
    }
  }
  
  // 下一句
  nextSentence() {
    if (this.currentSentenceIndex < this.currentCourse.sentences.length - 1) {
      this.currentSentenceIndex++;
      this.renderSentence();
    } else {
      toast.success('已完成本课程所有句子！');
      // TODO: 显示完成动画或进入下一课
    }
  }
  
  // 渲染句子卡片
  renderSentence() {
    const sentenceData = this.currentCourse.sentences[this.currentSentenceIndex];
    const cardContent = document.getElementById('cardContent');
    const counter = document.getElementById('sentenceCounter');
    
    // 更新计数器
    counter.textContent = `${this.currentSentenceIndex + 1}/${this.currentCourse.sentences.length}`;
    
    // 清空内容
    cardContent.innerHTML = '';
    this.selectedAnswer = null;
    
    // 创建卡片
    const card = document.createElement('div');
    card.className = 'card-item';
    
    // 句子头部（英文 + 中文）
    const header = document.createElement('div');
    header.className = 'sentence-header';
    header.innerHTML = `
      <div class="sentence-en">${sentenceData.sentence}</div>
      <div class="sentence-cn">${sentenceData.translation}</div>
    `;
    card.appendChild(header);
    
    // 音频播放控制
    const audioControl = document.createElement('div');
    audioControl.className = 'audio-control';
    audioControl.innerHTML = `
      <button class="audio-btn" id="playAudioBtn">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      </button>
    `;
    card.appendChild(audioControl);
    
    // 题目区域
    const questionArea = document.createElement('div');
    questionArea.className = 'question-area';
    card.appendChild(questionArea);
    
    cardContent.appendChild(card);
    
    // 绑定音频播放
    document.getElementById('playAudioBtn').addEventListener('click', () => {
      this.playAudio(sentenceData.audio);
    });
    
    // 根据题型渲染题目
    switch (this.questionType) {
      case 'listening':
        this.renderListening(sentenceData, questionArea);
        break;
      case 'fillBlank':
        this.renderFillBlank(sentenceData, questionArea);
        break;
      case 'ordering':
        this.renderOrdering(sentenceData, questionArea);
        break;
      case 'translation':
        this.renderTranslation(sentenceData, questionArea);
        break;
      case 'speaking':
        this.renderSpeaking(sentenceData, questionArea);
        break;
    }
  }
  
  // 渲染题目：听音辨意（真正的听力训练）
  renderListening(sentenceData, container) {
    const listening = sentenceData.questions?.listening;
    if (!listening?.options?.length) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-secondary)">该题型暂无数据</p>';
      return;
    }
    
    const optionsHtml = listening.options
      .map((opt, idx) => `
        <button class="answer-option" data-index="${idx}" data-correct="${opt.correct}">
          ${opt.text}
        </button>
      `)
      .join('');
    
    container.innerHTML = `
      <!-- 音频播放区 -->
      <div class="listening-audio-area">
        <button class="audio-btn large" id="playAudioBtn">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <span>点击播放音频</span>
        </button>
        <p class="listening-hint">听录音，选择正确含义</p>
        <p class="listening-subhint" style="margin-top:8px;font-size:0.85rem;color:var(--text-secondary)">
          🔁 可多次播放，直到听清为止
        </p>
      </div>
      
      <!-- 选项区 -->
      <div class="answer-options">
        ${optionsHtml}
      </div>
      
      <!-- 答案反馈区（答题后显示） -->
      <div class="feedback-area" id="feedbackArea" style="display:none">
        <div class="feedback-result"></div>
        <div class="original-sentence">
          <div class="sentence-en">${sentenceData.sentence}</div>
          <div class="sentence-cn">${sentenceData.translation}</div>
        </div>
      </div>
    `;
    
    // 绑定音频播放
    document.getElementById('playAudioBtn').addEventListener('click', () => {
      this.playAudio(sentenceData.audio);
    });
    
    // 自动播放一次（可选）
    setTimeout(() => {
      this.playAudio(sentenceData.audio);
    }, 500);
    
    // 绑定选项点击
    container.querySelectorAll('.answer-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const isCorrect = btn.dataset.correct === 'true';
        this.handleAnswer(isCorrect, sentenceData);
      });
    });
  }
  
  // 渲染题目：补全训练
  renderFillBlank(sentenceData, container) {
    const fillBlank = sentenceData.questions?.fillBlank;
    if (!fillBlank) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-secondary)">该题型暂无数据</p>';
      return;
    }
    
    const optionsHtml = fillBlank.options
      .map(opt => `<button class="answer-option" data-answer="${opt}">${opt}</button>`)
      .join('');
    
    container.innerHTML = `
      <h3 class="question-text">补全句中缺失单词</h3>
      <p class="blank-template">${fillBlank.template}</p>
      <p class="hint" style="text-align:center;color:var(--text-secondary);font-size:0.9rem">
        💡 ${fillBlank.hint}
      </p>
      <div class="answer-options">
        ${optionsHtml}
      </div>
    `;
    
    // 绑定选项点击
    container.querySelectorAll('.answer-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleAnswer(btn.dataset.answer === fillBlank.answer);
      });
    });
  }
  
  // 渲染题目：句子重组
  renderOrdering(sentenceData, container) {
    const ordering = sentenceData.questions?.ordering;
    if (!ordering?.words?.length) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-secondary)">该题型暂无数据</p>';
      return;
    }
    
    // 打乱单词顺序（如果还没打乱）
    if (!ordering.shuffled) {
      ordering.shuffled = [...ordering.words].sort(() => Math.random() - 0.5);
    }
    
    container.innerHTML = `
      <h3 class="question-text">拖拽单词组成句子</h3>
      <div class="ordering-container">
        <div class="word-bank" id="wordBank">
          ${ordering.shuffled.map(w => `<span class="word-chip" draggable="true">${w}</span>`).join('')}
        </div>
        <div class="answer-area" id="answerArea">
          <span class="placeholder">点击单词填入</span>
        </div>
      </div>
      <button class="btn-primary" id="checkOrderingBtn" style="margin-top:16px;width:100%">检查答案</button>
    `;
    
    this.initOrderingInteraction(container, ordering);
  }
  
  // 句子重组交互逻辑
  initOrderingInteraction(container, ordering) {
    const wordBank = document.getElementById('wordBank');
    const answerArea = document.getElementById('answerArea');
    const checkBtn = document.getElementById('checkOrderingBtn');
    
    let currentWords = [];
    
    // 点击单词（简化的交互，无需拖拽）
    wordBank.addEventListener('click', (e) => {
      if (e.target.classList.contains('word-chip')) {
        const word = e.target.textContent;
        currentWords.push(word);
        e.target.remove();
        this.updateAnswerArea(answerArea, currentWords);
      }
    });
    
    answerArea.addEventListener('click', (e) => {
      if (e.target.classList.contains('word-chip')) {
        const word = e.target.textContent;
        currentWords = currentWords.filter(w => w !== word);
        e.target.remove();
        this.addWordToBank(wordBank, word);
        this.updateAnswerArea(answerArea, currentWords);
      }
    });
    
    // 检查答案
    checkBtn.addEventListener('click', () => {
      const isCorrect = JSON.stringify(currentWords) === JSON.stringify(ordering.answer);
      this.handleAnswer(isCorrect);
    });
  }
  
  // 更新答案区域
  updateAnswerArea(container, words) {
    if (words.length === 0) {
      container.innerHTML = '<span class="placeholder">点击单词填入</span>';
    } else {
      container.innerHTML = words
        .map(w => `<span class="word-chip placed">${w}</span>`)
        .join('');
    }
  }
  
  // 添加单词回词库
  addWordToBank(bank, word) {
    const chip = document.createElement('span');
    chip.className = 'word-chip';
    chip.textContent = word;
    chip.setAttribute('draggable', 'true');
    bank.appendChild(chip);
  }
  
  // 渲染题目：翻译练习
  renderTranslation(sentenceData, container) {
    const reference = sentenceData.questions?.reference || sentenceData.translation;
    
    container.innerHTML = `
      <h3 class="question-text">翻译练习</h3>
      <p class="source-text" style="text-align:center;font-size:1.2rem;margin:16px 0">
        ${sentenceData.sentence}
      </p>
      <textarea 
        class="translation-input" 
        placeholder="请输入中文翻译..." 
        rows="3"
        style="width:100%;padding:12px;border:1px solid var(--border);border-radius:var(--radius-md);resize:none"
      >${reference}</textarea>
      <p class="hint" style="text-align:center;color:var(--text-secondary);font-size:0.9rem;margin-top:8px">
        💡 自评：根据你的翻译给分
      </p>
      <div class="self-rating" style="display:flex;justify-content:center;gap:8px;margin-top:16px">
        <button class="rate-btn" data-rating="3">⭐⭐⭐ 准确</button>
        <button class="rate-btn" data-rating="2">⭐⭐ 基本正确</button>
        <button class="rate-btn" data-rating="1">⭐ 需要改进</button>
      </div>
    `;
    
    // 绑定自评按钮
    container.querySelectorAll('.rate-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rating = parseInt(btn.dataset.rating);
        this.handleAnswer(rating >= 2); // 2 星以上算正确
      });
    });
  }
  
  // 渲染题目：跟读模仿
  renderSpeaking(sentenceData, container) {
    container.innerHTML = `
      <h3 class="question-text">跟读模仿</h3>
      <p class="source-text" style="text-align:center;font-size:1.2rem;margin:16px 0">
        ${sentenceData.sentence}
      </p>
      <div style="text-align:center;margin:20px 0">
        <button class="audio-btn" id="recordBtn" style="width:72px;height:72px;margin:0 auto">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
            <path d="M19 10v2a7 7 0 01-14 0v-2"/>
          </svg>
        </button>
        <p style="color:var(--text-secondary);margin-top:12px">点击录音，然后跟读</p>
      </div>
      <div class="self-rating" style="display:flex;justify-content:center;gap:8px">
        <button class="rate-btn" data-rating="3">⭐⭐⭐ 发音标准</button>
        <button class="rate-btn" data-rating="2">⭐⭐ 基本准确</button>
        <button class="rate-btn" data-rating="1">⭐ 需要改进</button>
      </div>
    `;
    
    // 绑定录音按钮（简化：点击后直接显示自评）
    document.getElementById('recordBtn').addEventListener('click', () => {
      toast.info('开始录音...（模拟）');
      setTimeout(() => {
        toast.success('录音完成，请自评');
      }, 1500);
    });
    
    // 绑定自评按钮
    container.querySelectorAll('.rate-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rating = parseInt(btn.dataset.rating);
        this.handleAnswer(rating >= 2);
      });
    });
  }
  
  // 播放音频
  async playAudio(audioUrl) {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer = null;
    }
    
    const audio = new Audio(audioUrl);
    this.audioPlayer = audio;
    
    const playBtn = document.getElementById('playAudioBtn');
    playBtn?.classList.add('playing');
    
    try {
      await audio.play();
      
      audio.onended = () => {
        playBtn?.classList.remove('playing');
      };
    } catch (error) {
      console.error('音频播放失败:', error);
      playBtn?.classList.remove('playing');
      toast.error('音频加载失败，请检查音频文件');
    }
  }
  
  // 处理答案
  handleAnswer(isCorrect, sentenceData = null) {
    if (isCorrect) {
      this.score += 10;
      
      // 显示正确答案反馈
      if (this.questionType === 'listening') {
        this.showListeningFeedback(sentenceData, true);
      } else {
        toast.success('正确！+10 分');
        
        // 延迟自动进入下一句
        setTimeout(() => {
          this.nextSentence();
        }, 800);
      }
    } else {
      // 显示错误反馈
      if (this.questionType === 'listening') {
        this.showListeningFeedback(sentenceData, false);
      } else {
        toast.error('不正确，请再思考一下');
      }
    }
    
    // 记录答题数据到同步模块
    if (window.dataSync && this.currentCourse) {
      window.recordPracticeResult(
        this.currentCourse.unitKey,
        this.currentCourse.bookKey,
        this.currentCourse.title,
        isCorrect,
        this.questionType
      );
    }
  }
  
  // 显示听力题答案反馈
  showListeningFeedback(sentenceData, isCorrect) {
    const feedbackArea = document.getElementById('feedbackArea');
    const resultDiv = feedbackArea.querySelector('.feedback-result');
    
    if (isCorrect) {
      resultDiv.innerHTML = `
        <div class="feedback-correct">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#34d399" stroke-width="3">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <h3>正确！+10 分</h3>
          <p>继续加油！</p>
        </div>
      `;
      
      toast.success('正确！+10 分');
      
      // 延迟自动进入下一句
      setTimeout(() => {
        this.nextSentence();
      }, 1500);
    } else {
      resultDiv.innerHTML = `
        <div class="feedback-incorrect">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#ef4444" stroke-width="3">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          <h3>不正确</h3>
          <p>再听一遍，加深印象</p>
        </div>
      `;
      
      toast.error('不正确，请再思考一下');
    }
    
    // 显示原句
    feedbackArea.style.display = 'block';
    
    // 再次播放音频帮助记忆
    setTimeout(() => {
      this.playAudio(sentenceData.audio);
    }, 500);
  }
  
  // 退出练习
  exit() {
    this.container.style.display = 'none';
    this.currentCourse = null;
    this.currentSentenceIndex = 0;
    this.questionType = null;
    
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer = null;
    }
  }
}

// 全局实例
window.CoursePractice = new CoursePracticeEngine();

// 导出函数
function startCoursePractice(type, courseId) {
  window.CoursePractice.init(type, courseId);
}

function exitCoursePractice() {
  window.CoursePractice.exit();
}
