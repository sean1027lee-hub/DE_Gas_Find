import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE, LANGS, parseAcceptLanguage, pickLang, type Lang } from "@/i18n/langs";

/**
 * "/" is served from one of three static pages (/ko, /de, /en) so the first paint is
 * already in the user's language — no re-render after hydration. The address bar keeps "/".
 */
export function proxy(request: NextRequest) {
  const cookie = request.cookies.get(LANG_COOKIE)?.value as Lang | undefined;
  const lang = cookie && LANGS.includes(cookie) ? cookie : pickLang(parseAcceptLanguage(request.headers.get("accept-language")));
  const url = request.nextUrl.clone();
  url.pathname = `/${lang}`;
  const res = NextResponse.rewrite(url);
  res.headers.set("Vary", "Accept-Language, Cookie");
  return res;
}

export const config = { matcher: ["/"] };
