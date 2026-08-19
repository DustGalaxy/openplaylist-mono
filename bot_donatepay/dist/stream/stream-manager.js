"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamManager = void 0;
const logger_1 = require("../utils/logger");
const centrifuge_stream_1 = require("./centrifuge-stream");
class StreamManager {
    apiClient;
    wsUrl;
    callbacks;
    activeStreams = new Map();
    logger;
    constructor(apiClient, wsUrl, callbacks = {}, logger) {
        this.apiClient = apiClient;
        this.wsUrl = wsUrl;
        this.callbacks = callbacks;
        this.logger = logger || new logger_1.Logger("StreamManager");
    }
    hasStream(platformUserId) {
        return this.activeStreams.has(platformUserId);
    }
    getStream(platformUserId) {
        return this.activeStreams.get(platformUserId);
    }
    getActiveCount() {
        return this.activeStreams.size;
    }
    getActiveUserIds() {
        return Array.from(this.activeStreams.keys());
    }
    async startStream(conn) {
        const platformUserId = conn.platform_user_id;
        const channelName = `$public:${platformUserId}`;
        if (this.activeStreams.has(platformUserId)) {
            this.logger.info(`Стрим для пользователя ${platformUserId} (${channelName}) уже активен.`);
            return true;
        }
        const streamCallbacks = {
            onNotification: (notification, connection) => {
                this.callbacks.onNotification?.(notification, connection);
            },
            onTokenError: (connection, reason) => {
                this.logger.warn(`Инвалидация API ключа для пользователя ${connection.platform_user_id}. Причина: ${reason}`);
                this.stopStream(connection.platform_user_id);
                this.callbacks.onTokenInvalidated?.(connection, reason);
            },
        };
        const stream = new centrifuge_stream_1.CentrifugeStream(conn, this.wsUrl, this.apiClient, streamCallbacks, this.logger.forContext(`User:${platformUserId}`));
        try {
            await stream.start();
            this.activeStreams.set(platformUserId, stream);
            return true;
        }
        catch (err) {
            this.logger.error(`Ошибка при запуске сокета для пользователя ${platformUserId}:`, err.message);
            return false;
        }
    }
    stopStream(platformUserId) {
        const stream = this.activeStreams.get(platformUserId);
        if (!stream) {
            this.logger.info(`Стрим для пользователя ${platformUserId} не найден.`);
            return true;
        }
        const result = stream.disconnect();
        this.activeStreams.delete(platformUserId);
        return result;
    }
    stopAll() {
        this.logger.info(`Остановка всех активных стримов (${this.activeStreams.size} шт.)...`);
        for (const [platformUserId, stream] of this.activeStreams.entries()) {
            try {
                stream.disconnect();
            }
            catch (err) {
                this.logger.error(`Ошибка при остановке стрима для ${platformUserId}:`, err);
            }
        }
        this.activeStreams.clear();
    }
}
exports.StreamManager = StreamManager;
