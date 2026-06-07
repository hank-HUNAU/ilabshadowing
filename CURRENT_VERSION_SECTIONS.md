# 当前版本板块与设计方案

## 版本信息
- **版本号**：v20260606-1
- **发布日期**：2026年6月6日
- **项目状态**：✅ 100%完成
- **代码行数**：8419行新增代码

## 整体架构

```
词汇学习系统 (7个主要板块)
├── 学习概览 (tab-overview)
├── 词汇预习 (tab-vocabulary)
├── 篇章预听 (tab-prelistening)
├── 影子跟读 (tab-shadowing)
├── 词汇复习 (tab-review)
├── 篇章测试 (tab-practice)
└── 课程详情 (tab-course)
```

## 详细板块说明

### 1. 学习概览 (tab-overview)

**功能定位**：学习数据总览和学习进度跟踪

**设计方案**：
- **左侧关键指标**：
  - 累计学习时间（总学习时长）
  - 连续学习天数（学习连续性）
  - 学习完成率（整体进度）
  - 待复习词汇（需要复习的数量）

- **右侧单元网格**：
  - 虚拟滚动卡片（1000条 → 10条DOM）
  - 课程单元展示（NCE1/Think Level 0）
  - 学习进度指示器
  - 点击跳转到课程学习

- **技术特性**：
  - 虚拟滚动技术（性能优化）
  - ARIA无障碍标签
  - 响应式设计（移动/平板/桌面）

**数据来源**：
- `localStorage: nce_user_data`
- `localStorage: nce_unit_review`
- 实时计算统计数据

---

### 2. 词汇预习 (tab-vocabulary)

**功能定位**：CET-MASTER闪卡学习模式，基于斯宾浩斯算法

**设计方案**：
- **闪卡组件**：
  - 3D翻转动画（CSS transform）
  - 卡片正面：单词 + 音标 + 翻转提示
  - 卡片背面：释义 + 例句
  - 触觉反馈（点击振动）

- **操作按钮**：
  - 认识按钮（绿色）：标记为已知，加入复习队列
  - 不认识按钮（红色）：标记为未知，继续学习

- **进度显示**：
  - 当前进度（已学/总数）
  - 学习统计（已知/未知）
  - 学习进度条（可视化）

- **技术特性**：
  - 斯宾浩斯SM-2算法
  - 键盘快捷键（空格翻转，←/→切换）
  - localStorage持久化
  - 自动保存学习进度

**数据结构**：
```javascript
{
  word: string,
  phonetic: string,
  meaning: string,
  example: string,
  status: 'known' | 'unknown',
  nextReview: timestamp,
  interval: number,
  easeFactor: number
}
```

**算法逻辑**：
- 复习间隔：20分钟 → 1小时 → 8小时 → 1天 → 2天 → 6天
- 难度因子：初始2.5，根据正确率调整（1.3-2.5）

---

### 3. 篇章预听 (tab-prelistening)

**功能定位**：音频听读训练，熟悉课文内容和语音

**设计方案**：
- **学习进度卡片**：
  - 今日预听进度（完成次数/每日目标）
  - 完成度百分比显示
  - 开始测试按钮

- **音频播放器**：
  - 音频标题显示
  - 播放控制（播放/暂停/停止）
  - 当前时间/总时长显示
  - 速度调节（0.5x/0.75x/1.0x/1.25x/1.5x）

- **文本字幕**：
  - LRC字幕解析
  - 点击跳转到对应时间
  - 当前句子高亮
  - 自动滚动跟随

- **每日目标设置**：
  - 自定义听读次数（1-10次）
  - 保存设置
  - 目标达成提示

- **学习流程导航**：
  - 四步骤可视化导航
  - 当前步骤高亮
  - 已完成步骤标记
  - 锁定步骤显示

- **预听测试**：
  - 从认识词汇生成填空题
  - 实时答题反馈
  - 测试结果统计

**技术特性**：
- LRC格式解析器
- HTML5 Audio API
- localStorage进度管理
- 学习流程进度共享
- 响应式音频控件

**数据源**：
- LRC字幕文件：`/{bookKey}/{filename}.lrc`
- 音频文件：`https://jikhdympaifsmubmwilp.supabase.co/storage/v1/object/public/audio/Think0/{filename}.mp3`

---

### 4. 影子跟读 (tab-shadowing)

**功能定位**：录音跟读训练，提升口语发音和语感

**设计方案**：
- **学习进度卡片**：
  - 今日跟读进度（完成次数/每日目标）
  - 完成度百分比显示

- **音频播放器**：
  - 与篇章预听相同的播放器
  - 字幕同步显示
  - 速度调节功能

- **录音控制**：
  - 开始/停止录音按钮
  - 录音状态动画（脉冲效果）
  - 麦克风权限管理

- **录音回放**：
  - 录音播放器控件
  - 与原音对比功能
  - 保存录音选项

- **每日目标设置**：
  - 自定义跟读次数（1-10次）
  - 目标达成提示
  - 进度自动保存

