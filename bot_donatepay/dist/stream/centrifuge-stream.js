"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CentrifugeStream = void 0;
const centrifuge_1 = __importDefault(require("centrifuge"));
const ws_1 = __importDefault(require("ws"));
const logger_1 = require("../utils/logger");
// Node.js environment polyfill for Centrifuge ajax check
if (typeof global.XMLHttpRequest === "undefined") {
    global.XMLHttpRequest = class XMLHttpRequest {
    };
}
class CentrifugeStream {
    connectionData;
    wsUrl;
    apiClient;
    callbacks;
    centrifuge = null;
    subscription = null;
    channelName;
    logger;
    constructor(connectionData, wsUrl, apiClient, callbacks = {}, logger) {
        this.connectionData = connectionData;
        this.wsUrl = wsUrl;
        this.apiClient = apiClient;
        this.callbacks = callbacks;
        this.channelName = `$public:${connectionData.platform_user_id}`;
        this.logger =
            logger || new logger_1.Logger(`CentrifugeStream:${connectionData.platform_user_id}`);
    }
    get platformUserId() {
        return this.connectionData.platform_user_id;
    }
    get channel() {
        return this.channelName;
    }
    async start() {
        this.logger.info(`Запуск сокет-стрима для пользователя ${this.platformUserId}, канал: ${this.channelName}`);
        this.centrifuge = new centrifuge_1.default(this.wsUrl, {
            websocket: ws_1.default,
            onPrivateSubscribe: async (ctx, cb) => {
                try {
                    const client = ctx.data?.client || ctx.client;
                    const channel = ctx.data?.channels?.[0] || ctx.channel || this.channelName;
                    const subData = await this.apiClient.getSubscriptionToken(this.connectionData.access_token, channel, client);
                    cb({ status: 200, data: subData });
                }
                catch (err) {
                    this.logger.error(`Ошибка получения токена подписки для ${this.platformUserId}:`, err);
                    cb({ status: 500, error: err.message });
                    this.callbacks.onTokenError?.(this.connectionData, `Subscription token error: ${err.message}`);
                }
            },
            disableWithCredentials: true,
        });
        try {
            const connectionToken = await this.apiClient.getConnectionToken(this.connectionData.access_token);
            this.centrifuge.setToken(connectionToken);
            this.subscription = this.centrifuge.subscribe(this.channelName, (message) => {
                this.logger.debug("Получены данные из Centrifuge:", JSON.stringify(message, null, 2));
                const notification = message.data?.notification;
                if (!notification || !notification.vars)
                    return;
                this.logger.info(`Получен донат на канале ${this.channelName} от ${notification.vars.name || "Аноним"} (сумма: ${notification.vars.sum} ${notification.vars.currency || "RUB"})`);
                this.callbacks.onNotification?.(notification, this.connectionData);
            });
            this.subscription.on("subscribe", (ctx) => {
                this.logger.info(`Успешная подписка на ${this.channelName}:`, ctx);
            });
            this.subscription.on("error", (err) => {
                this.logger.error(`Ошибка подписки на ${this.channelName}:`, err);
                const errStr = String(err?.message || err?.code || err);
                if (errStr.includes("401") ||
                    errStr.includes("403") ||
                    errStr.includes("token")) {
                    this.callbacks.onTokenError?.(this.connectionData, `Subscription error: ${errStr}`);
                }
                this.callbacks.onError?.(this.connectionData, err);
            });
            this.centrifuge.on("connect", (ctx) => {
                this.logger.info(`Подключен к сокету для ${this.channelName}. Client ID: ${ctx.client}`);
                this.callbacks.onConnected?.(this.connectionData, ctx.client);
            });
            this.centrifuge.on("disconnect", (ctx) => {
                this.logger.info(`Отключен от сокета для ${this.channelName}:`, ctx);
                this.callbacks.onDisconnected?.(this.connectionData, ctx);
            });
            this.centrifuge.on("error", (err) => {
                this.logger.error(`Ошибка на канале ${this.channelName}:`, err);
                const errStr = String(err?.message || err?.code || err);
                if (errStr.includes("401") || errStr.includes("403")) {
                    this.callbacks.onTokenError?.(this.connectionData, `Socket error: ${errStr}`);
                }
                this.callbacks.onError?.(this.connectionData, err);
            });
            this.centrifuge.connect();
        }
        catch (err) {
            this.logger.error(`Не удалось запустить стрим для ${this.platformUserId}:`, err.message);
            this.callbacks.onTokenError?.(this.connectionData, `Connection token failed: ${err.message}`);
            throw err;
        }
    }
    disconnect() {
        this.logger.info(`Остановка стрима для пользователя: ${this.platformUserId}`);
        let success = true;
        try {
            if (this.subscription) {
                this.subscription.unsubscribe();
                this.subscription = null;
            }
            if (this.centrifuge) {
                this.centrifuge.disconnect();
                this.centrifuge = null;
            }
        }
        catch (err) {
            this.logger.error(`Ошибка при закрытии сокета ${this.platformUserId}:`, err);
            success = false;
        }
        return success;
    }
}
exports.CentrifugeStream = CentrifugeStream;
