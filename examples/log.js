var pomeloLogger = require('../');

// Configure logger first
pomeloLogger.configure({
  appenders: {
    console: { type: 'console' }
  },
  categories: {
    default: { appenders: ['console'], level: 'debug' },
    log: { appenders: ['console'], level: 'debug' }
  }
});

var logger = pomeloLogger.getLogger('log', __filename, process.pid);

// Enable line number display
process.env.LOGGER_LINE = true;

logger.info('test1 - info message');
logger.warn('test2 - warning message');
logger.error('test3 - error message');
logger.debug('test4 - debug message');
