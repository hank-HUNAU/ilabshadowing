/**
 * 篇章预听模块 - 学习流程第二环节
 * 版本：20260605-3
 */

// 篇章预听管理器
class PrelisteningManager {
  constructor() {
    this.currentCourse = null;
    this.currentLesson = null;
    this.audioPlayer = null;
    this.dailyGoal = 3; // 默认每日听3遍
    this.todayCount = 0;
    this.isPlaying = false;
    this.currentSpeed = 1.0;
    this.currentTime = 0;
    this.duration = 0;
    this.subtitleLines = [];
    this.currentLineIndex = -1;
    this.testMode = false;
    this.currentTest = null;
    this.testResults = [];
  }
  
  // 初始化
  async init(courseId = null, lessonId = null) {
    // 如果提供了参数，使用参数；否则从全局获取
    if (courseId && lessonId) {
      this.currentCourse = courseId;
      this.currentLesson = lessonId;
    } else {
      // 从全局获取当前课程信息
      const currentCourse = window.currentCourse;
      if (currentCourse) {
        this.currentCourse = `${currentCourse.bookKey}_${currentCourse.unitKey}`;
        this.currentLesson = currentCourse.unitKey;
      }
    }

    if (!this.currentCourse) {
      console.warn('[PrelisteningManager] 没有课程信息，等待数据加载');
      return;
    }

    await this.loadLessonData();
    this.loadProgress();
    this.initAudioPlayer();
    this.bindEvents();
    this.renderUI();
  }
  
  // 加载课次数据
  async loadLessonData() {
    try {
      // 获取当前课程信息
      const currentCourse = window.currentCourse;
      if (!currentCourse) {
        console.error('[PrelisteningManager] 当前课程信息不存在');
        return;
      }

      // 获取课程单元数据
      await CourseManager.ensureInit();
      const units = CourseManager.getUnitsByBook(currentCourse.bookKey);
      const currentUnit = units.find(u => u.key === currentCourse.unitKey);

      if (!currentUnit) {
        console.error('[PrelisteningManager] 找不到当前单元');
        return;
      }

      // 构建文件路径
      const filename = currentUnit.filename || currentUnit.key;
      const lrcPath = `/${currentCourse.bookKey}/${filename}.lrc`;
      const audioPath = `https://jikhdympaifsmubmwilp.supabase.co/storage/v1/object/public/audio/Think0/${filename}.mp3`;

      // 更新音频标题
      const audioTitle = document.getElementById('audioTitle');
      if (audioTitle) {
        audioTitle.textContent = currentUnit.title || filename;
      }

      // 加载LRC字幕数据
      const lrcData = await this.fetchLRCData(lrcPath);
      this.subtitleLines = this.parseLRC(lrcData);

      // 加载音频文件
      const audioFile = await this.fetchAudioFile(audioPath);
      this.audioFile = audioFile;

      console.log('[PrelisteningManager] 课程数据加载成功:', {
        filename,
        subtitleLines: this.subtitleLines.length,
        audioFile
      });

    } catch (error) {
      console.error('[PrelisteningManager] 加载课次数据失败:', error);
    }
  }

