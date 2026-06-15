/* 触觉反馈通用函数 */
function triggerHapticFeedback(intensity = 'light') {
  if (!navigator.vibrate) return;

  const patterns = {
    light: 15,
    medium: 30,
    heavy: 50
  };

  const duration = patterns[intensity] || 20;
  navigator.vibrate(duration);
}

/* 全局常量 */
const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const REPEAT_COUNTS = [1, 2, 3, 5, 10, 99]; // 重复次数选项
const LS = { 
  BOOK: 'nce_book', 
  UNIT: k => `nce_${k}_u`, 
  TIME: (k,u) => `nce_${k}_${u}_t`, 
  SPD: 'nce_spd', 
  MODE: 'nce_mode', 
  TR: 'nce_tr',
  LAST_PAGE: 'nce_last_page',
  FAVORITES: 'nce_favorites',
  REPEAT: 'nce_repeat',              // 重复次数（合并）
  USER_PROFILE: 'nce_user_profile',     // 用户信息
  LEARNING_STATS: 'nce_learning_stats', // 学习统计
  PROGRESS: 'nce_progress',             // 课程进度
  SELECTED_COURSES: 'nce_selected_courses' // 选择的课程
};

/* 音频源配置 - 一键切换 */
// 可选值：'github' 或 'supabase'
const AUDIO_SOURCE = 'supabase';

/* Supabase 配置 - 多 bucket 支持 */
const SUPABASE_URL = 'https://jikhdympaifsmubmwilp.supabase.co';
const SUPABASE_BUCKETS = {
  NCE1: 'nce1-audio',      // 新概念第一册
  THINK_0: 'think0-audio', // Think Level 0
  THINK_F: 'think0-audio'  // Think Level F（复用同一 bucket）
};

/* 获取 Supabase bucket 名称 */
function getBucket(key) {
  if (AUDIO_SOURCE === 'supabase') {
    return SUPABASE_BUCKETS[key] || SUPABASE_BUCKETS.NCE1;
  }
  return null;
}

/* 获取音频 URL */
function getAudioUrl(filename, bookPath, key) {
  if (AUDIO_SOURCE === 'supabase') {
    const bucket = getBucket(key);
    // 对文件名进行 URL 编码，处理空格等特殊字符
    const encodedFilename = encodeURIComponent(filename);
    const url = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodedFilename}.mp3`;
    return url;
  }
  // 从课程目录加载（支持多本书）
  if (bookPath) {
    return `/courses/${bookPath}/${filename}.mp3`;
  }
  return null;
}

/* 辅助函数 - 从 user-manager.js 桥接 */
function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(LS.FAVORITES) || '[]');
  } catch {
    return [];
  }
}

function formatLearningTime(minutes) {
  if (!minutes || minutes < 60) {
    return (minutes || 0) + 'm';
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return hours + 'h' + (mins > 0 ? mins + 'm' : '');
}

function loadLearningStats() {
  if (window.userManager && typeof userManager.loadLearningStats === 'function') {
    return userManager.loadLearningStats();
  }
  // 回退：直接从 localStorage 读取
  const stats = JSON.parse(localStorage.getItem(LS.LEARNING_STATS) || '{}');
  return {
    totalTime: stats.totalTime || 0,
    streak: stats.streak || 0,
    lastStudyDate: stats.lastStudyDate || null
  };
}

function loadAchievements() {
  if (window.userManager && typeof userManager.loadAchievements === 'function') {
    return userManager.loadAchievements();
  }
  // 回退：直接从 localStorage 读取
  return JSON.parse(localStorage.getItem('nce_achievements') || '[]');
}

/* 获取 LRC URL */
function getLrcUrl(filename, bookPath, key) {
  if (AUDIO_SOURCE === 'supabase') {
    const bucket = getBucket(key);
    // 对文件名进行 URL 编码，处理空格等特殊字符
    const encodedFilename = encodeURIComponent(filename);
    const url = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodedFilename}.lrc`;
    return url;
  }
  // 从课程目录加载（支持多本书）
  if (bookPath) {
    // 确保路径以 / 结尾
    const path = bookPath.endsWith('/') ? bookPath : bookPath + '/';
    return `${path}${filename}.lrc`;
  }
  // 默认从 NCE1 加载
  return `./audio/NCE1/${filename}.lrc`;
}

/* 歌词解析器 */
class Lrc {
  static parse(raw) {
    const list = [];
    for (const line of raw.split('\n')) {
      const m = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.+)/);
      if (!m) continue;
      const t = +m[1] * 60 + +m[2] + (m[3].length === 2 ? +m[3] * 10 : +m[3]) / 1000;
      const parts = m[4].trim().split('|').map(s => s.trim());
      list.push({ time: Math.max(0, t), en: parts[0], cn: parts[1] || '' });
    }
    return list.sort((a,b) => a.time - b.time);
  }
  
  // 计算句子数量（按LRC文件中的行数计算）
  static getLearningSentenceCount(lines) {
    return lines.length;
  }
}

/* 主程序 */
class App {
  constructor() {
    this.books = [];
    this.units = [];
    this.key = '';
    this.path = '';
    this.idx = -1;
    this.lines = [];
    this.cur = -1;
    this.mode = localStorage.getItem(LS.MODE) || 'single';
    this.spd = +(localStorage.getItem(LS.SPD) || 1.0);
    this.tr = localStorage.getItem(LS.TR) || 'bilingual';  // 显示模式：bilingual/en-only/cn-only
    // 重复次数（合并单句和全文）
    this.repeatCount = +(localStorage.getItem(LS.REPEAT) || 3);
    // 降级兼容：如果新 key 不存在，使用旧的 single key
    if (!localStorage.getItem(LS.REPEAT) && localStorage.getItem(LS.REPEAT_SINGLE)) {
      this.repeatCount = +(localStorage.getItem(LS.REPEAT_SINGLE) || 3);
    }
    
    // 显示模式配置
    this.displayModes = ['bilingual', 'en-only', 'cn-only'];
    
    // 静音检测配置
    this.silenceThreshold = 0.15;  // 静音阈值 (0-1)
    this.silenceDuration = 0.25;   // 持续 250ms 才判定（避免误判）
    // 手机端禁用静音检测（iOS Safari 不兼容 captureStream）
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    this.useSilenceDetection = !isMobile;
    
    // preRoll：前移 150ms 补偿 MP3 seek 解码精度
    this.preRoll = 0.15;

    // 动态提前量配置：根据句子间隔自动调整
    this.leadTimeMap = {
      short: { gap: 0.5, lead: 0.15 },    // 间隔<500ms：提前 150ms
      medium: { gap: 1.0, lead: 0.25 },   // 间隔<1s：提前 250ms
      long: { gap: Infinity, lead: 0.40 } // 间隔>1s：提前 400ms
    };
    this.minPlayTime = 0.5;  // 最少播放时长
this.cache = new Map();
// 性能优化：DOM渲染缓存，避免重复渲染
this.domCache = new Map();
this.favorites = JSON.parse(localStorage.getItem(LS.FAVORITES) || '[]');
    
    // 定时器
    this.timerMinutes = 0;  // 定时分钟数，0=关闭
    this.timerInterval = null;
    this.timerTimeout = null;
    this.timerEndtime = null;
    
    // 重复计数
    this.singleRepeatCount = 0;  // 当前单句已重复次数
    this.allRepeatCount = 0;     // 当前全文已重复次数
    
    this.els = {
      bookPage: document.getElementById('bookSelectPage'),
      unitPage: document.getElementById('unitListPage'),
      bookGrid: document.getElementById('bookGrid'),
      unitGrid: document.getElementById('unitGrid'),
      bookTitle: document.getElementById('bookTitle'),
      unitCount: document.getElementById('unitCount'),
      backToBooks: document.getElementById('backToBooks'),
      pullToRefresh: document.getElementById('pullToRefresh'),
      dlg: document.getElementById('playerDialog'),
      title: document.getElementById('unitTitle'),
      close: document.getElementById('closeBtn'),
      prev: document.getElementById('prevBtn'),
      next: document.getElementById('nextBtn'),
      expand: document.getElementById('expandBtn'),
      area: document.getElementById('lyricsArea'),
      play: document.getElementById('playBtn'),
      timer: document.getElementById('timerBtn'),
      timerLabel: document.getElementById('timerLabel'),
      timerDisplay: document.getElementById('timerDisplay'),
      track: document.getElementById('progressTrack'),
      fill: document.getElementById('progressFill'),
      handle: document.getElementById('progressHandle'),
      cur: document.getElementById('curTime'),
      dur: document.getElementById('durTime'),
      mode: document.getElementById('modeBtn'),
      modeL: document.getElementById('modeLabel'),
      spd: document.getElementById('speedBtn'),
      spdL: document.getElementById('speedLabel'),
      tr: document.getElementById('transBtn'),
      trL: document.getElementById('transLabel'),
      repeat: document.getElementById('repeatBtn'),
      repeatCount: document.getElementById('repeatCount'),
      audio: document.getElementById('audio')
    };

    this.els.audio.playbackRate = this.spd;
    this.applyTr();

    // 边缘返回手势相关属性
    this.pageHistory = [];
    this.currentPage = 'book';
    this.edgeGesture = {
      active: false,
      startX: 0,
      currentX: 0,
      progress: 0,
      threshold: 100,
      edgeWidth: 20,
      isBackGesture: false,
      targetPage: null
    };
    this.syncUI();
    
    // 初始化 Web Audio API 用于静音检测
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.silenceStartTime = null;
    this.silenceDetected = false;
    this.initAudioAnalyzer();
  }
  
