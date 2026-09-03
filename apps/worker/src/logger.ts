import type { WorkerEnvironment } from './config';

type LogLevel = WorkerEnvironment['LOG_LEVEL'];
type LogFields = Record<string, boolean | number | string | null | undefined>;

const priorities: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

/** Writes one JSON object per line and accepts only deliberately safe scalar fields. */
export function createLogger(level: LogLevel, service = 'sport-analytics-worker'): Logger {
  function write(logLevel: LogLevel, message: string, fields: LogFields = {}): void {
    if (priorities[logLevel] < priorities[level]) return;

    const record = JSON.stringify({
      timestamp: new Date().toISOString(),
      level: logLevel,
      service,
      message,
      ...fields,
    });
    if (logLevel === 'error') console.error(record);
    else console.log(record);
  }

  return {
    debug: (message, fields) => write('debug', message, fields),
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, fields) => write('error', message, fields),
  };
}
