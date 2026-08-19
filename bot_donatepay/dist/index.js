"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Node.js environment polyfill for Centrifuge ajax check
if (typeof global.XMLHttpRequest === "undefined") {
    global.XMLHttpRequest = class XMLHttpRequest {
    };
}
const app_1 = require("./app");
const logger_1 = require("./utils/logger");
__exportStar(require("./config"), exports);
__exportStar(require("./types"), exports);
__exportStar(require("./utils"), exports);
__exportStar(require("./api"), exports);
__exportStar(require("./stream"), exports);
__exportStar(require("./messaging"), exports);
__exportStar(require("./app"), exports);
const app = new app_1.BotApp();
async function bootstrap() {
    try {
        await app.start();
    }
    catch (err) {
        logger_1.logger.error("Критическая ошибка при запуске DonatePay бота:", err);
        process.exit(1);
    }
}
async function shutdown(signal) {
    logger_1.logger.info(`Получен сигнал ${signal}. Завершение работы...`);
    try {
        await app.stop();
        process.exit(0);
    }
    catch (err) {
        logger_1.logger.error("Ошибка при корректном завершении работы:", err);
        process.exit(1);
    }
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException", (err) => {
    logger_1.logger.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason) => {
    logger_1.logger.error("Unhandled Rejection:", reason);
});
bootstrap();
