const fs = require('fs');
const util = require('util');

// 使用全局单例模式确保所有 pomelo-logger 实例共享同一个 log4js 实例
// 这解决了当有多个 pomelo-logger 实例时（如外部 pomelo 和项目各一个），
// 它们各自使用独立 log4js 实例导致配置不同步的问题
global.__POMELO_LOGGER_LOG4JS__ = global.__POMELO_LOGGER_LOG4JS__ || require('log4js');
const log4js = global.__POMELO_LOGGER_LOG4JS__;

const funcs = {
  'env': doEnv,
  'args': doArgs,
  'opts': doOpts
};

function getLogger(categoryName) {
  const args = Array.prototype.slice.call(arguments);
  let prefix = "";

  for (let i = 1; i < args.length; i++) {
    if (i !== args.length - 1) {
      prefix = prefix + args[i] + "] [";
    } else {
      prefix = prefix + args[i];
    }
  }

  if (typeof categoryName === 'string') {
    categoryName = categoryName.replace(process.cwd(), '');
  }

  const logger = log4js.getLogger(categoryName);
  const pLogger = {};

  ['log', 'debug', 'info', 'warn', 'error', 'trace', 'fatal', 'mark'].forEach(function(item) {
    pLogger[item] = function() {
      let p = "";
      if (!process.env.RAW_MESSAGE) {
        if (args.length > 1) {
          p = "[" + prefix + "] ";
        }
        if (args.length && process.env.LOGGER_LINE) {
          p = getLine() + ": " + p;
        }
        p = colorize(p, colours[item] || colours.info);
      }

      const newArgs = Array.prototype.slice.call(arguments);
      if (newArgs.length) {
        newArgs[0] = p + newArgs[0];
      }
      logger[item].apply(logger, newArgs);
    };
  });

  return pLogger;
}

let configState = {};

function initReloadConfiguration(filename, reloadSecs) {
  if (configState.timerId) {
    clearInterval(configState.timerId);
    delete configState.timerId;
  }
  configState.filename = filename;
  configState.lastMTime = getMTime(filename);
  configState.timerId = setInterval(reloadConfiguration, reloadSecs * 1000);
}

function getMTime(filename) {
  let mtime;
  try {
    mtime = fs.statSync(filename).mtime;
  } catch (e) {
    throw new Error("Cannot find file with given path: " + filename);
  }
  return mtime;
}

function loadConfigurationFile(filename) {
  if (filename) {
    return JSON.parse(fs.readFileSync(filename, "utf8"));
  }
  return undefined;
}

function reloadConfiguration() {
  const mtime = getMTime(configState.filename);
  if (!mtime) {
    return;
  }
  if (configState.lastMTime && (mtime.getTime() > configState.lastMTime.getTime())) {
    const config = loadConfigurationFile(configState.filename);
    configureOnceOff(config);
  }
  configState.lastMTime = mtime;
}

function configureOnceOff(config) {
  if (config) {
    try {
      // Convert old format to new format if needed
      const newConfig = convertConfig(config);
      log4js.configure(newConfig);

      if (config.replaceConsole) {
        log4js.getLogger().level = config.levels?.default || 'INFO';
      }
    } catch (e) {
      throw new Error(
        "Problem reading log4js config " + util.inspect(config) +
        ". Error was \"" + e.message + "\""
      );
    }
  }
}

/**
 * Convert old log4js 0.x config format to new 6.x format
 * Supports pomelo's legacy configuration format
 */
function convertConfig(config) {
  // Already in new format
  if (config.appenders && typeof config.appenders === 'object' && !Array.isArray(config.appenders)) {
    return config;
  }

  // Convert old array format to new object format
  const newConfig = {
    appenders: {},
    categories: {
      default: { appenders: [], level: 'INFO' }
    }
  };

  let consoleAppenderName = null;

  // Handle old appenders array
  if (Array.isArray(config.appenders)) {
    config.appenders.forEach((appender, index) => {
      // Convert appender type
      let newAppender = { ...appender };

      // Convert "console" type to "stdout" for log4js 6.x
      if (appender.type === 'console') {
        newAppender = { type: 'stdout' };
        consoleAppenderName = 'console';
        newConfig.appenders[consoleAppenderName] = newAppender;

        // Console appender should be added to default category
        if (newConfig.categories.default.appenders.indexOf(consoleAppenderName) === -1) {
          newConfig.categories.default.appenders.push(consoleAppenderName);
        }
        return;
      }

      // For file appenders with category
      if (appender.category) {
        const appenderName = appender.category;

        // Remove 'category' from appender as it's not needed in new format
        delete newAppender.category;

        newConfig.appenders[appenderName] = newAppender;

        // Create category entry with file appender AND console appender (if exists)
        const categoryAppenders = [appenderName];
        if (consoleAppenderName) {
          categoryAppenders.push(consoleAppenderName);
        }

        newConfig.categories[appender.category] = {
          appenders: categoryAppenders,
          level: 'INFO'
        };
      } else {
        // Appender without category - add with generic name
        const appenderName = `appender${index}`;
        newConfig.appenders[appenderName] = newAppender;
        newConfig.categories.default.appenders.push(appenderName);
      }
    });
  }

  // If no appenders were added to default, add console
  if (newConfig.categories.default.appenders.length === 0) {
    newConfig.appenders.out = { type: 'stdout' };
    newConfig.categories.default.appenders.push('out');
  }

  // Handle levels from config
  if (config.levels) {
    for (const category in config.levels) {
      if (config.levels.hasOwnProperty(category)) {
        const level = config.levels[category].toUpperCase();

        if (!newConfig.categories[category]) {
          // Category doesn't have an appender, use default appenders
          newConfig.categories[category] = {
            appenders: [...newConfig.categories.default.appenders],
            level: level
          };
        } else {
          newConfig.categories[category].level = level;
        }
      }
    }
  }

  return newConfig;
}

