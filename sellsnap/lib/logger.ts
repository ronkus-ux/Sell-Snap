type LogLevel = 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

function log(level: LogLevel, event: string, context?: LogContext): void {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
  };

  if (level === 'error') {
    if (entry.error instanceof Error) {
      entry.error = {
        message: entry.error.message,
        name: entry.error.name,
        stack: process.env.NODE_ENV !== 'production' ? entry.error.stack : undefined,
      };
    }
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  info: (event: string, context?: LogContext) => log('info', event, context),
  warn: (event: string, context?: LogContext) => log('warn', event, context),
  error: (event: string, context?: LogContext) => log('error', event, context),
};
