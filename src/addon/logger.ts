const logLevel = process.env.PI_LOG_LEVEL as 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | undefined;
const logFormat = process.env.PI_LOG_FORMAT as 'pretty' | 'json' | undefined;

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const enabledLevels: Set<LogLevel> | null = logLevel ? new Set<LogLevel>([logLevel]) : null;

function isEnabled(level: LogLevel): boolean {
  if (!enabledLevels) return false;
  return enabledLevels.has(level);
}

function makePrettyLogger(level: LogLevel) {
  return (...args: unknown[]): void => {
    if (isEnabled(level)) {
      switch (level) {
        case 'trace':
          console.trace(`[${level.toUpperCase()}]`, ...args);
          break;
        case 'debug':
          console.debug(`[${level.toUpperCase()}]`, ...args);
          break;
        case 'info':
          console.info(`[${level.toUpperCase()}]`, ...args);
          break;
        case 'warn':
          console.warn(`[${level.toUpperCase()}]`, ...args);
          break;
        case 'error':
          console.error(`[${level.toUpperCase()}]`, ...args);
          break;
        case 'fatal':
          console.error(`[${level.toUpperCase()}]`, ...args);
          break;
        /* istanbul ignore next */
        default:
          // This should never happen if all cases are exhaustive
          throw new Error(`Unhandled log level: ${level}`);
      }
    }
  };
}

function makeJsonLogger(level: LogLevel) {
  return (...args: unknown[]): void => {
    if (isEnabled(level)) {
      const msg = args.length > 0 ? args[0] : undefined;
      const rest = args.slice(1);
      const entry: { timestamp: string; level: LogLevel; message?: unknown; meta?: unknown } = {
        timestamp: new Date().toISOString(),
        level,
        message: msg,
      };
      if (rest.length > 0) {
        entry.meta = rest;
      }
      console.log(JSON.stringify(entry));
    }
  };
}

const noop = (): void => undefined;

const createLogger =
  logFormat === 'json'
    ? (level: string) => makeJsonLogger(level as LogLevel)
    : (level: string) => makePrettyLogger(level as LogLevel);

const logger = {
  trace: logLevel ? createLogger('trace') : noop,
  debug: logLevel ? createLogger('debug') : noop,
  info: logLevel ? createLogger('info') : noop,
  warn: logLevel ? createLogger('warn') : noop,
  error: logLevel ? createLogger('error') : noop,
  fatal: logLevel ? createLogger('fatal') : noop,
};

export { logger };
