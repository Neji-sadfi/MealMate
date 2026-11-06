# Shopping + inventory (offline pilot)

**Owner:** Member 4

## Scope

- **Screens:** Shopping list, My inventory
- **Routes:** `/shopping`, `/shopping/inventory`
- **API:** `GET/POST /api/shopping-lists`, `POST /api/shopping-lists/generate`, `POST /api/shopping-price-estimate`, `PUT/DELETE /api/shopping-items/[id]`, `GET/POST/PUT/DELETE /api/inventory`
- **Models:** `ShoppingList`, `ShoppingItem`, `Inventory`, `Budget`
- **Shared UI to deliver (via reviewed PR into `components/ui`):** `CheckItem`, `lib/offline/`

Shopping list = meal plan minus stock, grouped by aisle, total vs budget, offline banner and last sync. Inventory sorted by expiry date. Owns the offline layer: `app/sw.ts` (Serwist) and `lib/offline/` (Dexie + pending action queue, document the conflict strategy, e.g. last write wins per item).

The inventory lets members add stock, adjust quantities and record expiry dates; upcoming and expired items are highlighted. When an item is marked as bought, members enter the total actually paid. That amount is saved to the weekly budget and nutrition/budget tracker; unmarking the item reverses its linked expense.

The shopping screen estimates cost from saved reference prices (TND/kg, TND/litre, or TND/item), and labels them as estimates rather than store prices. The estimate can prefill the purchase amount, but the member can adjust it to match the receipt. Géant Drive Tunis City is the only retailer shown. With explicit consent, generating a list automatically searches the public catalogue for up to 12 unchecked item names and saves confident matches to those list items. Search terms are sent to Géant; search pages are cached briefly and checks are rate-limited. Members can also manually search an existing list. Displayed catalogue prices are kept separate from estimated basket totals because a listed product's pack size may not match the requested quantity.

## Folder layout

- `components/`: React components used only by this module
- `services/`: data access, server actions and business rules (server side)
- `types.ts`: types shared between this module's server and client code

Pages live in `app/(app)/...` and stay thin: they render components from this folder.
All UI text goes through next-intl keys in `messages/en.json`.
