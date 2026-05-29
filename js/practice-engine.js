/**
 * 练习引擎 - 管理练习流程和题型渲染
 */

class PracticeEngine {
  constructor() {
    this.currentQueue = [];      // 当前练习队列
    this.currentIndex = 0;       // 当前题号
    this.score = 0;              // 本次得分
    this.correctCount = 0;       // 正确数
    this.questionType = null;    // 当前题型
    this.container = null;       // 渲染容器
    this.selectedAnswer = null;  // 用户选择的答案
    this.audioPlayer = null;     // 音频播放器
  }
  
  // 初始化练习
  async init(type, sentences = null) {
    this.questionType = type;
    this.currentIndex = 0;
    this.score = 0;
    this.correctCount = 0;
    this.selectedAnswer = null;
    
    // 获取练习容器
    this.container = document.getElementById('practiceContainer');
    if (!this.container) {
      console.error('练习容器不存在');
      return;
    }
    
    // 加载题目
    if (sentences) {
      // 复习模式：使用传入的句子 ID
      this.currentQueue = await this.loadSentences(sentences.map(s => s.id));
    } else {
      // 专项练习模式：加载该题型的所有句子
      this.currentQueue = await this.loadAllSentences();
    }
    
    if (this.currentQueue.length === 0) {
      toast.info('暂无可练习的句子');
      return;
    }
    
    // 显示练习界面
    this.showPracticeUI();
    
    // 渲染第一题
    this.renderQuestion();
  }
  
  // 加载指定句子
  async loadSentences(sentenceIds) {
    try {
      const response = await fetch('data.json');
      const data = await response.json();
      const questions = data.practice_questions || {};
      
      return sentenceIds
        .filter(id => questions[id])
        .map(id => ({ id, ...questions[id] }));
    } catch (error) {
      console.error('加载句子失败:', error);
      return [];
    }
  }
  
  // 加载所有句子
  async loadAllSentences() {
    try {
      const response = await fetch('data.json');
      const data = await response.json();
      const questions = data.practice_questions || {};
      
      return Object.entries(questions).map(([id, q]) => ({ id, ...q }));
    } catch (error) {
      console.error('加载句子失败:', error);
      return [];
    }
  }
  