  async init() {
    await this.loadBooks();
    this.renderBooks();
    this.bind();
    this.updateFavBadge();
    
    // 检查是否应该直接进入课程页面
    this.restoreLastPage();
    
    // 初始化下拉刷新（仅手机端）
    if (window.innerWidth <= 767) {
      this.initPullToRefresh();
    }

    // 初始化边缘返回手势（仅手机端）
    if (window.innerWidth <= 767) {
      this.initEdgeBackGesture();
    }
    
    // 初始化SPA路由器（在App完全初始化后）
    this.initSPARouter();
  }
  
  /**
   * 初始化SPA路由器
   */
  initSPARouter() {
    if (typeof SPARouter === 'undefined') {
      console.warn('[App] SPA Router not available, falling back to traditional navigation');
      return;
    }
    
    
    // 创建SPA路由器实例
    this.spaRouter = new SPARouter();
    
    // 设置App实例引用
    this.spaRouter.setApp(this);
    
    // 初始化路由器
    this.spaRouter.init();
    
    // 全局暴露SPA路由器
    window.spaRouter = this.spaRouter;
    
  }
  
  /**
   * 显示book页面（课本选择）
   */
  showBookPage() {
    
    // 隐藏其他页面
    this.hideOtherPages();
    
    // 显示课本选择页面
    if (this.els.bookPage) {
      this.els.bookPage.style.display = 'block';
    }
    
    // 隐藏课程列表页面
    if (this.els.unitPage) {
      this.els.unitPage.style.display = 'none';
    }
    
    // 隐藏播放页面
    if (this.els.playerPage) {
      this.els.playerPage.style.display = 'none';
    }
  }
  
  /**
   * 隐藏其他页面
   */
  hideOtherPages() {}
  
  updateFavBadge() {}

  // 已移除"练习本句"按钮功能（2026-05-30）
  
  getLineAudioUrl(lineIdx) {
    // 获取单句音频 URL（简化处理，使用完整音频 + 时间戳）
    if (!this.currentAudioFile) return '';
    return getAudioUrl(this.currentAudioFile, this.book?.path, this.key);
  }
  
  // 初始化音频分析器
  initAudioAnalyzer() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.3;
      
      const source = this.els.audio.captureStream ? 
        this.els.audio.captureStream() : null;
      
