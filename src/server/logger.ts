/** The only code that writes logs: one structured entry per warning or error. */
type Level = 'warn' | 'error';

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
  } else {
    console.warn(line);
  }
}

/** Log a warning message. */
export function warn(message: string, extra?: Record<string, unknown>): void {
  write('warn', message, extra);
}

/** Log an error message. */
export function error(message: string, extra?: Record<string, unknown>): void {
  write('error', message, extra);
}
