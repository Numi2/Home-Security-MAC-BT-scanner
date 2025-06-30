// Simple logger utility to provide a single logging interface across the app.
// In production you might swap console.* with a remote logger (e.g. Sentry, Firebase).

/* eslint-disable no-console */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

let currentLevel: LogLevel = LogLevel.DEBUG;

export function setLogLevel(level: LogLevel) {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  const order: LogLevel[] = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
  return order.indexOf(level) >= order.indexOf(currentLevel);
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (shouldLog(LogLevel.DEBUG)) console.debug('[DEBUG]', ...args);
  },
  info: (...args: unknown[]) => {
    if (shouldLog(LogLevel.INFO)) console.info('[INFO]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (shouldLog(LogLevel.WARN)) console.warn('[WARN]', ...args);
  },
  error: (...args: unknown[]) => {
    if (shouldLog(LogLevel.ERROR)) console.error('[ERROR]', ...args);
  },
};