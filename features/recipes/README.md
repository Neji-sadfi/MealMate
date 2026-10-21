# Recipes + ingredients

**Owner:** Member 2

## Scope

- **Screens:** Recipes, Recipe detail
- **Routes:** `/recipes`, `/recipes/[id]`
- **API:** `GET/POST /api/recipes`, `GET/PUT/DELETE /api/recipes/[id]` (create by any signed-in user; update/delete by owner or ADMIN), `GET/POST /api/ingredients`, `PUT/DELETE /api/ingredients/[id]`, `GET/POST /api/favorites`, `DELETE /api/favorites/[recipeId]`
- **Models:** `Recipe` (embedded ingredients and steps), `Ingredient` (shared), `Favorite`
- **Shared UI to deliver (via reviewed PR into `components/ui`):** `Chip`, `FilterChip`, `SegmentedTabs`, `RecipeCard`, `MealRow`

Recipe creation supports an optional photo URL, diet tags, ingredients, steps and per-serving nutrition/cost. Catalogue search filters by text, diet, calories, protein, cost, difficulty and preparation time. Signed-in users can favorite recipes; owners can edit or delete their recipes, and ADMIN can manage any recipe. Detail pages show nutrition, ingredients and steps.

## Folder layout

- `components/`: React components used only by this module
- `services/`: data access, server actions and business rules (server side)
- `types.ts`: types shared between this module's server and client code

Pages live in `app/(app)/...` and stay thin: they render components from this folder.
All UI text goes through next-intl keys in `messages/en.json`.
