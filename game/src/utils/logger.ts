export class Logger {
  static debug(message: string, ...args: any[]) {
    // In a browser environment, we don't have process.env.NODE_ENV
    // So we'll always log in development mode
    console.log(`[DEBUG] ${message}`, ...args);
  }

  static info(message: string, ...args: any[]) {
    console.info(`[INFO] ${message}`, ...args);
  }

  static warn(message: string, ...args: any[]) {
    console.warn(`[WARN] ${message}`, ...args);
  }

  static error(message: string, error?: Error, ...args: any[]) {
    console.error(`[ERROR] ${message}`, error, ...args);
  }
}