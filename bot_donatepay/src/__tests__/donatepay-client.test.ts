import { describe, it } from "node:test";
import assert from "node:assert";
import { DonatePayApiClient } from "../api/donatepay-client";

describe("DonatePayApiClient", () => {
  const tokenUrl = "https://donatepay.eu/api/v2/socket/token";

  it("fetches connection token successfully", async () => {
    let calledUrl = "";
    let calledInit: RequestInit | undefined;

    const mockFetch = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      calledUrl = String(input);
      calledInit = init;
      return {
        ok: true,
        status: 200,
        json: async () => ({ token: "mock-conn-jwt-token" }),
        text: async () => "",
      } as unknown as Response;
    };

    const client = new DonatePayApiClient(tokenUrl, mockFetch);
    const token = await client.getConnectionToken("my_access_token_123");

    assert.strictEqual(token, "mock-conn-jwt-token");
    assert.strictEqual(calledUrl, tokenUrl);
    assert.strictEqual(calledInit?.method, "POST");
    assert.deepStrictEqual(JSON.parse(calledInit?.body as string), {
      access_token: "my_access_token_123",
    });
  });

  it("throws error when API returns non-200 status for connection token", async () => {
    const mockFetch = async (): Promise<Response> => {
      return {
        ok: false,
        status: 401,
        text: async () => "Unauthorized user token",
      } as unknown as Response;
    };

    const client = new DonatePayApiClient(tokenUrl, mockFetch);
    await assert.rejects(
      async () => client.getConnectionToken("invalid_token"),
      /HTTP 401: Unauthorized user token/,
    );
  });

  it("throws error when API returns response without token", async () => {
    const mockFetch = async (): Promise<Response> => {
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: "error", message: "Token missing" }),
        text: async () => "",
      } as unknown as Response;
    };

    const client = new DonatePayApiClient(tokenUrl, mockFetch);
    await assert.rejects(
      async () => client.getConnectionToken("token_with_bad_response"),
      /Token API returned invalid response/,
    );
  });

  it("fetches subscription token successfully", async () => {
    let calledHeaders: Record<string, string> = {};
    let calledBody = "";

    const mockFetch = async (
      _input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      calledHeaders = (init?.headers || {}) as Record<string, string>;
      calledBody = String(init?.body || "");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          channels: [{ channel: "$public:123", token: "sub-token-abc" }],
        }),
        text: async () => "",
      } as unknown as Response;
    };

    const client = new DonatePayApiClient(tokenUrl, mockFetch);
    const result = await client.getSubscriptionToken(
      "api_token",
      "$public:123",
      "client-id-456",
    );

    assert.deepStrictEqual(result.channels, [
      { channel: "$public:123", token: "sub-token-abc" },
    ]);
    assert.strictEqual(
      calledHeaders["Content-Type"],
      "application/x-www-form-urlencoded",
    );
    assert.strictEqual(calledHeaders["X-Requested-With"], "XMLHttpRequest");

    const params = new URLSearchParams(calledBody);
    assert.strictEqual(params.get("access_token"), "api_token");
    assert.strictEqual(params.get("channels[]"), "$public:123");
    assert.strictEqual(params.get("client"), "client-id-456");
  });
});
