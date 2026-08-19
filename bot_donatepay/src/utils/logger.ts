export type LogLevel = "debug" | "info" | "warn" | "error";

export class Logger {
  constructor(private readonly context: string) {}

  public debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG) {
      console.debug(`[${this.context}] ${message}`, ...args);
    }
  }

  public info(message: string, ...args: any[]): void {
    console.log(`[${this.context}] ${message}`, ...args);
  }

  public warn(message: string, ...args: any[]): void {
    console.warn(`[${this.context}] ${message}`, ...args);
  }

  public error(message: string, ...args: any[]): void {
    console.error(`[${this.context}] ${message}`, ...args);
  }

  public forContext(subContext: string): Logger {
    return new Logger(`${this.context}:${subContext}`);
  }
}

export const logger = new Logger("DonatePayBot");
