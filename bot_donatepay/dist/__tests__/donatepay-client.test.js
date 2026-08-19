"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const donatepay_client_1 = require("../api/donatepay-client");
(0, node_test_1.describe)("DonatePayApiClient", () => {
    const tokenUrl = "https://donatepay.eu/api/v2/socket/token";
    (0, node_test_1.it)("fetches connection token successfully", async () => {
        let calledUrl = "";
        let calledInit;
        const mockFetch = async (input, init) => {
            calledUrl = String(input);
            calledInit = init;
            return {
                ok: true,
                status: 200,
                json: async () => ({ token: "mock-conn-jwt-token" }),
                text: async () => "",
            };
        };
        const client = new donatepay_client_1.DonatePayApiClient(tokenUrl, mockFetch);
        const token = await client.getConnectionToken("my_access_token_123");
        node_assert_1.default.strictEqual(token, "mock-conn-jwt-token");
        node_assert_1.default.strictEqual(calledUrl, tokenUrl);
        node_assert_1.default.strictEqual(calledInit?.method, "POST");
        node_assert_1.default.deepStrictEqual(JSON.parse(calledInit?.body), {
            access_token: "my_access_token_123",
        });
    });
    (0, node_test_1.it)("throws error when API returns non-200 status for connection token", async () => {
        const mockFetch = async () => {
            return {
                ok: false,
                status: 401,
                text: async () => "Unauthorized user token",
            };
        };
        const client = new donatepay_client_1.DonatePayApiClient(tokenUrl, mockFetch);
        await node_assert_1.default.rejects(async () => client.getConnectionToken("invalid_token"), /HTTP 401: Unauthorized user token/);
    });
    (0, node_test_1.it)("throws error when API returns response without token", async () => {
        const mockFetch = async () => {
            return {
                ok: true,
                status: 200,
                json: async () => ({ status: "error", message: "Token missing" }),
                text: async () => "",
            };
        };
        const client = new donatepay_client_1.DonatePayApiClient(tokenUrl, mockFetch);
        await node_assert_1.default.rejects(async () => client.getConnectionToken("token_with_bad_response"), /Token API returned invalid response/);
    });
    (0, node_test_1.it)("fetches subscription token successfully", async () => {
        let calledHeaders = {};
        let calledBody = "";
        const mockFetch = async (_input, init) => {
            calledHeaders = (init?.headers || {});
            calledBody = String(init?.body || "");
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    channels: [{ channel: "$public:123", token: "sub-token-abc" }],
                }),
                text: async () => "",
            };
        };
        const client = new donatepay_client_1.DonatePayApiClient(tokenUrl, mockFetch);
        const result = await client.getSubscriptionToken("api_token", "$public:123", "client-id-456");
        node_assert_1.default.deepStrictEqual(result.channels, [
            { channel: "$public:123", token: "sub-token-abc" },
        ]);
        node_assert_1.default.strictEqual(calledHeaders["Content-Type"], "application/x-www-form-urlencoded");
        node_assert_1.default.strictEqual(calledHeaders["X-Requested-With"], "XMLHttpRequest");
        const params = new URLSearchParams(calledBody);
        node_assert_1.default.strictEqual(params.get("access_token"), "api_token");
        node_assert_1.default.strictEqual(params.get("channels[]"), "$public:123");
        node_assert_1.default.strictEqual(params.get("client"), "client-id-456");
    });
});
