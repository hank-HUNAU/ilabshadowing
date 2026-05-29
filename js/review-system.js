/**
 * 复习系统 - 基于艾宾赛斯遗忘曲线（课程维度）
 * 复习间隔：1 天 → 2 天 → 4 天 → 7 天 → 15 天 → 30 天 → 60 天
 */

class ReviewSystem {
  constructor() {
    // 艾宾赛斯遗忘曲线复习间隔（天）
    this.intervals = [1, 2, 4, 7, 15, 30, 60];
    
    // 数据缓存
    this.reviewData = null;  // nce_unit_review - 课程复习数据
    this.unitData = null;    // 课程数据缓存
    
    // 学习统计缓存
    this.statsCache = null;
    this.statsCacheTime = null;
  }
  
  // 初始化
  async init() {
    await this.loadReviewData();
    await this.loadUnitData();
  }
  
  // 加载复习数据
  async loadReviewData() {
    this.reviewData = JSON.parse(
      localStorage.getItem('nce_unit_review') || '{}'
    );
  }
  
  // 加载课程数据
  async loadUnitData() {
    try {
      const response = await fetch('data.json');
      const data = await response.json();
      this.unitData = data.units || {};
    } catch (error) {
      console.error('加载课程数据失败:', error);
      this.unitData = {};
    }
  }
  
  // 保存复习数据
  saveReviewData() {
    localStorage.setItem('nce_unit_review', JSON.stringify(this.reviewData));
    this.invalidateStatsCache();
  }
  
  // 失效统计缓存
  invalidateStatsCache() {
    this.statsCache = null;
    this.statsCacheTime = null;
  }
  
  // 计算下次复习日期
  calculateNextReviewDate(stage, studyDate) {
    if (stage >= this.intervals.length) {
      // 已完成所有复习阶段
      const finalDate = new Date(studyDate);
      finalDate.setDate(finalDate.getDate() + 60);
      return finalDate.toISOString();
    }
    
    const daysToAdd = this.intervals[stage];
    const nextDate = new Date(studyDate);
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    nextDate.setHours(8, 0, 0, 0); // 设置复习时间为早上 8 点
    
    return nextDate.toISOString();
  }
  
  // 记录课程学习
  recordUnitStudy(bookKey, unitKey, unitTitle, accuracy = 0) {
    const key = `${bookKey}_${unitKey}`;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!this.reviewData[key]) {
      // 首次学习
      this.reviewData[key] = {
        bookKey,
        unitKey,
        unitTitle,
        studyDate: today.toISOString(),
        reviewStage: 0,
        nextReviewDate: this.calculateNextReviewDate(0, today),
        accuracyHistory: [accuracy],
        completionRate: 100,
        status: 'studying'
      };
    } else {
      // 更新课程数据
      const unit = this.reviewData[key];
      unit.accuracyHistory.push(accuracy);
      unit.completionRate = 100;
      
      // 完成一次复习，进入下一阶段
      if (unit.reviewStage < this.intervals.length) {
        unit.reviewStage++;
        unit.nextReviewDate = this.calculateNextReviewDate(unit.reviewStage, new Date(unit.studyDate));
      }
      
      // 检查是否已掌握
      if (unit.reviewStage >= this.intervals.length) {
        unit.status = 'mastered';
      }
    }
    
