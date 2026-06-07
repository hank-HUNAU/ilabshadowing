// 学习流程步骤间导航测试脚本
// 在浏览器控制台中运行

async function testLearningFlowNavigation() {
  console.log('=== 学习流程步骤间导航测试 ===\n');

  try {
    // 设置测试课程信息
    window.currentCourse = {
      bookKey: 'think-0',
      unitKey: 'Unit 04-4 Culture',
      title: 'Think Level 0 · Unit 4-4 Culture'
    };

    // 初始化PrelisteningManager
    const manager = new PrelisteningManager();
    await manager.init();

    console.log('📋 测试1: 检查学习流程进度结构');
    const progressKey = `learning_progress_${manager.currentCourse}_${manager.currentLesson}`;
    const progress = JSON.parse(localStorage.getItem(progressKey) || '{}');
    console.log('学习流程进度:', progress);

    console.log('\n📋 测试2: 检查步骤完成状态');
    const steps = ['vocabulary', 'prelistening', 'shadowing', 'practice'];
    steps.forEach(step => {
      const isCompleted = manager.isStepCompleted(step);
      const canProceed = manager.canProceedToStep(step);
      console.log(`${step}: 完成=${isCompleted}, 可进行=${canProceed}`);
    });

    console.log('\n📋 测试3: 测试词汇预习完成');
    manager.updateStepProgress('vocabulary', true, {
      total: 10,
      known: 7,
      unknown: 3
    });

    const vocabCompleted = manager.isStepCompleted('vocabulary');
    const shadowingCanProceed = manager.canProceedToStep('shadowing');
    console.log(`词汇预习完成: ${vocabCompleted}`);
    console.log(`可进行影子跟读: ${shadowingCanProceed}`);

    console.log('\n📋 测试4: 测试篇章预听完成');
    manager.todayCount = 3;
    manager.dailyGoal = 3;
    manager.saveProgress();

    const prelisteningCompleted = manager.isStepCompleted('prelistening');
    const practiceCanProceed = manager.canProceedToStep('practice');
    console.log(`篇章预听完成: ${prelisteningCompleted}`);
    console.log(`可进行篇章测试: ${practiceCanProceed}`);

    console.log('\n📋 测试5: 测试缺少前置条件');
    const shadowingCanProceedNow = manager.canProceedToStep('shadowing');
    console.log(`影子跟读可进行: ${shadowingCanProceedNow}`);

    // 清理测试数据
    localStorage.removeItem(progressKey);

    console.log('\n🎉 所有测试完成！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
  }
}

// 运行测试
console.log('运行 testLearningFlowNavigation() 来开始测试');
