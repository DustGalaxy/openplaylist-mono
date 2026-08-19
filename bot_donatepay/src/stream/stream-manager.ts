import { IDonatePayApiClient } from "../api/donatepay-client";
import { DonatePayNotification } from "../types/donatepay.types";
import { ConnectionData } from "../types/user.types";
import { Logger } from "../utils/logger";
import { CentrifugeStream, CentrifugeStreamCallbacks } from "./centrifuge-stream";

export interface StreamManagerCallbacks {
  onNotification?: (
    notification: DonatePayNotification,
    conn: ConnectionData,
  ) => void;
  onTokenInvalidated?: (conn: ConnectionData, reason: string) => void;
}

export class StreamManager {
  private readonly activeStreams = new Map<string, CentrifugeStream>();
  private readonly logger: Logger;

  constructor(
    private readonly apiClient: IDonatePayApiClient,
    private readonly wsUrl: string,
    private readonly callbacks: StreamManagerCallbacks = {},
    logger?: Logger,
  ) {
    this.logger = logger || new Logger("StreamManager");
  }

  public hasStream(platformUserId: string): boolean {
    return this.activeStreams.has(platformUserId);
  }

  public getStream(platformUserId: string): CentrifugeStream | undefined {
    return this.activeStreams.get(platformUserId);
  }

  public getActiveCount(): number {
    return this.activeStreams.size;
  }

  public getActiveUserIds(): string[] {
    return Array.from(this.activeStreams.keys());
  }

  public async startStream(conn: ConnectionData): Promise<boolean> {
    const platformUserId = conn.platform_user_id;
    const channelName = `$public:${platformUserId}`;

    if (this.activeStreams.has(platformUserId)) {
      this.logger.info(
        `Стрим для пользователя ${platformUserId} (${channelName}) уже активен.`,
      );
      return true;
    }

    const streamCallbacks: CentrifugeStreamCallbacks = {
      onNotification: (notification, connection) => {
        this.callbacks.onNotification?.(notification, connection);
      },
      onTokenError: (connection, reason) => {
        this.logger.warn(
          `Инвалидация API ключа для пользователя ${connection.platform_user_id}. Причина: ${reason}`,
        );
        this.stopStream(connection.platform_user_id);
        this.callbacks.onTokenInvalidated?.(connection, reason);
      },
    };

    const stream = new CentrifugeStream(
      conn,
      this.wsUrl,
      this.apiClient,
      streamCallbacks,
      this.logger.forContext(`User:${platformUserId}`),
    );

    try {
      await stream.start();
      this.activeStreams.set(platformUserId, stream);
      return true;
    } catch (err: any) {
      this.logger.error(
        `Ошибка при запуске сокета для пользователя ${platformUserId}:`,
        err.message,
      );
      return false;
    }
  }

  public stopStream(platformUserId: string): boolean {
    const stream = this.activeStreams.get(platformUserId);
    if (!stream) {
      this.logger.info(
        `Стрим для пользователя ${platformUserId} не найден.`,
      );
      return true;
    }

    const result = stream.disconnect();
    this.activeStreams.delete(platformUserId);
    return result;
  }

  public stopAll(): void {
    this.logger.info(
      `Остановка всех активных стримов (${this.activeStreams.size} шт.)...`,
    );
    for (const [platformUserId, stream] of this.activeStreams.entries()) {
      try {
        stream.disconnect();
      } catch (err) {
        this.logger.error(
          `Ошибка при остановке стрима для ${platformUserId}:`,
          err,
        );
      }
    }
    this.activeStreams.clear();
  }
}
