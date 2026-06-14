/**
 * SF Symbols 图标库 - 苹果风格 SVG 图标
 */

const SFSymbols = {
  // 播放控制
  play: '<path d="M8 5v14l11-7z"/>',
  playFill: '<path d="M8 5v14l11-7z"/>',
  pause: '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>',
  pauseFill: '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>',
  
  // 重复/循环
  repeat: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>',
  repeat1: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/><text x="12" y="14" font-size="8" text-anchor="middle" fill="currentColor">1</text>',
  
  // 时间/速度
  timer: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  speedometer: '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8 -8 8 8 0 0 1-8 8z"/><path d="M12 6v6l4 2"/>',
  
  // 文本/显示
  textAlignCenter: '<path d="M4 6h16M4 12h16M4 18h16M7 21h10"/>',
  
  // 导航
  chevronLeft: '<path d="M15 19l-7-7 7-7"/>',
  chevronRight: '<path d="M9 5l7 7-7 7"/>',
  xmark: '<path d="M18 6L6 18M6 6l12 12"/>',
  
  // 收藏/评分
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  starFill: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  heart: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>',
  
  // 学习/练习
  book: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
  bookFill: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20v-15H6.5A2.5 2.5 0 004 4.5v15z"/><path d="M6.5 2H20v2H6.5A2.5 2.5 0 004 6.5v13A2.5 2.5 0 016.5 17H20v2H6.5a4.5 4.5 0 00-4.5 4.5V6.5A4.5 4.5 0 006.5 2z"/>',
  pencil: '<path d="M17.657 17.657a4 4 0 01-5.657 0l-.707-.707a4 4 0 010-5.657l4.95-4.95a4 4 0 015.657 0l.707.707a4 4 0 010 5.657l-4.95 4.95z"/><path d="M14.828 14.828a2 2 0 002.829 0l.707-.707a2 2 0 000-2.829"/><path d="M9 20h6M12 3v3"/>',
  pencilTip: '<path d="M17.657 17.657a4 4 0 01-5.657 0l-.707-.707a4 4 0 010-5.657l4.95-4.95a4 4 0 015.657 0l.707.707a4 4 0 010 5.657l-4.95 4.95z"/>',
  
  // 听读训练
  ear: '<path d="M7 4v16a5 5 0 005 5h1a5 5 0 005-5v-2a2 2 0 00-2-2 2 2 0 00-2 2v2a1 1 0 01-1 1h-1a1 1 0 01-1-1V4a1 1 0 011-1h1a1 1 0 011 1v2h2V4a3 3 0 00-3-3h-1a3 3 0 00-3 3z"/><circle cx="12" cy="13" r="2"/>',
  earFill: '<path d="M7 4v16a5 5 0 005 5h1a5 5 0 005-5v-2a2 2 0 00-2-2 2 2 0 00-2 2v2a1 1 0 01-1 1h-1a1 1 0 01-1-1V4a1 1 0 011-1h1a1 1 0 011 1v2h2V4a3 3 0 00-3-3h-1a3 3 0 00-3 3z"/><circle cx="12" cy="13" r="2"/>',
  mic: '<path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>',
  micFill: '<path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>',
  textCursor: '<path d="M4 6h16M4 12h16M4 18h16"/><path d="M9 18v3M15 18v3M12 18v3M5 6V3M19 6V3"/>',
  
  // 箭头/交换
  arrowLeft: '<path d="M15 19l-7-7 7-7"/>',
  arrowRight: '<path d="M9 5l7 7-7 7"/>',
  arrowLeftRight: '<path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4"/>',
  arrowTriangle2Switchpath: '<path d="M17 10H3"/><path d="M21 6l-4 4 4 4"/><path d="M7 14H21"/><path d="M3 18l4-4-4-4"/>',
  
  // 图表/统计
  chartBar: '<path d="M18 3v18M6 14v4M12 10v8M24 6v12"/>',
  chartBarFill: '<path d="M18 3v18M6 14v4M12 10v8M24 6v12"/><path d="M18 21V3M6 21v-7M12 21v-11M24 21V6"/>',
  chartLine: '<path d="M3 21h18M3 10l6-6 4 4 8-8"/>',
  chartLineFill: '<path d="M3 21h18M3 10l6-6 4 4 8-8"/><path d="M21 21V10l-8-8-4 4-6-6v21z"/>',
  
  // 日历
  calendar: '<path d="M4 5h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2z"/><path d="M16 3v4M8 3v4M2 10h20"/>',
  
  // 大脑/记忆
  brain: '<path d="M12 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a5 5 0 005 5h4a5 5 0 005-5V9a2 2 0 00-2-2V7a5 5 0 00-5-5z"/><path d="M12 4v8M9 8h6"/>',
  
  // 其他
  checkmark: '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  exclamation: '<path d="M12 2L2 22h20L12 2zm0 4l5 12H7l5-12zm0 6v4m0 4h.01"/>',
  
  // _expand/收缩
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  shrink: '<path d="M4 14h6v-6M20 10h-6v6M14 4l7 7M10 20l-7-7"/>'
};

/**
 * 生成 SVG 图标 HTML
 * @param {string} name - 图标名称
 * @param {number} size - 图标尺寸 (默认 20)
 * @param {string} color - 图标颜色 (默认 currentColor)
 * @param {number} strokeWidth - 线条粗细 (默认 2)
 * @returns {string} SVG HTML 字符串
 */
function SFIcon(name, size = 20, color = 'currentColor', strokeWidth = 2) {
  const path = SFSymbols[name] || SFSymbols.info;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="${strokeWidth}">${path}</svg>`;
}

/**
 * 生成填充图标 HTML
 * @param {string} name - 图标名称
 * @param {number} size - 图标尺寸
 * @param {string} fill - 填充颜色
 * @returns {string} SVG HTML 字符串
 */
function SFFillIcon(name, size = 20, fill = 'currentColor') {
  const path = SFSymbols[name] || SFSymbols.info;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill}" stroke="none">${path}</svg>`;
}

// 导出到全局
window.SFIcon = SFIcon;
window.SFFillIcon = SFFillIcon;
window.SFSymbols = SFSymbols;
