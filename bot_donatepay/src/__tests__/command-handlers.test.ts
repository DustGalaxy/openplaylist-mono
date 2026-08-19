import { describe, it } from "node:test";
import assert from "node:assert";
import amqp from "amqplib";
import {
  ConnectCommandHandler,
  DisconnectCommandHandler,
} from "../messaging/command-handlers";
import { IAmqpClient } from "../messaging/amqp-client";
import { StreamManager } from "../stream/stream-manager";
import { ConnectionData } from "../types/user.types";

describe("Command Handlers", () => {
  const createMockAmqpClient = () => {
    const replies: Array<{ replyTo: string; correlationId: string; data: any }> =
      [];
    const acks: amqp.Message[] = [];

    const client: Partial<IAmqpClient> = {
      sendRpcReply: (replyTo: string, correlationId: string, data: any) => {
        replies.push({ replyTo, correlationId, data });
      },
      ack: (msg: amqp.Message) => {
        acks.push(msg);
      },
    };

    return { client: client as IAmqpClient, replies, acks };
  };

  const createMockStreamManager = () => {
    const startedConnections: ConnectionData[] = [];
    const stoppedUsers: string[] = [];

    const streamManager = {
      startStream: async (conn: ConnectionData) => {
        startedConnections.push(conn);
        return true;
      },
      stopStream: (platformUserId: string) => {
        stoppedUsers.push(platformUserId);
        return true;
      },
    } as unknown as StreamManager;

    return { streamManager, startedConnections, stoppedUsers };
  };

  describe("ConnectCommandHandler", () => {
    it("handles standard connection payload and sends RPC reply", async () => {
      const { client, replies, acks } = createMockAmqpClient();
      const { streamManager, startedConnections } = createMockStreamManager();

      const handler = new ConnectCommandHandler(client, streamManager);

      const msg = {
        content: Buffer.from(
          JSON.stringify({
            user_id: "user-uuid-1",
            platform_user_id: "12345",
            access_token: "token_abc",
          }),
        ),
        properties: {
          replyTo: "amq.gen-reply",
          correlationId: "corr-123",
        },
      } as unknown as amqp.ConsumeMessage;

      const result = await handler.handle(msg);

      assert.strictEqual(result, true);
      assert.strictEqual(startedConnections.length, 1);
      assert.strictEqual(startedConnections[0].platform_user_id, "12345");
      assert.strictEqual(startedConnections[0].access_token, "token_abc");
      assert.strictEqual(replies.length, 1);
      assert.strictEqual(replies[0].data, true);
      assert.strictEqual(acks.length, 1);
    });

    it("handles legacy subscribe action payload", async () => {
      const { client, replies, acks } = createMockAmqpClient();
      const { streamManager, startedConnections } = createMockStreamManager();

      const handler = new ConnectCommandHandler(client, streamManager);

      const msg = {
        content: Buffer.from(
          JSON.stringify({
            action: "subscribe",
            channel: "$public:998877",
            token: "secret_token",
          }),
        ),
        properties: {},
      } as unknown as amqp.ConsumeMessage;

      const result = await handler.handle(msg);

      assert.strictEqual(result, true);
      assert.strictEqual(startedConnections.length, 1);
      assert.strictEqual(startedConnections[0].platform_user_id, "998877");
      assert.strictEqual(startedConnections[0].access_token, "secret_token");
      assert.strictEqual(replies.length, 0);
      assert.strictEqual(acks.length, 1);
    });
  });

  describe("DisconnectCommandHandler", () => {
    it("handles json disconnect payload with platform_user_id", async () => {
      const { client, replies, acks } = createMockAmqpClient();
      const { streamManager, stoppedUsers } = createMockStreamManager();

      const handler = new DisconnectCommandHandler(client, streamManager);

      const msg = {
        content: Buffer.from(JSON.stringify({ platform_user_id: "98765" })),
        properties: {
          replyTo: "reply-queue",
          correlationId: "corr-disconnect-1",
        },
      } as unknown as amqp.ConsumeMessage;

      const result = await handler.handle(msg);

      assert.strictEqual(result, true);
      assert.deepStrictEqual(stoppedUsers, ["98765"]);
      assert.strictEqual(replies.length, 1);
      assert.strictEqual(replies[0].data, true);
      assert.strictEqual(acks.length, 1);
    });

    it("handles raw string or channel in disconnect payload", async () => {
      const { client } = createMockAmqpClient();
      const { streamManager, stoppedUsers } = createMockStreamManager();

      const handler = new DisconnectCommandHandler(client, streamManager);

      const msg = {
        content: Buffer.from('"$public:554433"'),
        properties: {},
      } as unknown as amqp.ConsumeMessage;

      const result = await handler.handle(msg);

      assert.strictEqual(result, true);
      assert.deepStrictEqual(stoppedUsers, ["554433"]);
    });
  });
});