      if (source) {
        const audioSource = this.audioContext.createMediaStreamSource(source);
        audioSource.connect(this.analyser);
      }
      
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      console.log('[Audio Analyzer] Initialized');
    } catch (e) {
      console.warn('[Audio Analyzer] Init failed:', e.message);
      this.useSilenceDetection = false;
    }

  // ========== 边缘返回手势 - iOS 风格 ==========
  }
  
  initEdgeBackGesture() {
    this.createEdgeBackUI();
    document.addEventListener('touchstart', this.handleEdgeTouchStart.bind(this), { passive: true });
    document.addEventListener('touchmove', this.handleEdgeTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleEdgeTouchEnd.bind(this), { passive: true });
    window.addEventListener('popstate', this.handlePopState.bind(this));
    this.initPageHistory();
  }
  
  createEdgeBackUI() {
    const indicator = document.createElement('div');
    indicator.id = 'edgeBackIndicator';
    indicator.className = 'edge-back-indicator';
    
    const progress = document.createElement('div');
    progress.id = 'edgeBackProgress';
    progress.className = 'edge-back-progress';
    
    const touchZone = document.createElement('div');
    touchZone.id = 'edgeTouchZone';
    touchZone.className = 'edge-touch-zone';
    
    document.body.appendChild(indicator);
    document.body.appendChild(progress);
    document.body.appendChild(touchZone);
    
    this.els.edgeBackIndicator = indicator;
    this.els.edgeBackProgress = progress;
    this.els.edgeTouchZone = touchZone;
  }
  
  initPageHistory() {
    this.currentPage = 'book';
    this.pageHistory = ['book'];
    
    if (window.history.state === null) {
      window.history.replaceState({ page: 'book' }, '', '#book');
    }
  }
  
  handleEdgeTouchStart(e) {
    const touch = e.touches[0];
    
    if (touch.clientX <= this.edgeGesture.edgeWidth) {
      if (this.canGoBack()) {
        this.edgeGesture.active = true;
        this.edgeGesture.startX = touch.clientX;
        this.edgeGesture.currentX = touch.clientX;
        this.edgeGesture.progress = 0;
        this.edgeGesture.isBackGesture = true;
        
        this.els.edgeTouchZone.classList.add('active');
        document.body.classList.add('edge-gesture-active');
        e.preventDefault();
      }
    }
  }
  
  handleEdgeTouchMove(e) {
    if (!this.edgeGesture.active || !this.edgeGesture.isBackGesture) return;
    
    const touch = e.touches[0];
    const diffX = touch.clientX - this.edgeGesture.startX;
    
    this.edgeGesture.currentX = Math.min(diffX, window.innerWidth * 0.8);
    this.edgeGesture.progress = this.edgeGesture.currentX / window.innerWidth;
    
    this.els.edgeBackProgress.style.transform = `scaleY(${this.edgeGesture.progress})`;
    this.els.edgeBackProgress.classList.add('active');
    this.els.edgeBackIndicator.classList.add('active');
    
    if (Math.abs(diffX) > 10) {
      e.preventDefault();
    }
  }
  
  handleEdgeTouchEnd(e) {
    if (!this.edgeGesture.active) return;
    
    const shouldGoBack = this.edgeGesture.currentX >= this.edgeGesture.threshold;
    
    if (shouldGoBack) {
      this.triggerEdgeBack();
    } else {
      this.cancelEdgeBack();
    }
    
    this.edgeGesture.active = false;
    this.edgeGesture.isBackGesture = false;
  }
  
  triggerEdgeBack() {
    this.hideEdgeBackUI();
    
    if (this.pageHistory.length > 1) {
      const previousPage = this.pageHistory[this.pageHistory.length - 2];
      this.pageHistory.pop();
      this.currentPage = previousPage;
      window.history.back();
    }
  }
  
  cancelEdgeBack() {
    this.hideEdgeBackUI();
  }
  
  hideEdgeBackUI() {
    this.els.edgeTouchZone.classList.remove('active');
    this.els.edgeBackProgress.classList.remove('active');
    this.els.edgeBackIndicator.classList.remove('active');
    document.body.classList.remove('edge-gesture-active');
  }
  
  canGoBack() {
    return this.pageHistory.length > 1;
  }
  
  handlePopState(e) {
    const state = e.state;
    
    if (state && state.page) {
      const direction = this.getNavigationDirection(state.page);
      this.transitionPage(state.page, direction);
      this.currentPage = state.page;
      this.updateBottomNavState(state.page);
    }
  }
  
  getNavigationDirection(targetPage) {
    const currentIndex = this.pageHistory.indexOf(targetPage);
    const currentLastIndex = this.pageHistory.length - 1;
    
    return currentIndex < currentLastIndex ? 'reverse' : 'forward';
  }
  
  updateBottomNavState(page) {
    // 更新侧边导航（电脑端）
    const sideNav = document.getElementById('sideNav');
    if (sideNav) {
      sideNav.querySelectorAll('.side-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
          item.classList.add('active');
        }
      });
    }
  }
  
  navigateBottomNavWithHistory(page, direction = 'forward') {
    if (page !== this.currentPage) {
      this.pageHistory.push(page);
      this.currentPage = page;
      window.history.pushState({ page: page }, '', `#${page}`);
    }
    
    this.navigateBottomNav(page, direction);
  }
  
  // 获取当前音量 (0-1)
  getCurrentVolume() {
    if (!this.analyser || !this.dataArray) return 0;
    
    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length / 255;
    return average;
  }
  
  showFavoriteToolbar() {
    // 不再使用工具栏，收藏按钮在每行歌词右侧
    // 此函数保留用于兼容性
  }
  
  hideFavoriteToolbar() {
    // 不再使用工具栏
  }
  
  toggleLineFavorite(lineIdx) {
    if (lineIdx < 0 || !this.lines[lineIdx]) return;
    
    const currentLine = this.lines[lineIdx];
    const favId = `${this.key}_${this.idx}_${lineIdx}`;
    const existingIdx = this.favorites.findIndex(f => f.id === favId);
    
    if (existingIdx >= 0) {
      // 取消收藏
      this.favorites.splice(existingIdx, 1);
      this.updateLineFavoriteIcon(lineIdx, false);
      console.log('[Favorite] Removed from favorites');
    } else {
      // 添加收藏
      const unit = this.units[this.idx];
      this.favorites.push({
        id: favId,
        key: this.key,
        unitIdx: this.idx,
        lineIdx: lineIdx,
        sentence: currentLine.en,
        translation: currentLine.cn || '',
        lessonTitle: unit?.lesson_num || `Lesson ${this.idx + 1}`,
        bookTitle: this.books.find(b => b.key === this.key)?.title || ''
      });
      this.updateLineFavoriteIcon(lineIdx, true);
      console.log('[Favorite] Added sentence to favorites');
      
      // 触觉反馈（移动端）
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // 星星弹跳动画已通过 CSS 实现
    }
    
    localStorage.setItem(LS.FAVORITES, JSON.stringify(this.favorites));
    this.updateFavBadge();
    

  }
  
  updateLineFavoriteIcon(lineIdx, isFavorited) {
    const btn = this.els.area.querySelector(`.line-favorite[data-line-i="${lineIdx}"]`);
    if (!btn) return;
    
    const svg = btn.querySelector('svg');
    if (isFavorited) {
      btn.classList.add('favorited');
      svg.setAttribute('fill', '#fbbf24');
      svg.setAttribute('stroke', '#fbbf24');
      btn.setAttribute('title', '取消收藏');
      btn.setAttribute('aria-label', '取消收藏');
      btn.setAttribute('aria-pressed', 'true');
      btn.classList.add('favorite-star', 'active');
    } else {
      btn.classList.remove('favorited');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      btn.setAttribute('title', '收藏本句');
      btn.setAttribute('aria-label', '收藏本句');
      btn.setAttribute('aria-pressed', 'false');
      btn.classList.remove('favorite-star', 'active');
    }
  }

  toggleFavorite() {
    if (this.cur < 0 || !this.lines[this.cur]) {
      console.warn('[ToggleFavorite] No sentence selected');
      return;
    }
    
    const currentLine = this.lines[this.cur];
    const favId = `${this.key}_${this.idx}_${this.cur}`;
    const existingIdx = this.favorites.findIndex(f => f.id === favId);
    
    if (existingIdx >= 0) {
      // 取消收藏
      this.favorites.splice(existingIdx, 1);
      this.els.favoriteBtn?.classList.remove('favorited');
      this.els.favoriteBtn?.querySelector('svg').setAttribute('fill', 'none');
      // 如果在收藏页，刷新收藏列表

    } else {
      // 添加收藏 - 收藏当前句子
      const unit = this.units[this.idx];
      this.favorites.push({
        id: favId,
        key: this.key,
        unitIdx: this.idx,
        lineIdx: this.cur,
        sentence: currentLine.en,
        translation: currentLine.cn || '',
        lessonTitle: unit?.lesson_num || `Lesson ${this.idx + 1}`,
        bookTitle: this.books.find(b => b.key === this.key)?.title || ''
      });
      this.els.favoriteBtn?.classList.add('favorited');
      this.els.favoriteBtn?.querySelector('svg').setAttribute('fill', '#fbbf24');
    }
    
    localStorage.setItem(LS.FAVORITES, JSON.stringify(this.favorites));
  }

  // 手机端底部导航栏导航
  navigateBottomNav(page, direction = 'forward') {
    // 已使用SPA路由器
  }

  transitionPage(page, direction = 'forward') {}

  renderFavorites() {
    // 已移除收藏页面
  }
  
  filterFavorites(query) {
    // 已移除收藏页面
  }

  async loadBooks() {
    // 显示骨架屏
    this.els.bookGrid.innerHTML = `
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
    `;
    
    try {
      const data = await fetch('data.json').then(r => r.json());
      const allBooks = data.books || [];
      
      const selected = userManager?.getSelectedCourses() || null;
      
      if (selected === null) {
        this.books = allBooks;
      } else {
        this.books = allBooks.filter(b => selected.includes(b.key));
      }
      
      if (this.books.length === 0) {
        this.els.bookGrid.innerHTML = `
          <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
            </svg>
            <h3 class="empty-state-title">没有显示的课程</h3>
            <p class="empty-state-desc">请在 data.json 中添加课程配置</p>
          </div>
        `;
        return;
      }
    } catch (e) { 
      console.error('[App] Failed to load data.json:', e);
      this.books = []; 
      this.els.bookGrid.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <h3 class="empty-state-title">加载失败</h3>
          <p class="empty-state-desc">数据加载失败，请刷新页面重试</p>
          <button class="empty-state-action" onclick="location.reload()">刷新页面</button>
        </div>
      `;
      return;
    }
  }

  renderBooks() {
    this.els.bookGrid.innerHTML = this.books.map(b => {
      const shortName = b.key === 'NCE1' ? 'N1' : b.key === 'THINK_0' ? 'T0' : b.key === 'THINK_F' ? 'TF' : b.key;
      return `
      <div class="book-card" data-key="${b.key}">
        <div class="book-icon">${shortName}</div>
        <div class="book-info">
          <h2 class="book-title">${b.title}</h2>
          <p class="book-desc">${this.getBookDesc(b.key)}</p>
        </div>
      </div>`;
    }).join('');
  }
  
  getBookDesc(key) {
    const descs = {
      'NCE1': '新概念英语第一册 · 基础入门',
      'THINK_0': 'Think Level 0 · 入门级别',
      'THINK_F': 'Think Level F · 基础级别'
    };
    return descs[key] || '英语跟读训练';
  }

  restoreLastPage() {
    const lastBook = localStorage.getItem(LS.BOOK);
    const lastPage = localStorage.getItem(LS.LAST_PAGE);
    
    // 如果用户之前已经进入过课程页面，直接恢复
    if (lastBook && lastPage === 'unit') {
      const book = this.books.find(b => b.key === lastBook);
      if (book) {
        this.openBook(book.key);
      } else {
        // book not found, reset
        localStorage.removeItem(LS.LAST_PAGE);
      }
    }
  }
  
  // 恢复课本选择页面（从空状态引导）
  restoreBookPage() {
    if (this.els.unitPage) {
      this.els.unitPage.style.display = 'none';
    }
    if (this.els.bookPage) {
      this.els.bookPage.style.display = 'flex';
    }
    localStorage.setItem(LS.LAST_PAGE, 'book');
  }

  openBook(key, toUnitIdx = null, toLineIdx = null) {
    this.key = key;
    const book = this.books.find(b => b.key === key);
    if (!book) return;
    
    this.path = book.bookPath || '';
    localStorage.setItem(LS.BOOK, key);
    
    // 更新页面显示
    this.els.bookTitle.textContent = book.title;
    this.els.bookPage.style.display = 'none';
    this.els.unitPage.style.display = 'flex';
    this.els.unitPage.classList.add('page-transition');
    localStorage.setItem(LS.LAST_PAGE, 'unit');
    
    // 加载课程列表
    this.loadUnits(() => {
      // 如果指定了课程索引，加载完成后打开
      if (toUnitIdx !== null) {
        setTimeout(() => {
          this.open(toUnitIdx);
          // 如果指定了句子索引，播放该句子
          if (toLineIdx !== null) {
            setTimeout(() => this.playLine(toLineIdx), 300);
          }
        }, 100);
      }
    });
  }

  async loadUnits(callback) {
    if (!this.path) return;
    
    // 显示骨架屏
    this.showSkeleton();
    
    try {
      const d = await fetch(`${this.path}/book.json`).then(r => r.json());
      this.units = d.units || [];
      this.els.unitCount.textContent = `${this.units.length} 课`;
      this.grid();
      this.restoreUnit();
      this.preloadLrcFiles(); // 预加载 LRC 文件
      
      // 加载完成回调
      if (callback) callback();
    } catch(e) { 
      this.units = []; 
      this.els.unitCount.textContent = '0 课';
      if (callback) callback();
    }
  }

  showSkeleton() {
    // 根据当前布局显示骨架屏
    const isThink = (this.key === 'THINK_0' || this.key === 'THINK_F');
    const count = isThink ? 8 : 24;
    
    this.els.unitGrid.innerHTML = Array(count).fill(0).map(() => `
      <div class="unit-card skeleton"></div>
    `).join('');
  }

  grid() {
    // 根据书籍类型设置布局类名
    const isThink = (this.key === 'THINK_0' || this.key === 'THINK_F');
    this.els.unitGrid.classList.toggle('think-layout', isThink);
    
    // 获取当前书籍的进度数据
    const progressData = (userManager?.progress && this.key) ? userManager.progress[this.key] : null;
    const completedUnits = progressData?.completedUnits || [];
    const unitProgress = progressData?.unitProgress || {};
    
    this.els.unitGrid.innerHTML = this.units.map((u, i) => {
      let num;
      let description = '';
      let type = 'reading';
      
      if (isThink) {
        const lesson = u.lesson_num || '';
        const parts = lesson.split(' ').filter(p => p);
        
        if (parts.length >= 3) {
          num = `${parts[0]} ${parts[1]}`;
          description = parts.slice(2).join(' ');
          
          const desc = description.toLowerCase();
          if (desc.includes('culture') || desc.includes('文化')) {
            type = 'culture';
          } else if (desc.includes('math') || desc.includes('数学')) {
            type = 'math';
          } else if (desc.includes('reading') || desc.includes('阅读')) {
            type = 'reading';
          } else if (desc.includes('science') || desc.includes('科学')) {
            type = 'science';
          }
        } else if (parts.length === 2) {
          num = lesson;
        } else {
          num = lesson;
        }
      } else {
        const numMatch = u.lesson_num ? u.lesson_num.match(/(\d+)/) : null;
        num = numMatch ? numMatch[1] : u.filename;
      }
      
      const isCompleted = completedUnits.includes(i);
      const progress = unitProgress[`lesson_${i}`] || unitProgress[`${this.key}_unit_${i}`] || 0;
      const hasProgress = progress > 0;
      
      // 使用缓存的句子数量，如果没有则使用默认值5
      const totalLines = this.cache.get(`lineCount_${i}`) || 5;
      const completedLines = Math.round((progress / 100) * totalLines);
      
      const typeLabels = {
        'reading': '阅读',
        'culture': '文化',
        'math': '数学',
        'science': '科学'
      };
      
      const statusText = isCompleted ? '已完成' : (hasProgress ? '学习中' : '未开始');
      const actionText = isCompleted ? '复习 ›' : (hasProgress ? '继续学习 ›' : '开始学习 ›');
      
      if (isThink) {
        return `
        <div class="unit-card ${isCompleted ? 'completed' : ''}" data-i="${i}" data-key="${u.key}">
          <div class="card-header">
            <span class="type-tag ${type}">${typeLabels[type]}</span>
            <span class="status-badge">${statusText}</span>
          </div>
          <div class="unit-num">${num}</div>
          <div class="unit-title">${description}</div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${progress}%"></div>
          </div>
          <div class="card-footer">
            <span class="duration">⏱ ${this.getUnitDuration(i)}</span>
            <span class="progress-text">${completedLines}/${totalLines}</span>
          </div>
          <div class="card-action">
            <span class="action-text">${actionText}</span>
          </div>
        </div>`;
      } else {
        const showTitle = isThink && description;
        const circumference = 75.4;
        const offset = circumference - (progress / 100) * circumference;
        
        return `
        <div class="unit-card nce1-enhanced ${isCompleted ? 'completed' : ''}" data-i="${i}">
          <div class="status-badge">${statusText}</div>
          <div class="unit-num">${num}</div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${progress}%"></div>
          </div>
          <div class="card-footer">
            <span class="duration">⏱ ${this.getUnitDuration(i)}</span>
            <span class="progress-text">${completedLines}/${totalLines}</span>
          </div>
        </div>`;
      }
    }).join('');
  }

  getUnitDuration(index) {
    // 使用缓存的句子数量，如果没有则使用默认值5
    const lineCount = this.cache.get(`lineCount_${index}`) || 5;
    const estimatedDuration = Math.max(3, Math.min(15, lineCount));
    return `${estimatedDuration} min`;
  }

  async preloadLrcFiles() {
    // 预加载所有 LRC 文件到缓存，点击播放时 0 延迟显示歌词
    // 同时缓存每个课程的句子数量
    const promises = this.units.map((u, i) => {
      const url = getLrcUrl(u.filename, this.path, this.key);
      return fetch(url).then(r => r.text()).then(lrc => {
        this.cache.set(url, lrc);
        
        // 解析LRC文件，获取句子数量
        const lines = Lrc.parse(lrc);
        const lineCount = Lrc.getLearningSentenceCount(lines);
        
        // 缓存句子数量（使用课程索引作为key）
        this.cache.set(`lineCount_${i}`, lineCount);
        
      }).catch(() => {
        // 如果LRC文件加载失败，缓存默认值
        this.cache.set(`lineCount_${i}`, 5); // 默认5句
      });
    });
    await Promise.all(promises);
  }

  async updateTitlesFromLrc() {
    // 批量从 LRC 获取 [ti:] 标签作为标题
    const cards = this.els.grid.querySelectorAll('.card-title');
    
    for (const card of cards) {
      const filename = card.getAttribute('data-filename');
      if (!filename) continue;
      
      const lrcUrl = getLrcUrl(filename, this.path, this.key);
      let txt = this.cache.get(lrcUrl);
      
      if (!txt) {
        try {
          const response = await fetch(lrcUrl);
          if (response.ok) {
            txt = await response.text();
            this.cache.set(lrcUrl, txt);
          }
        } catch (e) {
          console.error('Failed to load LRC for title:', e);
        }
      }
      
      if (txt) {
        // 从 [ti:xxx] 提取标题
        const tiMatch = txt.match(/\[ti:(.+)\]/);
        if (tiMatch) {
          card.textContent = tiMatch[1].trim();
        }
      }
    }
  }

  restoreUnit() {
    const i = +(localStorage.getItem(LS.UNIT(this.key)) || 0);
    if (this.units.length > 0) {
      const safeIdx = Math.min(i, this.units.length-1);
      this.activeCard(safeIdx);
    }
  }

  async open(i) {
    this.idx = i;
    this.cur = -1;
    this.allRepeatCount = 0;  // 重置全文重复计数
    localStorage.setItem(LS.UNIT(this.key), i);
    
    const u = this.units[i];
    
    // 先显示弹窗（标题先显示数字）
    this.els.title.textContent = `Lesson ${parseInt(u.filename)}`;
    this.navBtns();
    this.activeCard(i);
    this.reset();
    this.hideFavoriteToolbar(); // 隐藏收藏工具栏
    
    // 开始学习计时
    if (userManager) {
      userManager.startStudySession();
    }
    
    // 默认全屏模式：打开时移除 windowed 类，添加 expanded 类（兼容旧版）
    const inner = this.els.dlg.querySelector('.dialog-inner');
    if (inner) {
      inner.classList.remove('windowed');
      inner.classList.add('expanded');
      
      // 更新图标状态
      const icoExp = this.els.expand?.querySelector('.ico-expand');
      const icoShr = this.els.expand?.querySelector('.ico-shrink');
      if (icoExp) icoExp.style.display = 'none';
      if (icoShr) icoShr.style.display = 'block';
    }
    
    // 先显示弹窗（不等待 LRC 加载）
    this.els.dlg.showModal();
    
    // 添加下拉关闭手势（仅手机端）
    if (window.innerWidth <= 767) {
      this.setupPullToClose();
    }
    
    // 异步加载 LRC
    const lrcUrl = getLrcUrl(u.filename, this.path, this.key);
    let txt = this.cache.get(lrcUrl);
    if (!txt) {
      try {
        const response = await fetch(lrcUrl);
        if (!response.ok) throw new Error('LRC not found');
        txt = await response.text();
      } catch (e) {
        console.error('Failed to load LRC:', e);
        txt = '';
      }
      this.cache.set(lrcUrl, txt);
    }
    this.lines = Lrc.parse(txt);
    this.renderLines();
    
    // 从 LRC [ti:xxx] 获取标题
    const tiMatch = txt.match(/\[ti:(.+)\]/);
    if (tiMatch) {
      this.els.title.textContent = tiMatch[1].trim();
    }
    
    // 异步加载音频
    const audio = this.els.audio;
    const audioSrc = getAudioUrl(u.filename, this.path, this.key);
    audio.src = audioSrc;
    audio.load();
    
    audio.addEventListener('loadeddata', () => {
      // 恢复上次播放进度
      this.restoreTime();
    }, { once: true });
    
    audio.addEventListener('error', (e) => {
      console.error('Audio load error:', e);
      if (window.toast && window.toast.error) {
        window.toast.error('音频加载失败，请检查网络连接');
      }
      
      // 测试直接访问 URL
      fetch(audio.src, { method: 'HEAD' })
        .catch(err => console.error('Direct fetch error:', err));
    });
  }

  reset() {
    this.els.audio.pause();
    this.els.audio.currentTime = 0;
    this.els.fill.style.width = '0%';
    this.els.cur.textContent = '0:00';
    this.els.dur.textContent = '0:00';
    this.playIcon(false);
    this.bound = null;
    this.singleRepeatCount = 0;
    this.allRepeatCount = 0;
  }

  restoreTime() {
    const t = +localStorage.getItem(LS.TIME(this.key, this.idx)) || 0;
    if (t > 0 && this.els.audio.duration) {
      this.els.audio.currentTime = Math.min(t, this.els.audio.duration - 0.1);
    }
  }

  renderLines() {
    if (!this.lines.length) { this.els.area.innerHTML = '<p class="line">无歌词数据</p>'; return; }
    
    // 性能优化：检查DOM渲染缓存
    const cacheKey = `${this.key}_${this.idx}`;
    let cachedHTML = this.domCache.get(cacheKey);
    
    // 如果缓存不存在，生成并缓存HTML
    if (!cachedHTML) {
      cachedHTML = this.lines.map((l, i) => {
        const favId = `${this.key}_${this.idx}_${i}`;
        const isFavorited = this.favorites.some(f => f.id === favId);
        return `
        <div class="line" data-i="${i}" data-t="${l.time}">
          <div class="line-content">
            <div class="line-en">${l.en}</div>
            ${l.cn ? `<div class="line-cn">${l.cn}</div>` : ''}
          </div>
          <div class="line-actions">
            <button class="line-favorite ${isFavorited ? 'favorited' : ''}" data-line-i="${i}" title="${isFavorited ? '取消收藏' : '收藏本句'}">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="${isFavorited ? '#fbbf24' : 'none'}" stroke="${isFavorited ? '#fbbf24' : 'currentColor'}" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </button>
          </div>
        </div>`;
      }).join('');
      
      // 缓存HTML（限制缓存大小，避免内存泄漏）
      if (this.domCache.size > 50) {
        const firstKey = this.domCache.keys().next().value;
        this.domCache.delete(firstKey);
      }
      this.domCache.set(cacheKey, cachedHTML);
    }
    
    this.els.area.innerHTML = cachedHTML;
    this.els.area.scrollTop = 0;
  }

  activeCard(i) {
    // 移除 active 状态，不再高亮选中卡片
    // const prev = this.els.grid.querySelector('.card.active');
    // if (prev) prev.classList.remove('active');
  }

  navBtns() {
    this.els.prev.disabled = this.idx <= 0;
    this.els.next.disabled = this.idx >= this.units.length - 1;
  }

  playLine(i) {
    if (i < 0 || i >= this.lines.length) return;
    const line = this.lines[i];
    
    // 等待音频加载完成
    if (!this.els.audio.src || this.els.audio.readyState < 2) {
      this.els.audio.addEventListener('canplay', () => {
        this._doPlayLine(line, i);
      }, { once: true });
      return;
    }
    
    this._doPlayLine(line, i);
  }

  _doPlayLine(line, i) {
    // 重置静音检测状态
    this.silenceDetected = false;
    this.silenceStartTime = null;
    
    // 计算实际开始播放时间（前移 preRoll 补偿 MP3 解码精度）
    const seekTime = Math.max(0, line.time - this.preRoll);
    const startTime = Math.max(0, line.time);
    this.els.audio.currentTime = seekTime;
    this.cur = i;
    this.highlight();
    this.showFavoriteToolbar();
    
    if (this.mode === 'single') {
      const nxt = this.lines[i + 1];
      if (nxt) {
        const gap = nxt.time - line.time;  // 句子间隔
        
        // 动态调整提前量
        let leadTime;
        if (gap < this.leadTimeMap.short.gap) {
          leadTime = this.leadTimeMap.short.lead;
        } else if (gap < this.leadTimeMap.medium.gap) {
          leadTime = this.leadTimeMap.medium.lead;
        } else {
          leadTime = this.leadTimeMap.long.lead;
        }
        
        this.bound = nxt.time - leadTime;
        this.bound = Math.max(this.bound, startTime + this.minPlayTime);
        
        console.log(`[Play] Line ${i}, gap=${gap.toFixed(3)}s, leadTime=${leadTime}s, bound=${this.bound.toFixed(3)}s`);
      } else {
        this.bound = this.els.audio.duration;
      }
      this.singleRepeatCount = 0;
    } else { 
      this.bound = null; 
    }
    
    this.els.audio.play().catch(e => console.log('Play error:', e.message));
    this.saveTime(startTime);
  }

  handleAllRepeatEnd() {
    // 只有在全文模式才触发全文重复
    if (this.mode !== 'all') return;
    
    const needRepeat = this.repeatCount >= 99 || this.allRepeatCount < this.repeatCount;
    
    if (needRepeat) {
      this.allRepeatCount++;
      // 全文重复：间隔 0.1 秒后从第一句开始
      setTimeout(() => {
        this.playLine(0);
      }, 100);
    } else {
      // 全部重复完成，停止播放
      this.els.audio.pause();
      this.allRepeatCount = 0;
      
      // 检查是否刚完成该课程
      const wasCompleted = userManager.progress[this.key]?.completedUnits?.includes(this.idx);
      
      // 更新课程进度
      if (userManager) {
        userManager.updateProgress(this.key, this.idx, this.repeatCount);
      }
      
      // 同步到数据模块
      if (window.dataSync && this.book?.key) {
        window.updateCourseProgress(this.book.key, this.units[this.idx].key, this.repeatCount);
      }
      
      // 如果刚完成，触发完成动画
      if (!wasCompleted && userManager.progress[this.key]?.completedUnits?.includes(this.idx)) {
        const card = this.els.unitGrid.querySelector(`.unit-card[data-i="${this.idx}"]`);
        if (card) {
          triggerCompleteAnimation(card);
        }
      }
    }
  }
  
  // playNext() - 已删除，全文模式下音频连续播放

  highlight() {
    if (!this.lines.length) return;
    const now = this.els.audio.currentTime;
    let ni = -1;
    for (let i = this.lines.length - 1; i >= 0; i--) { if (now >= this.lines[i].time) { ni = i; break; } }
    if (ni === this.cur) return;
    
    const prevCur = this.cur;
    this.cur = ni;
    
    // 性能优化：只切换前后两行的class，而不是所有行
    const lines = this.els.area.querySelectorAll('.line');
    
    // 移除前一行的active class
    if (prevCur >= 0 && lines[prevCur]) {
      lines[prevCur].classList.remove('active');
    }
    
    // 添加当前行的active class
    if (ni >= 0 && lines[ni]) {
      lines[ni].classList.add('active');
      
      // 性能优化：只在需要时滚动
      // 检查当前行是否在可视区域内
      const container = this.els.area;
      const element = lines[ni];
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      // 如果元素不在可视区域内，则滚动
      if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  updateProg() {
    if (!this.els.audio.duration) return;
    const p = (this.els.audio.currentTime / this.els.audio.duration) * 100;
    this.els.fill.style.width = `${p}%`;
    
    // 更新拖动手柄位置
    if (this.els.handle) {
      this.els.handle.style.left = `${p}%`;
    }
    
    this.els.cur.textContent = this.fmt(this.els.audio.currentTime);
  }

  playIcon(isPlay) {
    this.els.play.querySelector('.ico-play').style.display = isPlay ? 'none' : 'block';
    this.els.play.querySelector('.ico-pause').style.display = isPlay ? 'block' : 'none';
  }

  syncUI() {
    const speedLabel = `${this.spd}x`;
    this.els.spdL.textContent = speedLabel;
    this.modeLabel();
    this.updateRepeatCounts();
  }
  
  updateRepeatCounts() {
    if (this.els.repeatCount) {
      this.els.repeatCount.textContent = this.repeatCount >= 99 ? '∞' : this.repeatCount;
    }
  }

  modeLabel() {
    this.els.modeL.textContent = this.mode === 'single' ? '单句' : '全文';
  }

  applyTr() {
    document.body.classList.remove('hide-cn', 'hide-en');
    
    if (this.tr === 'en-only') {
      document.body.classList.add('hide-cn');
    } else if (this.tr === 'cn-only') {
      document.body.classList.add('hide-en');
    }
    
    const labels = { bilingual: '双语', 'en-only': '英文', 'cn-only': '中文' };
    const label = labels[this.tr] || '双语';
    this.els.trL.textContent = label;
  }

  saveTime(t) { localStorage.setItem(LS.TIME(this.key, this.idx), t); }
  
  fmt(s) { if (!isFinite(s)) return '0:00'; return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`; }

  bind() {
    // 电脑端侧边导航栏
    const sideNav = document.getElementById('sideNav');
    if (sideNav) {
      const sideNavItems = sideNav.querySelectorAll('.side-nav-item');
      sideNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const page = item.dataset.page;
          
          // 使用SPA路由器进行页面切换
          if (this.spaRouter) {
            this.spaRouter.navigateTo(page);
          } else {
            this.navigateBottomNavWithHistory(page);
          }
        });
      });
    }

    // 歌词区域点击事件（收藏按钮）
    if (this.els.area) {
      this.els.area.addEventListener('click', e => {
        const favoriteBtn = e.target.closest('.line-favorite');
        
        // 如果点击的是收藏按钮，只切换收藏状态，不播放
        if (favoriteBtn) {
          e.preventDefault();
          e.stopPropagation();
          const lineIdx = +favoriteBtn.dataset.lineI;
          this.toggleLineFavorite(lineIdx);
          triggerHapticFeedback('light');
          return;
        }
        
        // 否则播放该句
        const line = e.target.closest('.line');
        if (line) {
          this.playLine(+line.dataset.i);
          triggerHapticFeedback('light');
        }
      });
    }
    if (this.els.repeat) {
      this.els.repeat.addEventListener('click', () => {
        const currentIdx = REPEAT_COUNTS.indexOf(this.repeatCount);
        const nextIdx = (currentIdx + 1) % REPEAT_COUNTS.length;
        this.repeatCount = REPEAT_COUNTS[nextIdx];
        localStorage.setItem(LS.REPEAT, this.repeatCount);
        this.updateRepeatCounts();
        triggerHapticFeedback('light');
      });
    }
    
    // 课本选择 - 点击进入课程列表
    this.els.bookGrid.addEventListener('click', e => {
      const card = e.target.closest('.book-card');
      if (card) {
        const key = card.dataset.key;
        if (key) this.openBook(key);
      }
    });
    
    // 返回课本选择
    this.els.backToBooks.addEventListener('click', () => {
      this.els.unitPage.style.display = 'none';
      this.els.unitPage.classList.remove('page-transition');
      this.els.bookPage.style.display = 'flex';
      this.els.bookPage.classList.add('page-transition');
      localStorage.setItem(LS.LAST_PAGE, 'book');
    });
    
    // 课程网格点击 - 打开播放器
    this.els.unitGrid.addEventListener('click', e => {
      const card = e.target.closest('.unit-card');
      if (card) {
        this.open(+card.dataset.i);
        triggerHapticFeedback('light');
      }
    });

    
    // Audio events
    this.els.audio.addEventListener('timeupdate', () => {
      this.highlight();
      this.updateProg();
      // 保存播放进度（每 5 秒保存一次）
      if (Math.floor(this.els.audio.currentTime) % 5 === 0) {
        localStorage.setItem(LS.TIME(this.key, this.idx), this.els.audio.currentTime);
      }
      
      // 单句模式：静音检测
      if (this.mode === 'single' && this.useSilenceDetection && !this.els.audio.paused) {
        const volume = this.getCurrentVolume();
        const currentTime = this.els.audio.currentTime;
        
        // 检测是否开始静音
        if (volume < this.silenceThreshold) {
          if (!this.silenceStartTime) {
            this.silenceStartTime = currentTime;
          } else if (currentTime - this.silenceStartTime >= this.silenceDuration) {
            // 持续静音达到阈值，判定为句子结束
            if (!this.silenceDetected) {
              this.silenceDetected = true;
              
              // 暂停播放
              this.els.audio.pause();
              this.singleRepeatCount++;
              
              const needRepeat = this.repeatCount >= 99 || this.singleRepeatCount < this.repeatCount;
              if (needRepeat) {
                // 重复当前句（前移 preRoll 补偿解码精度）
                setTimeout(() => {
                  this.els.audio.currentTime = Math.max(0, this.lines[this.cur].time - this.preRoll);
                  this.els.audio.play();
                  this.silenceDetected = false;
                  this.silenceStartTime = null;
                }, 200);
              } else {
                // 重复完成，停止播放
                this.bound = null;
                // 更新课程进度
                if (userManager) {
                  userManager.updateProgress(this.key, this.idx, this.repeatCount);
                }
                // 同步到数据模块
                if (window.dataSync && this.book?.key) {
                  window.updateCourseProgress(this.book.key, this.units[this.idx].key, this.repeatCount);
                }
              }
            }
          }
        } else {
          // 有声音，重置检测
          this.silenceStartTime = null;
          this.silenceDetected = false;
        }
      }
      
      // 单句模式：后备边界检测（如果静音检测失败）
      if (this.mode === 'single' && this.bound !== null && !this.silenceDetected) {
        const currentTime = this.els.audio.currentTime;
        if (currentTime >= this.bound) {
          this.singleRepeatCount++;
          const needRepeat = this.repeatCount >= 99 || this.singleRepeatCount < this.repeatCount;
          
          if (needRepeat) {
            this.els.audio.currentTime = Math.max(0, this.lines[this.cur].time - this.preRoll);
            this.els.audio.play();
          } else {
            this.bound = null;
            this.els.audio.pause();
            // 更新课程进度
            if (userManager) {
              userManager.updateProgress(this.key, this.idx, this.repeatCount);
            }
            // 同步到数据模块
            if (window.dataSync && this.book?.key) {
              window.updateCourseProgress(this.book.key, this.units[this.idx].key, this.repeatCount);
            }
          }
        }
      }
    });
    
    // 音频播放结束事件（用于全文重复检测）
    this.els.audio.addEventListener('ended', () => {
      this.handleAllRepeatEnd();
    });
    this.els.audio.addEventListener('loadedmetadata', () => { this.els.dur.textContent = this.fmt(this.els.audio.duration); });
    // 音频播放开始事件
    this.els.audio.addEventListener('play', () => {
      this.playIcon(true);
      // 启用音频上下文（需要用户交互后才能启动）
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    });
    this.els.audio.addEventListener('pause', () => this.playIcon(false));
    this.els.audio.addEventListener('ended', () => { if (this.mode === 'loop') this.playNext(); });
    
    // Progress
    // 进度条拖拽交互
    let isDragging = false;
    
    const seekTo = (clientX) => {
      if (!this.els.audio.duration) return;
      const r = this.els.track.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      this.els.audio.currentTime = pos * this.els.audio.duration;
      this.els.fill.style.width = `${pos * 100}%`;
      if (this.els.handle) {
        this.els.handle.style.left = `${pos * 100}%`;
      }
    };
    
    const handleStart = (e) => {
      isDragging = true;
      this.els.track.style.cursor = 'grabbing';
      seekTo(e.type.includes('touch') ? e.touches[0].clientX : e.clientX);
    };
    
    const handleMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      seekTo(e.type.includes('touch') ? e.touches[0].clientX : e.clientX);
    };
    
    const handleEnd = () => {
      isDragging = false;
      this.els.track.style.cursor = '';
    };
    
    this.els.track.addEventListener('mousedown', handleStart);
    this.els.track.addEventListener('touchstart', handleStart, { passive: false });
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove, { passive: false });
    
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);
    
    // 点击事件（非拖拽时）
    this.els.track.addEventListener('click', e => {
      if (isDragging) return;
      if (!this.els.audio.duration) return;
      const r = this.els.track.getBoundingClientRect();
      this.els.audio.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * this.els.audio.duration;
    });
    
    // Mode
    this.els.mode.addEventListener('click', () => {
      // 切换模式：single（单句重复） -> all（全文重复） -> single
      this.mode = this.mode === 'single' ? 'all' : 'single';
      localStorage.setItem(LS.MODE, this.mode);
      this.modeLabel();
      this.updateRepeatCounts();
      
      // 重置重复计数
      this.singleRepeatCount = 0;
      this.allRepeatCount = 0;
    });
    
    // Speed
    this.els.spd.addEventListener('click', () => {
      const i = SPEEDS.indexOf(this.spd);
      this.spd = SPEEDS[(i + 1) % SPEEDS.length];
      this.els.audio.playbackRate = this.spd;
      localStorage.setItem(LS.SPD, this.spd);
      this.syncUI();
      triggerHapticFeedback('light');
    });
    
    // Translation display mode
    this.els.tr.addEventListener('click', () => {
      const idx = this.displayModes.indexOf(this.tr);
      this.tr = this.displayModes[(idx + 1) % this.displayModes.length];
      localStorage.setItem(LS.TR, this.tr);
      this.applyTr();
      triggerHapticFeedback('light');
    });
    
    // ESC
    document.addEventListener('keydown', e => { 
      if (e.key === 'Escape' && this.els.dlg.open) {
        // 结束学习计时
        if (userManager) {
          userManager.endStudySession();
          const targetRepeat = this.mode === 'single' 
            ? REPEAT_COUNTS[this.singleRepeatIdx] 
            : REPEAT_COUNTS[this.allRepeatIdx];
          userManager.updateProgress(this.key, this.idx, targetRepeat);
          // 同步到数据模块
          if (window.dataSync && this.book?.key) {
            window.updateCourseProgress(this.book.key, this.units[this.idx].key, targetRepeat);
          }
        }
        this.els.dlg.close(); 
      } 
    });
    
    // 键盘快捷键（仅桌面端）
    if (window.innerWidth > 768) {
      document.addEventListener('keydown', e => {
        // 播放器打开时才响应
        if (!this.els.dlg.open) return;
        
        if (e.code === 'Space') {
          e.preventDefault();
          this.els.audio.paused ? this.els.audio.play() : this.els.audio.pause();
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          if (this.idx > 0) this.open(this.idx - 1);
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          if (this.idx < this.units.length - 1) this.open(this.idx + 1);
        }
      });
    }
    
    // 定时关闭方法
    this.toggleTimer = function() {
      const options = [0, 15, 30, 60];
      const currentIdx = options.indexOf(this.timerMinutes);
      const nextIdx = (currentIdx + 1) % options.length;
      this.timerMinutes = options[nextIdx];
      
      this.updateTimerDisplay();
      
      if (this.timerMinutes === 0) {
        toast.info('定时关闭已取消');
      } else {
        toast.info(`${this.timerMinutes}分钟后自动关闭`);
      }
    };
    
    this.updateTimerDisplay = function() {
      if (!this.els.timerLabel) return;
      
      const label = this.timerMinutes === 0 ? '关闭' : `${this.timerMinutes}分`;
      
      this.els.timerLabel.textContent = label;
      if (this.timerMinutes === 0) {
        this.els.timer.classList.remove('active');
      } else {
        this.els.timer.classList.add('active');
      }
      
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // 初始化版本管理
  if (window.NETWORK_STATUS) {
    window.NETWORK_STATUS.init();
  }
  if (window.PWA_INSTALL) {
    window.PWA_INSTALL.init();
  }
  
  // 初始化用户管理
  userManager = new UserManager();
  
  // 初始化移动端手势
  initMobileGestures();
  
  // 初始化应用
  new App().init();
});

