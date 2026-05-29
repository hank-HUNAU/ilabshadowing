/**
 * 数据同步模块 - 确保主应用与学习中心数据一致
 * 
 * 同步内容：
 * 1. 课程进度 (nce_progress)
 * 2. 学习统计 (nce_learning_stats)
 * 3. 课程复习数据 (nce_unit_review)
 * 4. 收藏数据 (nce_favorites)
 */

class DataSync {
  constructor() {
    this.storageKeys = [
      'nce_progress',
      'nce_learning_stats',
      'nce_unit_review',
      'nce_favorites',
      'nce_user_profile'
    ];
    
    // 监听存储变化
    this.bindStorageListener();
    
    console.log('[DataSync] Initialized');
  }
  
  /**
   * 获取课程进度
   * @returns {Object} 进度数据
   */
  getProgress() {
    const data = localStorage.getItem('nce_progress');
    if (!data) {
      // 如果没有进度数据，从复习数据推断
      const reviewData = JSON.parse(localStorage.getItem('nce_unit_review') || '{}');
      const progress = {};
      
      Object.values(reviewData).forEach(unit => {
        const key = `${unit.bookKey}_${unit.unitKey}`;
        progress[key] = {
          completed: unit.status === 'mastered',
          reviewStage: unit.reviewStage,
          accuracy: unit.accuracyHistory?.length > 0 
            ? Math.round((unit.accuracyHistory.filter(x => x).length / unit.accuracyHistory.length) * 100)
            : 0,
          lastStudyDate: unit.studyDate
        };
      });
      
      // 保存推断的进度
      localStorage.setItem('nce_progress', JSON.stringify(progress));
      return progress;
    }
    
    return JSON.parse(data);
  }
  
  /**
   * 更新课程进度
   * @param {string} bookKey - 课本 Key
   * @param {string} unitKey - 课程 Key
   * @param {number} repeatCount - 重复次数
   */
  updateProgress(bookKey, unitKey, repeatCount) {
    const progress = this.getProgress();
    const key = `${bookKey}_${unitKey}`;
    const now = new Date().toISOString();
    
    if (!progress[key]) {
      progress[key] = {
        completed: false,
        reviewStage: 0,
        accuracy: 0,
        lastStudyDate: now,
        studyCount: 0,
        totalRepeats: 0
      };
    }
    
    // 更新学习记录
    progress[key].lastStudyDate = now;
    progress[key].studyCount = (progress[key].studyCount || 0) + 1;
    progress[key].totalRepeats = (progress[key].totalRepeats || 0) + repeatCount;
    
    // 判断是否完成（至少学习 3 次且重复 10 次以上）
    if (progress[key].studyCount >= 3 && progress[key].totalRepeats >= 10) {
      progress[key].completed = true;
    }
    
    localStorage.setItem('nce_progress', JSON.stringify(progress));
    
    // 同步更新学习统计
    this.updateLearningStats(bookKey, unitKey);
    
    console.log('[DataSync] Progress updated:', key);
  }
  
  /**
   * 获取学习统计
   * @returns {Object} 统计数据
   */
  getLearningStats() {
    const data = localStorage.getItem('nce_learning_stats');
    if (!data) {
      // 从其他数据推断统计
      return this.calculateStatsFromData();
    }
    
    return JSON.parse(data);
  }
  
  /**
   * 从现有数据计算统计
   * @returns {Object} 统计数据
   */
  calculateStatsFromData() {
    const progress = this.getProgress();
    const reviewData = JSON.parse(localStorage.getItem('nce_unit_review') || '{}');
    const favorites = JSON.parse(localStorage.getItem('nce_favorites') || '[]');
    
    // 计算连续学习天数
    const studyDates = Object.values(progress)
      .map(p => p.lastStudyDate?.split('T')[0])
      .filter(d => d)
      .sort()
      .reverse();
    
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = new Date();
    
    for (const dateStr of studyDates) {
      const expectedDate = checkDate.toISOString().split('T')[0];
      if (dateStr === expectedDate || (streak === 0 && dateStr === today)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dateStr < expectedDate) {
        break;
      }
    }
    
    // 计算已掌握课程数
    const mastered = Object.values(progress).filter(p => p.completed).length;
    const total = Object.keys(progress).length;
    
    // 计算总学习时长（基于学习次数估算，每次约 15 分钟）
    const totalStudyCount = Object.values(progress).reduce((sum, p) => sum + (p.studyCount || 0), 0);
    const totalTime = totalStudyCount * 15;
    
    // 计算本周学习时长
    const monday = this.getMonday();
    const weeklyStudyCount = Object.values(progress).reduce((sum, p) => {
      if (p.lastStudyDate && new Date(p.lastStudyDate) >= monday) {
        return sum + (p.studyCount || 0);
      }
      return sum;
    }, 0);
    const weeklyMinutes = weeklyStudyCount * 15;
    
    // 计算平均正确率
    const allAccuracies = Object.values(reviewData).flatMap(r => r.accuracyHistory || []);
    const avgAccuracy = allAccuracies.length > 0
      ? Math.round((allAccuracies.filter(x => x).length / allAccuracies.length) * 100)
      : 0;
    
    const stats = {
      totalTime,
      weeklyMinutes,
      streak,
      mastered,
      total,
      favCount: favorites.length,
      avgAccuracy
    };
    
    // 缓存统计结果
    localStorage.setItem('nce_learning_stats', JSON.stringify(stats));
    
    return stats;
  }
  
