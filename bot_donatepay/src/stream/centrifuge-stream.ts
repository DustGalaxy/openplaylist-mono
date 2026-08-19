import Centrifuge from "centrifuge";
import WebSocket from "ws";
import { IDonatePayApiClient } from "../api/donatepay-client";
import {
  CentrifugeDonatePayMessage,
  DonatePayNotification,
} from "../types/donatepay.types";
import { ConnectionData } from "../types/user.types";
import { Logger } from "../utils/logger";

// Node.js environment polyfill for Centrifuge ajax check
if (typeof (global as any).XMLHttpRequest === "undefined") {
  (global as any).XMLHttpRequest = class XMLHttpRequest {};
}

export interface CentrifugeStreamCallbacks {
  onNotification?: (
    notification: DonatePayNotification,
    conn: ConnectionData,
  ) => void;
  onTokenError?: (conn: ConnectionData, reason: string) => void;
  onConnected?: (conn: ConnectionData, clientId: string) => void;
  onDisconnected?: (conn: ConnectionData, ctx: any) => void;
  onError?: (conn: ConnectionData, error: any) => void;
}

export class CentrifugeStream {
  private centrifuge: Centrifuge | null = null;
  private subscription: any = null;
  private readonly channelName: string;
  private readonly logger: Logger;

  constructor(
    public readonly connectionData: ConnectionData,
    private readonly wsUrl: string,
    private readonly apiClient: IDonatePayApiClient,
    private readonly callbacks: CentrifugeStreamCallbacks = {},
    logger?: Logger,
  ) {
    this.channelName = `$public:${connectionData.platform_user_id}`;
    this.logger =
      logger || new Logger(`CentrifugeStream:${connectionData.platform_user_id}`);
  }

  public get platformUserId(): string {
    return this.connectionData.platform_user_id;
  }

  public get channel(): string {
    return this.channelName;
  }

  public async start(): Promise<void> {
    this.logger.info(
      `Запуск сокет-стрима для пользователя ${this.platformUserId}, канал: ${this.channelName}`,
    );

    this.centrifuge = new Centrifuge(this.wsUrl, {
      websocket: WebSocket,
      onPrivateSubscribe: async (ctx: any, cb: any) => {
        try {
          const client = ctx.data?.client || ctx.client;
          const channel =
            ctx.data?.channels?.[0] || ctx.channel || this.channelName;

          const subData = await this.apiClient.getSubscriptionToken(
            this.connectionData.access_token,
            channel,
            client,
          );
          cb({ status: 200, data: subData });
        } catch (err: any) {
          this.logger.error(
            `Ошибка получения токена подписки для ${this.platformUserId}:`,
            err,
          );
          cb({ status: 500, error: err.message });
          this.callbacks.onTokenError?.(
            this.connectionData,
            `Subscription token error: ${err.message}`,
          );
        }
      },
      disableWithCredentials: true,
    });

    try {
      const connectionToken = await this.apiClient.getConnectionToken(
        this.connectionData.access_token,
      );
      this.centrifuge.setToken(connectionToken);

      this.subscription = this.centrifuge.subscribe(
        this.channelName,
        (message: CentrifugeDonatePayMessage) => {
          this.logger.debug(
            "Получены данные из Centrifuge:",
            JSON.stringify(message, null, 2),
          );
          const notification = message.data?.notification;
          if (!notification || !notification.vars) return;

          this.logger.info(
            `Получен донат на канале ${this.channelName} от ${notification.vars.name || "Аноним"} (сумма: ${notification.vars.sum} ${notification.vars.currency || "RUB"})`,
          );

          this.callbacks.onNotification?.(notification, this.connectionData);
        },
      );

      this.subscription.on("subscribe", (ctx: any) => {
        this.logger.info(`Успешная подписка на ${this.channelName}:`, ctx);
      });

      this.subscription.on("error", (err: any) => {
        this.logger.error(`Ошибка подписки на ${this.channelName}:`, err);
        const errStr = String(err?.message || err?.code || err);
        if (
          errStr.includes("401") ||
          errStr.includes("403") ||
          errStr.includes("token")
        ) {
          this.callbacks.onTokenError?.(
            this.connectionData,
            `Subscription error: ${errStr}`,
          );
        }
        this.callbacks.onError?.(this.connectionData, err);
      });

      this.centrifuge.on("connect", (ctx: { client: string }) => {
        this.logger.info(
          `Подключен к сокету для ${this.channelName}. Client ID: ${ctx.client}`,
        );
        this.callbacks.onConnected?.(this.connectionData, ctx.client);
      });

      this.centrifuge.on("disconnect", (ctx: any) => {
        this.logger.info(`Отключен от сокета для ${this.channelName}:`, ctx);
        this.callbacks.onDisconnected?.(this.connectionData, ctx);
      });

      this.centrifuge.on("error", (err: any) => {
        this.logger.error(`Ошибка на канале ${this.channelName}:`, err);
        const errStr = String(err?.message || err?.code || err);
        if (errStr.includes("401") || errStr.includes("403")) {
          this.callbacks.onTokenError?.(
            this.connectionData,
            `Socket error: ${errStr}`,
          );
        }
        this.callbacks.onError?.(this.connectionData, err);
      });

      this.centrifuge.connect();
    } catch (err: any) {
      this.logger.error(
        `Не удалось запустить стрим для ${this.platformUserId}:`,
        err.message,
      );
      this.callbacks.onTokenError?.(
        this.connectionData,
        `Connection token failed: ${err.message}`,
      );
      throw err;
    }
  }

  public disconnect(): boolean {
    this.logger.info(
      `Остановка стрима для пользователя: ${this.platformUserId}`,
    );
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
    } catch (err) {
      this.logger.error(
        `Ошибка при закрытии сокета ${this.platformUserId}:`,
        err,
      );
      success = false;
    }

    return success;
  }
}
