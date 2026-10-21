import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
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

export const metadata: Metadata = { title: "Administration · MealMate" };

const reasonLabels: Record<string, string> = {
  spam: "Spam",
  offensive: "Offensive content",
  medical_misinformation: "Medical misinformation",
  other: "Other",
};

export default async function AdminPage() {
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
      <section>
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">MealMate</p>
        <h1 className="mt-1 text-2xl font-black">Administration</h1>
        <p className="mt-1 text-sm text-muted">
          Manage the recipe catalogue and community reports.
        </p>
      </section>

      <section className="grid grid-cols-3 gap-2" aria-label="Admin overview">
        <Card className="text-center">
          <p className="text-2xl font-black">{userCount}</p>
          <p className="text-xs text-muted">Members</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-black">{recipes.length}</p>
          <p className="text-xs text-muted">Recipes</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-black">{reports.length}</p>
          <p className="text-xs text-muted">Reports to review</p>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-bold">Community moderation</h2>
          <p className="text-sm text-muted">Review reports and hide posts that break the rules.</p>
        </div>
        {reports.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">No pending reports.</p>
          </Card>
        ) : (
          reports.map((report) => {
            const post = report.post;
            return (
              <Card key={report._id.toString()} className="flex flex-col gap-3">
                <div>
                  <p className="text-warning text-xs font-semibold tracking-wide uppercase">
                    {reasonLabels[report.reason] ?? report.reason}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Reported by {report.reporter?.name ?? "a member"} ·{" "}
                    {report.createdAt.toLocaleDateString()}
                  </p>
                </div>
                {post ? (
                  <div className="rounded-xl bg-background p-3">
                    <h3 className="font-semibold">{post.title}</h3>
                    <p className="mt-1 text-sm text-muted">
                      By {post.author?.name ?? "unknown member"}
                    </p>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{post.content}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted">The reported post is no longer available.</p>
                )}
                {report.details && <p className="text-sm">Report details: {report.details}</p>}
                <AdminReportActions
                  report={{
                    id: report._id.toString(),
                    reason: report.reason,
                    details: report.details,
                    createdAt: report.createdAt.toISOString(),
                    reporterName: report.reporter?.name ?? "a member",
                    post: post
                      ? {
                          id: post._id.toString(),
                          title: post.title,
                          content: post.content,
                          authorName: post.author?.name ?? "unknown member",
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
          <h2 className="text-xl font-bold">Recipe catalogue</h2>
          <p className="text-sm text-muted">Add, edit, and remove recipes available to members.</p>
        </div>
        <RecipeCreateForm />
        {recipeData.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">No recipes in the catalogue yet.</p>
          </Card>
        ) : (
          recipeData.map((recipe) => <AdminRecipeCard key={recipe.id} recipe={recipe} />)
        )}
      </section>
    </div>
  );
}