  /**
   * 更新学习统计
   * @param {string} bookKey - 课本 Key
   * @param {string} unitKey - 课程 Key
   */
  updateLearningStats(bookKey, unitKey) {
    // 重新计算统计
    const stats = this.calculateStatsFromData();
    localStorage.setItem('nce_learning_stats', JSON.stringify(stats));
    
    console.log('[DataSync] Learning stats updated');
  }
  
  /**
   * 记录练习结果（同步到复习系统）
   * @param {string} unitKey - 课程 Key
   * @param {string} bookKey - 课本 Key
   * @param {string} unitTitle - 课程标题
   * @param {boolean} isCorrect - 是否正确
   * @param {string} questionType - 题型
   */
  recordPractice(unitKey, bookKey, unitTitle, isCorrect, questionType) {
    const reviewData = JSON.parse(localStorage.getItem('nce_unit_review') || '{}');
    const key = `${bookKey}_${unitKey}`;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!reviewData[key]) {
      // 创建新的复习记录
      reviewData[key] = {
        bookKey,
        unitKey,
        unitTitle,
        studyDate: today.toISOString(),
        reviewStage: 0,
        nextReviewDate: this.calculateNextReviewDate(0, today),
        accuracyHistory: [],
        questionTypeStats: {
          listening: { correct: 0, total: 0 },
          speaking: { correct: 0, total: 0 },
          fillBlank: { correct: 0, total: 0 },
          ordering: { correct: 0, total: 0 },
          translation: { correct: 0, total: 0 }
        },
        completionRate: 0,
        status: 'studying'
      };
    }
    
    // 更新练习记录
    const record = reviewData[key];
    
    // 如果没有 accuracyHistory，初始化
    if (!record.accuracyHistory) {
      record.accuracyHistory = [];
    }
    
    record.accuracyHistory.push(isCorrect ? 1 : 0);
    
    // 更新题型统计
    if (questionType && record.questionTypeStats[questionType]) {
      record.questionTypeStats[questionType].total++;
      if (isCorrect) {
        record.questionTypeStats[questionType].correct++;
      }
    }
    
    // 更新状态
    if (record.accuracyHistory.length >= 10 && 
        record.accuracyHistory.filter(x => x).length / record.accuracyHistory.length >= 0.9) {
      record.status = 'mastered';
    }
    
    localStorage.setItem('nce_unit_review', JSON.stringify(reviewData));
    
    // 同步更新学习统计
    this.updateLearningStats(bookKey, unitKey);
    
    console.log('[DataSync] Practice recorded:', key, questionType, isCorrect);
  }
  
  /**
   * 获取周一的日期
   * @returns {Date} 周一日期
   */
  getMonday() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  
  /**
   * 计算下次复习日期
   * @param {number} stage - 当前阶段
   * @param {Date} studyDate - 学习日期
   * @returns {string} 下次复习日期 ISO 字符串
   */
  calculateNextReviewDate(stage, studyDate) {
    const intervals = [1, 2, 4, 7, 15, 30, 60]; // 艾宾浩斯间隔
    
    if (stage >= intervals.length) {
      const finalDate = new Date(studyDate);
      finalDate.setDate(finalDate.getDate() + 60);
      return finalDate.toISOString();
    }
    
    const daysToAdd = intervals[stage];
    const nextDate = new Date(studyDate);
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    nextDate.setHours(8, 0, 0, 0);
    
    return nextDate.toISOString();
  }
  
  /**
   * 监听存储变化（跨标签页同步）
   */
  bindStorageListener() {
    window.addEventListener('storage', (e) => {
      if (this.storageKeys.includes(e.key)) {
        console.log('[DataSync] Storage changed:', e.key);
        
        // 触发跨页面同步事件
        const event = new CustomEvent('dataSync', {
          detail: {
            key: e.key,
            newValue: e.newValue
          }
        });
        window.dispatchEvent(event);
      }
    });
  }
  
  /**
   * 强制同步所有数据
   */
  syncAll() {
    console.log('[DataSync] Forcing sync...');
    
    // 重新计算统计
    this.calculateStatsFromData();
    
    // 触发同步事件
    const event = new CustomEvent('dataSync', {
      detail: { key: 'syncAll', sync: true }
    });
    window.dispatchEvent(event);
  }
  
  /**
   * 导出数据
   * @returns {Object} 所有数据
   */
  exportData() {
    const data = {};
    this.storageKeys.forEach(key => {
      data[key] = localStorage.getItem(key);
    });
    return data;
  }
}

// 全局实例
let dataSync = null;

// 初始化
(async function() {
  dataSync = new DataSync();
  window.dataSync = dataSync;
  console.log('[DataSync] Module loaded');
})();

// 辅助函数：在应用主页面调用
window.updateCourseProgress = function(bookKey, unitKey, repeatCount) {
  if (window.dataSync) {
    window.dataSync.updateProgress(bookKey, unitKey, repeatCount);
  }
};

// 辅助函数：在学习中心页面调用
window.recordPracticeResult = function(unitKey, bookKey, unitTitle, isCorrect, questionType) {
  if (window.dataSync) {
    window.dataSync.recordPractice(unitKey, bookKey, unitTitle, isCorrect, questionType);
  }
};

// 导出类
window.DataSync = DataSync;
