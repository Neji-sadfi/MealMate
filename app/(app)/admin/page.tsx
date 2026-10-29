import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { PhotoHero } from "@/components/ui/PhotoHero";
import { AdminRecipeCard, AdminReportActions } from "@/features/admin/components/AdminActions";
import {
  RecipeCreateForm,
  type RecipeEditData,
} from "@/features/recipes/components/RecipeCreateForm";
import { getCurrentAdminId } from "@/lib/admin";
import { ForumReport } from "@/models/ForumReport";
import { Recipe } from "@/models/Recipe";
import { User } from "@/models/User";
import { Types } from "mongoose";
import type { IForumPost } from "@/models/ForumPost";
import type { IUser } from "@/models/User";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.admin");
  return { title: `${t("title")} · MealMate` };
}

export default async function AdminPage() {
  const t = await getTranslations("pages.admin");
  const locale = await getLocale();
  const adminId = await getCurrentAdminId();
  if (!adminId) redirect("/");

  const [recipes, reports, userCount] = await Promise.all([
    Recipe.find().sort({ createdAt: -1 }).limit(100).lean(),
    ForumReport.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate<{ reporter: Pick<IUser, "name"> }>("reporter", "name")
      .populate<{
        post:
          | (Pick<IForumPost, "title" | "content"> & {
              _id: Types.ObjectId;
              author: Pick<IUser, "name">;
            })
          | null;
      }>({
        path: "post",
        select: "title content author",
        populate: { path: "author", select: "name" },
      })
      .lean(),
    User.countDocuments(),
  ]);

  const recipeData: RecipeEditData[] = recipes.map((recipe) => ({
    id: recipe._id.toString(),
    title: recipe.title,
    tagline: recipe.tagline,
    description: recipe.description,
    imageUrl: recipe.imageUrl,
    prepTimeMinutes: recipe.prepTimeMinutes,
    servings: recipe.servings,
    costPerServing: recipe.costPerServing,
    diets: recipe.diets,
    tags: recipe.tags,
    difficulty: recipe.difficulty,
    nutrition: recipe.nutrition,
    ingredients: recipe.ingredients.map(({ name, quantity, unit, note }) => ({
      name,
      quantity,
      unit,
      note,
    })),
    steps: recipe.steps.map(({ title, description }) => ({ title, description })),
  }));

  return (
    <div className="flex flex-col gap-5">
      <PhotoHero image="community" title={t("title")} subtitle={t("subtitle")} />

      <section className="grid grid-cols-3 gap-2" aria-label={t("overview")}>
        <Card className="text-center">
          <p className="text-2xl font-black">{userCount}</p>
          <p className="text-xs text-muted">{t("members")}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-black">{recipes.length}</p>
          <p className="text-xs text-muted">{t("recipes")}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-black">{reports.length}</p>
          <p className="text-xs text-muted">{t("reports")}</p>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("moderation")}</h2>
          <p className="text-sm text-muted">{t("moderationSubtitle")}</p>
        </div>
        {reports.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">{t("noReports")}</p>
          </Card>
        ) : (
          reports.map((report) => {
            const post = report.post;
            const reporterName = report.reporter?.name ?? t("unknownMember");
            const authorName = post?.author?.name ?? t("unknownMember");
            return (
              <Card key={report._id.toString()} className="flex flex-col gap-3">
                <div>
                  <p className="text-warning text-xs font-semibold tracking-wide uppercase">
                    {t(`reasons.${report.reason}`)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {t("reportedBy", { name: reporterName })} ·{" "}
                    {report.createdAt.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US")}
                  </p>
                </div>
                {post ? (
                  <div className="rounded-xl bg-background p-3">
                    <h3 className="font-semibold">{post.title}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {t("postAuthor", { name: authorName })}
                    </p>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{post.content}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted">{t("postUnavailable")}</p>
                )}
                {report.details && (
                  <p className="text-sm">{t("reportDetails", { details: report.details })}</p>
                )}
                <AdminReportActions
                  report={{
                    id: report._id.toString(),
                    reason: report.reason,
                    details: report.details,
                    createdAt: report.createdAt.toISOString(),
                    reporterName,
                    post: post
                      ? {
                          id: post._id.toString(),
                          title: post.title,
                          content: post.content,
                          authorName,
                        }
                      : null,
                  }}
                />
              </Card>
            );
          })
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("catalogue")}</h2>
          <p className="text-sm text-muted">{t("catalogueSubtitle")}</p>
        </div>
        <RecipeCreateForm />
        {recipeData.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">{t("noRecipes")}</p>
          </Card>
        ) : (
          recipeData.map((recipe) => <AdminRecipeCard key={recipe.id} recipe={recipe} />)
        )}
      </section>
    </div>
  );
}
