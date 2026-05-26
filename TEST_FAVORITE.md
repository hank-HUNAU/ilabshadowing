# 测试收藏功能指南

## 🧪 清除缓存并测试

### 方法 1：浏览器控制台清除（推荐）

1. 按 `F12` 打开开发者工具
2. 点击 **Console（控制台）** 标签
3. 粘贴并执行以下命令：

```javascript
localStorage.clear();
caches.keys().then(names => names.forEach(n => caches.delete(n)));
navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
location.reload(true);
```

### 方法 2：无痕模式

直接在浏览器无痕/隐私模式中打开：
```
https://3000-2f8c3282c30e641a.monkeycode-ai.online
```

## ✨ 单句收藏功能

### 使用步骤

1. **打开任意课程**
   - 点击课本书籍卡片
   - 点击课程卡片打开播放器

2. **播放句子**
   - 点击播放按钮 ▶ 开始播放
   - 或点击歌词区域的任意句子

3. **收藏句子**
   - 看到右上角的空心星星 ⭐
   - 点击星星图标收藏当前句子
   - 星星会变成实心金色 ★ 表示已收藏

4. **查看收藏**
   - 返回首页
   - 点击顶部的星星图标 ⭐
   - 进入收藏列表页面

5. **播放收藏的句子**
   - 点击收藏列表中的任意卡片
   - 自动跳转到对应课程和句子
   - 开始播放该句子

6. **取消收藏**
   - 在播放器中再次点击金色星星 ★
   - 星星变回空心 ⭐ 表示已取消

## 🔧 单句播放优化

### 改进内容

- ✅ **更精细的切分**：提前 80-120ms 停止（根据句子长度动态调整）
- ✅ **安全边界**：确保每句至少播放 300ms
- ✅ **精确回溯**：到达边界时暂停并精确定位

### 测试效果

1. 切换到 **单句模式**（底部显示"单句"标签）
2. 播放任意句子
3. 句子结束时应该干净利落地停止
4. **不会**听到下一句的开头内容

## 📊 数据结构

### 收藏数据格式

```json
{
  "id": "NCE1_0_5",
  "key": "NCE1",
  "unitIdx": 0,
  "lineIdx": 5,
  "sentence": "Excuse me!",
  "translation": "对不起！",
  "lessonTitle": "Lesson 1",
  "bookTitle": "新概念第一册"
}
```

## 🐛 调试方法

### 查看控制台日志

打开开发者工具控制台，查看以下日志：
- `[Favorite] Added sentence to favorites` - 收藏成功
- `[Favorite] Removed from favorites` - 取消收藏

### 检查本地存储

```javascript
// 查看收藏列表
JSON.parse(localStorage.getItem('nce_favorites'))

// 查看收藏数量
JSON.parse(localStorage.getItem('nce_favorites')).length
```

## 📱 响应式设计

- **桌面端**：收藏按钮在歌词区域右上角
- **手机端**：收藏按钮位置相同，尺寸略小

## 🎯 注意事项

1. 必须先播放句子才能收藏（`cur` 索引必须有效）
2. 收藏的是**当前播放的句子**，不是整篇课文
3. 切换句子时收藏按钮状态会自动更新
4. 收藏数据保存在浏览器 localStorage，清除缓存会丢失