  // 显示练习 UI
  showPracticeUI() {
    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="practice-question-header">
        <button class="back-btn" onclick="exitPractice()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 19l-7-7 7-7"/>
          </svg>
          <span>退出</span>
        </button>
        <div class="question-progress">
          <span id="questionCounter">1/${this.currentQueue.length}</span>
          <span style="margin: 0 16px;">|</span>
          <span id="scoreDisplay">得分：0</span>
        </div>
        <button class="notification-btn" id="favoriteBtn" aria-label="收藏">
          ❤️
        </button>
      </div>
      <div class="question-content" id="questionContent">
        <!-- 题目内容 -->
      </div>
      <div class="question-footer" id="questionFooter">
        <!-- 按钮区域 -->
      </div>
    `;
    
    // 绑定收藏按钮
    document.getElementById('favoriteBtn')?.addEventListener('click', () => {
      this.toggleFavorite();
    });
  }
  
  // 渲染题目
  renderQuestion() {
    const question = this.currentQueue[this.currentIndex];
    const content = document.getElementById('questionContent');
    const footer = document.getElementById('questionFooter');
    const counter = document.getElementById('questionCounter');
    const score = document.getElementById('scoreDisplay');
    
    // 更新计数
    counter.textContent = `${this.currentIndex + 1}/${this.currentQueue.length}`;
    score.textContent = `得分：${this.score}`;
    
    // 清空容器
    content.innerHTML = '';
    footer.innerHTML = '';
    this.selectedAnswer = null;
    
    // 根据题型渲染
    switch(this.questionType) {
      case 'listening':
        this.renderListening(question, content, footer);
        break;
      case 'fillBlank':
        this.renderFillBlank(question, content, footer);
        break;
      case 'ordering':
        this.renderOrdering(question, content, footer);
        break;
      case 'translation':
        this.renderTranslation(question, content, footer);
        break;
      case 'speaking':
        this.renderSpeaking(question, content, footer);
        break;
      case 'review':
        // 复习模式：随机选择题型
        const types = ['listening', 'fillBlank', 'ordering', 'translation', 'speaking'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        this.questionType = randomType;
        this.renderQuestion();
        return;
    }
  }
  
  // 题型 1：听音选义
  renderListening(question, content, footer) {
    content.innerHTML = `
      <div class="audio-player">
        <button class="audio-btn" id="audioPlayBtn">🔊</button>
        <div class="audio-progress">
          <div class="audio-progress-bar">
            <div class="audio-progress-fill" id="audioProgress" style="width: 0%"></div>
          </div>
          <div class="audio-time">
            <span id="audioCurrentTime">0:00</span>
            <span id="audioDuration">0:00</span>
          </div>
        </div>
      </div>
      
      <div class="question-text">听到的是哪个意思？</div>
      
      <div class="options-list" id="optionsList">
        ${(question.listening?.options || []).map((opt, i) => `
          <div class="option-item" data-index="${i}">
            ${opt.text}
          </div>
        `).join('')}
      </div>
    `;
    
    footer.innerHTML = `
      <button class="btn-primary" id="submitBtn" disabled>提交答案</button>
    `;
    
    // 绑定音频播放
    const audio = new Audio(question.audio);
    this.audioPlayer = audio;
    
    document.getElementById('audioPlayBtn')?.addEventListener('click', () => {
      if (audio.paused) {
        audio.play();
        document.getElementById('audioPlayBtn').classList.add('playing');
      } else {
        audio.pause();
        document.getElementById('audioPlayBtn').classList.remove('playing');
      }
    });
    
    audio.addEventListener('timeupdate', () => {
      const progress = (audio.currentTime / audio.duration) * 100;
      document.getElementById('audioProgress').style.width = `${progress}%`;
      document.getElementById('audioCurrentTime').textContent = this.formatTime(audio.currentTime);
    });
    
    audio.addEventListener('loadedmetadata', () => {
      document.getElementById('audioDuration').textContent = this.formatTime(audio.duration);
    });
    
    audio.addEventListener('ended', () => {
      document.getElementById('audioPlayBtn').classList.remove('playing');
      document.getElementById('audioProgress').style.width = '0%';
    });
    
    // 绑定选项选择
    document.querySelectorAll('.option-item')?.forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.option-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        this.selectedAnswer = parseInt(item.dataset.index);
        document.getElementById('submitBtn').disabled = false;
      });
    });
    
    // 绑定提交
    document.getElementById('submitBtn')?.addEventListener('click', () => {
      this.submitListening(question);
    });
  }
  
  submitListening(question) {
    const correctIndex = question.listening?.options?.findIndex(o => o.correct);
    const isCorrect = this.selectedAnswer === correctIndex;
    
    this.showFeedback(isCorrect, question, () => {
      this.nextQuestion();
    });
    
    // 记录练习数据
    if (window.reviewSystem) {
      window.reviewSystem.recordPractice(question.id, 'listening', isCorrect);
    }
    
    // 同步到数据模块
    if (window.dataSync && question.id) {
      const [bookKey, unitKey] = question.id.split('_');
      window.recordPracticeResult(unitKey, bookKey, question.translation || '', isCorrect, 'listening');
    }
  }
  
  // 题型 2：补全句子
  renderFillBlank(question, content, footer) {
    content.innerHTML = `
      <div class="question-text">补全句子：</div>
      
      <div class="feedback-sentence" style="font-size: 1.3rem; text-align: center; margin: 24px 0;">
        ${question.fillBlank?.template || 'This is ______ apple.'}
      </div>
      
      ${question.fillBlank?.hint ? `
        <div class="feedback-hint">
          💡 提示：${question.fillBlank.hint}
        </div>
      ` : ''}
      
      <div class="options-list" id="optionsList" style="margin-top: 24px;">
        ${(question.fillBlank?.options || []).map((opt, i) => `
          <div class="option-item" data-index="${i}">
            ${opt}
          </div>
        `).join('')}
      </div>
    `;
    
    footer.innerHTML = `
      <button class="btn-primary" id="submitBtn" disabled>检查答案</button>
    `;
    
    // 绑定选项选择
    document.querySelectorAll('.option-item')?.forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.option-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        this.selectedAnswer = item.textContent.trim();
        document.getElementById('submitBtn').disabled = false;
      });
    });
    
    // 绑定提交
    document.getElementById('submitBtn')?.addEventListener('click', () => {
      this.submitFillBlank(question);
    });
  }
  
  submitFillBlank(question) {
    const isCorrect = this.selectedAnswer === question.fillBlank?.answer;
    
    this.showFeedback(isCorrect, question, () => {
      this.nextQuestion();
    });
    
    // 记录练习数据
    if (window.reviewSystem) {
      window.reviewSystem.recordPractice(question.id, 'fillBlank', isCorrect);
    }
    
    // 同步到数据模块
    if (window.dataSync && question.id) {
      const [bookKey, unitKey] = question.id.split('_');
      window.recordPracticeResult(unitKey, bookKey, question.translation || '', isCorrect, 'fillBlank');
    }
  }
  
  // 题型 3：排序组句
  renderOrdering(question, content, footer) {
    const words = question.ordering?.words || [];
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    
    content.innerHTML = `
      <div class="question-text">将单词排序组成正确句子：</div>
      
      <div class="word-bank" id="wordBank">
        ${shuffled.map(word => `
          <div class="word-chip" data-word="${word}">${word}</div>
        `).join('')}
      </div>
      
      <div class="answer-area" id="answerArea">
        <div class="answer-placeholder">点击下方单词填入此处</div>
      </div>
    `;
    
    footer.innerHTML = `
      <button class="btn-secondary" id="clearBtn" style="margin-right: 12px;">清空重排</button>
      <button class="btn-primary" id="submitBtn">检查顺序</button>
    `;
    
    let answer = [];
    
    // 绑定单词点击
    document.querySelectorAll('.word-chip')?.forEach(chip => {
      chip.addEventListener('click', () => {
        if (chip.classList.contains('used')) return;
        
        const word = chip.dataset.word;
        answer.push(word);
        chip.classList.add('used');
        
        this.renderAnswer(answer);
      });
    });
    
    // 绑定清空
    document.getElementById('clearBtn')?.addEventListener('click', () => {
      answer = [];
      document.querySelectorAll('.word-chip').forEach(c => c.classList.remove('used'));
      this.renderAnswer(answer);
    });
    
    // 绑定提交
    document.getElementById('submitBtn')?.addEventListener('click', () => {
      this.submitOrdering(question, answer);
    });
  }
  
  renderAnswer(answer) {
    const area = document.getElementById('answerArea');
    if (answer.length === 0) {
      area.innerHTML = '<div class="answer-placeholder">点击下方单词填入此处</div>';
    } else {
      area.innerHTML = answer.map(word => `
        <div class="word-chip">${word}</div>
      `).join('');
    }
  }
  
  submitOrdering(question, answer) {
    const correctAnswer = question.ordering?.answer || [];
    const isCorrect = JSON.stringify(answer) === JSON.stringify(correctAnswer);
    
    this.showFeedback(isCorrect, question, () => {
      this.nextQuestion();
    });
    
    // 记录练习数据
    if (window.reviewSystem) {
      window.reviewSystem.recordPractice(question.id, 'ordering', isCorrect);
    }
    
    // 同步到数据模块
    if (window.dataSync && question.id) {
      const [bookKey, unitKey] = question.id.split('_');
      window.recordPracticeResult(unitKey, bookKey, question.translation || '', isCorrect, 'ordering');
    }
  }
  
  // 题型 4：中英互译
  renderTranslation(question, content, footer) {
    content.innerHTML = `
      <div class="question-text">翻译成中文：</div>
      
      <div class="feedback-sentence" style="font-size: 1.2rem; text-align: center; margin: 24px 0;">
        "${question.sentence || ''}"
      </div>
      
      <textarea 
        class="text-input" 
        id="translationInput" 
        placeholder="请输入你的翻译..."
        rows="3"
        style="margin-top: 24px;"
      ></textarea>
      
      <button class="btn-secondary" id="showAnswerBtn" style="margin-top: 16px;">
        💡 显示参考答案
      </button>
      
      <div class="feedback-sentence" id="referenceAnswer" style="display: none; margin-top: 16px;">
        <div class="en">${question.sentence}</div>
        <div class="zh">${question.translation || question.reference || ''}</div>
      </div>
      
      <div class="rating-stars" id="ratingStars" style="margin-top: 24px;">
        ${[1,2,3,4,5].map(i => `
          <span class="rating-star" data-rating="${i}">☆</span>
        `).join('')}
      </div>
      <div style="text-align: center; color: var(--text-secondary); margin-top: 8px;">
        自我评分
      </div>
    `;
    
    footer.innerHTML = `
      <button class="btn-primary" id="submitBtn" disabled>提交评分</button>
    `;
    
    let userRating = 0;
    
    // 绑定显示答案
    document.getElementById('showAnswerBtn')?.addEventListener('click', () => {
      const answer = document.getElementById('referenceAnswer');
      answer.style.display = 'block';
      document.getElementById('showAnswerBtn').style.display = 'none';
    });
    
    // 绑定评分
    document.querySelectorAll('.rating-star')?.forEach(star => {
      star.addEventListener('click', () => {
        userRating = parseInt(star.dataset.rating);
        document.querySelectorAll('.rating-star').forEach((s, i) => {
          s.textContent = i < userRating ? '⭐' : '☆';
          s.classList.toggle('active', i < userRating);
        });
        document.getElementById('submitBtn').disabled = false;
      });
    });
    
    // 绑定提交
    document.getElementById('submitBtn')?.addEventListener('click', () => {
      this.submitTranslation(question, userRating);
    });
  }
  
  submitTranslation(question, rating) {
    // 自我评分 5 星=100 分，4 星=80 分，以此类推
    const isCorrect = rating >= 4;
    
    this.showFeedback(isCorrect, question, () => {
      this.nextQuestion();
    });
    
    // 记录练习数据
    if (window.reviewSystem) {
      window.reviewSystem.recordPractice(question.id, 'translation', isCorrect);
    }
    
    // 同步到数据模块
    if (window.dataSync && question.id) {
      const [bookKey, unitKey] = question.id.split('_');
      window.recordPracticeResult(unitKey, bookKey, question.translation || '', isCorrect, 'translation');
    }
  }
  
  // 题型 5：跟读打分
  renderSpeaking(question, content, footer) {
    content.innerHTML = `
      <div class="question-text">跟读下面的句子：</div>
      
      <div class="feedback-sentence" style="font-size: 1.3rem; text-align: center; margin: 24px 0;">
        <div class="en">${question.sentence || ''}</div>
        <div class="zh" style="margin-top: 8px;">${question.translation || ''}</div>
      </div>
      
      <div style="text-align: center; margin-top: 24px;">
        <div style="margin-bottom: 16px;">1. 听原声：</div>
        <button class="audio-btn" id="playOriginalBtn" style="width: 60px; height: 60px; font-size: 1.5rem;">🔊</button>
      </div>
      
      <div style="text-align: center; margin-top: 32px;">
        <div style="margin-bottom: 16px;">2. 开始录音：</div>
        <button class="record-btn" id="recordBtn">🎤</button>
        <div class="record-status" id="recordStatus">
          <div>按住说话</div>
          <div class="record-timer" id="recordTimer">0.0s</div>
        </div>
      </div>
      
      <div id="recordingPreview" style="display: none; margin-top: 24px;">
        <div style="text-align: center; margin-bottom: 16px;">3. 录音预览：</div>
        <div class="audio-progress">
          <div class="audio-progress-bar">
            <div class="audio-progress-fill" id="recordingProgress" style="width: 0%"></div>
          </div>
        </div>
        <div style="text-align: center; margin-top: 16px;">
          <button class="audio-btn" id="playRecordingBtn" style="width: 50px; height: 50px; font-size: 1.2rem; margin-right: 12px;">🔊</button>
          <button class="btn-secondary" id="rerecordBtn">🔁 重新录制</button>
        </div>
      </div>
    `;
    
    footer.innerHTML = `
      <button class="btn-primary" id="submitBtn" disabled>提交录音</button>
    `;
    
    // 播放原声
    const originalAudio = new Audio(question.audio);
    document.getElementById('playOriginalBtn')?.addEventListener('click', () => {
      originalAudio.play();
    });
    
    // 录音功能（简化版，实际需要使用 MediaRecorder API）
    let isRecording = false;
    let recordingTime = 0;
    let recordingTimer = null;
    
    const recordBtn = document.getElementById('recordBtn');
    const recordStatus = document.getElementById('recordStatus');
    const recordTimer = document.getElementById('recordTimer');
    const recordingPreview = document.getElementById('recordingPreview');
    
    recordBtn?.addEventListener('mousedown', () => {
      isRecording = true;
      recordingTime = 0;
      recordBtn.classList.add('recording');
      recordStatus.innerHTML = '<div>正在录音...</div><div class="record-timer" id="recordTimer">0.0s</div>';
      
      recordingTimer = setInterval(() => {
        recordingTime += 0.1;
        document.getElementById('recordTimer').textContent = recordingTime.toFixed(1) + 's';
      }, 100);
    });
    
    recordBtn?.addEventListener('mouseup', () => {
      if (!isRecording) return;
      
      isRecording = false;
      recordBtn.classList.remove('recording');
      clearInterval(recordingTimer);
      
      recordingPreview.style.display = 'block';
      recordStatus.innerHTML = `<div>录音完成</div><div class="record-timer">${recordingTime.toFixed(1)}s</div>`;
      document.getElementById('submitBtn').disabled = false;
    });
    
    // 重新录制
    document.getElementById('rerecordBtn')?.addEventListener('click', () => {
      recordingPreview.style.display = 'none';
      document.getElementById('submitBtn').disabled = true;
    });
    
    // 绑定提交
    document.getElementById('submitBtn')?.addEventListener('click', () => {
      this.submitSpeaking(question);
    });
  }
  
  submitSpeaking(question) {
    // 简化：假设提交都正确
    const isCorrect = true;
    
    this.showFeedback(isCorrect, question, () => {
      this.nextQuestion();
    });
    
    // 记录练习数据
    if (window.reviewSystem) {
      window.reviewSystem.recordPractice(question.id, 'speaking', isCorrect);
    }
    
    // 同步到数据模块
    if (window.dataSync && question.id) {
      const [bookKey, unitKey] = question.id.split('_');
      window.recordPracticeResult(unitKey, bookKey, question.translation || '', isCorrect, 'speaking');
    }
  }
  
  // 显示反馈
  showFeedback(isCorrect, question, onNext) {
    const content = document.getElementById('questionContent');
    const footer = document.getElementById('questionFooter');
    
    if (isCorrect) {
      this.correctCount++;
      this.score += 10;
      
      content.innerHTML = `
        <div class="feedback-correct">
          <div class="feedback-icon">✅</div>
          <div class="feedback-title">回答正确！</div>
          <div class="feedback-stats">
            <div class="stat">
              <div class="stat-value">+10</div>
              <div class="stat-label">得分</div>
            </div>
            <div class="stat">
              <div class="stat-value">${this.correctCount}/${this.currentIndex + 1}</div>
              <div class="stat-label">正确率</div>
            </div>
          </div>
          <div class="feedback-sentence">
            <div class="en">${question.sentence}</div>
            <div class="zh">${question.translation || ''}</div>
          </div>
        </div>
      `;
      
      footer.innerHTML = `
        <button class="btn-primary" onclick="practiceEngine.nextQuestion()">继续下一题</button>
      `;
    } else {
      content.innerHTML = `
        <div class="feedback-incorrect">
          <div class="feedback-icon">❌</div>
          <div class="feedback-title">回答错误</div>
          <div class="feedback-sentence">
            <div class="en">${question.sentence}</div>
            <div class="zh">${question.translation || ''}</div>
          </div>
          <div class="feedback-hint">
            💡 再听一遍，注意细节
          </div>
        </div>
      `;
      
      footer.innerHTML = `
        <button class="btn-secondary" onclick="practiceEngine.addToReview('${question.id}')" style="margin-right: 12px;">加入复习</button>
        <button class="btn-primary" onclick="practiceEngine.nextQuestion()">继续下一题</button>
      `;
    }
    
    // 更新分数
    document.getElementById('scoreDisplay').textContent = `得分：${this.score}`;
  }
  
  // 下一题
  nextQuestion() {
    this.currentIndex++;
    
    if (this.currentIndex >= this.currentQueue.length) {
      this.showResult();
    } else {
      this.renderQuestion();
    }
  }
  
  // 显示结果
  showResult() {
    const content = document.getElementById('questionContent');
    const footer = document.getElementById('questionFooter');
    
    const accuracy = Math.round((this.correctCount / this.currentQueue.length) * 100);
    
    content.innerHTML = `
      <div class="feedback-correct">
        <div class="feedback-icon">🎉</div>
        <div class="feedback-title">练习完成！</div>
        <div class="feedback-stats" style="margin-top: 24px;">
          <div class="stat">
            <div class="stat-value">${this.score}分</div>
            <div class="stat-label">总得分</div>
          </div>
          <div class="stat">
            <div class="stat-value">${this.correctCount}/${this.currentQueue.length}</div>
            <div class="stat-label">正确数</div>
          </div>
          <div class="stat">
            <div class="stat-value">${accuracy}%</div>
            <div class="stat-label">正确率</div>
          </div>
        </div>
      </div>
    `;
    
    footer.innerHTML = `
      <button class="btn-primary" onclick="exitPractice()">返回学习中心</button>
    `;
  }
  
  // 收藏当前句子
  toggleFavorite() {
    const question = this.currentQueue[this.currentIndex];
    if (!question) return;
    
    // 添加到收藏
    const favorites = JSON.parse(localStorage.getItem('nce_favorites') || '[]');
    const favId = question.id;
    
    const existingIndex = favorites.findIndex(f => f.id === favId);
    
    if (existingIndex >= 0) {
      favorites.splice(existingIndex, 1);
      toast.info('已取消收藏');
      document.getElementById('favoriteBtn').textContent = '🤍';
    } else {
      favorites.push({
        id: favId,
        sentence: question.sentence,
        translation: question.translation
      });
      toast.success('已加入收藏');
      document.getElementById('favoriteBtn').textContent = '❤️';
    }
    
    localStorage.setItem('nce_favorites', JSON.stringify(favorites));
  }
  
  // 格式化时间
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // 加入复习
  addToReview(sentenceId) {
    if (window.reviewSystem) {
      window.reviewSystem.addToReview(sentenceId);
      toast.info('已加入复习队列');
    }
  }
}

// 退出练习
function exitPractice() {
  const container = document.getElementById('practiceContainer');
  if (container) {
    container.style.display = 'none';
  }
}

// 全局实例
let practiceEngine = null;

// 导出到全局
window.PracticeEngine = PracticeEngine;
window.startPractice = function(type, sentences) {
  if (!practiceEngine) {
    practiceEngine = new PracticeEngine();
  }
  practiceEngine.init(type, sentences);
};
window.exitPractice = exitPractice;
