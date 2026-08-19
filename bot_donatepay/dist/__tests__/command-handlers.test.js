"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const command_handlers_1 = require("../messaging/command-handlers");
(0, node_test_1.describe)("Command Handlers", () => {
    const createMockAmqpClient = () => {
        const replies = [];
        const acks = [];
        const client = {
            sendRpcReply: (replyTo, correlationId, data) => {
                replies.push({ replyTo, correlationId, data });
            },
            ack: (msg) => {
                acks.push(msg);
            },
        };
        return { client: client, replies, acks };
    };
    const createMockStreamManager = () => {
        const startedConnections = [];
        const stoppedUsers = [];
        const streamManager = {
            startStream: async (conn) => {
                startedConnections.push(conn);
                return true;
            },
            stopStream: (platformUserId) => {
                stoppedUsers.push(platformUserId);
                return true;
            },
        };
        return { streamManager, startedConnections, stoppedUsers };
    };
    (0, node_test_1.describe)("ConnectCommandHandler", () => {
        (0, node_test_1.it)("handles standard connection payload and sends RPC reply", async () => {
            const { client, replies, acks } = createMockAmqpClient();
            const { streamManager, startedConnections } = createMockStreamManager();
            const handler = new command_handlers_1.ConnectCommandHandler(client, streamManager);
            const msg = {
                content: Buffer.from(JSON.stringify({
                    user_id: "user-uuid-1",
                    platform_user_id: "12345",
                    access_token: "token_abc",
                })),
                properties: {
                    replyTo: "amq.gen-reply",
                    correlationId: "corr-123",
                },
            };
            const result = await handler.handle(msg);
            node_assert_1.default.strictEqual(result, true);
            node_assert_1.default.strictEqual(startedConnections.length, 1);
            node_assert_1.default.strictEqual(startedConnections[0].platform_user_id, "12345");
            node_assert_1.default.strictEqual(startedConnections[0].access_token, "token_abc");
            node_assert_1.default.strictEqual(replies.length, 1);
            node_assert_1.default.strictEqual(replies[0].data, true);
            node_assert_1.default.strictEqual(acks.length, 1);
        });
        (0, node_test_1.it)("handles legacy subscribe action payload", async () => {
            const { client, replies, acks } = createMockAmqpClient();
            const { streamManager, startedConnections } = createMockStreamManager();
            const handler = new command_handlers_1.ConnectCommandHandler(client, streamManager);
            const msg = {
                content: Buffer.from(JSON.stringify({
                    action: "subscribe",
                    channel: "$public:998877",
                    token: "secret_token",
                })),
                properties: {},
            };
            const result = await handler.handle(msg);
            node_assert_1.default.strictEqual(result, true);
            node_assert_1.default.strictEqual(startedConnections.length, 1);
            node_assert_1.default.strictEqual(startedConnections[0].platform_user_id, "998877");
            node_assert_1.default.strictEqual(startedConnections[0].access_token, "secret_token");
            node_assert_1.default.strictEqual(replies.length, 0);
            node_assert_1.default.strictEqual(acks.length, 1);
        });
    });
    (0, node_test_1.describe)("DisconnectCommandHandler", () => {
        (0, node_test_1.it)("handles json disconnect payload with platform_user_id", async () => {
            const { client, replies, acks } = createMockAmqpClient();
            const { streamManager, stoppedUsers } = createMockStreamManager();
            const handler = new command_handlers_1.DisconnectCommandHandler(client, streamManager);
            const msg = {
                content: Buffer.from(JSON.stringify({ platform_user_id: "98765" })),
                properties: {
                    replyTo: "reply-queue",
                    correlationId: "corr-disconnect-1",
                },
            };
            const result = await handler.handle(msg);
            node_assert_1.default.strictEqual(result, true);
            node_assert_1.default.deepStrictEqual(stoppedUsers, ["98765"]);
            node_assert_1.default.strictEqual(replies.length, 1);
            node_assert_1.default.strictEqual(replies[0].data, true);
            node_assert_1.default.strictEqual(acks.length, 1);
        });
        (0, node_test_1.it)("handles raw string or channel in disconnect payload", async () => {
            const { client } = createMockAmqpClient();
            const { streamManager, stoppedUsers } = createMockStreamManager();
            const handler = new command_handlers_1.DisconnectCommandHandler(client, streamManager);
            const msg = {
                content: Buffer.from('"$public:554433"'),
                properties: {},
            };
            const result = await handler.handle(msg);
            node_assert_1.default.strictEqual(result, true);
            node_assert_1.default.deepStrictEqual(stoppedUsers, ["554433"]);
        });
    });
});