// 移动端手势支持
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let isEdgeSwipe = false; // 标记是否为屏幕边缘滑动

function initMobileGestures() {
  if (window.innerWidth <= 768) {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
  }
}

function handleTouchStart(e) {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
  
  // 检测是否为屏幕边缘滑动（系统侧滑返回区域）
  const screenWidth = window.innerWidth;
  isEdgeSwipe = touchStartX < 30 || touchStartX > screenWidth - 30;
}

function handleTouchEnd(e) {
  touchEndX = e.changedTouches[0].screenX;
  touchEndY = e.changedTouches[0].screenY;
  
  handleSwipe();
}

// ========== 方案 C: 折叠卡片交互 ==========

// 折叠/展开卡片
function toggleFoldCard(section) {
  const card = document.querySelector(`.fold-card[data-fold="${section}"]`);
  if (!card) return;
  
  const content = card.querySelector('.fold-content');
  const isExpanded = card.classList.contains('expanded');
  
  // 切换状态
  card.classList.toggle('expanded');
  content.classList.toggle('show');
  
  // 保存展开/折叠状态到 localStorage
  const foldState = JSON.parse(localStorage.getItem('nce_fold_state') || '{}');
  foldState[section] = !isExpanded;
  localStorage.setItem('nce_fold_state', JSON.stringify(foldState));
  
  // 展开时更新仪表盘
  if (!isExpanded) {
    setTimeout(() => {
      updateDashboard();
    }, 300);
  }
}

