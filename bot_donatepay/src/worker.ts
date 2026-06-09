import Centrifuge from 'centrifuge';
import amqp from 'amqplib';

// ==========================================
// ИНТЕРФЕЙСЫ ТИПОВ ДАННЫХ (DonatePay & RabbitMQ)
// ==========================================

export interface DonatePayVideo {
    link: string | null;
    id: string | null;
    start: number | null;
    finish: number | null;
    title: string | null;
    channel: { id: string | null; title: string | null };
    image: string | null;
    live: boolean | null;
    duration: number | null;
    views: number | null;
    likes: number | null;
    dislikes: number | null;
    embeddable: boolean | null;
}

export interface DonatePayVars {
    name: string;
    comment: string;
    sum: number;
    currency: string;
    target: string;
    video: DonatePayVideo;
    boss: string;
    premiumSettings: {
        image: string | null;
        effect: string | null;
        voice: string | null;
        emotion: string | null;
        speed: number | null;
    };
    like: string;
    social_provider: string;
    social_name: string;
}

export interface DonatePayNotification {
    id: number;
    user_id: number;
    type: "donation" | string;
    view: any | null;
    vars: DonatePayVars;
    created_at: string;
}

// Структура сырого фрейма, приходящего от Centrifuge
export interface CentrifugeDonatePayMessage {
    notification: DonatePayNotification;
}

// Выходящий контракт данных, который улетает в Python
export interface OutgoingEventPayload {
    channel: string;
    notification: DonatePayNotification;
}

// Интерфейс команд из управляющей очереди Python
export interface ManagerCommand {
    action: 'subscribe' | 'unsubscribe';
    token?: string;
    channel: string;
}

interface ActiveStream {
    centrifuge: Centrifuge;
    subscription: any; // В старых версиях centrifuge-js тип подписки не экспортирован явно
}

// ==========================================
// ОСНОВНАЯ ЛОГИКА МЕНЕДЖЕРА
// ==========================================

const CONFIG = {
    rabbitUrl: process.env.RABBITMQ_URL || 'amqp://localhost',
    eventQueue: process.env.RABBITMQ_EVENT_QUEUE || 'donatepay_events',
    managerQueue: process.env.RABBITMQ_MANAGER_QUEUE || 'donatepay_manager',
    tokenUrl: process.env.DONATEPAY_TOKEN_URL || 'https://donatepay.ru/api/v2/socket/token',
    wsUrl: process.env.DONATEPAY_WS_URL || 'wss://centrifugo.donatepay.ru:443/connection/websocket',
};

let rabbitChannel: amqp.ConfirmChannel | null = null;
const activeStreams = new Map<string, ActiveStream>();

async function fetchToken(tokenUrl: string, accessToken: string, channel: string | null = null): Promise<string> {
    const payload: Record<string, string> = { access_token: accessToken };
    if (channel) payload.channel = channel;

    const res = await fetch(tokenUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { token: string };
    return data.token;
}

async function startStream(accessToken: string, channelName: string): Promise<void> {
    if (activeStreams.has(channelName)) {
        console.log(`[Manager] Стрим для ${channelName} уже активен.`);
        return;
    }

    console.log(`[Manager] Запуск нового стрима для канала: ${channelName}`);

    const centrifuge = new Centrifuge(CONFIG.wsUrl, {
        subscribeEndpoint: CONFIG.tokenUrl,
        subscribeParams: { access_token: accessToken },
        disableWithCredentials: true
    });

    try {
        const connectionToken = await fetchToken(CONFIG.tokenUrl, accessToken);
        centrifuge.setToken(connectionToken);

        const subscription = centrifuge.subscribe(channelName, (message: CentrifugeDonatePayMessage) => {
            console.log(`[Centrifuge] Получен донат на канале ${channelName} от ${message.notification.vars.name}`);
            
            if (rabbitChannel) {
                // Формируем строго типизированный ответ для Python очереди events
                const eventPayload: OutgoingEventPayload = {
                    channel: channelName,
                    notification: message.notification // сохраняем оригинальную обертку бэкенда
                };
                
                const payload = Buffer.from(JSON.stringify(eventPayload));
                rabbitChannel.sendToQueue(CONFIG.eventQueue, payload, { persistent: true });
            }
        });

        centrifuge.on('connect', (ctx: { client: string }) => console.log(`[Centrifuge] Подключен к сокету для ${channelName}. ID: ${ctx.client}`));
        centrifuge.on('error', (err: any) => console.error(`[Centrifuge] Ошибка на канале ${channelName}:`, err));

        centrifuge.connect();
        activeStreams.set(channelName, { centrifuge, subscription });

    } catch (err: any) {
        console.error(`[Manager] Не удалось запустить стрим для ${channelName}:`, err.message);
    }
}

function stopStream(channelName: string): void {
    const stream = activeStreams.get(channelName);
    if (!stream) {
        console.log(`[Manager] Стрим для ${channelName} не найден для остановки.`);
        return;
    }

    console.log(`[Manager] Остановка стрима для канала: ${channelName}`);
    try {
        stream.subscription.unsubscribe();
        stream.centrifuge.disconnect();
    } catch (err) {
        console.error(`[Manager] Ошибка при закрытии соединений ${channelName}:`, err);
    }

    activeStreams.delete(channelName);
}

async function handleManagerCommand(msg: amqp.ConsumeMessage | null): Promise<void> {
    if (!msg || !rabbitChannel) return;

    try {
        const command = JSON.parse(msg.content.toString()) as ManagerCommand;
        console.log('[Manager] Получена команда:', command);

        const { action, token, channel } = command;

        if (!channel) {
            console.error('[Manager] В команде отсутствует обязательное поле "channel"');
            rabbitChannel.ack(msg);
            return;
        }

        if (action === 'subscribe') {
            if (!token) {
                console.error('[Manager] Для действия "subscribe" необходим "token"');
            } else {
                await startStream(token, channel);
            }
        } else if (action === 'unsubscribe') {
            stopStream(channel);
        } else {
            console.error(`[Manager] Неизвестное действие: ${action}`);
        }

    } catch (err: any) {
        console.error('[Manager] Ошибка обработки команды RabbitMQ:', err.message);
    }

    rabbitChannel.ack(msg);
}

async function initRabbit(): Promise<void> {
    try {
        const connection = await amqp.connect(CONFIG.rabbitUrl);
        rabbitChannel = await connection.createConfirmChannel();
        
        await rabbitChannel.assertQueue(CONFIG.eventQueue, { durable: true });
        await rabbitChannel.assertQueue(CONFIG.managerQueue, { durable: true });
        
        await rabbitChannel.prefetch(1);
        rabbitChannel.consume(CONFIG.managerQueue, handleManagerCommand, { noAck: false });
        
        console.log(`[Manager] Очереди инициализированы. Слушаю команды в: ${CONFIG.managerQueue}`);
        
        connection.on('error', (err) => {
            console.error('[Manager] Ошибка RabbitMQ:', err);
            setTimeout(initRabbit, 5000);
        });
    } catch (err: any) {
        console.error('[Manager] Ошибка подключения к RabbitMQ, ретрай через 5 сек...', err.message);
        setTimeout(initRabbit, 5000);
    }
}

initRabbit();