import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { logoutAction } from "../services/actions";

export function SignOutButton() {
  const t = useTranslations("common");

  return (
    <form action={logoutAction}>
      <Button type="submit" variant="secondary" icon={LogOut} fullWidth>
        {t("signOut")}
      </Button>
    </form>
  );
}
