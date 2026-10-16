# Recipes + ingredients

**Owner:** Member 2

## Scope

- **Screens:** Recipes, Recipe detail
- **Routes:** `/recipes`, `/recipes/[id]`
- **API:** `GET/POST /api/recipes`, `GET/PUT/DELETE /api/recipes/[id]` (writes ADMIN only), `GET/POST /api/ingredients`, `PUT/DELETE /api/ingredients/[id]`, `GET/POST /api/favorites`, `DELETE /api/favorites/[recipeId]`
- **Models:** `Recipe` (embedded ingredients and steps), `Ingredient` (shared), `Favorite`
- **Shared UI to deliver (via reviewed PR into `components/ui`):** `Chip`, `FilterChip`, `SegmentedTabs`, `RecipeCard`, `MealRow`

Filters in the URL (`searchParams`): diet, calories, protein, cost, difficulty, time; "Relevance" sort; favorites. Detail: cost, macros, ingredients in stock / to buy, servings +/-, steps, "Add to meal plan". Extend `scripts/seed.ts` to ~20 recipes.

## Folder layout

- `components/`: React components used only by this module
- `services/`: data access, server actions and business rules (server side)
- `types.ts`: types shared between this module's server and client code

Pages live in `app/(app)/...` and stay thin: they render components from this folder.
All UI text goes through next-intl keys in `messages/en.json`.
