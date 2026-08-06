"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const centrifuge_1 = __importDefault(require("centrifuge"));
const amqplib_1 = __importDefault(require("amqplib"));
const crypto_1 = __importDefault(require("crypto"));
const ws_1 = __importDefault(require("ws"));
// Node.js environment polyfill for Centrifuge ajax check
if (typeof global.XMLHttpRequest === 'undefined') {
    global.XMLHttpRequest = class XMLHttpRequest {
    };
}
// ==========================================
// ОСНОВНАЯ ЛОГИКА МЕНЕДЖЕРА
// ==========================================
const CONFIG = {
    rabbitUrl: process.env.RABBITMQ_URL || 'amqp://localhost',
    eventQueue: process.env.RABBITMQ_EVENT_QUEUE || 'bot.donatepay.order.new',
    connectQueue: process.env.RABBITMQ_CONNECT_QUEUE || 'bot.donatepay.connect.request',
    disconnectQueue: process.env.RABBITMQ_DISCONNECT_QUEUE || 'bot.donatepay.disconnect',
    mainExchange: process.env.RABBITMQ_MAIN_EXCHANGE || 'main_exchange',
    tokenUrl: process.env.DONATEPAY_TOKEN_URL || 'https://donatepay.eu/api/v2/socket/token',
    wsUrl: process.env.DONATEPAY_WS_URL || 'wss://centrifugo.donatepay.eu:443/connection/websocket',
};
let rabbitChannel = null;
const activeStreams = new Map();
function extractVideoUrl(vars) {
    if (vars.video?.link) {
        return vars.video.link;
    }
    if (vars.video?.id) {
        return `https://www.youtube.com/watch?v=${vars.video.id}`;
    }
    if (vars.comment) {
        const match = vars.comment.match(/(https?:\/\/[^\s]+)/);
        if (match)
            return match[1];
    }
    return '';
}
async function fetchConnectionToken(tokenUrl, accessToken) {
    const res = await fetch(tokenUrl, {
        method: 'POST',
        body: JSON.stringify({ access_token: accessToken }),
        headers: { "Content-Type": "application/json" }
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
    }
    const data = await res.json();
    if (!data.token) {
        throw new Error(`Token API returned invalid response: ${JSON.stringify(data)}`);
    }
    return data.token;
}
async function fetchSubscriptionToken(tokenUrl, accessToken, channel, client) {
    const params = new URLSearchParams();
    params.append('access_token', accessToken);
    params.append('client', client);
    params.append('channels[]', channel);
    const res = await fetch(tokenUrl, {
        method: 'POST',
        body: params.toString(),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
        }
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return await res.json();
}
async function startStream(conn) {
    const channelName = `$public:${conn.platform_user_id}`;
    if (activeStreams.has(conn.platform_user_id)) {
        console.log(`[Manager] Стрим для пользователя ${conn.platform_user_id} (${channelName}) уже активен.`);
        return true;
    }
    console.log(`[Manager] Запуск сокет-стрима для пользователя ${conn.platform_user_id}, канал: ${channelName}`);
    const centrifuge = new centrifuge_1.default(CONFIG.wsUrl, {
        websocket: ws_1.default,
        onPrivateSubscribe: async (ctx, cb) => {
            try {
                const client = ctx.data?.client || ctx.client;
                const channel = ctx.data?.channels?.[0] || ctx.channel || channelName;
                const subData = await fetchSubscriptionToken(CONFIG.tokenUrl, conn.access_token, channel, client);
                cb({ status: 200, data: subData });
            }
            catch (err) {
                console.error('[Centrifuge] Error fetching subscription token:', err);
                cb({ status: 500, error: err.message });
            }
        },
        disableWithCredentials: true
    });
    try {
        const connectionToken = await fetchConnectionToken(CONFIG.tokenUrl, conn.access_token);
        centrifuge.setToken(connectionToken);
        const subscription = centrifuge.subscribe(channelName, (message) => {
            console.log(`[Centrifuge] Получен донат на канале ${channelName} от ${message.notification?.vars?.name || 'Аноним'}`);
            if (!message.notification || !message.notification.vars)
                return;
            if (rabbitChannel) {
                const videoUrl = extractVideoUrl(message.notification.vars);
                const eventPayload = {
                    request_id: crypto_1.default.randomUUID(),
                    owner_platform_id: conn.platform_user_id,
                    owner_id: conn.user_id,
                    requester_id: String(message.notification.id || Date.now()),
                    requester_nickname: message.notification.vars.name || 'Anonymous',
                    donation_amount: Number(message.notification.vars.sum) || 0,
                    donation_currency: message.notification.vars.currency || 'RUB',
                    yt_video_url: videoUrl,
                    priority: 'donation',
                    source: 'donatepay'
                };
                const payload = Buffer.from(JSON.stringify(eventPayload));
                rabbitChannel.publish(CONFIG.mainExchange, CONFIG.eventQueue, payload, { persistent: true });
                console.log(`[Manager] Отправлен заказ в очередь ${CONFIG.eventQueue}:`, eventPayload.request_id);
            }
        });
        subscription.on('subscribe', (ctx) => console.log(`[Centrifuge] Успешная подписка на ${channelName}:`, ctx));
        subscription.on('error', (err) => console.error(`[Centrifuge] Ошибка подписки на ${channelName}:`, err));
        centrifuge.on('connect', (ctx) => console.log(`[Centrifuge] Подключен к сокету для ${channelName}. Client ID: ${ctx.client}`));
        centrifuge.on('disconnect', (ctx) => console.log(`[Centrifuge] Отключен от сокета для ${channelName}:`, ctx));
        centrifuge.on('error', (err) => console.error(`[Centrifuge] Ошибка на канале ${channelName}:`, err));
        centrifuge.connect();
        activeStreams.set(conn.platform_user_id, { centrifuge, subscription, connectionData: conn });
        return true;
    }
    catch (err) {
        console.error(`[Manager] Не удалось запустить стрим для ${conn.platform_user_id}:`, err.message);
        return false;
    }
}
function stopStream(platformUserId) {
    const stream = activeStreams.get(platformUserId);
    if (!stream) {
        console.log(`[Manager] Стрим для пользователя ${platformUserId} не найден.`);
        return true;
    }
    console.log(`[Manager] Остановка стрима для пользователя: ${platformUserId}`);
    try {
        stream.subscription.unsubscribe();
        stream.centrifuge.disconnect();
    }
    catch (err) {
        console.error(`[Manager] Ошибка при закрытии сокета ${platformUserId}:`, err);
        return false;
    }
    activeStreams.delete(platformUserId);
    return true;
}
async function handleConnectCommand(msg) {
    if (!msg || !rabbitChannel)
        return false;
    let success = false;
    try {
        const payload = JSON.parse(msg.content.toString());
        console.log('[Manager] Получена команда подключения:', payload);
        let connData = null;
        if (payload.platform_user_id && payload.access_token) {
            connData = payload;
        }
        else if (payload.action === 'subscribe' && payload.token && payload.channel) {
            const platformUserId = payload.channel.replace('$public:', '');
            connData = {
                user_id: payload.user_id || platformUserId,
                platform_user_id: platformUserId,
                access_token: payload.token
            };
        }
        if (connData) {
            success = await startStream(connData);
        }
        else {
            console.error('[Manager] Ошибка: некорректный формат сообщения подключения.');
        }
    }
    catch (err) {
        console.error('[Manager] Ошибка обработки команды подключения:', err.message);
    }
    if (msg.properties.replyTo) {
        rabbitChannel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(success)), { correlationId: msg.properties.correlationId });
    }
    rabbitChannel.ack(msg);
    return success;
}
async function handleDisconnectCommand(msg) {
    if (!msg || !rabbitChannel)
        return false;
    let success = false;
    try {
        const contentStr = msg.content.toString();
        let platformUserId = contentStr.replace(/"/g, '').trim();
        try {
            const parsed = JSON.parse(contentStr);
            if (typeof parsed === 'string')
                platformUserId = parsed;
            else if (parsed.platform_user_id)
                platformUserId = parsed.platform_user_id;
            else if (parsed.channel)
                platformUserId = parsed.channel.replace('$public:', '');
        }
        catch {
            // raw string
        }
        if (platformUserId) {
            success = stopStream(platformUserId);
        }
    }
    catch (err) {
        console.error('[Manager] Ошибка обработки отключения:', err.message);
    }
    if (msg.properties.replyTo) {
        rabbitChannel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(success)), { correlationId: msg.properties.correlationId });
    }
    rabbitChannel.ack(msg);
    return success;
}
async function initRabbit() {
    try {
        const connection = await amqplib_1.default.connect(CONFIG.rabbitUrl);
        rabbitChannel = await connection.createConfirmChannel();
        await rabbitChannel.assertExchange(CONFIG.mainExchange, 'direct', { durable: true });
        await rabbitChannel.assertQueue(CONFIG.eventQueue, { durable: true });
        await rabbitChannel.assertQueue(CONFIG.connectQueue, { durable: true });
        await rabbitChannel.assertQueue(CONFIG.disconnectQueue, { durable: true });
        await rabbitChannel.bindQueue(CONFIG.eventQueue, CONFIG.mainExchange, CONFIG.eventQueue);
        await rabbitChannel.bindQueue(CONFIG.connectQueue, CONFIG.mainExchange, CONFIG.connectQueue);
        await rabbitChannel.bindQueue(CONFIG.disconnectQueue, CONFIG.mainExchange, CONFIG.disconnectQueue);
        await rabbitChannel.prefetch(1);
        rabbitChannel.consume(CONFIG.connectQueue, handleConnectCommand, { noAck: false });
        rabbitChannel.consume(CONFIG.disconnectQueue, handleDisconnectCommand, { noAck: false });
        console.log(`[Manager] Очереди инициализированы. Слушаю подключение в ${CONFIG.connectQueue} и отключение в ${CONFIG.disconnectQueue}`);
        connection.on('error', (err) => {
            console.error('[Manager] Ошибка подключения RabbitMQ:', err);
            setTimeout(initRabbit, 5000);
        });
    }
    catch (err) {
        console.error('[Manager] Ошибка подключения к RabbitMQ, ретрай через 5 сек...', err.message);
        setTimeout(initRabbit, 5000);
    }
}
initRabbit();
