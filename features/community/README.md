# Community + nutrition & budget tracking

**Owner:** Member 5

## Scope

- **Screens:** Community forum, Nutrition & budget
- **Routes:** `/community`, `/tracking`
- **API:** `GET/POST /api/forum/posts`, `PUT/DELETE /api/forum/posts/[id]`, `POST /api/forum/posts/[id]/comments`, `POST /api/forum/posts/[id]/reports`, `POST /api/forum/posts/[id]/likes`, `GET /api/stats/nutrition`, `GET/POST /api/budget`
- **Models:** `ForumPost`, `ForumComment`, `ForumLike`, `ForumReport`, `Notification`
- **Shared UI to deliver (via reviewed PR into `components/ui`):** `Card`, `StatCard`, `InfoBanner`

Forum categories: nutrition, weight_loss, muscle_gain, training, motivation. ADMIN moderation (hide reported posts). Tracking: This week / This month, kcal per day chart (recharts), macro bars, budget spent / left by category, add an expense. Notifications (meal reminder, budget almost reached, expiry).

## Folder layout

- `components/`: React components used only by this module
- `services/`: data access, server actions and business rules (server side)
- `types.ts`: types shared between this module's server and client code

Pages live in `app/(app)/...` and stay thin: they render components from this folder.
All UI text goes through next-intl keys in `messages/en.json`.
