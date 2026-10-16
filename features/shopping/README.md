# Shopping + inventory (offline pilot)

**Owner:** Member 4

## Scope

- **Screens:** Shopping list, My inventory
- **Routes:** `/shopping`, `/shopping/inventory`
- **API:** `GET/POST /api/shopping-lists`, `POST /api/shopping-lists/generate`, `PUT/DELETE /api/shopping-items/[id]`, `GET/POST/PUT/DELETE /api/inventory`
- **Models:** `ShoppingList`, `ShoppingItem`, `Inventory`, `Budget`
- **Shared UI to deliver (via reviewed PR into `components/ui`):** `CheckItem`, `lib/offline/`

Shopping list = meal plan minus stock, grouped by aisle, total vs budget, offline banner and last sync. Inventory sorted by expiry date. Owns the offline layer: `app/sw.ts` (Serwist) and `lib/offline/` (Dexie + pending action queue, document the conflict strategy, e.g. last write wins per item).

## Folder layout

- `components/`: React components used only by this module
- `services/`: data access, server actions and business rules (server side)
- `types.ts`: types shared between this module's server and client code

Pages live in `app/(app)/...` and stay thin: they render components from this folder.
All UI text goes through next-intl keys in `messages/en.json`.
