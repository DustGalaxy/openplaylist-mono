"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const stream_manager_1 = require("../stream/stream-manager");
(0, node_test_1.describe)("StreamManager", () => {
    const mockApiClient = {
        getConnectionToken: async () => "mock-jwt-token",
        getSubscriptionToken: async () => ({ channels: [] }),
    };
    const createConnection = (id) => ({
        user_id: `user-${id}`,
        platform_user_id: id,
        access_token: `token-${id}`,
    });
    (0, node_test_1.it)("handles non-existent streams gracefully in stopStream", () => {
        const manager = new stream_manager_1.StreamManager(mockApiClient, "wss://test.local");
        node_assert_1.default.strictEqual(manager.hasStream("non_existent"), false);
        node_assert_1.default.strictEqual(manager.getActiveCount(), 0);
        node_assert_1.default.deepStrictEqual(manager.getActiveUserIds(), []);
        const stopResult = manager.stopStream("non_existent");
        node_assert_1.default.strictEqual(stopResult, true);
    });
    (0, node_test_1.it)("stops all streams cleanly", () => {
        const manager = new stream_manager_1.StreamManager(mockApiClient, "wss://test.local");
        // Manually register mock streams into active streams for testing registry behavior
        manager.activeStreams.set("user1", {
            disconnect: () => true,
        });
        manager.activeStreams.set("user2", {
            disconnect: () => true,
        });
        node_assert_1.default.strictEqual(manager.getActiveCount(), 2);
        node_assert_1.default.deepStrictEqual(manager.getActiveUserIds(), ["user1", "user2"]);
        manager.stopAll();
        node_assert_1.default.strictEqual(manager.getActiveCount(), 0);
        node_assert_1.default.deepStrictEqual(manager.getActiveUserIds(), []);
    });
    (0, node_test_1.it)("prevents starting duplicate stream if already active", async () => {
        const manager = new stream_manager_1.StreamManager(mockApiClient, "wss://test.local");
        manager.activeStreams.set("duplicate-user", {
            disconnect: () => true,
        });
        const conn = createConnection("duplicate-user");
        const result = await manager.startStream(conn);
        node_assert_1.default.strictEqual(result, true);
        node_assert_1.default.strictEqual(manager.getActiveCount(), 1);
    });
});
