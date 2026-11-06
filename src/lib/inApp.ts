/**
 * In-app browsers (Threads, Instagram, KakaoTalk, …) often cannot ask for location:
 * on iOS the host app itself needs location permission, which most of them lack.
 * Returns the app's name when known, "" for an unnamed in-app browser, null otherwise.
 */
const NAMED: [RegExp, string][] = [
  [/Barcelona/, "Threads"],
  [/Instagram/, "Instagram"],
  [/FBAN|FBAV|FB_IAB/, "Facebook"],
  [/KAKAOTALK/i, "KakaoTalk"],
  [/\bLine\//, "LINE"],
  [/NAVER\(inapp/, "NAVER"],
  [/LinkedInApp/, "LinkedIn"],
  [/Snapchat/, "Snapchat"],
  [/musical_ly|TikTok|BytedanceWebview/, "TikTok"],
];

export function inAppBrowser(ua: string): string | null {
  for (const [re, name] of NAMED) if (re.test(ua)) return name;
  // iOS: Safari and Chrome/Firefox/Edge all include "Safari/"; a bare WKWebView does not.
  if (/iPhone|iPad|iPod/.test(ua) && !/Safari\//.test(ua)) return "";
  // Android WebView marks itself with "; wv)".
  if (/Android/.test(ua) && /; wv\)/.test(ua)) return "";
  return null;
}
