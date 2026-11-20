type Level = 'info' | 'warn' | 'error';

interface LogEntry {
  level: Level;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Write a structured JSON log line.
 * Never logs request bodies or personal data.
 */
function write(level: Level, message: string, extra?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...extra,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/** Log an informational message. */
export function info(message: string, extra?: Record<string, unknown>): void {
  write('info', message, extra);
}

/** Log a warning message. */
export function warn(message: string, extra?: Record<string, unknown>): void {
  write('warn', message, extra);
}

/** Log an error message. */
export function error(message: string, extra?: Record<string, unknown>): void {
  write('error', message, extra);
}
