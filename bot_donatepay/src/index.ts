// Node.js environment polyfill for Centrifuge ajax check
if (typeof (global as any).XMLHttpRequest === "undefined") {
  (global as any).XMLHttpRequest = class XMLHttpRequest {};
}

import { BotApp } from "./app";
import { logger } from "./utils/logger";

export * from "./config";
export * from "./types";
export * from "./utils";
export * from "./api";
export * from "./stream";
export * from "./messaging";
export * from "./app";

const app = new BotApp();

async function bootstrap() {
  try {
    await app.start();
  } catch (err: any) {
    logger.error("Критическая ошибка при запуске DonatePay бота:", err);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  logger.info(`Получен сигнал ${signal}. Завершение работы...`);
  try {
    await app.stop();
    process.exit(0);
  } catch (err: any) {
    logger.error("Ошибка при корректном завершении работы:", err);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", reason);
});

bootstrap();
