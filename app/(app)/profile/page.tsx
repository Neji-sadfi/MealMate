import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { getCurrentUserId } from "@/lib/current-user";
import { User } from "@/models/User";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.profile");
  return { title: t("title") };
}

export default async function ProfilePage() {
  const t = await getTranslations("pages.profile");
  const userId = await getCurrentUserId();
  const user = userId ? await User.findById(userId).lean() : null;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-black">{t("title")}</h1>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </section>
      {user ? (
        <Card className="space-y-3">
          <div><p className="text-xs uppercase tracking-wide text-muted">Name</p><p className="text-lg font-bold">{user.name}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-muted">Email</p><p>{user.email}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-muted">Location</p><p>{user.city || "Not set"}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-muted">Goal</p><p>{user.preferences.goal.replaceAll("_", " ")}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-muted">Weekly budget</p><p>{user.preferences.weeklyBudget} {user.preferences.currency}</p></div>
        </Card>
      ) : (
        <Card><p className="text-sm text-muted">Your profile could not be loaded.</p></Card>
      )}
      <SignOutButton />
    </div>
  );
}
