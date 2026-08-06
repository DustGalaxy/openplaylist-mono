import Centrifuge from "centrifuge";
import amqp from "amqplib";
import crypto from "crypto";
import WebSocket from "ws";

// Node.js environment polyfill for Centrifuge ajax check
if (typeof (global as any).XMLHttpRequest === "undefined") {
  (global as any).XMLHttpRequest = class XMLHttpRequest {};
}

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
  video?: DonatePayVideo;
  boss: string;
  premiumSettings?: {
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

export interface CentrifugeDonatePayMessage {
  data: {
    notification: DonatePayNotification;
  };
}

export interface ConnectionData {
  user_id: string; // UUID владельца аккаунта в OpenPlaylist
  platform_user_id: string;
  access_token: string;
  bot_settings?: Record<string, any> | null;
}

export interface DonatePayNewOrderPayload {
  request_id: string;
  owner_platform_id: str;
  owner_id: string;
  requester_id: string;
  requester_nickname: string;
  donation_amount: number;
  donation_currency: string;
  yt_video_url: string;
  priority: string;
  source: string;
}

interface ActiveStream {
  centrifuge: Centrifuge;
  subscription: any;
  connectionData: ConnectionData;
}

type str = string;

// ==========================================
// ОСНОВНАЯ ЛОГИКА МЕНЕДЖЕРА
// ==========================================

const CONFIG = {
  rabbitUrl: process.env.RABBITMQ_URL || "amqp://localhost",
  eventQueue: process.env.RABBITMQ_EVENT_QUEUE || "bot.donatepay.order.new",
  connectQueue:
    process.env.RABBITMQ_CONNECT_QUEUE || "bot.donatepay.connect.request",
  disconnectQueue:
    process.env.RABBITMQ_DISCONNECT_QUEUE || "bot.donatepay.disconnect",
  mainExchange: process.env.RABBITMQ_MAIN_EXCHANGE || "main_exchange",
  tokenUrl:
    process.env.DONATEPAY_TOKEN_URL ||
    "https://donatepay.eu/api/v2/socket/token",
  wsUrl:
    process.env.DONATEPAY_WS_URL ||
    "wss://centrifugo.donatepay.eu:443/connection/websocket",
};

let rabbitChannel: amqp.ConfirmChannel | null = null;
const activeStreams = new Map<string, ActiveStream>();

function extractVideoUrl(vars: DonatePayVars): string {
  if (vars.video?.link) {
    return vars.video.link;
  }
  if (vars.video?.id) {
    return `https://www.youtube.com/watch?v=${vars.video.id}`;
  }
  if (vars.comment) {
    const match = vars.comment.match(/(https?:\/\/[^\s]+)/);
    if (match) return match[1];
  }
  return "";
}

async function fetchConnectionToken(
  tokenUrl: string,
  accessToken: string,
): Promise<string> {
  const res = await fetch(tokenUrl, {
    method: "POST",
    body: JSON.stringify({ access_token: accessToken }),
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { token: string };
  if (!data.token) {
    throw new Error(
      `Token API returned invalid response: ${JSON.stringify(data)}`,
    );
  }
  return data.token;
}

async function fetchSubscriptionToken(
  tokenUrl: string,
  accessToken: string,
  channel: string,
  client: string,
): Promise<any> {
  const params = new URLSearchParams();
  params.append("access_token", accessToken);
  params.append("client", client);
  params.append("channels[]", channel);

  const res = await fetch(tokenUrl, {
    method: "POST",
    body: params.toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return await res.json();
}

async function startStream(conn: ConnectionData): Promise<boolean> {
  const channelName = `$public:${conn.platform_user_id}`;

  if (activeStreams.has(conn.platform_user_id)) {
    console.log(
      `[Manager] Стрим для пользователя ${conn.platform_user_id} (${channelName}) уже активен.`,
    );
    return true;
  }

  console.log(
    `[Manager] Запуск сокет-стрима для пользователя ${conn.platform_user_id}, канал: ${channelName}`,
  );

  const centrifuge = new Centrifuge(CONFIG.wsUrl, {
    websocket: WebSocket,
    onPrivateSubscribe: async (ctx: any, cb: any) => {
      try {
        const client = ctx.data?.client || ctx.client;
        const channel = ctx.data?.channels?.[0] || ctx.channel || channelName;

        const subData = await fetchSubscriptionToken(
          CONFIG.tokenUrl,
          conn.access_token,
          channel,
          client,
        );
        cb({ status: 200, data: subData });
      } catch (err: any) {
        console.error("[Centrifuge] Error fetching subscription token:", err);
        cb({ status: 500, error: err.message });
      }
    },
    disableWithCredentials: true,
  });

  try {
    const connectionToken = await fetchConnectionToken(
      CONFIG.tokenUrl,
      conn.access_token,
    );
    centrifuge.setToken(connectionToken);

    const subscription = centrifuge.subscribe(
      channelName,
      (message: CentrifugeDonatePayMessage) => {
        console.log("[Centrifuge] Data:", JSON.stringify(message, null, 2));
        const notification = message.data?.notification;
        if (!notification || !notification.vars) return;

        console.log(
          `[Centrifuge] Получен донат на канале ${channelName} от ${notification.vars.name || "Аноним"}`,
        );

        if (rabbitChannel) {
          const videoUrl = extractVideoUrl(notification.vars);

          const eventPayload: DonatePayNewOrderPayload = {
            request_id: crypto.randomUUID(),
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

          const payload = Buffer.from(JSON.stringify(eventPayload));
          rabbitChannel.publish(
            CONFIG.mainExchange,
            CONFIG.eventQueue,
            payload,
            { persistent: true },
          );
          console.log(
            `[Manager] Отправлен заказ в очередь ${CONFIG.eventQueue}:`,
            eventPayload.request_id,
          );
        }
      },
    );

    subscription.on("subscribe", (ctx: any) =>
      console.log(`[Centrifuge] Успешная подписка на ${channelName}:`, ctx),
    );
    subscription.on("error", (err: any) =>
      console.error(`[Centrifuge] Ошибка подписки на ${channelName}:`, err),
    );

    centrifuge.on("connect", (ctx: { client: string }) =>
      console.log(
        `[Centrifuge] Подключен к сокету для ${channelName}. Client ID: ${ctx.client}`,
      ),
    );
    centrifuge.on("disconnect", (ctx: any) =>
      console.log(`[Centrifuge] Отключен от сокета для ${channelName}:`, ctx),
    );
    centrifuge.on("error", (err: any) =>
      console.error(`[Centrifuge] Ошибка на канале ${channelName}:`, err),
    );

    centrifuge.connect();
    activeStreams.set(conn.platform_user_id, {
      centrifuge,
      subscription,
      connectionData: conn,
    });
    return true;
  } catch (err: any) {
    console.error(
      `[Manager] Не удалось запустить стрим для ${conn.platform_user_id}:`,
      err.message,
    );
    return false;
  }
}

function stopStream(platformUserId: string): boolean {
  const stream = activeStreams.get(platformUserId);
  if (!stream) {
    console.log(
      `[Manager] Стрим для пользователя ${platformUserId} не найден.`,
    );
    return true;
  }

  console.log(`[Manager] Остановка стрима для пользователя: ${platformUserId}`);
  try {
    stream.subscription.unsubscribe();
    stream.centrifuge.disconnect();
  } catch (err) {
    console.error(
      `[Manager] Ошибка при закрытии сокета ${platformUserId}:`,
      err,
    );
    return false;
  }

  activeStreams.delete(platformUserId);
  return true;
}

async function handleConnectCommand(
  msg: amqp.ConsumeMessage | null,
): Promise<boolean> {
  if (!msg || !rabbitChannel) return false;

  let success = false;

  try {
    const payload = JSON.parse(msg.content.toString());
    console.log("[Manager] Получена команда подключения:", payload);

    let connData: ConnectionData | null = null;
    if (payload.platform_user_id && payload.access_token) {
      connData = payload as ConnectionData;
    } else if (
      payload.action === "subscribe" &&
      payload.token &&
      payload.channel
    ) {
      const platformUserId = payload.channel.replace("$public:", "");
      connData = {
        user_id: payload.user_id || platformUserId,
        platform_user_id: platformUserId,
        access_token: payload.token,
      };
    }

    if (connData) {
      success = await startStream(connData);
    } else {
      console.error(
        "[Manager] Ошибка: некорректный формат сообщения подключения.",
      );
    }
  } catch (err: any) {
    console.error(
      "[Manager] Ошибка обработки команды подключения:",
      err.message,
    );
  }

  if (msg.properties.replyTo) {
    rabbitChannel.sendToQueue(
      msg.properties.replyTo,
      Buffer.from(JSON.stringify(success)),
      { correlationId: msg.properties.correlationId },
    );
  }

  rabbitChannel.ack(msg);
  return success;
}

async function handleDisconnectCommand(
  msg: amqp.ConsumeMessage | null,
): Promise<boolean> {
  if (!msg || !rabbitChannel) return false;

  let success = false;

  try {
    const contentStr = msg.content.toString();
    let platformUserId = contentStr.replace(/"/g, "").trim();

    try {
      const parsed = JSON.parse(contentStr);
      if (typeof parsed === "string") platformUserId = parsed;
      else if (parsed.platform_user_id)
        platformUserId = parsed.platform_user_id;
      else if (parsed.channel)
        platformUserId = parsed.channel.replace("$public:", "");
    } catch {
      // raw string
    }

    if (platformUserId) {
      success = stopStream(platformUserId);
    }
  } catch (err: any) {
    console.error("[Manager] Ошибка обработки отключения:", err.message);
  }

  if (msg.properties.replyTo) {
    rabbitChannel.sendToQueue(
      msg.properties.replyTo,
      Buffer.from(JSON.stringify(success)),
      { correlationId: msg.properties.correlationId },
    );
  }

  rabbitChannel.ack(msg);
  return success;
}

async function initRabbit(): Promise<void> {
  try {
    const connection = await amqp.connect(CONFIG.rabbitUrl);
    rabbitChannel = await connection.createConfirmChannel();

    await rabbitChannel.assertExchange(CONFIG.mainExchange, "direct", {
      durable: true,
    });

    await rabbitChannel.assertQueue(CONFIG.eventQueue, { durable: true });
    await rabbitChannel.assertQueue(CONFIG.connectQueue, { durable: true });
    await rabbitChannel.assertQueue(CONFIG.disconnectQueue, { durable: true });

    await rabbitChannel.bindQueue(
      CONFIG.eventQueue,
      CONFIG.mainExchange,
      CONFIG.eventQueue,
    );
    await rabbitChannel.bindQueue(
      CONFIG.connectQueue,
      CONFIG.mainExchange,
      CONFIG.connectQueue,
    );
    await rabbitChannel.bindQueue(
      CONFIG.disconnectQueue,
      CONFIG.mainExchange,
      CONFIG.disconnectQueue,
    );

    await rabbitChannel.prefetch(1);
    rabbitChannel.consume(CONFIG.connectQueue, handleConnectCommand, {
      noAck: false,
    });
    rabbitChannel.consume(CONFIG.disconnectQueue, handleDisconnectCommand, {
      noAck: false,
    });

    console.log(
      `[Manager] Очереди инициализированы. Слушаю подключение в ${CONFIG.connectQueue} и отключение в ${CONFIG.disconnectQueue}`,
    );

    connection.on("error", (err) => {
      console.error("[Manager] Ошибка подключения RabbitMQ:", err);
      setTimeout(initRabbit, 5000);
    });
  } catch (err: any) {
    console.error(
      "[Manager] Ошибка подключения к RabbitMQ, ретрай через 5 сек...",
      err.message,
    );
    setTimeout(initRabbit, 5000);
  }
}

initRabbit();
