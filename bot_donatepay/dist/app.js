"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotApp = void 0;
const crypto_1 = __importDefault(require("crypto"));
const donatepay_client_1 = require("./api/donatepay-client");
const config_1 = require("./config");
const amqp_client_1 = require("./messaging/amqp-client");
const command_handlers_1 = require("./messaging/command-handlers");
const stream_manager_1 = require("./stream/stream-manager");
const logger_1 = require("./utils/logger");
const url_extractor_1 = require("./utils/url-extractor");
class BotApp {
    config;
    logger;
    apiClient;
    amqpClient;
    streamManager;
    connectHandler;
    disconnectHandler;
    isRunning = false;
    constructor(options) {
        this.config = options?.config || config_1.CONFIG;
        this.logger = options?.logger || new logger_1.Logger("BotApp");
        this.apiClient =
            options?.apiClient ||
                new donatepay_client_1.DonatePayApiClient(this.config.tokenUrl, fetch, this.logger.forContext("ApiClient"));
        this.amqpClient =
            options?.amqpClient ||
                new amqp_client_1.AmqpClient(this.config, this.logger.forContext("RabbitMQ"));
        this.streamManager =
            options?.streamManager ||
                new stream_manager_1.StreamManager(this.apiClient, this.config.wsUrl, {
                    onNotification: this.handleDonationNotification.bind(this),
                    onTokenInvalidated: this.handleTokenInvalidation.bind(this),
                }, this.logger.forContext("StreamManager"));
        this.connectHandler = new command_handlers_1.ConnectCommandHandler(this.amqpClient, this.streamManager, this.logger.forContext("ConnectHandler"));
        this.disconnectHandler = new command_handlers_1.DisconnectCommandHandler(this.amqpClient, this.streamManager, this.logger.forContext("DisconnectHandler"));
    }
    getStreamManager() {
        return this.streamManager;
    }
    getAmqpClient() {
        return this.amqpClient;
    }
    getApiClient() {
        return this.apiClient;
    }
    handleDonationNotification(notification, conn) {
        const videoUrl = (0, url_extractor_1.extractVideoUrl)(notification.vars);
        const eventPayload = {
            request_id: crypto_1.default.randomUUID(),
            owner_platform_id: conn.platform_user_id,
            owner_id: conn.user_id,
            requester_id: String(notification.id || Date.now()),
            requester_nickname: notification.vars.name || "Anonymous",
            donation_amount: Number(notification.vars.sum) || 0,
            donation_currency: notification.vars.currency || "RUB",
            yt_video_url: videoUrl,
            priority: "donation",
            source: "donatepay",
        };
        this.amqpClient.publishOrderEvent(eventPayload);
    }
    handleTokenInvalidation(conn, _reason) {
        this.amqpClient.publishTokenDied({
            access_token: conn.access_token,
            platform_user_id: conn.platform_user_id,
        });
    }
    async start() {
        if (this.isRunning) {
            this.logger.warn("Приложение уже запущено.");
            return;
        }
        this.isRunning = true;
        this.logger.info("Запуск приложения DonatePay Bot...");
        await this.initRabbitMQ();
    }
    async initRabbitMQ() {
        try {
            await this.amqpClient.connect();
            await this.amqpClient.consume(this.config.connectQueue, async (msg) => {
                await this.connectHandler.handle(msg);
            }, { noAck: false });
            await this.amqpClient.consume(this.config.disconnectQueue, async (msg) => {
                await this.disconnectHandler.handle(msg);
            }, { noAck: false });
            this.logger.info(`Очереди инициализированы. Слушаю подключение в ${this.config.connectQueue} и отключение в ${this.config.disconnectQueue}`);
            // Фоновая синхронизация пользователей с бэкенда
            this.syncUsers().catch((err) => {
                this.logger.error("Ошибка при заведении пользователей с сервера:", err);
            });
        }
        catch (err) {
            this.logger.error(`Ошибка подключения к RabbitMQ (${err.message}), повтор через 5 сек...`);
            if (this.isRunning) {
                setTimeout(() => this.initRabbitMQ(), 5000);
            }
        }
    }
    async syncUsers() {
        const retries = [5000, 10000, 10000, 30000];
        let users = null;
        for (let i = 0; i <= retries.length; i++) {
            try {
                users = await this.amqpClient.requestAllUsers(10000);
                break;
            }
            catch (err) {
                this.logger.error(`Ошибка запроса пользователей (${err.message})...`);
                if (i < retries.length && this.isRunning) {
                    this.logger.info(`Повтор запроса пользователей через ${retries[i] / 1000} сек...`);
                    await new Promise((r) => setTimeout(r, retries[i]));
                }
            }
        }
        if (!users) {
            this.logger.error("Не удалось получить пользователей с сервера после нескольких попыток.");
            return;
        }
        this.logger.info(`Подключение сокетов для ${users.length} пользователей...`);
        for (const user of users) {
            try {
                await this.streamManager.startStream(user);
            }
            catch (err) {
                this.logger.error(`Ошибка подключения для пользователя ${user.platform_user_id}:`, err);
            }
        }
    }
    async stop() {
        this.logger.info("Остановка приложения DonatePay Bot...");
        this.isRunning = false;
        this.streamManager.stopAll();
        await this.amqpClient.close();
        this.logger.info("DonatePay Bot успешно остановлен.");
    }
}
exports.BotApp = BotApp;
