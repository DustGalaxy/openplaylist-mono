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
  platform?: string;
  refresh_token?: string;
  expires_at?: number;
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
  tokenDiedQueue:
    process.env.RABBITMQ_TOKEN_DIED_QUEUE || "donatepay.user.token.died",
  allUsersRequestQueue:
    process.env.RABBITMQ_ALL_USERS_REQUEST_QUEUE ||
    "auth.user.donatepay.all.request",
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

export async function invalidateUserToken(
  conn: ConnectionData,
  reason?: string,
): Promise<void> {
  console.error(
    `[Manager] Инвалидация API ключа для пользователя ${conn.platform_user_id}. Причина: ${reason || "ошибка авторизации"}`,
  );

  stopStream(conn.platform_user_id);

  if (rabbitChannel) {
    try {
      const payload = Buffer.from(
        JSON.stringify({
          access_token: conn.access_token,
          platform_user_id: conn.platform_user_id,
        }),
      );

      rabbitChannel.publish(
        CONFIG.mainExchange,
        CONFIG.tokenDiedQueue,
        payload,
        { persistent: true },
      );
      console.log(
        `[Manager] Оповещение о недействительном API ключе отправлено в ${CONFIG.tokenDiedQueue} для пользователя ${conn.platform_user_id}`,
      );
    } catch (err: any) {
      console.error(
        `[Manager] Ошибка при отправке user_token_died:`,
        err.message,
      );
    }
  }
}

export async function fetchUsersFromBackend(
  timeoutMs = 10000,
): Promise<ConnectionData[]> {
  if (!rabbitChannel) {
    throw new Error("RabbitMQ channel not initialized");
  }

  console.log(
    `[Manager] Запрос списка пользователей с сервера (${CONFIG.allUsersRequestQueue})...`,
  );

  const replyQueue = await rabbitChannel.assertQueue("", {
    exclusive: true,
    autoDelete: true,
  });
  const correlationId = crypto.randomUUID();

  return new Promise<ConnectionData[]>((resolve, reject) => {
    let timer: NodeJS.Timeout;

    const consumerPromise = rabbitChannel!.consume(
      replyQueue.queue,
      (msg) => {
        if (!msg) return;
        if (msg.properties.correlationId === correlationId) {
          clearTimeout(timer);
          try {
            const content = msg.content.toString();
            const rawUsers = JSON.parse(content);
            console.log(
              `[Manager] Успешно получено пользователей с сервера: ${Array.isArray(rawUsers) ? rawUsers.length : 0}`,
            );
            const users: ConnectionData[] = (
              Array.isArray(rawUsers) ? rawUsers : []
            ).map((u: any) => ({
              user_id: u.user_id,
              platform: u.platform,
              platform_user_id: u.platform_user_id,
              access_token: u.access_token,
              refresh_token: u.refresh_token || "",
              expires_at: u.expires_at || 0,
              bot_settings: u.bot_settings ?? null,
            }));
            resolve(users);
          } catch (err) {
            reject(new Error(`Failed to parse users response: ${err}`));
          } finally {
            rabbitChannel?.cancel(msg.fields.consumerTag).catch(() => {});
            rabbitChannel?.deleteQueue(replyQueue.queue).catch(() => {});
          }
        }
      },
      { noAck: true },
    );

    timer = setTimeout(async () => {
      try {
        const { consumerTag } = await consumerPromise;
        await rabbitChannel?.cancel(consumerTag).catch(() => {});
        await rabbitChannel?.deleteQueue(replyQueue.queue).catch(() => {});
      } catch (_) {}
      reject(
        new Error(`Timeout (${timeoutMs}ms) waiting for users from server`),
      );
    }, timeoutMs);

    rabbitChannel!.publish(
      CONFIG.mainExchange,
      CONFIG.allUsersRequestQueue,
      Buffer.from(JSON.stringify({})),
      {
        replyTo: replyQueue.queue,
        correlationId: correlationId,
        persistent: false,
      },
    );
  });
}

export async function setupUsers(): Promise<void> {
  const retries = [5000, 10000, 10000, 30000];
  let users: ConnectionData[] | null = null;

  for (let i = 0; i <= retries.length; i++) {
    try {
      users = await fetchUsersFromBackend(10000);
      break;
    } catch (err: any) {
      console.error(
        `[Manager] Ошибка запроса пользователей (${err.message})...`,
      );
      if (i < retries.length) {
        console.log(
          `[Manager] Повтор запроса пользователей через ${retries[i] / 1000} сек...`,
        );
        await new Promise((r) => setTimeout(r, retries[i]));
      }
    }
  }

  if (!users) {
    console.error(
      "[Manager] Не удалось получить пользователей с сервера после нескольких попыток.",
    );
    return;
  }

  console.log(
    `[Manager] Подключение сокетов для ${users.length} пользователей...`,
  );
  for (const user of users) {
    try {
      await startStream(user);
    } catch (err: any) {
      console.error(
        `[Manager] Ошибка подключения для пользователя ${user.platform_user_id}:`,
        err,
      );
    }
  }
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
        console.error(
          `[Centrifuge] Error fetching subscription token for ${conn.platform_user_id}:`,
          err,
        );
        cb({ status: 500, error: err.message });
        await invalidateUserToken(
          conn,
          `Subscription token error: ${err.message}`,
        );
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
    subscription.on("error", async (err: any) => {
      console.error(`[Centrifuge] Ошибка подписки на ${channelName}:`, err);
      const errStr = String(err?.message || err?.code || err);
      if (
        errStr.includes("401") ||
        errStr.includes("403") ||
        errStr.includes("token")
      ) {
        await invalidateUserToken(conn, `Subscription error: ${errStr}`);
      }
    });

    centrifuge.on("connect", (ctx: { client: string }) =>
      console.log(
        `[Centrifuge] Подключен к сокету для ${channelName}. Client ID: ${ctx.client}`,
      ),
    );
    centrifuge.on("disconnect", (ctx: any) =>
      console.log(`[Centrifuge] Отключен от сокета для ${channelName}:`, ctx),
    );
    centrifuge.on("error", async (err: any) => {
      console.error(`[Centrifuge] Ошибка на канале ${channelName}:`, err);
      const errStr = String(err?.message || err?.code || err);
      if (errStr.includes("401") || errStr.includes("403")) {
        await invalidateUserToken(conn, `Socket error: ${errStr}`);
      }
    });

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
    await invalidateUserToken(conn, `Connection token failed: ${err.message}`);
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

    setupUsers().catch((err) => {
      console.error(
        "[Manager] Ошибка при заведении пользователей с сервера:",
        err,
      );
    });

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
