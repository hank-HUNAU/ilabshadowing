/**
 * 篇章测试模块 - 学习流程第四环节
 * 版本：20260605-1
 */

// 篇章测试管理器
class PracticeTestManager {
  constructor() {
    this.currentCourse = null;
    this.currentLesson = null;
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.correctCount = 0;
    this.userAnswers = [];
    this.testCompleted = false;
    this.testType = 'mixed'; // mixed, vocabulary, comprehension, listening
    this.questionTypes = ['vocabulary', 'comprehension', 'listening'];
    this.showedCompletionPrompt = false;
  }

  // 初始化
  async init(courseId = null, lessonId = null, testType = 'mixed') {
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
      console.warn('[PracticeTestManager] 没有课程信息，等待数据加载');
      return;
    }

    this.testType = testType;
    await this.loadLessonData();
    this.generateQuestions();
    this.bindEvents();
    this.renderUI();
  }

  // 加载课次数据
  async loadLessonData() {
    try {
      // 获取当前课程信息
      const currentCourse = window.currentCourse;
      if (!currentCourse) {
        console.error('[PracticeTestManager] 当前课程信息不存在');
        return;
      }

      // 获取课程单元数据
      await CourseManager.ensureInit();
      const units = CourseManager.getUnitsByBook(currentCourse.bookKey);
      const currentUnit = units.find(u => u.key === currentCourse.unitKey);

      if (!currentUnit) {
        console.error('[PracticeTestManager] 找不到当前单元');
        return;
      }

      // 构建文件路径
      const filename = currentUnit.filename || currentUnit.key;
      const lrcPath = `/${currentCourse.bookKey}/${filename}.lrc`;

      // 加载LRC字幕数据
      const lrcData = await this.fetchLRCData(lrcPath);
      this.subtitleLines = this.parseLRC(lrcData);

      // 获取词汇数据
      this.vocabularyData = await this.loadVocabularyData();

      console.log('[PracticeTestManager] 课程数据加载成功:', {
        filename,
        subtitleLines: this.subtitleLines.length,
        vocabularyData: this.vocabularyData.length
      });

    } catch (error) {
      console.error('[PracticeTestManager] 加载课次数据失败:', error);
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
      console.error('[PracticeTestManager] 获取LRC数据失败:', error);
      // 返回示例数据作为fallback
      return `[00:00.00]Welcome to practice test.
[00:02.50]This test will check your understanding of the lesson.
[00:05.80]Read each question carefully and choose the best answer.
[00:08.30]Take your time and think before answering.
[00:11.00]Good luck with your test!`;
    }
  }

  // 加载词汇数据
  async loadVocabularyData() {
    // 从词汇学习模块获取词汇数据
    const vocabProgress = localStorage.getItem('vocabulary_progress');
    if (vocabProgress) {
      const progress = JSON.parse(vocabProgress);
      return progress.vocabulary || [];
    }
    return [];
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

  // 生成测试题目
  generateQuestions() {
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.correctCount = 0;
    this.userAnswers = [];
    this.testCompleted = false;

    // 根据测试类型生成题目
    if (this.testType === 'mixed' || this.testType === 'vocabulary') {
      this.generateVocabularyQuestions();
    }

    if (this.testType === 'mixed' || this.testType === 'comprehension') {
      this.generateComprehensionQuestions();
    }

    if (this.testType === 'mixed' || this.testType === 'listening') {
      this.generateListeningQuestions();
    }

    // 随机排序题目
    this.shuffleQuestions();
  }

  // 生成词汇测试题
  generateVocabularyQuestions() {
    if (this.vocabularyData.length === 0) {
      // 如果没有词汇数据，生成示例题目
      this.questions.push({
        type: 'vocabulary',
        question: 'What does "efficient" mean?',
        options: ['Working well and quickly', 'Slow and lazy', 'Expensive and luxurious', 'Simple and basic'],
        correctAnswer: 0,
        explanation: '"Efficient" means working well and without wasting time or energy.'
      });
      return;
    }

    // 从认识的词汇中选择
    const knownWords = this.vocabularyData.filter(w => w.status === 'known');
    const wordsToTest = knownWords.slice(0, 5);

    wordsToTest.forEach(word => {
      this.questions.push({
        type: 'vocabulary',
        question: `What does "${word.word}" mean?`,
        options: this.generateDistractors(word),
        correctAnswer: 0, // 第一个是正确答案
        explanation: `"${word.word}" means ${word.definition || 'not available'}.`
      });
    });
  }

  // 生成干扰选项
  generateDistractors(correctWord) {
    const correctAnswer = correctWord.definition || 'not available';
    const distractors = [];

    // 示例干扰项
    const sampleDistractors = [
      'Not available',
      'A common mistake',
      'Very expensive',
      'Extremely difficult'
    ];

    // 确保正确答案是第一个
    distractors.push(correctAnswer);

    // 添加干扰项
    const remainingDistractors = sampleDistractors.filter(d => d !== correctAnswer);
    distractors.push(...remainingDistractors.slice(0, 3));

    // 如果不足4个选项，添加更多
    while (distractors.length < 4) {
      distractors.push(`Option ${distractors.length}`);
    }

    // 随机排序选项
    return distractors.sort(() => Math.random() - 0.5);
  }

  // 生成理解测试题
  generateComprehensionQuestions() {
    if (this.subtitleLines.length === 0) {
      this.questions.push({
        type: 'comprehension',
        question: 'What is the main topic of this lesson?',
        options: ['Vocabulary learning', 'Grammar rules', 'Pronunciation practice', 'Writing skills'],
        correctAnswer: 0,
        explanation: 'The lesson focuses on vocabulary learning techniques.'
      });
      return;
    }

    // 从字幕中选择关键句子
    const keySentences = this.subtitleLines.filter(line => 
      line.text.length > 20 && !line.text.includes('[00:')
    ).slice(0, 5);

    keySentences.forEach((sentence, index) => {
      this.questions.push({
        type: 'comprehension',
        question: `What does this sentence suggest: "${sentence.text.substring(0, 50)}..."?`,
        options: [
          'It suggests a learning method',
          'It describes a problem',
          'It gives an example',
          'It asks a question'
        ],
        correctAnswer: 0,
        explanation: 'The sentence suggests a method or approach to learning.'
      });
    });
  }

  // 生成听力测试题
  generateListeningQuestions() {
    if (this.subtitleLines.length === 0) {
      this.questions.push({
        type: 'listening',
        question: 'What is the speaker suggesting in this lesson?',
        options: ['Follow a structured approach', 'Learn randomly', 'Focus only on reading', 'Skip vocabulary study'],
        correctAnswer: 0,
        explanation: 'The speaker suggests following a structured learning approach.'
      });
      return;
    }

    // 选择部分字幕生成听力题
    const selectedLines = this.subtitleLines.slice(0, 3);

    selectedLines.forEach((line, index) => {
      this.questions.push({
        type: 'listening',
        question: `What does the speaker say about: "${line.text.substring(0, 30)}..."?`,
        options: [
          'It is important for learning',
          'It should be avoided',
          'It is optional',
          'It is too difficult'
        ],
        correctAnswer: 0,
        explanation: 'The speaker emphasizes the importance of this topic.',
        audioTime: line.time
      });
    });
  }

  // 随机排序题目
  shuffleQuestions() {
    for (let i = this.questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.questions[i], this.questions[j]] = [this.questions[j], this.questions[i]];
    }
  }

  // 绑定事件
  bindEvents() {
    // 开始测试按钮
    const startTestBtn = document.getElementById('startPracticeTest');
    if (startTestBtn) {
      startTestBtn.addEventListener('click', () => this.startTest());
    }

    // 重新测试按钮
    const retakeTestBtn = document.getElementById('retakePracticeTest');
    if (retakeTestBtn) {
      retakeTestBtn.addEventListener('click', () => this.retakeTest());
    }

    // 测试类型选择
    const testTypeButtons = document.querySelectorAll('.test-type-btn');
    testTypeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        this.testType = type;
        this.generateQuestions();
        this.renderTestTypeSelection();
      });
    });

    // 选项选择
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('test-option')) {
        const questionIndex = parseInt(e.target.dataset.question);
        const optionIndex = parseInt(e.target.dataset.option);
        this.selectOption(questionIndex, optionIndex);
      }
    });

    // 下一题按钮
    const nextQuestionBtn = document.getElementById('nextQuestionBtn');
    if (nextQuestionBtn) {
      nextQuestionBtn.addEventListener('click', () => this.nextQuestion());
    }

    // 提交测试按钮
    const submitTestBtn = document.getElementById('submitPracticeTest');
    if (submitTestBtn) {
      submitTestBtn.addEventListener('click', () => this.submitTest());
    }
  }

  // 渲染UI
  renderUI() {
    this.renderTestOverview();
    this.renderTestTypeSelection();
    this.updateLearningFlowNav();
  }

  // 渲染测试概览
  renderTestOverview() {
    const overviewContainer = document.getElementById('practiceTestOverview');
    if (!overviewContainer) return;

    const canProceed = this.canProceedToTest();

    overviewContainer.innerHTML = `
      <div class="test-overview-card">
        <div class="test-overview-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012 2h2a2 2 0 012-2m-6 5l2 2 4-4"/>
          </svg>
        </div>
        <h3 class="test-overview-title">篇章测试</h3>
        <p class="test-overview-description">
          完成词汇预习、篇章预听和影子跟读后，进行本章的综合测试，检验学习成果。
        </p>
        
        ${canProceed ? `
          <div class="test-overview-stats">
            <div class="stat-item">
              <div class="stat-value">${this.questions.length}</div>
              <div class="stat-label">题目数量</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">15</div>
              <div class="stat-label">建议时间(分钟)</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">60%</div>
              <div class="stat-label">及格分数</div>
            </div>
          </div>
          <button class="btn-start-test" id="startPracticeTest">
            开始测试
          </button>
        ` : `
          <div class="test-locked-message">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            <span>请先完成词汇预习、篇章预听和影子跟读</span>
          </div>
        `}
      </div>
    `;
  }

  // 渲染测试类型选择
  renderTestTypeSelection() {
    const typeContainer = document.getElementById('testTypeSelection');
    if (!typeContainer) return;

    typeContainer.innerHTML = `
      <h4 class="test-type-title">选择测试类型</h4>
      <div class="test-type-buttons">
        <button class="test-type-btn ${this.testType === 'mixed' ? 'active' : ''}" data-type="mixed">
          <span class="type-icon">📋</span>
          <span class="type-name">综合测试</span>
          <span class="type-desc">词汇+理解+听力</span>
        </button>
        <button class="test-type-btn ${this.testType === 'vocabulary' ? 'active' : ''}" data-type="vocabulary">
          <span class="type-icon">📚</span>
          <span class="type-name">词汇测试</span>
          <span class="type-desc">重点词汇考察</span>
        </button>
        <button class="test-type-btn ${this.testType === 'comprehension' ? 'active' : ''}" data-type="comprehension">
          <span class="type-icon">🧠</span>
          <span class="type-name">理解测试</span>
          <span class="type-desc">文章理解能力</span>
        </button>
        <button class="test-type-btn ${this.testType === 'listening' ? 'active' : ''}" data-type="listening">
          <span class="type-icon">🎧</span>
          <span class="type-name">听力测试</span>
          <span class="type-desc">听力理解能力</span>
        </button>
      </div>
    `;
  }

  // 开始测试
  startTest() {
    if (this.questions.length === 0) {
      alert('没有可用的测试题目，请先完成其他学习环节');
      return;
    }

    this.currentQuestionIndex = 0;
    this.score = 0;
    this.correctCount = 0;
    this.userAnswers = [];
    this.testCompleted = false;

    this.renderTestQuestions();
    this.renderCurrentQuestion();
  }

  // 渲染测试题目
  renderTestQuestions() {
    const questionsContainer = document.getElementById('practiceTestQuestions');
    const overviewContainer = document.getElementById('practiceTestOverview');

    if (questionsContainer && overviewContainer) {
      overviewContainer.style.display = 'none';
      questionsContainer.style.display = 'block';
    }
  }

  // 渲染当前题目
  renderCurrentQuestion() {
    const currentQuestionContainer = document.getElementById('currentQuestionContainer');
    if (!currentQuestionContainer || this.currentQuestionIndex >= this.questions.length) {
      return;
    }

    const question = this.questions[this.currentQuestionIndex];
    const progress = Math.round(((this.currentQuestionIndex + 1) / this.questions.length) * 100);

    let typeLabel = '';
    switch(question.type) {
      case 'vocabulary': typeLabel = '词汇测试'; break;
      case 'comprehension': typeLabel = '理解测试'; break;
      case 'listening': typeLabel = '听力测试'; break;
    }

    currentQuestionContainer.innerHTML = `
      <div class="test-progress-bar">
        <div class="progress-fill" style="width: ${progress}%"></div>
      </div>
      <div class="question-counter">
        题目 ${this.currentQuestionIndex + 1} / ${this.questions.length}
      </div>
      
      <div class="question-type-badge">${typeLabel}</div>
      
      <h3 class="question-text">${question.question}</h3>
      
      <div class="options-container">
        ${question.options.map((option, index) => `
          <div class="test-option" data-question="${this.currentQuestionIndex}" data-option="${index}">
            <span class="option-label">${String.fromCharCode(65 + index)}.</span>
            <span class="option-text">${option}</span>
          </div>
        `).join('')}
      </div>
      
      <div class="question-actions">
        <button class="btn-submit-question" id="submitQuestionBtn" disabled>
          下一题
        </button>
      </div>
    `;

    // 重新绑定提交按钮事件
    const submitBtn = document.getElementById('submitQuestionBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.nextQuestion());
    }
  }

  // 选择选项
  selectOption(questionIndex, optionIndex) {
    // 移除其他选项的选中状态
    document.querySelectorAll(`.test-option[data-question="${questionIndex}"]`).forEach(opt => {
      opt.classList.remove('selected');
    });

    // 添加当前选项的选中状态
    const selectedOption = document.querySelector(`.test-option[data-question="${questionIndex}"][data-option="${optionIndex}"]`);
    if (selectedOption) {
      selectedOption.classList.add('selected');
    }

    // 启用提交按钮
    const submitBtn = document.getElementById('submitQuestionBtn');
    if (submitBtn) {
      submitBtn.disabled = false;
    }

    // 记录用户答案
    this.userAnswers[questionIndex] = optionIndex;
  }

  // 下一题
  nextQuestion() {
    if (this.currentQuestionIndex >= this.questions.length - 1) {
      this.finishTest();
      return;
    }

    this.currentQuestionIndex++;
    this.renderCurrentQuestion();

    // 重置提交按钮状态
    const submitBtn = document.getElementById('submitQuestionBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = this.currentQuestionIndex === this.questions.length - 1 ? '提交测试' : '下一题';
    }
  }

  // 完成测试
  finishTest() {
    this.calculateScore();
    this.testCompleted = true;
    this.saveTestResults();
    this.renderTestResults();
    this.checkStepCompletionPrompt();
  }

  // 计算分数
  calculateScore() {
    this.correctCount = 0;

    this.questions.forEach((question, index) => {
      if (this.userAnswers[index] === question.correctAnswer) {
        this.correctCount++;
      }
    });

    this.score = Math.round((this.correctCount / this.questions.length) * 100);
  }

  // 保存测试结果
  saveTestResults() {
    const progressKey = `practice_test_progress_${this.currentCourse}_${this.currentLesson}`;
    const testResults = {
      courseId: this.currentCourse,
      lessonId: this.currentLesson,
      testType: this.testType,
      score: this.score,
      correctCount: this.correctCount,
      totalQuestions: this.questions.length,
      userAnswers: this.userAnswers,
      questions: this.questions,
      completedAt: Date.now()
    };

    localStorage.setItem(progressKey, JSON.stringify(testResults));

    // 更新学习流程进度
    this.updateLearningFlowProgress();
  }

  // 更新学习流程进度
  updateLearningFlowProgress() {
    const progressKey = `learning_progress_${this.currentCourse}_${this.currentLesson}`;
    const existingProgress = JSON.parse(localStorage.getItem(progressKey) || '{}');

    const passed = this.score >= 60;
    existingProgress.practiceCompleted = passed;
    existingProgress.practiceStats = {
      testType: this.testType,
      score: this.score,
      correctCount: this.correctCount,
      totalQuestions: this.questions.length,
      passed: passed,
      completedAt: Date.now()
    };
    existingProgress.updatedAt = Date.now();

    localStorage.setItem(progressKey, JSON.stringify(existingProgress));
  }

  // 渲染测试结果
  renderTestResults() {
    const resultsContainer = document.getElementById('practiceTestResults');
    const questionsContainer = document.getElementById('practiceTestQuestions');

    if (resultsContainer && questionsContainer) {
      questionsContainer.style.display = 'none';
      resultsContainer.style.display = 'block';
    }

    const passed = this.score >= 60;
    const message = passed ? '🎉 恭喜你通过了测试！' : '💪 继续努力，下次一定能够通过！';

    resultsContainer.innerHTML = `
      <div class="test-results-card">
        <div class="results-header">
          <div class="results-icon ${passed ? 'passed' : 'failed'}">
            ${passed ? '✓' : '×'}
          </div>
          <h3 class="results-title">${message}</h3>
          <div class="score-display">
            <div class="score-number">${this.score}</div>
            <div class="score-label">分</div>
          </div>
          <div class="score-details">
            <span class="correct-count">正确 ${this.correctCount} 题</span>
            <span class="total-count">共 ${this.questions.length} 题</span>
          </div>
        </div>

        <div class="results-stats">
          <div class="result-stat">
            <div class="stat-label">词汇测试</div>
            <div class="stat-value">${this.calculateTypeScore('vocabulary')}%</div>
          </div>
          <div class="result-stat">
            <div class="stat-label">理解测试</div>
            <div class="stat-value">${this.calculateTypeScore('comprehension')}%</div>
          </div>
          <div class="result-stat">
            <div class="stat-label">听力测试</div>
            <div class="stat-value">${this.calculateTypeScore('listening')}%</div>
          </div>
        </div>

        <div class="results-actions">
          ${passed ? `
            <button class="btn-success" onclick="window.location.hash='index.html'">
              返回首页
            </button>
          ` : `
            <button class="btn-primary" id="retakePracticeTest">
              重新测试
            </button>
          `}
          <button class="btn-secondary" onclick="window.location.hash='index.html'">
            返回首页
          </button>
        </div>
      </div>
    `;

    // 重新绑定重新测试按钮事件
    const retakeBtn = document.getElementById('retakePracticeTest');
    if (retakeBtn) {
      retakeBtn.addEventListener('click', () => this.retakeTest());
    }
  }

  // 计算类型分数
  calculateTypeScore(type) {
    const typeQuestions = this.questions.filter(q => q.type === type);
    if (typeQuestions.length === 0) return '-';

    let typeCorrect = 0;
    typeQuestions.forEach((question, index) => {
      const originalIndex = this.questions.indexOf(question);
      if (this.userAnswers[originalIndex] === question.correctAnswer) {
        typeCorrect++;
      }
    });

    return Math.round((typeCorrect / typeQuestions.length) * 100);
  }

  // 重新测试
  retakeTest() {
    const resultsContainer = document.getElementById('practiceTestResults');
    const questionsContainer = document.getElementById('practiceTestQuestions');

    if (resultsContainer && questionsContainer) {
      resultsContainer.style.display = 'none';
      questionsContainer.style.display = 'block';
    }

    this.startTest();
  }

  // 检查是否可以进行测试
  canProceedToTest() {
    const prerequisites = ['vocabulary', 'prelistening', 'shadowing'];
    return prerequisites.every(req => this.isStepCompleted(req));
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

  // 更新学习流程导航
  updateLearningFlowNav() {
    const flowSteps = document.querySelectorAll('.practice-test-flow-steps .flow-step');

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

    // 影子跟读
    const shadowingStep = flowSteps[2];
    if (shadowingStep) {
      const isShadowingCompleted = this.isStepCompleted('shadowing');
      shadowingStep.querySelector('.step-icon').classList.toggle('completed', isShadowingCompleted);
    }

    // 篇章测试（当前步骤）
    const practiceStep = flowSteps[3];
    if (practiceStep) {
      const isCurrent = true; // 当前在测试环节
      const canProceed = this.canProceedToTest();
      practiceStep.querySelector('.step-icon').classList.toggle('current', isCurrent);
      practiceStep.querySelector('.step-icon').classList.toggle('locked', !canProceed);
    }
  }

  // 检查步骤完成提示
  checkStepCompletionPrompt() {
    // 如果测试通过，显示完成提示
    if (this.testCompleted && this.score >= 60 && !this.showedCompletionPrompt) {
      this.showCompletionNotification('practice');
      this.showedCompletionPrompt = true;
    }
  }

  // 显示步骤完成通知
  showCompletionNotification(currentStep) {
    const stepNames = {
      'vocabulary': '词汇预习',
      'prelistening': '篇章预听',
      'shadowing': '影子跟读',
      'practice': '篇章测试'
    };

    const message = `🎉 恭喜！你已经完成了${stepNames[currentStep]}！\n\n整个学习流程已完成，你的英语水平一定会不断提升！`;

    // 创建自定义通知元素
    const notification = document.createElement('div');
    notification.className = 'step-completion-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">🎉</div>
        <div class="notification-message">${message.replace(/\n/g, '<br>')}</div>
        <div class="notification-actions">
          <button class="btn-continue" onclick="window.location.hash='index.html'">返回首页</button>
          <button class="btn-dismiss" onclick="this.closest('.step-completion-notification').remove()">稍后</button>
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
    }, 8000);
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
