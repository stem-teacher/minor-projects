// Tracing utility for debugging the server

// Define trace levels
export enum TraceLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4
}

// Interface for trace
export interface ITrace {
  enabled: boolean;
  currentLevel: TraceLevel;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  verbose(message: string, ...args: any[]): void;
  setLevel(level: TraceLevel | string): void;
}

// Trace implementation
export const trace: ITrace = {
  enabled: true,
  currentLevel: TraceLevel.DEBUG,
  
  error(message: string, ...args: any[]) {
    if (!this.enabled || this.currentLevel < TraceLevel.ERROR) return;
    console.error(`[ERROR] ${message}`, ...args);
  },
  
  warn(message: string, ...args: any[]) {
    if (!this.enabled || this.currentLevel < TraceLevel.WARN) return;
    console.warn(`[WARN] ${message}`, ...args);
  },
  
  info(message: string, ...args: any[]) {
    if (!this.enabled || this.currentLevel < TraceLevel.INFO) return;
    console.info(`[INFO] ${message}`, ...args);
  },
  
  debug(message: string, ...args: any[]) {
    if (!this.enabled || this.currentLevel < TraceLevel.DEBUG) return;
    console.debug(`[DEBUG] ${message}`, ...args);
  },
  
  verbose(message: string, ...args: any[]) {
    if (!this.enabled || this.currentLevel < TraceLevel.VERBOSE) return;
    console.debug(`[VERBOSE] ${message}`, ...args);
  },
  
  setLevel(level: TraceLevel | string) {
    if (typeof level === 'string') {
      const levelMap: Record<string, TraceLevel> = {
        'ERROR': TraceLevel.ERROR,
        'WARN': TraceLevel.WARN,
        'INFO': TraceLevel.INFO,
        'DEBUG': TraceLevel.DEBUG,
        'VERBOSE': TraceLevel.VERBOSE
      };
      this.currentLevel = levelMap[level.toUpperCase()] || TraceLevel.INFO;
    } else {
      this.currentLevel = level;
    }
    
    console.info(`Trace level set to ${TraceLevel[this.currentLevel]}`);
  }
};

// Set trace level from environment variable if available
if (process.env.TRACE_LEVEL) {
  trace.setLevel(process.env.TRACE_LEVEL);
}
