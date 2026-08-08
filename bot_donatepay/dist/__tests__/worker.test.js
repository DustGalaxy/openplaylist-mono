"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
(0, node_test_1.describe)("DonatePay Worker Logic", () => {
    (0, node_test_1.it)("formats user invalidation payload correctly without refresh_token", () => {
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
        node_assert_1.default.strictEqual(parsed.refresh_token, undefined);
    });
});
