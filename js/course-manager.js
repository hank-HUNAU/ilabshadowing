/**
 * 课程管理器模块
 * 提供课程数据管理、进度查询、最近学习等功能
 */

window.CourseManager = {
  // 课程缓存数据
  _coursesData: null,
  
  /**
   * 初始化课程管理器
   */
  async init() {
    if (this._coursesData) {
      return this._coursesData;
    }
    
    try {
      const response = await fetch('data.json');
      this._coursesData = await response.json();
      return this._coursesData;
    } catch (error) {
      console.error('[CourseManager] Failed to load courses:', error);
      return { books: [], units: {} };
    }
  },
  
  /**
   * 获取所有教材
   */
  getAllBooks() {
    return this._coursesData?.books || [];
  },
  
  /**
   * 根据教材 key 获取所有单元
   */
  getUnitsByBook(bookKey) {
    return this._coursesData?.units?.[bookKey] || [];
  },
  
  /**
   * 获取单元进度
   * @param {string} bookKey - 教材 key
   * @param {string} unitKey - 单元 key
   * @returns {Object} 进度数据 { progress, learnedCount, weakCount, totalSentences }
   */
  getUnitProgress(bookKey, unitKey) {
    const reviewData = JSON.parse(localStorage.getItem('nce_unit_review') || '{}');
    const key = `${bookKey}_${unitKey}`;
    const record = reviewData[key];
    
    if (!record) {
      const units = this.getUnitsByBook(bookKey);
      const unit = units.find(u => u.key === unitKey);
      return {
        progress: 0,
        learnedCount: 0,
        weakCount: 0,
        totalSentences: unit?.lines?.length || 0
      };
    }
    
    // 计算进度
    const totalSentences = unit?.lines?.length || record.accuracyHistory?.length || 0;
    const learnedCount = record.accuracyHistory?.length || 0;
    const progress = totalSentences > 0 ? Math.round((learnedCount / totalSentences) * 100) : 0;
    
    // 计算待强化数量（正确率<80% 的题型）
    let weakCount = 0;
    if (record.questionTypeStats) {
      Object.values(record.questionTypeStats).forEach(stat => {
        if (stat.total > 0 && (stat.correct / stat.total) < 0.8) {
          weakCount++;
        }
      });
    }
    
    return {
      progress,
      learnedCount,
      weakCount,
      totalSentences
    };
  },
  
  /**
   * 获取最近学习的课程
   * @returns {Object|null} 最近学习的课程信息
   */
  getLastLearnedCourse() {
    const reviewData = JSON.parse(localStorage.getItem('nce_unit_review') || '{}');
    const keys = Object.keys(reviewData);
    
    if (keys.length === 0) {
      return null;
    }
    
    // 找到最近学习的单元（根据 studyDate 或最后学习的）
    let lastKey = keys[0];
    let lastDate = new Date(reviewData[keys[0]]?.studyDate || 0);
    
    keys.forEach(key => {
      const record = reviewData[key];
      if (record.studyDate) {
        const studyDate = new Date(record.studyDate);
        if (studyDate > lastDate) {
          lastDate = studyDate;
          lastKey = key;
        }
      }
    });
    
    // 解析 key (格式：BOOK_UNIT)
    const [bookKey, unitKey] = lastKey.split('_');
    
    // 获取课程标题
    const units = this.getUnitsByBook(bookKey);
    const unit = units.find(u => u.key === unitKey);
    const title = unit?.title || lastKey;
    
    // 获取进度
    const progressData = this.getUnitProgress(bookKey, unitKey);
    
    return {
      bookKey,
      unitKey,
      title,
      ...progressData
    };
  },
  
  /**
   * 获取所有课程进度统计
   * @returns {Object} 统计数据
   */
  getAllCoursesProgress() {
    const books = this.getAllBooks();
    const reviewData = JSON.parse(localStorage.getItem('nce_unit_review') || '{}');
    
    let totalUnits = 0;
    let completedUnits = 0;
    let totalProgress = 0;
    
    books.forEach(book => {
      const units = this.getUnitsByBook(book.key);
      totalUnits += units.length;
      
      units.forEach(unit => {
        const progressData = this.getUnitProgress(book.key, unit.key);
        totalProgress += progressData.progress;
        
        if (progressData.progress === 100) {
          completedUnits++;
        }
      });
    });
    
    return {
      totalUnits,
      completedUnits,
      averageProgress: totalUnits > 0 ? Math.round(totalProgress / totalUnits) : 0,
      inProgressUnits: totalUnits - completedUnits
    };
  },
  
  /**
   * 根据 bookKey 和 unitKey 获取课程详情
   */
  getCourseDetail(bookKey, unitKey) {
    const units = this.getUnitsByBook(bookKey);
    return units.find(u => u.key === unitKey) || null;
  },
  
  /**
   * 搜索课程
   * @param {string} keyword - 搜索关键词
   * @returns {Array} 匹配的课程列表
   */
  searchCourses(keyword) {
    if (!keyword) return [];
    
    const results = [];
    const books = this.getAllBooks();
    const lowerKeyword = keyword.toLowerCase();
    
    books.forEach(book => {
      const units = this.getUnitsByBook(book.key);
      
      units.forEach(unit => {
        if (
          unit.title.toLowerCase().includes(lowerKeyword) ||
          book.title.toLowerCase().includes(lowerKeyword) ||
          unit.key.toLowerCase().includes(lowerKeyword)
        ) {
          results.push({
            bookKey: book.key,
            bookTitle: book.title,
            unitKey: unit.key,
            unitTitle: unit.title
          });
        }
      });
    });
    
    return results;
  }
};

// 自动初始化
window.CourseManager.init();
