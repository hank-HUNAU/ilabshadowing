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
    const url = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filename}.mp3`;
    console.log('[Audio URL]', { filename, key, bucket, url });
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
    const url = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filename}.lrc`;
    console.log('[LRC URL]', { filename, key, bucket, url });
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
    
    // 动态提前量配置：根据句子间隔自动调整
    this.leadTimeMap = {
      short: { gap: 0.5, lead: 0.15 },    // 间隔<500ms：提前 150ms
      medium: { gap: 1.0, lead: 0.25 },   // 间隔<1s：提前 250ms
      long: { gap: Infinity, lead: 0.40 } // 间隔>1s：提前 400ms
    };
    this.minPlayTime = 0.5;  // 最少播放时长
    this.cache = new Map();
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
      favoritePage: document.getElementById('favoritePage'),
      bookGrid: document.getElementById('bookGrid'),
      unitGrid: document.getElementById('unitGrid'),
      favoriteGrid: document.getElementById('favoriteGrid'),
      bookTitle: document.getElementById('bookTitle'),
      unitCount: document.getElementById('unitCount'),
      favoriteCount: document.getElementById('favoriteCount'),
      backToBooks: document.getElementById('backToBooks'),
      backToBooksFromFav: document.getElementById('backToBooksFromFav'),
      showFavorites: document.getElementById('showFavorites'),
      favCountBadge: document.getElementById('favCountBadge'),
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
  }
  
  updateFavBadge() {
    if (!this.els.favBadge) return;
    
    if (this.favorites.length > 0) {
      this.els.favBadge.style.display = 'flex';
      this.els.favBadge.textContent = this.favorites.length > 99 ? '99+' : this.favorites.length;
    } else {
      this.els.favBadge.style.display = 'none';
    }
  }

  openPractice(lineIdx) {
    if (lineIdx < 0 || lineIdx >= this.lines.length) return;
    
    const line = this.lines[lineIdx];
    const sentenceId = `${this.key}_${this.idx}_${lineIdx}`;
    
    // 打开练习页面
    const practiceUrl = `practice.html?sentence=${encodeURIComponent(sentenceId)}&en=${encodeURIComponent(line.en)}&zh=${encodeURIComponent(line.cn || '')}&audio=${encodeURIComponent(this.getLineAudioUrl(lineIdx))}`;
    
    // 在新标签页打开练习页面
    window.open(practiceUrl, '_blank');
    
    console.log('[Practice] Opening practice for sentence:', sentenceId);
  }
  
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
    }
    
    localStorage.setItem(LS.FAVORITES, JSON.stringify(this.favorites));
    this.updateFavBadge();
    
    // 如果在收藏页，刷新收藏列表
    if (this.els.favoritePage && this.els.favoritePage.style.display === 'flex') {
      this.renderFavorites();
    }
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
      if (this.els.favoritePage.style.display === 'flex') {
        this.renderFavorites();
      }
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
  
  renderFavorites() {
    if (this.favorites.length === 0) {
      this.els.favoriteGrid.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <h3 class="empty-state-title">暂无收藏</h3>
          <p class="empty-state-desc">播放课文时点击句子右侧的星星图标，收藏喜欢的句子</p>
          <button class="empty-state-action" onclick="document.getElementById('showFavorites').click()">去浏览课程</button>
        </div>
      `;
      this.els.favoriteCount.textContent = '0 句';
      return;
    }
    
    this.els.favoriteCount.textContent = `${this.favorites.length} 句`;
    this.els.favoriteGrid.innerHTML = this.favorites.map((f, i) => {
      const num = f.lessonTitle.match(/\d+/)?.[0] || i + 1;
      return `
      <div class="unit-card" data-fav-idx="${i}" style="min-height:60px;align-items:flex-start;text-align:left;">
        <div class="unit-num" style="font-size:1rem;margin-bottom:4px;">${num}</div>
        <div class="unit-title" style="font-size:0.75rem;white-space:normal;line-height:1.3;">${f.sentence.substring(0, 30)}${f.sentence.length > 30 ? '...' : ''}</div>
      </div>`;
    }).join('');
  }
  
  // 搜索过滤收藏
  filterFavorites(query) {
    if (!query || query.trim() === '') {
      // 清空搜索，显示全部
      this.renderFavorites();
      return;
    }
    
    const lowerQuery = query.toLowerCase().trim();
    const filtered = this.favorites.filter(f => 
      f.sentence.toLowerCase().includes(lowerQuery) ||
      f.translation.toLowerCase().includes(lowerQuery) ||
      f.bookTitle.toLowerCase().includes(lowerQuery) ||
      f.lessonTitle.toLowerCase().includes(lowerQuery)
    );
    
    if (filtered.length === 0) {
      this.els.favoriteGrid.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 21l-4.35-4.35M19 11a8 8 0 10-16 0 8 8 0 0016 0z"/>
          </svg>
          <h3 class="empty-state-title">未找到匹配的句子</h3>
          <p class="empty-state-desc">试试其他关键词</p>
        </div>
      `;
      this.els.favoriteCount.textContent = `${filtered.length} 句`;
      return;
    }
    
    this.els.favoriteCount.textContent = `${filtered.length} 句`;
    this.els.favoriteGrid.innerHTML = filtered.map((f, i) => {
      const num = f.lessonTitle.match(/\d+/)?.[0] || i + 1;
      return `
      <div class="unit-card" data-fav-idx="${this.favorites.indexOf(f)}" style="min-height:60px;align-items:flex-start;text-align:left;">
        <div class="unit-num" style="font-size:1rem;margin-bottom:4px;">${num}</div>
        <div class="unit-title" style="font-size:0.75rem;white-space:normal;line-height:1.3;">${f.sentence.substring(0, 30)}${f.sentence.length > 30 ? '...' : ''}</div>
      </div>`;
    }).join('');
  }

  async loadBooks() {
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
            <p class="empty-state-desc">您已隐藏所有课程，请在用户中心重新选择</p>
            <button class="empty-state-action" onclick="document.getElementById('userCenterBtn').click()">去选择课程</button>
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
        this.showBookPage();
      }
    } else {
      this.showBookPage();
    }
  }

  showBookPage() {
    this.els.bookPage.style.display = 'flex';
    this.els.unitPage.style.display = 'none';
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
    
    this.els.unitGrid.innerHTML = this.units.map((u, i) => {
      // NCE1: 从 lesson_num 提取纯数字（如 "Lesson 1" → "1"）
      // Think: 直接使用 lesson_num（如 "10-1"）
      let num;
      if (isThink) {
        num = u.lesson_num || u.filename;
      } else {
        const numMatch = u.lesson_num ? u.lesson_num.match(/(\d+)/) : null;
        num = numMatch ? numMatch[1] : u.filename;
      }
      
      // Think Level 系列显示标题，NCE1 不显示
      const showTitle = isThink;
      
      return `
      <div class="unit-card ${isThink ? 'think-unit' : ''}" data-i="${i}">
        <div class="unit-num">${num}</div>
        ${showTitle && u.title ? `<div class="unit-title">${u.title}</div>` : ''}
      </div>`;
    }).join('');
  }

  async preloadLrcFiles() {
    // 预加载所有 LRC 文件到缓存，点击播放时 0 延迟显示歌词
    const promises = this.units.map(u => {
      const url = getLrcUrl(u.filename, this.path, this.key);
      return fetch(url).then(r => r.text()).then(lrc => {
        this.cache.set(url, lrc);
      }).catch(() => {}); // 忽略失败
    });
    await Promise.all(promises);
    console.log('[Preload] LRC files cached:', this.units.length);
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
    console.log('[DEBUG open()]', { i, key: this.key, path: this.path, unit: u });
    
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
    
    // 先显示弹窗（不等待 LRC 加载）
    this.els.dlg.showModal();
    
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
    console.log('Loading audio:', audioSrc);
    audio.src = audioSrc;
    audio.load();
    
    audio.addEventListener('loadeddata', () => {
      console.log('Audio loaded, duration:', audio.duration);
      // 恢复上次播放进度
      this.restoreTime();
    }, { once: true });
    
    audio.addEventListener('error', (e) => {
      console.error('Audio load error:', e);
      console.error('Audio src:', audio.src);
      console.error('Audio error code:', audio.error?.code);
      console.error('Audio error message:', audio.error?.message);
      
      // 测试直接访问 URL
      fetch(audio.src, { method: 'HEAD' })
        .then(r => console.log('Direct fetch status:', r.status))
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
    this.els.area.innerHTML = this.lines.map((l, i) => {
      const favId = `${this.key}_${this.idx}_${i}`;
      const isFavorited = this.favorites.some(f => f.id === favId);
      return `
      <div class="line" data-i="${i}" data-t="${l.time}">
        <div class="line-content">
          <div class="line-en">${l.en}</div>
          ${l.cn ? `<div class="line-cn">${l.cn}</div>` : ''}
        </div>
        <div class="line-actions">
          <button class="line-practice" data-line-i="${i}" title="练习本句" aria-label="练习本句">📝</button>
          <button class="line-favorite ${isFavorited ? 'favorited' : ''}" data-line-i="${i}" title="${isFavorited ? '取消收藏' : '收藏本句'}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="${isFavorited ? '#fbbf24' : 'none'}" stroke="${isFavorited ? '#fbbf24' : 'currentColor'}" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>
        </div>
      </div>`;
    }).join('');
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
      console.log('Audio not ready, waiting...');
      this.els.audio.addEventListener('canplay', () => {
        console.log('Audio ready, playing line', i);
        this._doPlayLine(line, i);
      }, { once: true });
      return;
    }
    
    console.log('Audio ready, playing line', i);
    this._doPlayLine(line, i);
  }

  _doPlayLine(line, i) {
    // 重置静音检测状态
    this.silenceDetected = false;
    this.silenceStartTime = null;
    
    // 计算实际开始播放时间
    const startTime = Math.max(0, line.time);
    this.els.audio.currentTime = startTime;
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
  
  // playNext() - 已删除，全文模式下音频连续播放

  highlight() {
    if (!this.lines.length) return;
    const now = this.els.audio.currentTime;
    let ni = -1;
    for (let i = this.lines.length - 1; i >= 0; i--) { if (now >= this.lines[i].time) { ni = i; break; } }
    if (ni === this.cur) return;
    this.cur = ni;
    this.els.area.querySelectorAll('.line').forEach((el, x) => el.classList.toggle('active', x === ni));
    if (ni >= 0) {
      const el = this.els.area.querySelectorAll('.line')[ni];
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  updateProg() {
    if (!this.els.audio.duration) return;
    const p = (this.els.audio.currentTime / this.els.audio.duration) * 100;
    this.els.fill.style.width = `${p}%`;
    this.els.cur.textContent = this.fmt(this.els.audio.currentTime);
  }

  playIcon(isPlay) {
    this.els.play.querySelector('.ico-play').style.display = isPlay ? 'none' : 'block';
    this.els.play.querySelector('.ico-pause').style.display = isPlay ? 'block' : 'none';
  }

  syncUI() {
    this.els.spdL.textContent = `${this.spd}x`;
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
    this.els.trL.textContent = labels[this.tr] || '双语';
  }

  saveTime(t) { localStorage.setItem(LS.TIME(this.key, this.idx), t); }
  
  fmt(s) { if (!isFinite(s)) return '0:00'; return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`; }

  bind() {
    // 收藏工具栏事件（已删除，改用行内收藏按钮）
    // 收藏页面入口
    if (this.els.showFavorites) {
      this.els.showFavorites.addEventListener('click', () => {
        this.renderFavorites();
        this.els.bookPage.style.display = 'none';
        this.els.unitPage.style.display = 'none';
        this.els.favoritePage.style.display = 'flex';
      });
    }
    
    // 歌词区域点击事件（包含收藏按钮和练习按钮）
    this.els.area.addEventListener('click', e => {
      const practiceBtn = e.target.closest('.line-practice');
      
      // 如果点击的是练习按钮，打开练习界面
      if (practiceBtn) {
        e.preventDefault();
        e.stopPropagation();
        const lineIdx = +practiceBtn.dataset.lineI;
        this.openPractice(lineIdx);
        console.log('[Practice] Opened practice for line', lineIdx);
        return;
      }
      
      const favoriteBtn = e.target.closest('.line-favorite');
      
      // 如果点击的是收藏按钮，只切换收藏状态，不播放
      if (favoriteBtn) {
        e.preventDefault();
        e.stopPropagation();
        const lineIdx = +favoriteBtn.dataset.lineI;
        this.toggleLineFavorite(lineIdx);
        console.log('[Favorite Click] Toggled line', lineIdx, '- no audio play');
        return;
      }
      
      // 否则播放该句
      const line = e.target.closest('.line');
      if (line) {
        this.playLine(+line.dataset.i);
      }
    });
    if (this.els.repeat) {
      this.els.repeat.addEventListener('click', () => {
        const currentIdx = REPEAT_COUNTS.indexOf(this.repeatCount);
        const nextIdx = (currentIdx + 1) % REPEAT_COUNTS.length;
        this.repeatCount = REPEAT_COUNTS[nextIdx];
        localStorage.setItem(LS.REPEAT, this.repeatCount);
        this.updateRepeatCounts();
      });
    }
    
    // 从收藏页返回
    if (this.els.backToBooksFromFav) {
      this.els.backToBooksFromFav.addEventListener('click', () => {
        this.els.bookPage.style.display = 'flex';
        this.els.favoritePage.style.display = 'none';
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
      this.showBookPage();
    });
    
    // 课程网格点击 - 打开播放器
    this.els.unitGrid.addEventListener('click', e => {
      const card = e.target.closest('.unit-card');
      if (card) this.open(+card.dataset.i);
    });
    
    // 收藏网格点击 - 打开对应句子
    this.els.favoriteGrid.addEventListener('click', e => {
      const card = e.target.closest('.unit-card');
      if (card) {
        const favIdx = +card.dataset.favIdx;
        const fav = this.favorites[favIdx];
        if (fav) {
          // 切换到对应课本和课程
          if (this.key !== fav.key) {
            this.openBook(fav.key, fav.unitIdx, fav.lineIdx);
          } else {
            this.els.bookPage.style.display = 'none';
            this.els.unitPage.style.display = 'flex';
            // 打开课程并跳转到指定句子
            setTimeout(() => {
              this.open(fav.unitIdx);
              // 播放指定句子
              setTimeout(() => this.playLine(fav.lineIdx), 300);
            }, 100);
          }
        }
      }
    });
    
    // Close
    this.els.close.addEventListener('click', () => { 
      // 结束学习计时
      if (userManager) {
        userManager.endStudySession();
        // 更新课程进度
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
      this.els.audio.pause(); 
    });
    
    // Nav
    this.els.prev.addEventListener('click', () => {
      if (this.idx > 0) {
        this.open(this.idx - 1);
        // 切换课程后收藏按钮会自动更新
      }
    });
    this.els.next.addEventListener('click', () => {
      if (this.idx < this.units.length - 1) {
        this.open(this.idx + 1);
        // 切换课程后收藏按钮会自动更新
      }
    });
    
    // Expand/Maximize Toggle
    if (this.els.expand) {
      this.els.expand.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const inner = this.els.dlg.querySelector('.dialog-inner');
        if (inner) {
          inner.classList.toggle('expanded');
          
          // Toggle icons
          const isExpanded = inner.classList.contains('expanded');
          const icoExp = this.els.expand.querySelector('.ico-expand');
          const icoShr = this.els.expand.querySelector('.ico-shrink');
          
          if (icoExp) icoExp.style.display = isExpanded ? 'none' : 'block';
          if (icoShr) icoShr.style.display = isExpanded ? 'block' : 'none';
          this.els.expand.setAttribute('aria-label', isExpanded ? '退出全屏' : '全屏模式');
        }
      });
    }
    
    // Play
    this.els.play.addEventListener('click', () => this.els.audio.paused ? this.els.audio.play() : this.els.audio.pause());
    
    // 定时关闭
    if (this.els.timer) {
      this.els.timer.addEventListener('click', () => {
        this.toggleTimer();
      });
    }
    
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
              console.log('[Silence] Detected at', currentTime.toFixed(3), 's, volume:', volume.toFixed(3));
              
              // 暂停播放
              this.els.audio.pause();
              this.singleRepeatCount++;
              
              const needRepeat = this.repeatCount >= 99 || this.singleRepeatCount < this.repeatCount;
              if (needRepeat) {
                // 重复当前句
                setTimeout(() => {
                  this.els.audio.currentTime = this.lines[this.cur].time;
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
            this.els.audio.currentTime = this.lines[this.cur].time;
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
    this.els.track.addEventListener('click', e => {
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
    });
    
    // Translation display mode
    this.els.tr.addEventListener('click', () => {
      const idx = this.displayModes.indexOf(this.tr);
      this.tr = this.displayModes[(idx + 1) % this.displayModes.length];
      localStorage.setItem(LS.TR, this.tr);
      this.applyTr();
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
      
      if (this.timerMinutes === 0) {
        this.els.timerLabel.textContent = '关闭';
        this.els.timer.classList.remove('active');
      } else {
        this.els.timerLabel.textContent = `${this.timerMinutes}分`;
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

function initMobileGestures() {
  if (window.innerWidth <= 768) {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
  }
}

function handleTouchStart(e) {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
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
  
  // 水平滑动（切换课程）
  if (Math.abs(diffX) > 50 && Math.abs(diffY) < 30) {
    const appInstance = window.app;
    if (!appInstance || !appInstance.els?.dlg?.open) return;
    
    if (diffX > 0) {
      // 向右滑动 - 上一课
      if (appInstance.idx > 0) {
        appInstance.open(appInstance.idx - 1);
        toast.info('上一课');
      }
    } else {
      // 向左滑动 - 下一课
      if (appInstance.idx < appInstance.units.length - 1) {
        appInstance.open(appInstance.idx + 1);
        toast.info('下一课');
      }
    }
  }
}

// 导出折叠卡片函数到全局作用域
window.toggleFoldCard = toggleFoldCard;
window.restoreFoldState = restoreFoldState;
window.updateDashboard = updateDashboard;
