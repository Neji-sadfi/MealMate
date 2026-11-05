"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { WifiOff } from "lucide-react";

export function OfflineStatusBanner() {
  const t = useTranslations("offline");
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    function updateStatus() {
      setIsOnline(navigator.onLine);
    }

    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="border-warning/30 mb-5 flex items-center gap-3 rounded-xl border bg-warning-bg px-4 py-3 text-sm"
    >
      <WifiOff aria-hidden className="size-5 shrink-0 text-primary" />
      <p>{t("appBanner")}</p>
    </div>
  );
}
