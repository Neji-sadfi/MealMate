import { useTranslations } from "next-intl";
import { WifiOff } from "lucide-react";
import { Card } from "@/components/ui/Card";

// Shown by the service worker when a page is requested offline and is not cached.
export default function OfflinePage() {
  const t = useTranslations("offline");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <Card tone="warning" className="flex flex-col items-center gap-3 text-center">
        <WifiOff aria-hidden className="size-8 text-primary" />
        <h1 className="text-xl font-extrabold">{t("title")}</h1>
        <p className="text-muted">{t("description")}</p>
      </Card>
    </main>
  );
}
