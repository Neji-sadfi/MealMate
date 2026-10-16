# Meal planning + Home

**Owner:** Member 3

## Scope

- **Screens:** Meal plan, Home dashboard
- **Routes:** `/meal-plan`, `/`
- **API:** `GET/POST /api/meal-plans`, `PUT/DELETE /api/meal-plans/[id]`, `POST /api/meal-plans/generate`, `GET /api/dashboard`
- **Models:** `MealPlan`, `Meal`
- **Shared UI to deliver (via reviewed PR into `components/ui`):** `BottomNav`, `WeekStrip`

Rule-based generator (budget, diet, stock, kcal target), Plan / Recipes / Favorites tabs, duplicate day / week, offline cache of the plan via `lib/offline`. Home combines budget, nutrition, today's menu, items to buy, expiry alert and next workout.

## Folder layout

- `components/`: React components used only by this module
- `services/`: data access, server actions and business rules (server side)
- `types.ts`: types shared between this module's server and client code

Pages live in `app/(app)/...` and stay thin: they render components from this folder.
All UI text goes through next-intl keys in `messages/en.json`.