- **学习流程导航**：
  - 四步骤可视化导航
  - 智能解锁提示

- **技术特性**：
- MediaRecorder API（录音）
- Web Audio API（音频处理）
- 权限请求管理
- 音频对比算法（基础框架）

**录音功能**：
- 采样率：44.1kHz
- 格式：WAV/WEBM
- 音质：标准质量
- 存储方式：Blob URL

---

### 5. 词汇复习 (tab-review)

**功能定位**：基于斯宾浩斯算法的智能复习

**设计方案**：
- **复习队列**：
  - 到期词汇列表
  - 优先级排序（时间紧迫性）
  - 复习统计（待复习数量）

- **复习界面**：
  - 与词汇预习相同的闪卡组件
  - 词汇难度指示器
  - 复习间隔显示

- **评分系统**：
  - 5级评分（0-5分）
  - 影响下次复习时间
  - 调整记忆强度

- **复习统计**：
  - 今日复习数量
  - 本周复习数量
  - 复习正确率
  - 记忆曲线可视化

- **技术特性**：
- SM-2间隔重复算法
- 智能调度系统
- 复习提醒功能
- 数据统计分析

**复习算法**：
```
下次复习时间 = 当前时间 + 间隔 × 难度因子
间隔 = 根据评分调整（0.8x - 2.5x）
难度因子 = 根据表现动态调整
```

---

### 6. 篇章测试 (tab-practice)

**功能定位**：综合测试评估，检验学习成果

**设计方案**：
- **测试概览卡片**：
  - 测试说明和引导
  - 题目数量和预估时间
  - 及格分数要求
  - 前置条件检查（必须完成前三步）

- **测试类型选择**：
  - 综合测试（词汇+理解+听力）
  - 词汇测试（词汇识别）
  - 理解测试（文章理解）
  - 听力测试（听力理解）

- **测试题目生成**：
  - 智能题目生成算法
  - 基于学习内容出题
  - 随机选项生成
  - 题目难度自适应

- **答题界面**：
  - 进度条显示
  - 题目类型徽章
  - 选项选择交互
  - 即时反馈机制

- **测试结果**：
  - 总分和通过状态
  - 分类评分统计
  - 答题详情分析
  - 错题回顾功能

- **学习流程导航**：
  - 四步骤完整导航
  - 测试通过提示
  - 学习完成庆祝

- **技术特性**：
- 多种题型支持（选择/填空/匹配）
- 智能题目生成算法
- 实时评分系统
- 学习流程集成

**题目类型**：
- 词汇测试：词义选择、拼写填空
- 理解测试：阅读理解、句意判断
- 听力测试：听音辨意、听力理解

---

### 7. 课程详情 (tab-course)

**功能定位**：课程单元管理和选择

**设计方案**：
- **单元网格**：
  - 课程单元卡片
  - 学习进度指示
  - 完成状态标记
  - 点击进入学习

- **课程信息**：
  - 课程标题和描述
  - 单元数量统计
  - 整体进度概览
  - 学习建议提示

- **筛选和排序**：
  - 按课程类型筛选
  - 按进度排序
  - 搜索功能
  - 收藏单元

- **技术特性**：
- 虚拟滚动（性能优化）
- 动态数据加载
- 响应式网格布局
- 状态持久化

**课程类型**：
- NCE1（新概念英语第一册）
- Think Level 0（Think教材零基础）

---

## 学习流程设计

### 标准学习路径

```
1. 词汇预习 (tab-vocabulary)
   ↓（必须完成）
2. 篇章预听 (tab-prelistening) 
   ↓（必须完成）
3. 影子跟读 (tab-shadowing)
   ↓（必须完成）
4. 篇章测试 (tab-practice)
   ↓（可选）
5. 词汇复习 (tab-review) [循环]
```

### 智能导航系统

**前置条件检查**：
- 每个步骤都有明确的前置条件
- 系统自动检查完成状态
- 未完成步骤显示锁定状态
- 完成步骤显示解锁状态

**步骤完成提示**：
- 达到目标时自动提示
- 友好的完成庆祝界面
- 引导进入下一环节
- 学习进度可视化

**进度共享机制**：
- 跨Tab实时数据同步
- localStorage统一管理
- 学习状态一致性
- 断点续学支持

## 数据结构设计

### 学习流程进度
```javascript
{
  courseId: string,
  lessonId: string,
  vocabularyCompleted: boolean,
  vocabularyStats: {
    total: number,
    known: number,
    unknown: number
  },
  prelisteningCompleted: boolean,
  prelisteningStats: {
    dailyGoal: number,
    todayCount: number,
    progress: number
  },
  shadowingCompleted: boolean,
  shadowingStats: {
    dailyGoal: number,
    practiceCount: number,
    progress: number
  },
  practiceCompleted: boolean,
  practiceStats: {
    testType: string,
    score: number,
    correctCount: number,
    totalQuestions: number,
    passed: boolean
  },
  updatedAt: timestamp
}
```

