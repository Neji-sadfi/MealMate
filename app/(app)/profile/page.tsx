import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { CoachAvatar } from "@/features/coach/components/CoachAvatar";
import { ProfileView } from "@/features/auth/components/ProfileView";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { VerifyEmailBanner } from "@/features/auth/components/VerifyEmailBanner";
import { getCurrentUserId } from "@/lib/current-user";
import { DeleteAccountSection } from "@/features/auth/components/DeleteAccountSection";
import { Avatar } from "@/models/Avatar";
import { User } from "@/models/User";
import { PhotoHero } from "@/components/ui/PhotoHero";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.profile");
  return { title: t("title") };
}

export default async function ProfilePage() {
  const t = await getTranslations("pages.profile");
  const tCoach = await getTranslations("coach.cta");
  const userId = await getCurrentUserId();
  const [user, avatar] = userId
    ? await Promise.all([
        User.findById(userId).lean(),
        Avatar.findOne({ userId }).select("updatedAt").lean(),
      ])
    : [null, null];
  // ?v= changes with each upload, so the browser never shows an old cached photo.
  const avatarUrl = avatar ? `/api/users/me/avatar?v=${avatar.updatedAt.getTime()}` : null;

  return (
    <div className="flex flex-col gap-5">
      <PhotoHero image="community" title={t("title")} subtitle={t("subtitle")} />

      {user && !user.emailVerifiedAt && <VerifyEmailBanner email={user.email} />}

      <Link href="/coach" className="block">
        <Card tone="tint" className="flex items-center gap-3">
          <CoachAvatar size={56} />
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-primary">{tCoach("title")}</p>
            <p className="text-sm text-muted">{tCoach("description")}</p>
          </div>
          <ChevronRight aria-hidden className="size-5 text-primary" />
        </Card>
      </Link>

      {user ? (
        <ProfileView user={user} avatarUrl={avatarUrl} />
      ) : (
        <Card>
          <p className="text-sm text-muted">{t("loadError")}</p>
        </Card>
      )}
      <SignOutButton />
      {user && <DeleteAccountSection />}
    </div>
  );
}
