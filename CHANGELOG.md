# 更新日志

本项目的所有重要更改都将记录在此文件中。

## [0.2.0] - 2026-03-31

### 新增
- 支持 Node.js 18+ 和 Node.js 22
- 新增 `shutdown()` 方法，支持优雅关闭
- 自动转换旧版配置格式（v1 转 v2）
- 新增 `mark` 日志级别支持

### 变更
- **重要变更**: 升级 log4js 从 `0.6.21` 到 `^6.9.1`
- **重要变更**: 要求 Node.js >= 18.0.0
- 配置格式变更为 log4js 6.x 风格：
  - 旧格式: `appenders: [{ type: "console" }]` (数组)
  - 新格式: `appenders: { out: { type: "stdout" } }` (命名对象)
  - 必须配置 `categories` 并包含 `default` 分类
- 代码重构为 ES6+ 语法（const/let、箭头函数）
- 优化 `getLine()` 函数，提升跨平台兼容性

### 废弃
- `addAppender()` - 请使用 `configure()` 代替
- `loadAppender()` - log4js 6.x 不再需要
- `clearAppenders()` - 请使用 `configure()` 代替
- `replaceConsole()` / `restoreConsole()` - log4js 6.x 已废弃
- `getDefaultLogger()` - 请使用不带参数的 `getLogger()`

### 性能提升
- log4js 6.x 相比 0.x 版本性能显著提升
- 更好的异步处理和更低的内存占用

### 兼容性说明

#### API 兼容性

| API | 状态 | 说明 |
|-----|------|------|
| `getLogger(category, ...)` | ✅ 完全兼容 | 调用方式不变 |
| `configure(config, opts)` | ✅ 完全兼容 | 调用方式不变，支持旧配置格式 |
| `getDefaultLogger()` | ⚠️ 兼容 | 建议改用 `getLogger()` 不带参数 |
| `addAppender()` | ⚠️ 兼容 | 调用时输出警告，无实际效果 |
| `loadAppender()` | ⚠️ 兼容 | 调用时输出警告，无实际效果 |
| `clearAppenders()` | ⚠️ 兼容 | 调用时输出警告，无实际效果 |
| `replaceConsole()` | ⚠️ 兼容 | 调用时输出警告，无实际效果 |
| `restoreConsole()` | ⚠️ 兼容 | 调用时输出警告，无实际效果 |
| `setGlobalLogLevel(level)` | ✅ 完全兼容 | 调用方式不变 |
| `levels` | ✅ 完全兼容 | 不变 |

#### 配置文件兼容性

**无需修改现有配置文件！** 库会自动将旧格式转换为新格式：

- 旧格式的 `appenders` 数组会自动转换为对象格式
- 旧格式的 `levels` 会自动映射到 `categories`
- `type: "console"` 会自动转换为 `type: "stdout"`
- 所有带 `category` 的 appender 会自动创建对应的 category

#### pomelo 框架兼容性

直接升级 pomelo-logger 即可，**pomelo 项目无需任何代码修改**：

```bash
# 在 pomelo 项目中执行
npm install pomelo-logger@0.2.0
```

### 迁移指南

#### 旧配置 (v0.1.x) - 仍然支持
```json
{
  "appenders": [
    { "type": "console" },
    { "type": "file", "filename": "app.log", "category": "app" }
  ],
  "levels": { "app": "DEBUG" },
  "replaceConsole": true
}
```

#### 新配置 (v0.2.0+) - 推荐
```json
{
  "appenders": {
    "console": { "type": "stdout" },
    "file": { "type": "file", "filename": "app.log" }
  },
  "categories": {
    "default": { "appenders": ["console"], "level": "INFO" },
    "app": { "appenders": ["console", "file"], "level": "DEBUG" }
  }
}
```

> 💡 **提示**：虽然旧配置格式仍然可用，但建议逐步迁移到新格式以获得更好的可读性和维护性。

---

## [0.1.7] - 2016-03-xx

### 修复
- 修复 Windows 环境行号显示错误问题

### 变更
- 升级 log4js 到 0.6.21

---

## [0.1.5] - 2015-xx-xx

### 变更
- 升级 log4js 到 0.6.16
