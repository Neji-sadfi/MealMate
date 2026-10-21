# Community + nutrition & budget tracking

**Owner:** Member 5

## Scope

- **Screens:** Community forum, Nutrition & budget
- **Routes:** `/community`, `/tracking`
- **API:** `GET/POST /api/forum/posts`, `PUT/DELETE /api/forum/posts/[id]`, `GET/POST /api/forum/posts/[id]/comments`, `POST /api/forum/posts/[id]/reports`, `POST /api/forum/posts/[id]/likes`, `DELETE /api/admin/comments/[id]`, `PATCH /api/admin/reports/[id]`, `GET /api/stats/nutrition`, `GET/POST /api/budget`
- **Models:** `ForumPost`, `ForumComment`, `ForumLike`, `ForumReport`, `Notification`
- **Shared UI to deliver (via reviewed PR into `components/ui`):** `Card`, `StatCard`, `InfoBanner`

Members can create posts, like and report once per post, comment, and edit/delete their own posts. ADMIN can hide reported posts and delete any post or comment. Tracking shows current-week or current-month calories/macros from planned meals and expenses grouped by their dates.

## Folder layout

- `components/`: React components used only by this module
- `services/`: data access, server actions and business rules (server side)
- `types.ts`: types shared between this module's server and client code

Pages live in `app/(app)/...` and stay thin: they render components from this folder.
All UI text goes through next-intl keys in `messages/en.json`.