// 恢复折叠状态
function restoreFoldState() {
  const foldState = JSON.parse(localStorage.getItem('nce_fold_state') || '{}');
  
  Object.entries(foldState).forEach(([section, isExpanded]) => {
    if (isExpanded) {
      setTimeout(() => {
        toggleFoldCard(section);
      }, 100);
    }
  });
}

// 更新仪表盘数据
function updateDashboard() {
  const stats = loadLearningStats();
  
  // 累计学习时间
  document.getElementById('dashTotalTime').textContent = formatLearningTime(stats.totalTime);
  
  // 连续学习天数
  document.getElementById('dashStreak').textContent = stats.streak + '天';
  
  // 收藏句子数
  const favs = getFavorites();
  document.getElementById('dashFavorites').textContent = favs.length + '句';
  
  // 成就解锁数（简化：显示 0/6）
  document.getElementById('dashAchievements').textContent = '0/6';
}

function handleSwipe() {
  const diffX = touchEndX - touchStartX;
  const diffY = touchEndY - touchStartY;
  
  // 如果是屏幕边缘滑动，优先让系统处理（侧滑返回）
  if (isEdgeSwipe && Math.abs(diffX) > 30 && Math.abs(diffY) < 30) {
    // 不阻止默认行为，让系统处理侧滑返回
    return;
  }
  
  // 防误触：垂直滑动优先
  if (Math.abs(diffY) > Math.abs(diffX)) {
    // 垂直滑动，忽略水平手势
    return;
  }
  
  // 水平滑动（切换课程） - 在播放器打开时生效
  if (Math.abs(diffX) > 50 && Math.abs(diffY) < 30) {
    const appInstance = window.app;
    if (!appInstance || !appInstance.els?.dlg?.open) return;
    
    if (diffX > 0) {
      // 向右滑动 - 上一课
      if (appInstance.idx > 0) {
        appInstance.open(appInstance.idx - 1);
        toast.info('上一课');
        // 触觉反馈
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
      }
    } else {
      // 向左滑动 - 下一课
      if (appInstance.idx < appInstance.units.length - 1) {
        appInstance.open(appInstance.idx + 1);
        toast.info('下一课');
        // 触觉反馈
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
      }
    }
  }
}

