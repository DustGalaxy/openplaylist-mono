import { describe, it } from "node:test";
import assert from "node:assert";
import { extractVideoUrl } from "../utils/url-extractor";
import { DonatePayVars } from "../types/donatepay.types";

describe("URL Extractor Utility", () => {
  const createBaseVars = (partial: Partial<DonatePayVars> = {}): DonatePayVars => ({
    name: "Donor",
    comment: "",
    sum: 100,
    currency: "RUB",
    target: "Target",
    boss: "",
    like: "",
    social_provider: "",
    social_name: "",
    ...partial,
  });

  it("extracts direct video link when video.link is present", () => {
    const vars = createBaseVars({
      video: {
        link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        id: "dQw4w9WgXcQ",
        start: 0,
        finish: 100,
        title: "Test Video",
        channel: { id: null, title: null },
        image: null,
        live: false,
        duration: 100,
        views: 10,
        likes: 5,
        dislikes: 0,
        embeddable: true,
      },
    });

    const url = extractVideoUrl(vars);
    assert.strictEqual(url, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("builds YouTube URL when only video.id is present", () => {
    const vars = createBaseVars({
      video: {
        link: null,
        id: "abcdef12345",
        start: null,
        finish: null,
        title: null,
        channel: { id: null, title: null },
        image: null,
        live: null,
        duration: null,
        views: null,
        likes: null,
        dislikes: null,
        embeddable: null,
      },
    });

    const url = extractVideoUrl(vars);
    assert.strictEqual(url, "https://www.youtube.com/watch?v=abcdef12345");
  });

  it("extracts URL from comment when video object is absent", () => {
    const vars = createBaseVars({
      comment: "Пожалуйста, включи этот трек: https://youtu.be/dQw4w9WgXcQ спасибо!",
    });

    const url = extractVideoUrl(vars);
    assert.strictEqual(url, "https://youtu.be/dQw4w9WgXcQ");
  });

  it("returns empty string when no URL or video information is provided", () => {
    const vars = createBaseVars({
      comment: "Просто донат без музыки",
    });

    const url = extractVideoUrl(vars);
    assert.strictEqual(url, "");
  });

  it("prefers video.link over comment URL", () => {
    const vars = createBaseVars({
      video: {
        link: "https://youtube.com/watch?v=link1",
        id: "link1",
        start: null,
        finish: null,
        title: null,
        channel: { id: null, title: null },
        image: null,
        live: null,
        duration: null,
        views: null,
        likes: null,
        dislikes: null,
        embeddable: null,
      },
      comment: "Поставь другое: https://youtube.com/watch?v=link2",
    });

    const url = extractVideoUrl(vars);
    assert.strictEqual(url, "https://youtube.com/watch?v=link1");
  });
});
