# Shopping + inventory (offline pilot)

**Owner:** Member 4

## Scope

- **Screens:** Shopping list, My inventory
- **Routes:** `/shopping`, `/shopping/inventory`
- **API:** `GET/POST /api/shopping-lists`, `POST /api/shopping-lists/generate`, `POST /api/shopping-price-estimate`, `PUT/DELETE /api/shopping-items/[id]`, `GET/POST/PUT/DELETE /api/inventory`
- **Models:** `ShoppingList`, `ShoppingItem`, `Inventory`, `Budget`
- **Shared UI to deliver (via reviewed PR into `components/ui`):** `CheckItem`, `lib/offline/`

Shopping list = meal plan minus stock, grouped by aisle, total vs budget, offline banner and last sync. Inventory sorted by expiry date. Owns the offline layer: `app/sw.ts` (Serwist) and `lib/offline/` (Dexie + pending action queue, document the conflict strategy, e.g. last write wins per item).

The inventory lets members add stock, adjust quantities and record expiry dates; upcoming and expired items are highlighted. Budget entries are tracked separately in the nutrition/budget module and are currently entered manually.

The shopping screen estimates cost from saved reference prices (TND/kg, TND/litre, or TND/item), and labels them as estimates rather than store prices. Users can choose a Tunisian retailer. Only Carrefour Tunisia's public catalogue is currently queried in-app; this requires explicit consent, sends at most 12 unchecked item names, is rate-limited, and shows product prices separately because catalogue pack sizes may not match the list quantity. Other retailers remain generic estimates until a public, usable catalogue is verified.

## Folder layout

- `components/`: React components used only by this module
- `services/`: data access, server actions and business rules (server side)
- `types.ts`: types shared between this module's server and client code

Pages live in `app/(app)/...` and stay thin: they render components from this folder.
All UI text goes through next-intl keys in `messages/en.json`.