// 导出折叠卡片函数到全局作用域
window.toggleFoldCard = toggleFoldCard;
window.restoreFoldState = restoreFoldState;
window.updateDashboard = updateDashboard;
window.triggerCompleteAnimation = triggerCompleteAnimation;
window.createConfetti = createConfetti;
window.animateStreakFire = animateStreakFire;

// 波纹效果 - 触摸设备增强反馈
function createRipple(event) {
  const button = event.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  const rect = button.getBoundingClientRect();
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.classList.add('ripple');

  const ripple = button.querySelector('.ripple');
  if (ripple) {
    ripple.remove();
  }

  button.appendChild(circle);
}

// 为所有按钮添加波纹效果
document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.ctrl-btn, .icon-btn, .empty-state-action');
  buttons.forEach(btn => {
    btn.addEventListener('click', createRipple);
  });
});

// 礼花特效 - 完成课程时触发
function createConfetti(x, y) {
  const colors = ['#fbbf24', '#34c759', '#007aff', '#ff3b30', '#af52de', '#ff9500'];
  const count = 30; // 礼花数量
  
  for (let i = 0; i < count; i++) {
    const confetti = document.createElement('div');
    confetti.classList.add('confetti');
    confetti.style.left = (x || Math.random() * window.innerWidth) + 'px';
    confetti.style.top = (y || -20) + 'px';
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = (Math.random() * 0.5) + 's';
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    
    document.body.appendChild(confetti);
    
    // 动画结束后移除
    setTimeout(() => {
      confetti.remove();
    }, 2000);
  }
}

