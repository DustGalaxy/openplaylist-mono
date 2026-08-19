"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DonatePayApiClient = void 0;
const logger_1 = require("../utils/logger");
class DonatePayApiClient {
    tokenUrl;
    customFetch;
    logger;
    constructor(tokenUrl, customFetch = fetch, logger) {
        this.tokenUrl = tokenUrl;
        this.customFetch = customFetch;
        this.logger = logger || new logger_1.Logger("DonatePayApiClient");
    }
    async getConnectionToken(accessToken) {
        const res = await this.customFetch(this.tokenUrl, {
            method: "POST",
            body: JSON.stringify({ access_token: accessToken }),
            headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`HTTP ${res.status}: ${text}`);
        }
        const data = (await res.json());
        if (!data || !data.token) {
            throw new Error(`Token API returned invalid response: ${JSON.stringify(data)}`);
        }
        return data.token;
    }
    async getSubscriptionToken(accessToken, channel, client) {
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
        return (await res.json());
    }
}
exports.DonatePayApiClient = DonatePayApiClient;
