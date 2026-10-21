import { App } from "@/components/App";
import type { Lang } from "@/i18n/langs";

export default async function Page({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  return <App ssrLang={lang as Lang} />;
}