// 完成课程动画
function triggerCompleteAnimation(cardElement) {
  if (!cardElement) return;
  
  // 添加完成光晕动画
  cardElement.classList.add('complete-animate');
  
  // 获取卡片位置
  const rect = cardElement.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  // 触发礼花特效
  setTimeout(() => {
    createConfetti(centerX, centerY);
    
    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate([50, 100, 50]);
    }
  }, 300);
  
  // 移除动画类
  setTimeout(() => {
    cardElement.classList.remove('complete-animate');
  }, 1000);
}

// 学习 streak 火焰效果
function animateStreakFire(element) {
  if (!element) return;
  
  element.classList.add('streak-fire');
  
  // 3 秒后移除动画
  setTimeout(() => {
    element.classList.remove('streak-fire');
  }, 3000);
}

// ========== 低端设备检测 ==========
function detectLowEndDevice() {
  // 检测设备内存和 CPU 核心数
  const isLowEnd = (
    // 设备内存 < 4GB
    (navigator.deviceMemory && navigator.deviceMemory < 4) ||
    // CPU 核心数 < 4
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) ||
    // 网络速度慢
    (navigator.connection && navigator.connection.saveData)
  );
  
  // 老旧 iOS 设备检测（iPhone 6/7/8 等）
  const isOldIOS = /iPhone OS (9|10|11|12|13)_/.test(navigator.userAgent);
  
  if (isLowEnd || isOldIOS) {
    document.documentElement.classList.add('low-end-device');
  }
}

