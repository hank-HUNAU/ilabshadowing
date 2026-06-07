/**
 * 影子跟读模块 - 学习流程第三环节
 * 版本：20260605-1
 */

// 影子跟读管理器
class ShadowingManager {
  constructor() {
    this.currentCourse = null;
    this.currentLesson = null;
    this.audioPlayer = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordedAudio = null;
    this.subtitleLines = [];
    this.currentLineIndex = -1;
    this.isPlaying = false;
    this.isRecording = false;
    this.currentSpeed = 1.0;
    this.currentTime = 0;
    this.duration = 0;
    this.practiceCount = 0;
    this.dailyGoal = 3; // 默认每日跟读3遍
    this.showedCompletionPrompt = false;
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
      console.warn('[ShadowingManager] 没有课程信息，等待数据加载');
      return;
    }

    await this.loadLessonData();
    this.loadProgress();
    this.initAudioPlayer();
    this.initRecording();
    this.bindEvents();
    this.renderUI();
  }

  // 加载课次数据
  async loadLessonData() {
    try {
      // 获取当前课程信息
      const currentCourse = window.currentCourse;
      if (!currentCourse) {
        console.error('[ShadowingManager] 当前课程信息不存在');
        return;
      }

      // 获取课程单元数据
      await CourseManager.ensureInit();
      const units = CourseManager.getUnitsByBook(currentCourse.bookKey);
      const currentUnit = units.find(u => u.key === currentCourse.unitKey);

      if (!currentUnit) {
        console.error('[ShadowingManager] 找不到当前单元');
        return;
      }

      // 构建文件路径
      const filename = currentUnit.filename || currentUnit.key;
      const lrcPath = `/${currentCourse.bookKey}/${filename}.lrc`;
      const audioPath = `https://jikhdympaifsmubmwilp.supabase.co/storage/v1/object/public/audio/Think0/${filename}.mp3`;

      // 更新音频标题
      const audioTitle = document.getElementById('shadowingAudioTitle');
      if (audioTitle) {
        audioTitle.textContent = currentUnit.title || filename;
      }

      // 加载LRC字幕数据
      const lrcData = await this.fetchLRCData(lrcPath);
      this.subtitleLines = this.parseLRC(lrcData);

      // 加载音频文件
      const audioFile = await this.fetchAudioFile(audioPath);
      this.audioFile = audioFile;

      console.log('[ShadowingManager] 课程数据加载成功:', {
        filename,
        subtitleLines: this.subtitleLines.length,
        audioFile
      });

    } catch (error) {
      console.error('[ShadowingManager] 加载课次数据失败:', error);
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
      console.error('[ShadowingManager] 获取LRC数据失败:', error);
      // 返回示例数据作为fallback
      return `[00:00.00]Welcome to shadowing practice.
[00:02.50]Listen carefully to the audio and try to repeat what you hear.
[00:05.80]Pay attention to pronunciation, intonation, and rhythm.
[00:08.30]Practice regularly to improve your speaking skills.
[00:11.00]Shadowing is an effective way to develop oral proficiency.
[00:13.50]Listen and speak at the same time without stopping.
[00:16.00]Start with slow audio and gradually increase speed.
[00:18.50]Record yourself and compare with the original audio.
[00:21.00]Focus on specific sounds that are difficult for you.
[00:24.00]Consistent practice will lead to significant improvement.`;
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
      const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const milliseconds = parseInt(match[3].padEnd(3, '0'));
        const time = minutes * 60 + seconds + milliseconds / 1000;
        const text = match[4].trim();

        if (text) {
          parsedLines.push({ time, text });
        }
      }
    });

    return parsedLines;
  }

  // 加载进度
  loadProgress() {
    const progressKey = `shadowing_progress_${this.currentCourse}_${this.currentLesson}`;
    const progress = JSON.parse(localStorage.getItem(progressKey) || '{}');

    this.practiceCount = progress.practiceCount || 0;
    this.dailyGoal = progress.dailyGoal || 3;

    const today = new Date().toDateString();
    if (progress.date !== today) {
      this.practiceCount = 0;
      this.saveProgress();
    }
  }

  // 保存进度
  saveProgress() {
    const progressKey = `shadowing_progress_${this.currentCourse}_${this.currentLesson}`;
    const today = new Date().toDateString();

    const progress = {
      courseId: this.currentCourse,
      lessonId: this.currentLesson,
      practiceCount: this.practiceCount,
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

    existingProgress.shadowingCompleted = this.practiceCount >= this.dailyGoal;
    existingProgress.shadowingStats = {
      dailyGoal: this.dailyGoal,
      practiceCount: this.practiceCount,
      progress: Math.round((this.practiceCount / this.dailyGoal) * 100)
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

  // 初始化录音功能
  async initRecording() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
          this.audioChunks.push(event.data);
        };

        this.mediaRecorder.onstop = () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
          this.recordedAudio = URL.createObjectURL(audioBlob);
          this.showPlaybackControls();
        };

        console.log('[ShadowingManager] 录音功能初始化成功');
      } catch (error) {
        console.error('[ShadowingManager] 录音功能初始化失败:', error);
        alert('无法访问麦克风，录音功能将不可用');
      }
    } else {
      console.warn('[ShadowingManager] 浏览器不支持录音功能');
    }
  }

  // 绑定事件
  bindEvents() {
    // 播放控制按钮
    const playBtn = document.getElementById('shadowingPlayBtn');
    const stopBtn = document.getElementById('shadowingStopBtn');

    if (playBtn) {
      playBtn.addEventListener('click', () => this.togglePlay());
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stopAudio());
    }

    // 录音控制按钮
    const recordBtn = document.getElementById('shadowingRecordBtn');
    if (recordBtn) {
      recordBtn.addEventListener('click', () => this.toggleRecording());
    }

    // 速度控制按钮
    const speedButtons = document.querySelectorAll('.shadowing-speed-btn');
    speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        this.setSpeed(speed);
      });
    });

    // 每日目标设置
    const goalInput = document.getElementById('shadowingGoalInput');
    const saveGoalBtn = document.getElementById('shadowingSaveGoalBtn');

    if (goalInput) {
      goalInput.value = this.dailyGoal;
    }

    if (saveGoalBtn) {
      saveGoalBtn.addEventListener('click', () => {
        const goal = parseInt(goalInput?.value) || 3;
        this.setDailyGoal(goal);
      });
    }

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      // 只有在影子跟读Tab激活时才响应
      if (!document.getElementById('tab-shadowing')?.classList.contains('active')) {
        return;
      }

      switch(e.key) {
        case ' ':
          e.preventDefault();
          this.togglePlay();
          break;
        case 'r':
        case 'R':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.toggleRecording();
          }
          break;
        case 's':
        case 'S':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.stopAudio();
          }
          break;
      }
    });
  }

  // 渲染UI
  renderUI() {
    this.renderSubtitles();
    this.updateProgressDisplay();
    this.updateSpeedButtons();
    this.updateLearningFlowNav();
  }

  // 渲染字幕
  renderSubtitles() {
    const container = document.getElementById('shadowingSubtitleContainer');
    if (!container) return;

    let html = '';
    this.subtitleLines.forEach((line, index) => {
      html += `<div class="shadowing-subtitle-line" data-index="${index}" data-time="${line.time}">
        ${line.text}
      </div>`;
    });

    container.innerHTML = html;

    // 绑定字幕点击事件
    container.querySelectorAll('.shadowing-subtitle-line').forEach(line => {
      line.addEventListener('click', () => {
        const time = parseFloat(line.dataset.time);
        this.seekTo(time);
      });
    });
  }

  // 更新播放按钮状态
  updatePlayButton() {
    const playBtn = document.getElementById('shadowingPlayBtn');
    if (!playBtn) return;

    if (this.isPlaying) {
      playBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span>暂停</span>
      `;
    } else {
      playBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span>播放</span>
      `;
    }
  }

  // 更新录音按钮状态
  updateRecordButton() {
    const recordBtn = document.getElementById('shadowingRecordBtn');
    if (!recordBtn) return;

    if (this.isRecording) {
      recordBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1 4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"/>
        </svg>
        <span>停止录音</span>
      `;
      recordBtn.classList.add('recording');
    } else {
      recordBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
        </svg>
        <span>开始录音</span>
      `;
      recordBtn.classList.remove('recording');
    }
  }

  // 显示回放控制
  showPlaybackControls() {
    const playbackContainer = document.getElementById('shadowingPlaybackContainer');
    if (!playbackContainer) return;

    playbackContainer.innerHTML = `
      <div class="playback-controls">
        <h4>你的录音</h4>
        <audio id="recordedAudioPlayer" src="${this.recordedAudio}" controls></audio>
        <div class="playback-actions">
          <button class="btn-compare" onclick="window.shadowingManager.compareAudio()">对比原音</button>
          <button class="btn-save" onclick="window.shadowingManager.saveRecording()">保存录音</button>
        </div>
      </div>
    `;
  }

  // 播放/暂停音频
  togglePlay() {
    if (this.isPlaying) {
      this.audioPlayer.pause();
    } else {
      this.audioPlayer.play();
    }
  }

  // 停止音频
  stopAudio() {
    this.audioPlayer.pause();
    this.audioPlayer.currentTime = 0;
    this.isPlaying = false;
    this.updatePlayButton();
  }

  // 开始/停止录音
  toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  // 开始录音
  startRecording() {
    if (!this.mediaRecorder) {
      alert('录音功能不可用');
      return;
    }

    this.audioChunks = [];
    this.mediaRecorder.start();
    this.isRecording = true;
    this.updateRecordButton();
  }

  // 停止录音
  stopRecording() {
    if (!this.mediaRecorder || !this.isRecording) {
      return;
    }

    this.mediaRecorder.stop();
    this.isRecording = false;
    this.updateRecordButton();
  }

  // 对比音频
  compareAudio() {
    alert('音频对比功能开发中...');
  }

  // 保存录音
  saveRecording() {
    alert('录音保存功能开发中...');
  }

  // 设置播放速度
  setSpeed(speed) {
    this.currentSpeed = speed;
    this.audioPlayer.playbackRate = speed;

    // 更新按钮状态
    document.querySelectorAll('.shadowing-speed-btn').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.speed) === speed);
    });
  }

  // 更新速度按钮
  updateSpeedButtons() {
    document.querySelectorAll('.shadowing-speed-btn').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.speed) === this.currentSpeed);
    });
  }

  // 设置每日目标
  setDailyGoal(goal) {
    this.dailyGoal = Math.max(1, Math.min(10, goal));
    this.saveProgress();
    this.updateProgressDisplay();
  }

  // 更新进度显示
  updateProgressDisplay() {
    const todayCountEl = document.getElementById('shadowingTodayCount');
    const dailyGoalEl = document.getElementById('shadowingDailyGoal');
    const completionProgressEl = document.getElementById('shadowingCompletionProgress');

    if (todayCountEl) todayCountEl.textContent = this.practiceCount;
    if (dailyGoalEl) dailyGoalEl.textContent = this.dailyGoal;
    if (completionProgressEl) {
      const progress = Math.round((this.practiceCount / this.dailyGoal) * 100);
      completionProgressEl.textContent = `${progress}%`;
    }
  }

  // 更新当前时间显示
  updateCurrentTimeDisplay() {
    const currentTimeEl = document.getElementById('shadowingCurrentTime');
    if (currentTimeEl) {
      currentTimeEl.textContent = this.formatTime(this.currentTime);
    }
  }

  // 更新时长显示
  updateDurationDisplay() {
    const totalDurationEl = document.getElementById('shadowingTotalDuration');
    if (totalDurationEl) {
      totalDurationEl.textContent = this.formatTime(this.duration);
    }
  }

  // 格式化时间
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // 更新激活字幕
  updateActiveSubtitle() {
    const lines = document.querySelectorAll('.shadowing-subtitle-line');
    lines.forEach((line, index) => {
      const lineTime = parseFloat(line.dataset.time);
      const nextTime = this.subtitleLines[index + 1]?.time || Infinity;

      if (this.currentTime >= lineTime && this.currentTime < nextTime) {
        line.classList.add('active');
        // 滚动到当前行
        line.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        line.classList.remove('active');
      }
    });
  }

  // 跳转到指定时间
  seekTo(time) {
    this.audioPlayer.currentTime = time;
    if (!this.isPlaying) {
      this.audioPlayer.play();
    }
  }

  // 音频播放结束
  onAudioEnded() {
    this.isPlaying = false;
    this.updatePlayButton();

    // 增加练习次数
    this.practiceCount++;
    this.saveProgress();
    this.updateProgressDisplay();

    // 检查是否达到每日目标
    if (this.practiceCount >= this.dailyGoal) {
      this.showCompletionMessage();
      // 检查步骤完成提示
      this.checkStepCompletionPrompt();
    }
  }

  // 显示完成消息
  showCompletionMessage() {
    alert(`🎉 太棒了！今天已完成${this.practiceCount}次影子跟读练习！\n保持这个节奏，你的英语口语会越来越棒！`);
  }

  // 检查步骤完成提示
  checkStepCompletionPrompt() {
    // 如果影子跟读已完成，提示可以进行下一步
    if (this.practiceCount >= this.dailyGoal && !this.showedCompletionPrompt) {
      const canProceedToPractice = this.canProceedToStep('practice');

      if (canProceedToPractice) {
        // 显示完成提示
        this.showCompletionNotification('shadowing', 'practice');
        this.showedCompletionPrompt = true;
      } else {
        // 提示需要先完成前置条件
        this.showMissingPrerequisiteNotification('prelistening', 'shadowing');
      }
    }
  }

  // 显示步骤完成通知
  showCompletionNotification(currentStep, nextStep) {
    const stepNames = {
      'vocabulary': '词汇预习',
      'prelistening': '篇章预听',
      'shadowing': '影子跟读',
      'practice': '篇章测试'
    };

    const message = `✅ ${stepNames[currentStep]}已完成！\n\n现在可以进行${stepNames[nextStep]}了。`;

    // 创建自定义通知元素
    const notification = document.createElement('div');
    notification.className = 'step-completion-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">✅</div>
        <div class="notification-message">${message.replace(/\n/g, '<br>')}</div>
        <div class="notification-actions">
          <button class="btn-continue" onclick="switchTab('${nextStep}')">继续${stepNames[nextStep]}</button>
          <button class="btn-dismiss" onclick="this.closest('.step-completion-notification').remove()">稍后</button>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // 3秒后自动消失（如果用户没有操作）
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }

  // 显示缺少前置条件通知
  showMissingPrerequisiteNotification(missingStep, currentStep) {
    const stepNames = {
      'vocabulary': '词汇预习',
      'prelistening': '篇章预听',
      'shadowing': '影子跟读',
      'practice': '篇章测试'
    };

    const message = `⚠️ 请先完成${stepNames[missingStep]}，才能继续${stepNames[currentStep]}。`;

    // 创建警告通知元素
    const notification = document.createElement('div');
    notification.className = 'step-completion-notification warning';
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">⚠️</div>
        <div class="notification-message">${message.replace(/\n/g, '<br>')}</div>
        <div class="notification-actions">
          <button class="btn-primary" onclick="switchTab('${missingStep}'); this.closest('.step-completion-notification').remove();">去完成${stepNames[missingStep]}</button>
          <button class="btn-dismiss" onclick="this.closest('.step-completion-notification').remove()">知道了</button>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // 5秒后自动消失
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }

  // 更新学习流程导航
  updateLearningFlowNav() {
    const flowSteps = document.querySelectorAll('.shadowing-flow-steps .flow-step');

    if (flowSteps.length === 0) return;

    // 词汇预习
    const vocabStep = flowSteps[0];
    if (vocabStep) {
      const isVocabCompleted = this.isStepCompleted('vocabulary');
      vocabStep.querySelector('.step-icon').classList.toggle('completed', isVocabCompleted);
    }

    // 篇章预听
    const prelisteningStep = flowSteps[1];
    if (prelisteningStep) {
      const isPrelisteningCompleted = this.isStepCompleted('prelistening');
      prelisteningStep.querySelector('.step-icon').classList.toggle('completed', isPrelisteningCompleted);
    }

    // 影子跟读（当前步骤）
    const shadowingStep = flowSteps[2];
    if (shadowingStep) {
      const isCurrent = true; // 当前在影子跟读环节
      shadowingStep.querySelector('.step-icon').classList.toggle('current', isCurrent);
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

  // 更新指定步骤的进度
  updateStepProgress(step, completed = true, stats = {}) {
    const progressKey = `learning_progress_${this.currentCourse}_${this.currentLesson}`;
    const existingProgress = JSON.parse(localStorage.getItem(progressKey) || '{}');

    // 更新指定步骤的完成状态
    switch(step) {
      case 'vocabulary':
        existingProgress.vocabularyCompleted = completed;
        existingProgress.vocabularyStats = stats;
        break;
      case 'prelistening':
        existingProgress.prelisteningCompleted = completed;
        existingProgress.prelisteningStats = stats;
        break;
      case 'shadowing':
        existingProgress.shadowingCompleted = completed;
        existingProgress.shadowingStats = stats;
        break;
      case 'practice':
        existingProgress.practiceCompleted = completed;
        existingProgress.practiceStats = stats;
        break;
    }

    existingProgress.updatedAt = Date.now();
    localStorage.setItem(progressKey, JSON.stringify(existingProgress));

    // 刷新学习流程导航UI
    this.updateLearningFlowNav();
  }
}
