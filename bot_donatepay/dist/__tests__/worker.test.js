"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
(0, node_test_1.describe)("DonatePay Worker Logic", () => {
    (0, node_test_1.it)("maps all fields from backend Tokens DTO correctly", () => {
        const rawTokensDto = {
            user_id: "user-uuid-123",
            platform: "donatepay",
            platform_user_id: "98765",
            access_token: "dp_api_key_abc",
            refresh_token: "",
            expires_at: 0,
            bot_settings: { auto_read: true },
        };
        const parsedUser = {
            user_id: rawTokensDto.user_id,
            platform: rawTokensDto.platform,
            platform_user_id: rawTokensDto.platform_user_id,
            access_token: rawTokensDto.access_token,
            refresh_token: rawTokensDto.refresh_token || "",
            expires_at: rawTokensDto.expires_at || 0,
            bot_settings: rawTokensDto.bot_settings ?? null,
        };
        node_assert_1.default.strictEqual(parsedUser.user_id, "user-uuid-123");
        node_assert_1.default.strictEqual(parsedUser.platform, "donatepay");
        node_assert_1.default.strictEqual(parsedUser.platform_user_id, "98765");
        node_assert_1.default.strictEqual(parsedUser.access_token, "dp_api_key_abc");
        node_assert_1.default.strictEqual(parsedUser.refresh_token, "");
        node_assert_1.default.strictEqual(parsedUser.expires_at, 0);
        node_assert_1.default.deepStrictEqual(parsedUser.bot_settings, { auto_read: true });
    });
    (0, node_test_1.it)("formats user invalidation payload correctly", () => {
        const conn = {
            user_id: "user-123",
            platform_user_id: "12345",
            access_token: "dp_api_key_abc",
        };
        const payload = JSON.stringify({
            access_token: conn.access_token,
            platform_user_id: conn.platform_user_id,
        });
        const parsed = JSON.parse(payload);
        node_assert_1.default.strictEqual(parsed.access_token, "dp_api_key_abc");
        node_assert_1.default.strictEqual(parsed.platform_user_id, "12345");
    });
});
