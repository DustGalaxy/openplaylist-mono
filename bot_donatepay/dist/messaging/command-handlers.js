"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisconnectCommandHandler = exports.ConnectCommandHandler = void 0;
const logger_1 = require("../utils/logger");
class ConnectCommandHandler {
    amqpClient;
    streamManager;
    logger;
    constructor(amqpClient, streamManager, logger) {
        this.amqpClient = amqpClient;
        this.streamManager = streamManager;
        this.logger = logger || new logger_1.Logger("ConnectCommandHandler");
    }
    async handle(msg) {
        if (!msg)
            return false;
        let success = false;
        try {
            const payload = JSON.parse(msg.content.toString());
            this.logger.info("Получена команда подключения:", payload);
            let connData = null;
            if (payload.platform_user_id && payload.access_token) {
                connData = {
                    user_id: payload.user_id || payload.platform_user_id,
                    platform_user_id: payload.platform_user_id,
                    access_token: payload.access_token,
                    platform: payload.platform,
                    refresh_token: payload.refresh_token,
                    expires_at: payload.expires_at,
                    bot_settings: payload.bot_settings,
                };
            }
            else if (payload.action === "subscribe" &&
                payload.token &&
                payload.channel) {
                const platformUserId = payload.channel.replace("$public:", "");
                connData = {
                    user_id: payload.user_id || platformUserId,
                    platform_user_id: platformUserId,
                    access_token: payload.token,
                    platform: payload.platform,
                    refresh_token: payload.refresh_token,
                    expires_at: payload.expires_at,
                    bot_settings: payload.bot_settings,
                };
            }
            if (connData) {
                success = await this.streamManager.startStream(connData);
            }
            else {
                this.logger.error("Ошибка: некорректный формат сообщения подключения.");
            }
        }
        catch (err) {
            this.logger.error("Ошибка обработки команды подключения:", err.message);
        }
        if (msg.properties.replyTo) {
            this.amqpClient.sendRpcReply(msg.properties.replyTo, msg.properties.correlationId, success);
        }
        this.amqpClient.ack(msg);
        return success;
    }
}
exports.ConnectCommandHandler = ConnectCommandHandler;
class DisconnectCommandHandler {
    amqpClient;
    streamManager;
    logger;
    constructor(amqpClient, streamManager, logger) {
        this.amqpClient = amqpClient;
        this.streamManager = streamManager;
        this.logger = logger || new logger_1.Logger("DisconnectCommandHandler");
    }
    async handle(msg) {
        if (!msg)
            return false;
        let success = false;
        try {
            const contentStr = msg.content.toString();
            let platformUserId = contentStr.replace(/"/g, "").replace("$public:", "").trim();
            try {
                const parsed = JSON.parse(contentStr);
                if (typeof parsed === "string") {
                    platformUserId = parsed.replace("$public:", "").trim();
                }
                else if (parsed.platform_user_id) {
                    platformUserId = String(parsed.platform_user_id).trim();
                }
                else if (parsed.channel) {
                    platformUserId = String(parsed.channel).replace("$public:", "").trim();
                }
            }
            catch {
                // raw string handled above
            }
            if (platformUserId) {
                success = this.streamManager.stopStream(platformUserId);
            }
            else {
                this.logger.error("Ошибка: не удалось определить platform_user_id для отключения");
            }
        }
        catch (err) {
            this.logger.error("Ошибка обработки отключения:", err.message);
        }
        if (msg.properties.replyTo) {
            this.amqpClient.sendRpcReply(msg.properties.replyTo, msg.properties.correlationId, success);
        }
        this.amqpClient.ack(msg);
        return success;
    }
}
exports.DisconnectCommandHandler = DisconnectCommandHandler;
