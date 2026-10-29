import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Activity, Dumbbell, Ruler, Salad, Wallet, Weight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { WEEKDAYS } from "@/models/enums";
import type { IUser } from "@/models/User";
import { AvatarEditor } from "./AvatarEditor";

export type ProfileUser = Pick<
  IUser,
  "name" | "email" | "city" | "occupation" | "heightCm" | "weightKg" | "preferences"
>;

function initialsOf(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}

type BmiCategory = "underweight" | "normal" | "overweight" | "obese";

function bmiOf(heightCm?: number, weightKg?: number) {
  if (!heightCm || !weightKg) return null;
  const meters = heightCm / 100;
  const value = weightKg / (meters * meters);
  const category: BmiCategory =
    value < 18.5 ? "underweight" : value < 25 ? "normal" : value < 30 ? "overweight" : "obese";
  return { value: value.toFixed(1), category };
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-extrabold tracking-wide text-primary uppercase">
      {icon}
      {children}
    </h2>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-8 items-center rounded-full bg-tint px-3 text-sm font-semibold text-primary">
      {children}
    </span>
  );
}

/** Read-only profile screen. Receives plain data, so it stays easy to reuse and test. */
export function ProfileView({
  user,
  avatarUrl = null,
}: {
  user: ProfileUser;
  /** URL of the profile photo, or null to show the initials. */
  avatarUrl?: string | null;
}) {
  const t = useTranslations("pages.profile");
  const prefs = user.preferences;
  const bmi = bmiOf(user.heightCm, user.weightKg);
  const subtitle = [user.occupation, user.city].filter(Boolean).join(" · ");
  const notSet = t("notSet");

  return (
    <div className="flex flex-col gap-4">
      {/* Header: avatar + identity */}
      <Card tone="primary" className="flex items-center gap-4">
        <AvatarEditor initials={initialsOf(user.name)} avatarUrl={avatarUrl} />
        <div className="min-w-0">
          <p className="truncate text-xl font-extrabold">{user.name}</p>
          <p className="truncate text-sm opacity-90">{user.email}</p>
          {subtitle && <p className="truncate text-sm opacity-80">{subtitle}</p>}
        </div>
      </Card>

      {/* Health */}
      <section className="flex flex-col gap-2">
        <SectionTitle icon={<Activity aria-hidden className="size-4" />}>
          {t("sections.health")}
        </SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <Card className="flex flex-col items-center gap-1 text-center">
            <Ruler aria-hidden className="size-5 text-primary" />
            <p className="text-lg font-extrabold">
              {user.heightCm ?? "–"}
              {user.heightCm ? (
                <span className="text-xs font-semibold"> {t("units.cm")}</span>
              ) : null}
            </p>
            <p className="text-xs text-muted">{t("fields.height")}</p>
          </Card>
          <Card className="flex flex-col items-center gap-1 text-center">
            <Weight aria-hidden className="size-5 text-primary" />
            <p className="text-lg font-extrabold">
              {user.weightKg ?? "–"}
              {user.weightKg ? (
                <span className="text-xs font-semibold"> {t("units.kg")}</span>
              ) : null}
            </p>
            <p className="text-xs text-muted">{t("fields.weight")}</p>
          </Card>
          <Card tone="tint" className="flex flex-col items-center gap-1 text-center">
            <Activity aria-hidden className="size-5 text-primary" />
            <p className="text-lg font-extrabold">{bmi?.value ?? "–"}</p>
            <p className="text-xs text-muted">
              {bmi ? t(`bmiCategory.${bmi.category}`) : t("fields.bmi")}
            </p>
          </Card>
        </div>
        {bmi && <p className="text-xs text-muted">{t("bmiNote")}</p>}
      </section>

      {/* Food */}
      <section className="flex flex-col gap-2">
        <SectionTitle icon={<Salad aria-hidden className="size-4" />}>
          {t("sections.food")}
        </SectionTitle>
        <Card>
          <dl>
            <Row label={t("fields.diet")}>{t(`enums.diet.${prefs.diet}`)}</Row>
            <Row label={t("fields.goal")}>{t(`enums.goal.${prefs.goal}`)}</Row>
            <Row label={t("fields.allergies")}>
              {prefs.allergies.length ? (
                <span className="flex flex-wrap justify-end gap-2">
                  {prefs.allergies.map((item) => (
                    <Tag key={item}>{item}</Tag>
                  ))}
                </span>
              ) : (
                t("none")
              )}
            </Row>
            {prefs.intolerances.length > 0 && (
              <Row label={t("fields.intolerances")}>
                <span className="flex flex-wrap justify-end gap-2">
                  {prefs.intolerances.map((item) => (
                    <Tag key={item}>{item}</Tag>
                  ))}
                </span>
              </Row>
            )}
          </dl>
        </Card>
      </section>

      {/* Budget */}
      <section className="flex flex-col gap-2">
        <SectionTitle icon={<Wallet aria-hidden className="size-4" />}>
          {t("sections.budget")}
        </SectionTitle>
        <Card tone="tint" className="flex items-baseline justify-between gap-4">
          <p className="text-sm text-muted">{t("fields.weeklyBudget")}</p>
          <p className="text-2xl font-extrabold text-primary">
            {prefs.weeklyBudget > 0 ? `${prefs.weeklyBudget} ${prefs.currency}` : notSet}
          </p>
        </Card>
      </section>

      {/* Sport */}
      <section className="flex flex-col gap-2">
        <SectionTitle icon={<Dumbbell aria-hidden className="size-4" />}>
          {t("sections.sport")}
        </SectionTitle>
        <Card>
          <dl>
            <Row label={t("fields.activityLevel")}>
              {t(`enums.activityLevel.${prefs.activityLevel}`)}
            </Row>
            <Row label={t("fields.sportGoal")}>{t(`enums.sportGoal.${prefs.sportGoal}`)}</Row>
            <Row label={t("fields.level")}>{t(`enums.level.${prefs.level}`)}</Row>
            <Row label={t("fields.sessionDuration")}>
              {prefs.sessionDurationMinutes} {t("units.minutes")}
            </Row>
            <Row label={t("fields.equipment")}>{t(`enums.equipment.${prefs.equipment}`)}</Row>
          </dl>
          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-2 text-muted">{t("fields.availableDays")}</p>
            <ul className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((day) => {
                const active = prefs.availableDays.includes(day);
                return (
                  <li
                    key={day}
                    aria-label={`${t(`enums.weekday.${day}`)}${active ? " ✓" : ""}`}
                    className={`flex h-9 items-center justify-center rounded-full text-xs font-bold ${
                      active ? "bg-primary text-primary-foreground" : "bg-tint text-muted"
                    }`}
                  >
                    {t(`enums.weekday.${day}`)}
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>
      </section>
    </div>
  );
}
