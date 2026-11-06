import { describe, expect, it } from "vitest";
import { inAppBrowser } from "./inApp";

const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)";

describe("inAppBrowser", () => {
  it("names known apps", () => {
    expect(inAppBrowser(`${IOS} Mobile/15E148 Barcelona 389.0.0.0 (iPhone15,2; iOS 18_5)`)).toBe("Threads");
    expect(inAppBrowser(`${IOS} Mobile/15E148 Instagram 389.0.0.0`)).toBe("Instagram");
    expect(inAppBrowser(`${IOS} Mobile/15E148 [FBAN/FBIOS;FBAV/500.0]`)).toBe("Facebook");
    expect(inAppBrowser(`${IOS} Mobile/15E148 KAKAOTALK 10.8.0`)).toBe("KakaoTalk");
  });

  it("flags unnamed WebViews", () => {
    expect(inAppBrowser(`${IOS} Mobile/15E148`)).toBe("");
    expect(
      inAppBrowser("Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0 Mobile Safari/537.36"),
    ).toBe("");
  });

  it("leaves real browsers alone", () => {
    expect(inAppBrowser(`${IOS} Version/18.5 Mobile/15E148 Safari/604.1`)).toBeNull();
    expect(inAppBrowser(`${IOS} CriOS/130.0 Mobile/15E148 Safari/604.1`)).toBeNull();
    expect(
      inAppBrowser("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36"),
    ).toBeNull();
    expect(inAppBrowser("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15")).toBeNull();
  });
});