    this.saveReviewData();
    console.log('[Review System] Recorded unit study:', key);
  }
  
  // 记录练习结果（课程维度）
  recordPractice(unitKey, type, isCorrect) {
    // 找到对应的课程复习记录
    const record = Object.values(this.reviewData).find(r => 
      r.unitKey === unitKey || unitKey.startsWith(r.unitKey)
    );
    
    if (!record) return;
    
    // 如果没有 accuracyHistory，初始化
    if (!record.accuracyHistory) {
      record.accuracyHistory = [];
    }
    
    // 计算当前正确率
    const total = record.accuracyHistory.length + 1;
    const correct = record.accuracyHistory.filter(x => x).length + (isCorrect ? 1 : 0);
    record.accuracyHistory.push(isCorrect ? 1 : 0);
    
    this.saveReviewData();
  }
  
  // 获取今日复习课程
  getTodayReviewUnits() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const overdue = [];
    const due = [];
    
    Object.values(this.reviewData).forEach(unit => {
      const nextReview = new Date(unit.nextReviewDate);
      nextReview.setHours(0, 0, 0, 0);
      const nextReviewStr = nextReview.toISOString().split('T')[0];
      
      if (nextReviewStr < todayStr && unit.status !== 'mastered') {
        overdue.push(unit);
      } else if (nextReviewStr === todayStr && unit.status !== 'mastered') {
        due.push(unit);
      }
    });
    
    return { overdue, due, all: [...overdue, ...due] };
  }
  
  // 获取今日统计（兼容旧 API）
  getTodayStats() {
    const todayReview = this.getTodayReviewUnits();
    const mastered = Object.values(this.reviewData).filter(u => u.status === 'mastered').length;
    const total = Object.keys(this.reviewData).length;
    const completed = mastered;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      overdue: todayReview.overdue.length,
      due: todayReview.due.length,
      total: todayReview.all.length,
      completed,
      progress
    };
  }
  
  // 获取练习统计（兼容旧 API）
  getPracticeStats() {
    const stats = {
      listening: { accuracy: 0, remaining: 0 },
      fillBlank: { accuracy: 0, remaining: 0 },
      ordering: { accuracy: 0, remaining: 0 },
      translation: { accuracy: 0, remaining: 0 },
      speaking: { accuracy: 0, remaining: 0 }
    };
    
    // 简化：返回所有题型的默认值
    // 实际项目中可以基于课程维度的练习记录计算
    const todayReview = this.getTodayReviewUnits();
    const remaining = todayReview.all.length;
    
    Object.keys(stats).forEach(type => {
      stats[type].remaining = Math.ceil(remaining / 5); // 平均分配
      stats[type].accuracy = 80; // 默认 80% 正确率
    });
    
    return stats;
  }
  
  // 获取学习计划
  getReviewPlan() {
    const todayReview = this.getTodayReviewUnits();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const tomorrowUnits = [];
    Object.values(this.reviewData).forEach(unit => {
      const nextReview = new Date(unit.nextReviewDate);
      nextReview.setHours(0, 0, 0, 0);
      if (nextReview.toISOString().split('T')[0] === tomorrowStr && unit.status !== 'mastered') {
        tomorrowUnits.push(unit);
      }
    });
    
    // 构建待复习列表
    const units = [...todayReview.overdue, ...todayReview.due].map(unit => ({
      key: `${unit.bookKey}_${unit.unitKey}`,
      title: unit.unitTitle,
      stage: unit.reviewStage,
      nextReview: unit.nextReviewDate.split('T')[0],
      status: unit.status
    }));
    
    return {
      todayCount: todayReview.all.length,
      tomorrowCount: tomorrowUnits.length,
      units
    };
  }
  
  // 获取学习统计
  getLearningStats() {
    // 检查缓存（5 分钟内有效）
    const now = Date.now();
    if (this.statsCache && this.statsCacheTime && (now - this.statsCacheTime) < 300000) {
      return this.statsCache;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 本周起始（本周一）
    const monday = new Date(today);
    monday.setDate(monday.getDate() - (monday.getDay() || 7) + 1);
    monday.setHours(0, 0, 0, 0);
    
    // 统计已掌握课程数
    const mastered = Object.values(this.reviewData).filter(u => u.status === 'mastered').length;
    const total = Object.keys(this.reviewData).length;
    
    // 统计本周学习时间（简化：基于练习次数估算）
    const weeklyPracticeCount = Object.values(this.reviewData).reduce((acc, unit) => {
      if (new Date(unit.studyDate) >= monday) {
        return acc + (unit.accuracyHistory?.length || 0);
      }
      return acc;
    }, 0);
    const weeklyMinutes = Math.round(weeklyPracticeCount * 2); // 每次练习约 2 分钟
    
    // 统计连续学习天数
    let streak = 0;
    const studyDates = Object.values(this.reviewData).map(u => 
      new Date(u.studyDate).toISOString().split('T')[0]
    ).sort().reverse();
    
    const uniqueDates = [...new Set(studyDates)];
    let checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - 1);
    
    for (const dateStr of uniqueDates) {
      const expectedDate = checkDate.toISOString().split('T')[0];
      if (dateStr === expectedDate) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dateStr < expectedDate) {
        break;
      }
    }
    
    // 平均正确率
    const allAccuracies = Object.values(this.reviewData).flatMap(u => u.accuracyHistory || []);
    const avgAccuracy = allAccuracies.length > 0 
      ? Math.round((allAccuracies.filter(x => x).length / allAccuracies.length) * 100) 
      : 0;
    
    // 学习日历（最近 30 天）
    const studyCalendar = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // 统计当天学习的课程数
      const count = Object.values(this.reviewData).filter(u => 
        u.studyDate.startsWith(dateStr)
      ).length;
      
      studyCalendar[dateStr] = count * 15; // 每课约 15 分钟
    }
    
    // 课程进度
    const courses = [];
    if (this.unitData) {
      Object.entries(this.unitData).forEach(([bookKey, units]) => {
        if (Array.isArray(units)) {
          units.forEach(unit => {
            const key = `${bookKey}_${unit.key}`;
            const reviewRecord = this.reviewData[key];
            const progress = reviewRecord 
              ? Math.min(100, Math.round((reviewRecord.accuracyHistory?.length || 0) * 10))
              : 0;
            
            courses.push({
              key,
              name: unit.title,
              progress
            });
          });
        }
      });
    }
    
    this.statsCache = {
      weeklyMinutes,
      streak,
      mastered,
      total,
      avgAccuracy,
      studyCalendar,
      courses
    };
    this.statsCacheTime = now;
    
    return this.statsCache;
  }
  
  // 添加到复习队列
  addToReview(bookKey, unitKey, unitTitle) {
    const key = `${bookKey}_${unitKey}`;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!this.reviewData[key]) {
      this.reviewData[key] = {
        bookKey,
        unitKey,
        unitTitle,
        studyDate: today.toISOString(),
        reviewStage: 0,
        nextReviewDate: this.calculateNextReviewDate(0, today),
        accuracyHistory: [],
        completionRate: 0,
        status: 'studying'
      };
      this.saveReviewData();
      toast.success('已加入预习计划');
    }
  }
}

// 全局实例
let reviewSystem = null;

// 初始化
(async function() {
  reviewSystem = new ReviewSystem();
  await reviewSystem.init();
  window.reviewSystem = reviewSystem;
  console.log('[Review System] Initialized (Unit-based)');
})();

// 导出类
window.ReviewSystem = ReviewSystem;