// DOM 加载完成后检测设备
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', detectLowEndDevice);
  document.addEventListener('DOMContentLoaded', autoDarkMode);
} else {
  detectLowEndDevice();
  autoDarkMode();
}

// ========== 深色模式自动切换 (根据时间) ==========
function autoDarkMode() {
  // 如果用户已手动设置主题，不自动切换
  if (localStorage.getItem('theme')) {
    return;
  }
  
  const hour = new Date().getHours();
  // 晚上 8 点到早上 6 点自动开启深色模式
  const isNight = hour >= 20 || hour < 6;
  
  if (isNight) {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }
}

// ========== 深色模式手动切换 ==========
function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark-mode');
  
  // 保存用户偏好
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  
  // 触觉反馈
  if (navigator.vibrate) {
    navigator.vibrate(20);
  }
  
  console.log('[DarkMode]', isDark ? 'Enabled' : 'Disabled');
}

// 初始化深色模式开关
function initDarkModeToggle() {
  // 创建开关按钮
  const toggle = document.createElement('button');
  toggle.className = 'dark-mode-toggle';
  toggle.setAttribute('aria-label', '切换深色模式');
  toggle.setAttribute('title', '切换深色模式');
  toggle.innerHTML = `
    <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="5"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
    <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  `;
  
  toggle.addEventListener('click', toggleDarkMode);
  
  // 恢复到用户上次设置
  const userTheme = localStorage.getItem('theme');
  if (userTheme === 'dark') {
    document.documentElement.classList.add('dark-mode');
  } else if (userTheme === 'light') {
    document.documentElement.classList.remove('dark-mode');
  }
  
  // 添加到页面
  document.body.appendChild(toggle);
}

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    detectLowEndDevice();
      autoDarkMode();
    initDarkModeToggle();
  });
} else {
  detectLowEndDevice();
  autoDarkMode();
  initDarkModeToggle();
}

// ========== 移动端底部导航栏初始化 ==========
