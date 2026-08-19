import amqp from "amqplib";
import crypto from "crypto";
import { AppConfig } from "../config";
import {
  DonatePayNewOrderPayload,
  TokenDiedPayload,
} from "../types/messaging.types";
import { UserTokensDto } from "../types/user.types";
import { Logger } from "../utils/logger";

export interface IAmqpClient {
  connect(): Promise<void>;
  close(): Promise<void>;
  publishOrderEvent(event: DonatePayNewOrderPayload): boolean;
  publishTokenDied(event: TokenDiedPayload): boolean;
  requestAllUsers(timeoutMs?: number): Promise<UserTokensDto[]>;
  consume(
    queue: string,
    handler: (msg: amqp.ConsumeMessage | null) => Promise<any> | any,
    options?: amqp.Options.Consume,
  ): Promise<amqp.Replies.Consume>;
  sendRpcReply(replyTo: string, correlationId: string, data: any): void;
  ack(msg: amqp.Message): void;
  nack(msg: amqp.Message, requeue?: boolean): void;
}

export class AmqpClient implements IAmqpClient {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.ConfirmChannel | null = null;
  private readonly logger: Logger;

  constructor(
    private readonly config: AppConfig,
    logger?: Logger,
  ) {
    this.logger = logger || new Logger("AmqpClient");
  }

  public get isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }

  public async connect(): Promise<void> {
    this.logger.info(`Подключение к RabbitMQ (${this.config.rabbitUrl})...`);
    this.connection = await amqp.connect(this.config.rabbitUrl);
    this.channel = await this.connection.createConfirmChannel();

    this.connection.on("error", (err: any) => {
      this.logger.error("Ошибка соединения RabbitMQ:", err);
    });

    this.connection.on("close", () => {
      this.logger.warn("Соединение с RabbitMQ закрыто.");
      this.channel = null;
      this.connection = null;
    });

    await this.setupTopology();
  }

  private async setupTopology(): Promise<void> {
    if (!this.channel) {
      throw new Error("Cannot setup topology without active channel");
    }

    await this.channel.assertExchange(this.config.mainExchange, "direct", {
      durable: true,
    });

    await this.channel.assertQueue(this.config.eventQueue, { durable: true });
    await this.channel.assertQueue(this.config.connectQueue, { durable: true });
    await this.channel.assertQueue(this.config.disconnectQueue, { durable: true });

    await this.channel.bindQueue(
      this.config.eventQueue,
      this.config.mainExchange,
      this.config.eventQueue,
    );
    await this.channel.bindQueue(
      this.config.connectQueue,
      this.config.mainExchange,
      this.config.connectQueue,
    );
    await this.channel.bindQueue(
      this.config.disconnectQueue,
      this.config.mainExchange,
      this.config.disconnectQueue,
    );

    await this.channel.prefetch(1);
    this.logger.info("Топология RabbitMQ успешно инициализирована.");
  }

  public publishOrderEvent(event: DonatePayNewOrderPayload): boolean {
    if (!this.channel) {
      this.logger.error("Невозможно отправить заказ: канал RabbitMQ не активен");
      return false;
    }

    try {
      const payload = Buffer.from(JSON.stringify(event));
      const published = this.channel.publish(
        this.config.mainExchange,
        this.config.eventQueue,
        payload,
        { persistent: true },
      );
      this.logger.info(
        `Отправлен заказ в очередь ${this.config.eventQueue}: ${event.request_id} (${event.requester_nickname} - ${event.donation_amount} ${event.donation_currency})`,
      );
      return published;
    } catch (err: any) {
      this.logger.error("Ошибка при публикации заказа в RabbitMQ:", err.message);
      return false;
    }
  }

  public publishTokenDied(event: TokenDiedPayload): boolean {
    if (!this.channel) {
      this.logger.error(
        "Невозможно отправить уведомление о токене: канал RabbitMQ не активен",
      );
      return false;
    }

    try {
      const payload = Buffer.from(JSON.stringify(event));
      const published = this.channel.publish(
        this.config.mainExchange,
        this.config.tokenDiedQueue,
        payload,
        { persistent: true },
      );
      this.logger.info(
        `Оповещение о недействительном API ключе отправлено в ${this.config.tokenDiedQueue} для пользователя ${event.platform_user_id}`,
      );
      return published;
    } catch (err: any) {
      this.logger.error(
        `Ошибка при отправке user_token_died для пользователя ${event.platform_user_id}:`,
        err.message,
      );
      return false;
    }
  }

  public async requestAllUsers(timeoutMs = 10000): Promise<UserTokensDto[]> {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }

    this.logger.info(
      `Запрос списка пользователей с сервера (${this.config.allUsersRequestQueue})...`,
    );

    const replyQueue = await this.channel.assertQueue("", {
      exclusive: true,
      autoDelete: true,
    });
    const correlationId = crypto.randomUUID();

    return new Promise<UserTokensDto[]>((resolve, reject) => {
      let timer: NodeJS.Timeout;

      const consumerPromise = this.channel!.consume(
        replyQueue.queue,
        (msg) => {
          if (!msg) return;
          if (msg.properties.correlationId === correlationId) {
            clearTimeout(timer);
            try {
              const content = msg.content.toString();
              const rawUsers = JSON.parse(content);
              const count = Array.isArray(rawUsers) ? rawUsers.length : 0;
              this.logger.info(
                `Успешно получено пользователей с сервера: ${count}`,
              );

              const users: UserTokensDto[] = (
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
              this.channel?.cancel(msg.fields.consumerTag).catch(() => {});
              this.channel?.deleteQueue(replyQueue.queue).catch(() => {});
            }
          }
        },
        { noAck: true },
      );

      timer = setTimeout(async () => {
        try {
          const { consumerTag } = await consumerPromise;
          await this.channel?.cancel(consumerTag).catch(() => {});
          await this.channel?.deleteQueue(replyQueue.queue).catch(() => {});
        } catch (_) {}
        reject(
          new Error(`Timeout (${timeoutMs}ms) waiting for users from server`),
        );
      }, timeoutMs);

      this.channel!.publish(
        this.config.mainExchange,
        this.config.allUsersRequestQueue,
        Buffer.from(JSON.stringify({})),
        {
          replyTo: replyQueue.queue,
          correlationId: correlationId,
          persistent: false,
        },
      );
    });
  }

  public async consume(
    queue: string,
    handler: (msg: amqp.ConsumeMessage | null) => Promise<any> | any,
    options?: amqp.Options.Consume,
  ): Promise<amqp.Replies.Consume> {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }
    return this.channel.consume(
      queue,
      (msg) => {
        void handler(msg);
      },
      options,
    );
  }

  public sendRpcReply(
    replyTo: string,
    correlationId: string,
    data: any,
  ): void {
    if (!this.channel) return;
    try {
      this.channel.sendToQueue(
        replyTo,
        Buffer.from(JSON.stringify(data)),
        { correlationId },
      );
    } catch (err: any) {
      this.logger.error("Ошибка при отправке RPC ответа:", err.message);
    }
  }

  public ack(msg: amqp.Message): void {
    if (this.channel) {
      this.channel.ack(msg);
    }
  }

  public nack(msg: amqp.Message, requeue = false): void {
    if (this.channel) {
      this.channel.nack(msg, false, requeue);
    }
  }

  public async close(): Promise<void> {
    this.logger.info("Закрытие подключения RabbitMQ...");
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
    } catch (err) {
      this.logger.error("Ошибка при закрытии RabbitMQ:", err);
    }
  }
}
