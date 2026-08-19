import { describe, it } from "node:test";
import assert from "node:assert";
import { StreamManager } from "../stream/stream-manager";
import { IDonatePayApiClient } from "../api/donatepay-client";
import { ConnectionData } from "../types/user.types";

describe("StreamManager", () => {
  const mockApiClient: IDonatePayApiClient = {
    getConnectionToken: async () => "mock-jwt-token",
    getSubscriptionToken: async () => ({ channels: [] }),
  };

  const createConnection = (id: string): ConnectionData => ({
    user_id: `user-${id}`,
    platform_user_id: id,
    access_token: `token-${id}`,
  });

  it("handles non-existent streams gracefully in stopStream", () => {
    const manager = new StreamManager(mockApiClient, "wss://test.local");

    assert.strictEqual(manager.hasStream("non_existent"), false);
    assert.strictEqual(manager.getActiveCount(), 0);
    assert.deepStrictEqual(manager.getActiveUserIds(), []);

    const stopResult = manager.stopStream("non_existent");
    assert.strictEqual(stopResult, true);
  });

  it("stops all streams cleanly", () => {
    const manager = new StreamManager(mockApiClient, "wss://test.local");

    // Manually register mock streams into active streams for testing registry behavior
    (manager as any).activeStreams.set("user1", {
      disconnect: () => true,
    });
    (manager as any).activeStreams.set("user2", {
      disconnect: () => true,
    });

    assert.strictEqual(manager.getActiveCount(), 2);
    assert.deepStrictEqual(manager.getActiveUserIds(), ["user1", "user2"]);

    manager.stopAll();

    assert.strictEqual(manager.getActiveCount(), 0);
    assert.deepStrictEqual(manager.getActiveUserIds(), []);
  });

  it("prevents starting duplicate stream if already active", async () => {
    const manager = new StreamManager(mockApiClient, "wss://test.local");

    (manager as any).activeStreams.set("duplicate-user", {
      disconnect: () => true,
    });

    const conn = createConnection("duplicate-user");
    const result = await manager.startStream(conn);

    assert.strictEqual(result, true);
    assert.strictEqual(manager.getActiveCount(), 1);
  });
});
