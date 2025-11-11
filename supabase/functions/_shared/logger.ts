/**
 * Centralized logging utility for edge functions
 * Provides structured logging with consistent formatting and metadata
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

interface LogMetadata {
  functionName: string;
  timestamp: string;
  level: LogLevel;
  [key: string]: any;
}

class Logger {
  private functionName: string;

  constructor(functionName: string) {
    this.functionName = functionName;
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>) {
    const logEntry: LogMetadata = {
      functionName: this.functionName,
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.sanitizeMetadata(metadata)
    };

    // Use appropriate console method based on level
    switch (level) {
      case LogLevel.ERROR:
        console.error(JSON.stringify(logEntry));
        break;
      case LogLevel.WARN:
        console.warn(JSON.stringify(logEntry));
        break;
      case LogLevel.DEBUG:
        console.debug(JSON.stringify(logEntry));
        break;
      default:
        console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * Sanitize metadata to avoid exposing sensitive information
   */
  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> {
    if (!metadata) return {};

    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'apikey',
      'api_key',
      'authorization',
      'auth',
      'bearer'
    ];

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      const lowerKey = key.toLowerCase();
      
      // Check if key contains sensitive information
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  debug(message: string, metadata?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, any>) {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>) {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, metadata?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, metadata);
  }
}

/**
 * Create a logger instance for an edge function
 * @param functionName - Name of the edge function
 */
export function createLogger(functionName: string): Logger {
  return new Logger(functionName);
}
