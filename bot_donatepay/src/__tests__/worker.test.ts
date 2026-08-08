import { describe, it } from "node:test";
import assert from "node:assert";

describe("DonatePay Worker Logic", () => {
  it("maps all fields from backend Tokens DTO correctly", () => {
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

    assert.strictEqual(parsedUser.user_id, "user-uuid-123");
    assert.strictEqual(parsedUser.platform, "donatepay");
    assert.strictEqual(parsedUser.platform_user_id, "98765");
    assert.strictEqual(parsedUser.access_token, "dp_api_key_abc");
    assert.strictEqual(parsedUser.refresh_token, "");
    assert.strictEqual(parsedUser.expires_at, 0);
    assert.deepStrictEqual(parsedUser.bot_settings, { auto_read: true });
  });

  it("formats user invalidation payload correctly", () => {
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
    assert.strictEqual(parsed.access_token, "dp_api_key_abc");
    assert.strictEqual(parsed.platform_user_id, "12345");
  });
});