  // 获取LRC数据
  async fetchLRCData(lrcPath) {
    try {
      const response = await fetch(lrcPath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error('[PrelisteningManager] 获取LRC数据失败:', error);
      // 返回示例数据作为fallback
      return `[00:00.00]Hello everyone, welcome to our English learning program.
[00:02.50]Today we will learn about vocabulary and how to remember new words.
[00:05.80]Learning vocabulary is an important part of language acquisition.
[00:08.30]We will discuss effective strategies for memorizing words.
[00:11.00]Let's start with some basic techniques for vocabulary learning.
[00:13.50]First, try to understand the word in context.
[00:16.00]Second, practice using the word in sentences.
[00:18.50]Third, review the words regularly using spaced repetition.
[00:21.00]Now let's listen to a short passage and identify key vocabulary.
[00:24.00]The efficient student studies regularly and makes consistent progress.
[00:27.00]Consistency is more important than intensity in language learning.
[00:30.00]Small daily efforts lead to significant improvements over time.`;
    }
  }

  // 获取音频文件
  async fetchAudioFile(audioPath) {
    return audioPath;
  }
  
  // 解析LRC字幕
  parseLRC(lrcText) {
    const lines = lrcText.split('\n');
    const parsedLines = [];
    
    lines.forEach(line => {
      const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\](.+)/);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const milliseconds = parseInt(match[3]);
        const text = match[4].trim();
        
        const time = minutes * 60 + seconds + milliseconds / 100;
        
        parsedLines.push({
          time: time,
          text: text,
          originalLine: line
        });
      }
    });
    
    return parsedLines.sort((a, b) => a.time - b.time);
  }
  
  // 加载学习进度
  loadProgress() {
    const progressKey = `prelistening_progress_${this.currentCourse}_${this.currentLesson}`;
    const progress = JSON.parse(localStorage.getItem(progressKey) || '{}');
    
    this.todayCount = progress.todayCount || 0;
    this.dailyGoal = progress.dailyGoal || 3;
    
    const today = new Date().toDateString();
    if (progress.date !== today) {
      this.todayCount = 0;
      this.saveProgress();
    }
  }
  
  // 保存学习进度
  saveProgress() {
    const progressKey = `prelistening_progress_${this.currentCourse}_${this.currentLesson}`;
    const today = new Date().toDateString();
    
    const progress = {
      courseId: this.currentCourse,
      lessonId: this.currentLesson,
      todayCount: this.todayCount,
      dailyGoal: this.dailyGoal,
      date: today,
      timestamp: Date.now()
    };
    
    localStorage.setItem(progressKey, JSON.stringify(progress));
    
    // 同时更新整体学习流程进度
    this.updateLearningFlowProgress();
  }
  
  // 更新学习流程进度
  updateLearningFlowProgress() {
    const progressKey = `learning_progress_${this.currentCourse}_${this.currentLesson}`;
    const existingProgress = JSON.parse(localStorage.getItem(progressKey) || '{}');
    
    existingProgress.prelisteningCompleted = this.todayCount >= this.dailyGoal;
    existingProgress.prelisteningStats = {
      dailyGoal: this.dailyGoal,
      todayCount: this.todayCount,
      progress: Math.round((this.todayCount / this.dailyGoal) * 100)
    };
    existingProgress.updatedAt = Date.now();
    
    localStorage.setItem(progressKey, JSON.stringify(existingProgress));
  }
  
  // 初始化音频播放器
  initAudioPlayer() {
    if (!this.audioPlayer) {
      this.audioPlayer = new Audio();
      this.audioPlayer.src = this.audioFile;
      
      // 音频事件监听
      this.audioPlayer.addEventListener('loadedmetadata', () => {
        this.duration = this.audioPlayer.duration;
        this.updateDurationDisplay();
      });
      
      this.audioPlayer.addEventListener('timeupdate', () => {
        this.currentTime = this.audioPlayer.currentTime;
        this.updateCurrentTimeDisplay();
        this.updateActiveSubtitle();
      });
      
      this.audioPlayer.addEventListener('ended', () => {
        this.onAudioEnded();
      });
      
      this.audioPlayer.addEventListener('play', () => {
        this.isPlaying = true;
        this.updatePlayButton();
      });
      
      this.audioPlayer.addEventListener('pause', () => {
        this.isPlaying = false;
        this.updatePlayButton();
      });
    }
  }
  
  // 播放音频
  playAudio() {
    if (this.audioPlayer) {
      this.audioPlayer.play();
    }
  }
  
  // 暂停音频
  pauseAudio() {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
    }
  }
  
  // 停止音频
  stopAudio() {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0;
      this.isPlaying = false;
      this.updatePlayButton();
    }
  }
  
  // 切换播放/暂停
  togglePlay() {
    if (this.isPlaying) {
      this.pauseAudio();
    } else {
      this.playAudio();
    }
  }
  
  // 设置播放速度
  setSpeed(speed) {
    this.currentSpeed = speed;
    if (this.audioPlayer) {
      this.audioPlayer.playbackRate = speed;
    }
    this.updateSpeedButtons();
  }
  
  // 跳转到指定时间
  seekTo(time) {
    if (this.audioPlayer) {
      this.audioPlayer.currentTime = time;
    }
  }
  
  // 音频播放结束
  onAudioEnded() {
    this.isPlaying = false;
    this.updatePlayButton();
    
    // 增加今日听读次数
    this.todayCount++;
    this.saveProgress();
    this.updateProgressDisplay();
    
    // 检查是否达到每日目标
    if (this.todayCount >= this.dailyGoal) {
      this.showCompletionMessage();
    }
  }
  
  // 更新当前字幕
  updateActiveSubtitle() {
    const subtitleContainer = document.getElementById('subtitleContainer');
    if (!subtitleContainer) return;
    
    const subtitleLines = subtitleContainer.querySelectorAll('.subtitle-line');
    
    // 清除之前的激活状态
    subtitleLines.forEach((line, index) => {
      if (index <= this.currentLineIndex) {
        line.classList.add('played');
      }
      line.classList.remove('active');
    });
    
    // 找到当前时间对应的字幕
    let activeIndex = -1;
    for (let i = 0; i < this.subtitleLines.length; i++) {
      if (this.currentTime >= this.subtitleLines[i].time) {
        activeIndex = i;
      } else {
        break;
      }
    }
    
    this.currentLineIndex = activeIndex;
    
    if (activeIndex >= 0 && activeIndex < subtitleLines.length) {
      const activeLine = subtitleLines[activeIndex];
      activeLine.classList.add('active');
      
      // 自动滚动到当前字幕
      activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  // 渲染字幕
  renderSubtitles() {
    const container = document.getElementById('subtitleContainer');
    if (!container) return;
    
    let html = '';
    this.subtitleLines.forEach((line, index) => {
      html += `<div class="subtitle-line" data-index="${index}" data-time="${line.time}">
        ${line.text}
      </div>`;
    });
    
    container.innerHTML = html;
    
    // 绑定字幕点击事件
    container.querySelectorAll('.subtitle-line').forEach(line => {
      line.addEventListener('click', () => {
        const time = parseFloat(line.dataset.time);
        this.seekTo(time);
      });
    });
  }
  
  // 更新播放按钮状态
  updatePlayButton() {
    const playBtn = document.getElementById('playBtn');
    if (!playBtn) return;
    
    if (this.isPlaying) {
      playBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `;
    } else {
      playBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `;
    }
  }
  
  // 更新速度按钮
  updateSpeedButtons() {
    const speedButtons = document.querySelectorAll('.speed-btn');
    speedButtons.forEach(btn => {
      const speed = parseFloat(btn.dataset.speed);
      btn.classList.toggle('active', speed === this.currentSpeed);
    });
  }
  
  // 更新进度显示
  updateProgressDisplay() {
    const countEl = document.getElementById('todayCount');
    const goalEl = document.getElementById('dailyGoal');
    const progressEl = document.getElementById('completionProgress');
    
    if (countEl) countEl.textContent = this.todayCount;
    if (goalEl) goalEl.textContent = this.dailyGoal;
    
    if (progressEl) {
      const percentage = Math.round((this.todayCount / this.dailyGoal) * 100);
      progressEl.textContent = `${percentage}%`;
    }
  }
  
  // 更新当前时间显示
  updateCurrentTimeDisplay() {
    const timeEl = document.getElementById('currentTime');
    if (timeEl) {
      timeEl.textContent = this.formatTime(this.currentTime);
    }
  }
  
  // 更新总时长显示
  updateDurationDisplay() {
    const durationEl = document.getElementById('totalDuration');
    if (durationEl) {
      durationEl.textContent = this.formatTime(this.duration);
    }
  }
  
  // 格式化时间
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // 设置每日目标
  setDailyGoal(goal) {
    this.dailyGoal = Math.max(1, Math.min(10, parseInt(goal) || 3));
    this.saveProgress();
    this.updateProgressDisplay();
  }
  
  // 开始预听测试
  startTest() {
    this.testMode = true;
    this.generateTest();
    this.showTestUI();
  }
  
  // 生成预听测试
  generateTest() {
    // 从认识的词汇中选择词汇生成填空题
    const knownWords = this.getKnownWords();
    
    if (knownWords.length === 0) {
      alert('请先完成词汇预习！');
      return;
    }
    
    // 随机选择5个词汇进行测试
    const testWords = knownWords.sort(() => Math.random() - 0.5).slice(0, 5);
    
    this.currentTest = {
      currentIndex: 0,
      questions: testWords.map(word => ({
        word: word,
        correctAnswer: word.meaning,
        options: this.generateOptions(word, knownWords)
      }))
    };
  }
  
  // 获取认识的词汇
  getKnownWords() {
    // 从词汇学习进度中获取认识的词汇
    const vocabProgress = JSON.parse(localStorage.getItem('vocabulary_progress') || '{}');
    
    if (vocabProgress.knownWords && vocabProgress.knownWords.length > 0) {
      return vocabProgress.knownWords.map(id => ({
        id: id,
        word: this.getWordById(id),
        meaning: this.getWordMeaningById(id)
      }));
    }
    
    return [];
  }
  
  // 根据ID获取词汇
  getWordById(id) {
    // 这里应该从词汇数据中获取
    // 目前返回示例数据
    const words = {
      'v_001': { word: 'abandon', meaning: '放弃，抛弃' },
      'v_002': { word: 'ability', meaning: '能力，才能' },
      'v_003': { word: 'absolute', meaning: '绝对的，完全的' }
    };
    return words[id]?.word || 'example';
  }
  
  // 根据ID获取词汇释义
  getWordMeaningById(id) {
    const words = {
      'v_001': { word: 'abandon', meaning: '放弃，抛弃' },
      'v_002': { word: 'ability', meaning: '能力，才能' },
      'v_003': { word: 'absolute', meaning: '绝对的，完全的' }
    };
    return words[id]?.meaning || '示例含义';
  }
  
  // 生成选项
  generateOptions(correctWord, allWords) {
    const options = [correctWord.meaning];
    
    // 随机选择3个错误选项
    const otherWords = allWords.filter(w => w.id !== correctWord.id);
    const wrongOptions = otherWords
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => w.meaning);
    
    options.push(...wrongOptions);
    
    // 打乱选项顺序
    return options.sort(() => Math.random() - 0.5);
  }
  
  // 显示测试UI
  showTestUI() {
    const testSection = document.getElementById('prelisteningTestSection');
    if (testSection) {
      testSection.classList.add('active');
    }
    
    this.renderTestQuestion();
  }
  
  // 渲染测试题目
  renderTestQuestion() {
    if (!this.currentTest || this.currentTest.currentIndex >= this.currentTest.questions.length) {
      this.showTestResults();
      return;
    }
    
    const question = this.currentTest.questions[this.currentTest.currentIndex];
    
    const questionEl = document.getElementById('testQuestion');
    const optionsEl = document.getElementById('testOptions');
    const feedbackEl = document.getElementById('testFeedback');
    
    if (questionEl) {
      questionEl.textContent = `听音频，选择 "${question.word.word}" 的含义：`;
    }
    
    if (optionsEl) {
      let html = '';
      question.options.forEach((option, index) => {
        html += `<div class="test-option" data-index="${index}">${option}</div>`;
      });
      optionsEl.innerHTML = html;
      
      // 绑定选项点击事件
      optionsEl.querySelectorAll('.test-option').forEach(option => {
        option.addEventListener('click', () => {
          this.handleTestAnswer(parseInt(option.dataset.index));
        });
      });
    }
    
    if (feedbackEl) {
      feedbackEl.className = 'test-feedback';
      feedbackEl.textContent = '';
    }
    
    // 播放相关音频
    this.playTestAudio(question.word);
  }
  
  // 播放测试音频
  playTestAudio(word) {
    // 这里应该播放单词的音频
    // 目前只是模拟
    console.log(`播放单词 "${word.word}" 的音频`);
  }
  
  // 处理测试答案
  handleTestAnswer(selectedIndex) {
    const question = this.currentTest.questions[this.currentTest.currentIndex];
    const isCorrect = selectedIndex === question.options.indexOf(question.correctAnswer);
    
    // 显示答案
    const options = document.querySelectorAll('.test-option');
    options.forEach((option, index) => {
      option.classList.remove('selected', 'correct', 'incorrect');
      
      if (index === selectedIndex) {
        option.classList.add('selected');
      }
      
      if (index === question.options.indexOf(question.correctAnswer)) {
        option.classList.add('correct');
      } else if (index === selectedIndex && !isCorrect) {
        option.classList.add('incorrect');
      }
    });
    
    // 显示反馈
    const feedbackEl = document.getElementById('testFeedback');
    if (feedbackEl) {
      if (isCorrect) {
        feedbackEl.textContent = '正确！';
        feedbackEl.classList.add('success');
      } else {
        feedbackEl.textContent = `错误！正确答案是：${question.correctAnswer}`;
        feedbackEl.classList.add('error');
      }
    }
    
    // 记录结果
    this.testResults.push({
      word: question.word.word,
      isCorrect: isCorrect,
      selectedAnswer: question.options[selectedIndex],
      correctAnswer: question.correctAnswer
    });
    
    // 延迟后进入下一题
    setTimeout(() => {
      this.currentTest.currentIndex++;
      this.renderTestQuestion();
    }, 1500);
  }
  
  // 显示测试结果
  showTestResults() {
    const correctCount = this.testResults.filter(r => r.isCorrect).length;
    const totalCount = this.testResults.length;
    const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    
    const testSection = document.getElementById('prelisteningTestSection');
    if (testSection) {
      testSection.innerHTML = `
        <div class="vocabulary-summary">
          <h3 class="summary-title">预听测试完成！</h3>
          <div class="summary-stats">
            <div class="summary-stat">
              <div class="summary-stat-value known">${correctCount}</div>
              <div class="summary-stat-label">正确</div>
            </div>
            <div class="summary-stat">
              <div class="summary-stat-value unknown">${totalCount - correctCount}</div>
              <div class="summary-stat-label">错误</div>
            </div>
          </div>
          <div style="margin: 20px 0; font-size: 1.2rem; font-weight: 600;">
            正确率：${percentage}%
          </div>
          <div class="summary-actions">
            <button class="btn-continue" onclick="prelisteningManager.exitTest()">
              退出测试
            </button>
            <button class="btn-review" onclick="prelisteningManager.reviewResults()">
              查看详情
            </button>
          </div>
        </div>
      `;
    }
    
    // 保存测试结果
    this.saveTestResults();
  }
  
  // 退出测试
  exitTest() {
    this.testMode = false;
    this.testResults = [];
    
    const testSection = document.getElementById('prelisteningTestSection');
    if (testSection) {
      testSection.classList.remove('active');
    }
  }
  
  // 查看测试详情
  reviewResults() {
    // 显示详细的测试结果
    let details = '测试结果详情：\n\n';
    
    this.testResults.forEach((result, index) => {
      details += `${index + 1}. ${result.word}\n`;
      details += `   ${result.isCorrect ? '✓ 正确' : '✗ 错误'}\n`;
      details += `   你的答案：${result.selectedAnswer}\n`;
      details += `   正确答案：${result.correctAnswer}\n\n`;
    });
    
    alert(details);
  }
  
  // 保存测试结果
  saveTestResults() {
    const testKey = `prelistening_test_${this.currentCourse}_${this.currentLesson}`;
    const testData = {
      courseId: this.currentCourse,
      lessonId: this.currentLesson,
      results: this.testResults,
      timestamp: Date.now()
    };
    
    localStorage.setItem(testKey, JSON.stringify(testData));
  }
  
  // 显示完成消息
  showCompletionMessage() {
    alert(`恭喜！您已达到今日预听目标：${this.dailyGoal}遍`);
  }
  
  // 渲染UI
  renderUI() {
    this.renderSubtitles();
    this.updateProgressDisplay();
    this.updateSpeedButtons();
    this.updateLearningFlowNav();
  }
  
  // 更新学习流程导航
  updateLearningFlowNav() {
    const flowSteps = document.querySelectorAll('.flow-step');
    
    if (flowSteps.length === 0) return;
    
    // 词汇预习
    const vocabStep = flowSteps[0];
    if (vocabStep) {
      const isVocabCompleted = this.isStepCompleted('vocabulary');
      vocabStep.querySelector('.step-icon').classList.toggle('completed', isVocabCompleted);
    }
    
    // 篇章预听（当前步骤）
    const prelisteningStep = flowSteps[1];
    if (prelisteningStep) {
      const isCurrent = true; // 当前在预听环节
      prelisteningStep.querySelector('.step-icon').classList.toggle('current', isCurrent);
    }
    
    // 影子跟读
    const shadowingStep = flowSteps[2];
    if (shadowingStep) {
      const canProceed = this.canProceedToStep('shadowing');
      shadowingStep.querySelector('.step-icon').classList.toggle('locked', !canProceed);
    }
    
    // 篇章测试
    const practiceStep = flowSteps[3];
    if (practiceStep) {
      const canProceed = this.canProceedToStep('practice');
      practiceStep.querySelector('.step-icon').classList.toggle('locked', !canProceed);
    }
  }
  
  // 检查步骤是否完成
  isStepCompleted(step) {
    const progressKey = `learning_progress_${this.currentCourse}_${this.currentLesson}`;
    const progress = JSON.parse(localStorage.getItem(progressKey) || '{}');
    
    switch(step) {
      case 'vocabulary':
        return progress.vocabularyCompleted || false;
      case 'prelistening':
        return progress.prelisteningCompleted || false;
      case 'shadowing':
        return progress.shadowingCompleted || false;
      case 'practice':
        return progress.practiceCompleted || false;
      default:
        return false;
    }
  }
  
  // 检查是否可以进行到某步骤
  canProceedToStep(step) {
    const prerequisites = {
      'shadowing': ['vocabulary', 'prelistening'],
      'practice': ['vocabulary', 'prelistening', 'shadowing']
    };
    
    const requiredSteps = prerequisites[step] || [];
    return requiredSteps.every(req => this.isStepCompleted(req));
  }
  
  // 绑定事件
  bindEvents() {
    // 播放控制按钮
    const playBtn = document.getElementById('playBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    if (playBtn) {
      playBtn.addEventListener('click', () => this.togglePlay());
    }
    
    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stopAudio());
    }
    
    // 速度控制按钮
    const speedButtons = document.querySelectorAll('.speed-btn');
    speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        this.setSpeed(speed);
      });
    });
    
    // 每日目标设置
    const goalInput = document.getElementById('goalInput');
    const saveGoalBtn = document.getElementById('saveGoalBtn');
    
    if (goalInput) {
      goalInput.value = this.dailyGoal;
    }
    
    if (saveGoalBtn) {
      saveGoalBtn.addEventListener('click', () => {
        const goal = parseInt(goalInput?.value) || 3;
        this.setDailyGoal(goal);
      });
    }
    
    // 开始测试按钮
    const startTestBtn = document.getElementById('startTestBtn');
    if (startTestBtn) {
      startTestBtn.addEventListener('click', () => this.startTest());
    }
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      // 只有在篇章预听Tab激活时才响应
      if (!document.getElementById('tab-prelistening')?.classList.contains('active')) {
        return;
      }
      
      switch(e.code) {
        case 'Space':
          e.preventDefault();
          this.togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.seekTo(Math.max(0, this.currentTime - 5));
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.seekTo(Math.min(this.duration, this.currentTime + 5));
          break;
      }
    });
  }
}

// 全局实例
let prelisteningManager = null;

// 初始化函数
function initPrelisteningSystem() {
  prelisteningManager = new PrelisteningManager();
  
  // 在篇章预听Tab激活时初始化
  const prelisteningTab = document.getElementById('tab-prelistening');
  if (prelisteningTab) {
    prelisteningTab.addEventListener('transitionend', () => {
      if (prelisteningTab.classList.contains('active')) {
        // 获取当前选择的课程和课次
        const currentCourse = window.currentCourse;
        const currentLesson = window.currentLesson;
        
        if (currentCourse && currentLesson) {
          prelisteningManager.init(currentCourse.id, currentLesson.id);
        }
      }
    });
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  // 延迟初始化，确保其他模块已加载
  setTimeout(initPrelisteningSystem, 600);
});
