import crypto from "crypto";
import { DonatePayApiClient, IDonatePayApiClient } from "./api/donatepay-client";
import { AppConfig, CONFIG } from "./config";
import { AmqpClient, IAmqpClient } from "./messaging/amqp-client";
import {
  ConnectCommandHandler,
  DisconnectCommandHandler,
} from "./messaging/command-handlers";
import { StreamManager } from "./stream/stream-manager";
import { DonatePayNotification } from "./types/donatepay.types";
import { DonatePayNewOrderPayload } from "./types/messaging.types";
import { ConnectionData } from "./types/user.types";
import { Logger } from "./utils/logger";
import { extractVideoUrl } from "./utils/url-extractor";

export class BotApp {
  private readonly config: AppConfig;
  private readonly logger: Logger;
  private readonly apiClient: IDonatePayApiClient;
  private readonly amqpClient: IAmqpClient;
  private readonly streamManager: StreamManager;
  private readonly connectHandler: ConnectCommandHandler;
  private readonly disconnectHandler: DisconnectCommandHandler;
  private isRunning = false;

  constructor(options?: {
    config?: AppConfig;
    apiClient?: IDonatePayApiClient;
    amqpClient?: IAmqpClient;
    streamManager?: StreamManager;
    logger?: Logger;
  }) {
    this.config = options?.config || CONFIG;
    this.logger = options?.logger || new Logger("BotApp");

    this.apiClient =
      options?.apiClient ||
      new DonatePayApiClient(
        this.config.tokenUrl,
        fetch,
        this.logger.forContext("ApiClient"),
      );

    this.amqpClient =
      options?.amqpClient ||
      new AmqpClient(this.config, this.logger.forContext("RabbitMQ"));

    this.streamManager =
      options?.streamManager ||
      new StreamManager(
        this.apiClient,
        this.config.wsUrl,
        {
          onNotification: this.handleDonationNotification.bind(this),
          onTokenInvalidated: this.handleTokenInvalidation.bind(this),
        },
        this.logger.forContext("StreamManager"),
      );

    this.connectHandler = new ConnectCommandHandler(
      this.amqpClient,
      this.streamManager,
      this.logger.forContext("ConnectHandler"),
    );

    this.disconnectHandler = new DisconnectCommandHandler(
      this.amqpClient,
      this.streamManager,
      this.logger.forContext("DisconnectHandler"),
    );
  }

  public getStreamManager(): StreamManager {
    return this.streamManager;
  }

  public getAmqpClient(): IAmqpClient {
    return this.amqpClient;
  }

  public getApiClient(): IDonatePayApiClient {
    return this.apiClient;
  }

  private handleDonationNotification(
    notification: DonatePayNotification,
    conn: ConnectionData,
  ): void {
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

    this.amqpClient.publishOrderEvent(eventPayload);
  }

  private handleTokenInvalidation(conn: ConnectionData, _reason: string): void {
    this.amqpClient.publishTokenDied({
      access_token: conn.access_token,
      platform_user_id: conn.platform_user_id,
    });
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn("Приложение уже запущено.");
      return;
    }

    this.isRunning = true;
    this.logger.info("Запуск приложения DonatePay Bot...");

    await this.initRabbitMQ();
  }

  private async initRabbitMQ(): Promise<void> {
    try {
      await this.amqpClient.connect();

      await this.amqpClient.consume(
        this.config.connectQueue,
        async (msg) => {
          await this.connectHandler.handle(msg);
        },
        { noAck: false },
      );

      await this.amqpClient.consume(
        this.config.disconnectQueue,
        async (msg) => {
          await this.disconnectHandler.handle(msg);
        },
        { noAck: false },
      );

      this.logger.info(
        `Очереди инициализированы. Слушаю подключение в ${this.config.connectQueue} и отключение в ${this.config.disconnectQueue}`,
      );

      // Фоновая синхронизация пользователей с бэкенда
      this.syncUsers().catch((err) => {
        this.logger.error("Ошибка при заведении пользователей с сервера:", err);
      });
    } catch (err: any) {
      this.logger.error(
        `Ошибка подключения к RabbitMQ (${err.message}), повтор через 5 сек...`,
      );
      if (this.isRunning) {
        setTimeout(() => this.initRabbitMQ(), 5000);
      }
    }
  }

  public async syncUsers(): Promise<void> {
    const retries = [5000, 10000, 10000, 30000];
    let users: ConnectionData[] | null = null;

    for (let i = 0; i <= retries.length; i++) {
      try {
        users = await this.amqpClient.requestAllUsers(10000);
        break;
      } catch (err: any) {
        this.logger.error(`Ошибка запроса пользователей (${err.message})...`);
        if (i < retries.length && this.isRunning) {
          this.logger.info(
            `Повтор запроса пользователей через ${retries[i] / 1000} сек...`,
          );
          await new Promise((r) => setTimeout(r, retries[i]));
        }
      }
    }

    if (!users) {
      this.logger.error(
        "Не удалось получить пользователей с сервера после нескольких попыток.",
      );
      return;
    }

    this.logger.info(
      `Подключение сокетов для ${users.length} пользователей...`,
    );
    for (const user of users) {
      try {
        await this.streamManager.startStream(user);
      } catch (err: any) {
        this.logger.error(
          `Ошибка подключения для пользователя ${user.platform_user_id}:`,
          err,
        );
      }
    }
  }

  public async stop(): Promise<void> {
    this.logger.info("Остановка приложения DonatePay Bot...");
    this.isRunning = false;

    this.streamManager.stopAll();
    await this.amqpClient.close();
    this.logger.info("DonatePay Bot успешно остановлен.");
  }
}
