// Core Web Vitals 性能监控
(function() {
  const STORAGE_KEY = 'cwv_metrics';
  const MAX_ENTRIES = 50;

  function saveMetric(name, value, rating) {
    const metrics = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    metrics.push({
      name,
      value: Math.round(value),
      rating,
      timestamp: Date.now(),
      url: location.pathname
    });
    
    // 保留最近 50 条记录
    if (metrics.length > MAX_ENTRIES) {
      metrics.splice(0, metrics.length - MAX_ENTRIES);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
  }

  function getRating(value, thresholds) {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  }

  // Largest Contentful Paint (LCP)
  let lcpValue = 0;
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    lcpValue = lastEntry.renderTime || lastEntry.loadTime;
    saveMetric('LCP', lcpValue, getRating(lcpValue, { good: 2500, poor: 4000 }));
  }).observe({ type: 'largest-contentful-paint', buffered: true });

  // First Input Delay (FID)
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const fid = entry.processingStart - entry.startTime;
      saveMetric('FID', fid, getRating(fid, { good: 100, poor: 300 }));
    }
  }).observe({ type: 'first-input', buffered: true });

  // Cumulative Layout Shift (CLS)
  let clsValue = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
      }
    }
    saveMetric('CLS', clsValue * 1000, getRating(clsValue, { good: 0.1, poor: 0.25 }));
  }).observe({ type: 'layout-shift', buffered: true });

  // 页面完全加载后保存基础指标
  window.addEventListener('load', () => {
    const timing = performance.getEntriesByType('navigation')[0];
    if (timing) {
      saveMetric('FCP', timing.domContentLoadedEventEnd - timing.startTime, 
        getRating(timing.domContentLoadedEventEnd - timing.startTime, { good: 1800, poor: 3000 }));
      saveMetric('TTFB', timing.responseStart - timing.requestStart,
        getRating(timing.responseStart - timing.requestStart, { good: 800, poor: 1800 }));
    }
  });

  // 公开 API 供外部查询
  window.CWV = {
    getMetrics: () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
    getLCP: () => lcpValue,
    getCLS: () => clsValue,
    clear: () => localStorage.removeItem(STORAGE_KEY)
  };
})();
