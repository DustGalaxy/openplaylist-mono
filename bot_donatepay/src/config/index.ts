export interface AppConfig {
  rabbitUrl: string;
  mainExchange: string;
  eventQueue: string;
  connectQueue: string;
  disconnectQueue: string;
  tokenDiedQueue: string;
  allUsersRequestQueue: string;
  tokenUrl: string;
  wsUrl: string;
}

export function loadConfig(): AppConfig {
  return {
    rabbitUrl: process.env.RABBITMQ_URL || "amqp://localhost",
    mainExchange: process.env.RABBITMQ_MAIN_EXCHANGE || "main_exchange",
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
    tokenUrl:
      process.env.DONATEPAY_TOKEN_URL ||
      "https://donatepay.eu/api/v2/socket/token",
    wsUrl:
      process.env.DONATEPAY_WS_URL ||
      "wss://centrifugo.donatepay.eu:443/connection/websocket",
  };
}

export const CONFIG: AppConfig = loadConfig();
