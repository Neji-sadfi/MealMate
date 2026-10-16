import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";

type PagePlaceholderProps = {
  title: string;
  subtitle?: string;
  owner: string;
};

/** Temporary screen body. Each member replaces it with their module's UI. */
export function PagePlaceholder({ title, subtitle, owner }: PagePlaceholderProps) {
  const t = useTranslations("common");

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl leading-tight font-extrabold">{title}</h1>
        {subtitle && <p className="text-muted">{subtitle}</p>}
      </section>
      <Card tone="tint" className="flex flex-col gap-1 text-sm">
        <p className="font-semibold">{t("comingSoon")}</p>
        <p className="text-muted">{t("ownedBy", { owner })}</p>
      </Card>
    </div>
  );
}
