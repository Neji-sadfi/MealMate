# Recipes + ingredients

**Owner:** Member 2

## Scope

- **Screens:** Recipes, Recipe detail
- **Routes:** `/recipes`, `/recipes/[id]`
- **API:** `GET/POST /api/recipes`, `GET/PUT/DELETE /api/recipes/[id]` (create by any signed-in user; update/delete by owner or ADMIN), `GET/POST /api/ingredients`, `PUT/DELETE /api/ingredients/[id]`, `GET/POST /api/favorites`, `DELETE /api/favorites/[recipeId]`
- **Models:** `Recipe` (embedded ingredients and steps), `Ingredient` (shared), `Favorite`
- **Shared UI to deliver (via reviewed PR into `components/ui`):** `Chip`, `FilterChip`, `SegmentedTabs`, `RecipeCard`, `MealRow`

Recipe creation supports an optional photo URL, diet tags, ingredients, steps and per-serving nutrition/cost. Catalogue search filters by text, diet, calories, protein, cost, difficulty and preparation time. Signed-in users can favorite recipes; owners can edit or delete their recipes, and ADMIN can manage any recipe. Detail pages show nutrition, ingredients and steps.

## AI recipe studio

The recipes page includes an AI recipe generator and a general food-ideas chat assistant. Both use the signed-in user's saved diet, allergy, intolerance and nutrition-goal preferences. Generated recipes are validated and are only added to the catalogue when the user explicitly saves them.

To enable the feature locally, add a Google AI Studio API key to the server's `.env` file:

```env
GEMINI_API_KEY="your-google-ai-studio-api-key"
```

The key must stay on the server, must never be exposed to client code, and must not be committed. The app uses Google's provider for Vercel AI SDK, with `gemini-2.5-flash` by default; `GEMINI_MODEL` can optionally select another supported model. Before a request, users must acknowledge that their prompt and saved dietary preferences are sent to Google. AI nutrition and cost values are estimates only; this assistant is not for medical advice. Verify product labels and allergen/cross-contamination risks.

## Folder layout

- `components/`: React components used only by this module
- `services/`: data access, server actions and business rules (server side)
- `types.ts`: types shared between this module's server and client code

Pages live in `app/(app)/...` and stay thin: they render components from this folder.
All UI text goes through next-intl keys in `messages/en.json`.
