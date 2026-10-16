# MealMate

**Eat well. At your own pace.**

MealMate is a mobile-first Progressive Web App that helps students plan their meals on a budget. In one place it covers a weekly meal plan, a shopping list built from the plan minus what is already in stock, inventory with expiry dates, nutrition and budget tracking, a community forum, and a personalised workout plan. The shopping list also works offline.

Student team project, 6 developers, one module each. The mockup and the project plan are in [`docs/`](docs/).

## Tech stack

| Layer         | Choice                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router), React 19, TypeScript                                                |
| Styling       | Tailwind CSS 4, design tokens in `app/globals.css`, Manrope font, lucide-react icons         |
| Database      | MongoDB Atlas (free tier) + Mongoose                                                         |
| Auth          | Auth.js (next-auth v5): Credentials provider, bcryptjs, JWT sessions, roles `USER` / `ADMIN` |
| Validation    | zod                                                                                          |
| i18n          | next-intl, English only for now (`messages/en.json`)                                         |
| PWA / offline | Web manifest, Serwist service worker, Dexie (IndexedDB)                                      |
| Charts        | recharts                                                                                     |
| Quality       | ESLint, Prettier, `tsc`, GitHub Actions                                                      |

## Modules and owners

| #   | Module                                  | Screens                                      | Routes                                                | Folder                                               |
| --- | --------------------------------------- | -------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| 1   | Authentication + profile                | Login, Register, Forgot password, My profile | `/login`, `/register`, `/forgot-password`, `/profile` | [`features/auth`](features/auth/README.md)           |
| 2   | Recipes + ingredients                   | Recipes, Recipe detail                       | `/recipes`, `/recipes/[id]`                           | [`features/recipes`](features/recipes/README.md)     |
| 3   | Meal planning + Home                    | Meal plan, Home                              | `/meal-plan`, `/`                                     | [`features/meal-plan`](features/meal-plan/README.md) |
| 4   | Shopping + inventory (offline)          | Shopping list, My inventory                  | `/shopping`, `/shopping/inventory`                    | [`features/shopping`](features/shopping/README.md)   |
| 5   | Community + nutrition & budget tracking | Forum, Nutrition & budget                    | `/community`, `/tracking`                             | [`features/community`](features/community/README.md) |
| 6   | Personalised workout plan               | My sport, Session detail                     | `/sport`, `/sport/sessions/[id]`                      | [`features/sport`](features/sport/README.md)         |

Replace "Member N" with real names in this table and in each module README.

## Getting started (new member)

Requirements: Node.js 20.9+ (22 LTS recommended), Git, and a MongoDB Atlas user created by the project lead.

```bash
# 1. Clone
git clone https://github.com/alamakh/mealmate.git
cd mealmate

# 2. Install dependencies
npm install

# 3. Environment variables
cp .env.example .env
#    then edit .env:
#    - MONGODB_URI: your Atlas URI, with YOUR OWN database name
#      ...mongodb.net/mealmate_<firstname>?retryWrites=true&w=majority
#    - AUTH_SECRET: run `npx auth secret` or `openssl rand -base64 32`

# 4. Fill your database with demo data (this empties it first)
npm run db:seed

# 5. Start the app
npm run dev
```

Open http://localhost:3000 and sign in with **ahmed.benali@mail.com** / **password123**.

Then create your branch from `develop` and read [CONTRIBUTING.md](CONTRIBUTING.md):

```bash
git checkout develop
git checkout -b feat/<module>-<topic>
```

## Scripts

| Command             | What it does                                                              |
| ------------------- | ------------------------------------------------------------------------- |
| `npm run dev`       | Start the dev server on http://localhost:3000                             |
| `npm run build`     | Production build (no database needed)                                     |
| `npm start`         | Run the production build                                                  |
| `npm run lint`      | ESLint                                                                    |
| `npm run typecheck` | Generate route types, then `tsc --noEmit`                                 |
| `npm run format`    | Format everything with Prettier (`format:check` only checks)              |
| `npm run db:seed`   | Reset your database and insert the Ahmed persona and the 4 mockup recipes |

## Project structure

```
app/
  (auth)/            login, register, forgot-password (public)
  (app)/             signed-in screens: layout = AppHeader + BottomNav
  api/               route handlers (stubs return 501 until the owner builds them)
  serwist/           serves the service worker built from app/sw.ts
  ~offline/          offline fallback page
  manifest.ts        PWA web manifest
components/ui/       shared design system (Button, Input, Card, Chip, AppHeader, BottomNav...)
features/<module>/   components/, services/, types.ts and README.md for each module
lib/
  db.ts              cached Mongoose connection (server only)
  auth.ts            Auth.js with Credentials provider (server only)
  auth.config.ts     JWT-only config shared with proxy.ts
  offline/           Dexie database for offline storage
  i18n/              next-intl configuration
models/              Mongoose models, one file per collection
messages/en.json     all UI text
proxy.ts             route protection (the Next.js 16 name for middleware.ts)
scripts/seed.ts      demo data
```

## Notes

- **Route protection:** `proxy.ts` only reads the JWT and redirects signed-out users to `/login`. The rules are in `lib/auth.config.ts`; `/admin/*` is reserved for `ADMIN`.
- **Service worker:** it is disabled in `npm run dev`. Test offline behaviour with `npm run build && npm start`.
- **Design tokens:** `bg-primary`, `bg-background`, `bg-surface`, `bg-tint`, `bg-warning-bg`, `text-muted`, `rounded-card`, `rounded-input`. Use these instead of raw hex values.
- Nutrition values and workout plans are informative only and are not medical advice.
