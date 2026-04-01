pomelo-logger
========

pomelo-logger 是 [pomelo](https://github.com/NetEase/pomelo) 框架的日志组件，基于 [log4js](https://github.com/log4js-node/log4js-node) 封装，提供更便捷的日志功能。

> **版本 0.2.0**: 升级至 log4js 6.x，性能大幅提升，支持 Node.js 22。

## 安装
```
npm install pomelo-logger
```

## 环境要求
- Node.js >= 18.0.0

## 功能特性

### 日志前缀
除了 category，你还可以自定义日志前缀，如文件名、serverId、serverType、host 等。

```javascript
var logger = require('pomelo-logger').getLogger(category, prefix1, prefix2, ...);
```

### 显示行号
在调试环境下，你可能需要知道日志输出的代码行号。

方式一：设置环境变量
```javascript
process.env.LOGGER_LINE = true;
```

方式二：在配置文件中设置 `lineDebug`
```json
{
  "appenders": {
    "console": { "type": "console" }
  },
  "categories": {
    "default": { "appenders": ["console"], "level": "info" }
  },
  "lineDebug": true
}
```

### 原始消息模式
在原始消息模式下，日志输出不包含前缀和颜色格式。

方式一：设置环境变量
```javascript
process.env.RAW_MESSAGE = true;
```

方式二：在配置文件中设置 `rawMessage`
```json
{
  "appenders": {
    "console": { "type": "console" }
  },
  "categories": {
    "default": { "appenders": ["console"], "level": "info" }
  },
  "rawMessage": true
}
```

### 动态调整日志级别
在配置文件中添加 `reloadSecs` 选项，可以定时重新加载配置文件，实现动态调整日志级别。

```json
{
  "appenders": {
    "console": { "type": "console" }
  },
  "categories": {
    "default": { "appenders": ["console"], "level": "info" }
  },
  "reloadSecs": 30
}
```

上述配置表示每 30 秒重新加载一次配置文件。注意：不支持动态修改 appender 配置。

## 使用示例

```javascript
var logger = require('pomelo-logger').getLogger('log', __filename, process.pid);

process.env.LOGGER_LINE = true;

logger.info('这是一条 info 日志');
logger.warn('这是一条 warn 日志');
logger.error('这是一条 error 日志');
logger.debug('这是一条 debug 日志');
```

## 配置示例

```json
{
  "appenders": {
    "console": {
      "type": "console"
    },
    "file": {
      "type": "dateFile",
      "filename": "logs/pomelo.log",
      "pattern": "-yyyy-MM-dd",
      "alwaysIncludePattern": true
    }
  },
  "categories": {
    "default": {
      "appenders": ["console"],
      "level": "info"
    },
    "pomelo": {
      "appenders": ["console", "file"],
      "level": "debug"
    }
  },
  "lineDebug": false,
  "replaceConsole": true
}
```

## 从 0.1.x 迁移

### 配置格式变更

旧格式 (v0.1.x):
```json
{
  "appenders": [
    { "type": "console" },
    { "type": "file", "filename": "app.log", "category": "app" }
  ],
  "levels": { "app": "DEBUG" }
}
```

新格式 (v0.2.0+):
```json
{
  "appenders": {
    "console": { "type": "console" },
    "file": { "type": "file", "filename": "app.log" }
  },
  "categories": {
    "default": { "appenders": ["console"], "level": "INFO" },
    "app": { "appenders": ["console", "file"], "level": "DEBUG" }
  }
}
```

> 注意：库会尝试自动转换旧配置格式，但建议更新配置文件以获得最佳效果。

### 废弃的 API

以下方法在 log4js 6.x 中已废弃，调用时会输出警告：
- `addAppender()` - 请使用 `configure()` 代替
- `loadAppender()` - 在 log4js 6.x 中不再需要
- `clearAppenders()` - 请使用 `configure()` 代替
- `replaceConsole()` / `restoreConsole()` - 在 log4js 6.x 中已废弃
- `getDefaultLogger()` - 请使用 `getLogger()` 不带参数

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 获取完整的更新历史。

## 许可证

(The MIT License)

Copyright (c) 2012-2013 NetEase, Inc. and other contributors

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