function configureLevels(levels) {
  if (levels) {
    for (const category in levels) {
      if (levels.hasOwnProperty(category)) {
        const logger = log4js.getLogger(category);
        logger.level = levels[category];
      }
    }
  }
}

/**
 * Configure the logger.
 * Configure file just like log4js.json. And support ${scope:arg-name} format property setting.
 * It can replace the placeholder in runtime.
 * scope can be:
 *     env: environment variables, such as: env:PATH
 *     args: command line arguments, such as: args:1
 *     opts: key/value from opts argument of configure function
 *
 * @param  {String|Object} config configure file name or configure object
 * @param  {Object} opts   options
 * @return {Void}
 */
function configure(config, opts) {
  let filename = config;
  config = config || process.env.LOG4JS_CONFIG;
  opts = opts || {};

  if (typeof config === 'string') {
    config = JSON.parse(fs.readFileSync(config, "utf8"));
  }

  if (config) {
    config = replaceProperties(config, opts);
  }

  if (config && config.lineDebug) {
    process.env.LOGGER_LINE = true;
  }

  if (config && config.rawMessage) {
    process.env.RAW_MESSAGE = true;
  }

  if (filename && config && config.reloadSecs) {
    initReloadConfiguration(filename, config.reloadSecs);
  }

  // Convert old config format to new format
  const newConfig = convertConfig(config);

  log4js.configure(newConfig, opts);
}

function replaceProperties(configObj, opts) {
  if (configObj instanceof Array) {
    for (let i = 0, l = configObj.length; i < l; i++) {
      configObj[i] = replaceProperties(configObj[i], opts);
    }
  } else if (typeof configObj === 'object') {
    let field;
    for (const f in configObj) {
      if (!configObj.hasOwnProperty(f)) {
        continue;
      }

      field = configObj[f];
      if (typeof field === 'string') {
        configObj[f] = doReplace(field, opts);
      } else if (typeof field === 'object') {
        configObj[f] = replaceProperties(field, opts);
      }
    }
  }

  return configObj;
}

function doReplace(src, opts) {
  if (!src) {
    return src;
  }

  const ptn = /\$\{(.*?)\}/g;
  let m, pro, ts, scope, name, defaultValue, func, res = '',
    lastIndex = 0;

  while ((m = ptn.exec(src))) {
    pro = m[1];
    ts = pro.split(':');
    if (ts.length !== 2 && ts.length !== 3) {
      res += pro;
      continue;
    }

    scope = ts[0];
    name = ts[1];
    if (ts.length === 3) {
      defaultValue = ts[2];
    }

    func = funcs[scope];
    if (!func || typeof func !== 'function') {
      res += pro;
      continue;
    }

    res += src.substring(lastIndex, m.index);
    lastIndex = ptn.lastIndex;
    res += (func(name, opts) || defaultValue);
  }

  if (lastIndex < src.length) {
    res += src.substring(lastIndex);
  }

  return res;
}

function doEnv(name) {
  return process.env[name];
}

function doArgs(name) {
  return process.argv[name];
}

function doOpts(name, opts) {
  return opts ? opts[name] : undefined;
}

function getLine() {
  const e = new Error();
  const stack = e.stack.split('\n');
  if (stack.length >= 4) {
    const line = stack[3];
    // Match both Windows and Unix paths
    const match = line.match(/:(\d+):\d+/);
    if (match) {
      return match[1];
    }
  }
  return 'unknown';
}

function colorizeStart(style) {
  return style ? '\x1B[' + styles[style][0] + 'm' : '';
}

function colorizeEnd(style) {
  return style ? '\x1B[' + styles[style][1] + 'm' : '';
}

function colorize(str, style) {
  return colorizeStart(style) + str + colorizeEnd(style);
}

const styles = {
  'bold': [1, 22],
  'italic': [3, 23],
  'underline': [4, 24],
  'inverse': [7, 27],
  'white': [37, 39],
  'grey': [90, 39],
  'black': [90, 39],
  'blue': [34, 39],
  'cyan': [36, 39],
  'green': [32, 39],
  'magenta': [35, 39],
  'red': [31, 39],
  'yellow': [33, 39]
};

const colours = {
  'all': "grey",
  'trace': "blue",
  'debug': "cyan",
  'info': "green",
  'warn': "yellow",
  'error': "red",
  'fatal': "magenta",
  'mark': "magenta",
  'off': "grey"
};

module.exports = {
  getLogger: getLogger,

  configure: configure,

  levels: log4js.levels,

  // Compatibility - these are deprecated in log4js 6.x but kept for backward compatibility
  getDefaultLogger: function() {
    return log4js.getLogger();
  },

  addAppender: function() {
    console.warn('pomelo-logger: addAppender is deprecated in log4js 6.x, use configure() instead');
  },

  loadAppender: function() {
    console.warn('pomelo-logger: loadAppender is deprecated in log4js 6.x');
  },

  clearAppenders: function() {
    console.warn('pomelo-logger: clearAppenders is deprecated in log4js 6.x, use configure() instead');
  },

  replaceConsole: function() {
    console.warn('pomelo-logger: replaceConsole is deprecated in log4js 6.x');
  },

  restoreConsole: function() {
    console.warn('pomelo-logger: restoreConsole is deprecated in log4js 6.x');
  },

  setGlobalLogLevel: function(level) {
    log4js.getLogger().level = level;
  },

  layouts: log4js.layouts,
  appenders: log4js.appenders,

  // Shutdown gracefully
  shutdown: function(cb) {
    log4js.shutdown(cb);
  }
};
