import {
  DonatePayConnectionTokenResponse,
  DonatePaySubscriptionTokenResponse,
} from "../types/donatepay.types";
import { Logger } from "../utils/logger";

export interface IDonatePayApiClient {
  getConnectionToken(accessToken: string): Promise<string>;
  getSubscriptionToken(
    accessToken: string,
    channel: string,
    client: string,
  ): Promise<DonatePaySubscriptionTokenResponse>;
}

export class DonatePayApiClient implements IDonatePayApiClient {
  private readonly logger: Logger;

  constructor(
    private readonly tokenUrl: string,
    private readonly customFetch: typeof fetch = fetch,
    logger?: Logger,
  ) {
    this.logger = logger || new Logger("DonatePayApiClient");
  }

  public async getConnectionToken(accessToken: string): Promise<string> {
    const res = await this.customFetch(this.tokenUrl, {
      method: "POST",
      body: JSON.stringify({ access_token: accessToken }),
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const data = (await res.json()) as DonatePayConnectionTokenResponse;
    if (!data || !data.token) {
      throw new Error(
        `Token API returned invalid response: ${JSON.stringify(data)}`,
      );
    }

    return data.token;
  }

  public async getSubscriptionToken(
    accessToken: string,
    channel: string,
    client: string,
  ): Promise<DonatePaySubscriptionTokenResponse> {
    const params = new URLSearchParams();
    params.append("access_token", accessToken);
    params.append("client", client);
    params.append("channels[]", channel);

    const res = await this.customFetch(this.tokenUrl, {
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

    return (await res.json()) as DonatePaySubscriptionTokenResponse;
  }
}