### 词汇学习数据
```javascript
{
  word: string,
  phonetic: string,
  definition: string,
  example: string,
  partOfSpeech: string,
  status: 'known' | 'unknown' | 'reviewing',
  nextReview: timestamp,
  interval: number,
  easeFactor: number,
  reviewCount: number,
  correctCount: number,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 测试结果数据
```javascript
{
  testId: string,
  courseId: string,
  lessonId: string,
  testType: string,
  questions: Array<{
    id: string,
    type: string,
    question: string,
    options: Array<string>,
    correctAnswer: number,
    explanation: string
  }>,
  userAnswers: Array<number>,
  score: number,
  correctCount: number,
  totalQuestions: number,
  passed: boolean,
  completedAt: timestamp
}
```

## 技术架构

### 前端技术栈
- **核心框架**：原生JavaScript（ES6+）
- **样式框架**：原生CSS + CSS变量
- **状态管理**：localStorage + 自定义事件
- **音频处理**：HTML5 Audio API + MediaRecorder API
- **动画效果**：CSS3 Transforms + Transitions

### 管理器类
1. **VocabularyLearningManager**：词汇学习和复习管理
2. **EbbinghausReviewManager**：斯宾浩斯算法实现
3. **PrelisteningManager**：篇章预听功能
4. **ShadowingManager**：影子跟读功能
5. **PracticeTestManager**：篇章测试功能

### CSS文件结构
- `css/style.css`：全局样式
- `css/practice.css`：学习中心页面样式
- `css/vocabulary.css`：词汇学习样式
- `css/prelistening.css`：篇章预听样式
- `css/shadowing.css`：影子跟读样式
- `css/practice-test.css`：篇章测试样式

### JavaScript文件结构
- `js/course-manager.js`：课程管理
- `js/practice-engine.js`：练习引擎
- `js/practice.js`：页面逻辑
- `js/vocabulary-learning.js`：词汇学习
- `js/prelistening.js`：篇章预听
- `js/shadowing.js`：影子跟读
- `js/practice-test.js`：篇章测试

## 用户体验设计

### 响应式设计

**移动端（<768px）**：
- 44px顶部导航栏
- 56px底部导航栏
- 安全区域适配
- 触摸优化交互

**平板端（768px-1024px）**：
- 5列布局设计
- 中等尺寸组件
- 平衡的信息密度

**桌面端（>1024px）**：
- 最大宽度1200px
- 大屏幕空间利用
- 丰富的交互效果

### 交互设计

**键盘快捷键**：
- 空格键：播放/暂停、翻页
- ←/→：上一题/下一题、上一步/下一步
- R：开始/停止录音
- S：停止播放
- L/S/R/F：功能快捷键

**触觉反馈**：
- 轻度振动（15ms）：普通按钮点击
- 中度振动（30ms）：重要操作确认
- 重度振动（50ms）：操作完成庆祝

**动画效果**：
- 60fps流畅动画
- cubic-bezier缓动函数
- 过渡时长200-300ms
- 3D悬停效果

### 视觉设计

**配色方案**：
- 主色调：紫色渐变（#667eea → #764ba2）
- 成功色：绿色（#28a745）
- 警告色：橙色（#ffc107）
- 错误色：红色（#dc3545）
- 文字色：深灰（#333）/浅灰（#666）

**设计风格**：
- 现代化卡片设计
- 柔和的圆角（8px-16px）
- 优雅的阴影效果
- 渐变背景和按钮

## 性能优化

### 虚拟滚动
- 大数据集优化（1000条→10条DOM）
- itemHeight固定为140px
- visibleCount=10
- 动态渲染可见区域

### 缓存策略
- Service Worker v4缓存
- 静态资源预加载
- localStorage数据缓存
- 离线访问支持

### 压缩优化
- Gzip压缩率：75.86%
- Brotli压缩率：80.30%
- 文件大小：544KB → 107KB
- 加载时间：< 2秒

## 兼容性

### 浏览器支持
- Chrome/Edge：完全支持
- Firefox：完全支持
- Safari：基本支持
- 移动浏览器：iOS Safari、Chrome Mobile

### 功能支持
- HTML5 Audio API：完全支持
- MediaRecorder API：现代浏览器支持
- localStorage：完全支持
- CSS3 Animations：完全支持

## 安全性

### 数据安全
- localStorage数据加密（计划中）
- 用户隐私保护
- 敏感信息脱敏
- 数据备份机制

### 访问控制
- 麦克风权限请求
- 音频文件访问控制
- 跨域资源共享（CORS）
- 内容安全策略（CSP）

## 未来扩展

### 计划功能
1. 真实课程数据集成
2. 音频对比算法完善
3. 学习推荐系统
4. 数据分析和可视化
5. 多语言国际化

### 技术升级
1. PWA完整支持
2. 离线功能完善
3. 性能进一步优化
4. 无障碍功能增强
5. AI智能辅导集成

---

**文档版本**：v20260606-1  
**最后更新**：2026年6月6日  
**维护状态**：✅ 活跃维护中
