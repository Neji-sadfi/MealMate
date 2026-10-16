# Contributing to MealMate

Six people work on this repo in parallel, one module each. These rules keep `develop` green and stop us from overwriting each other's work.

## Branches and pull requests

- `main`: demo-ready code only. Updated from `develop` at each milestone.
- `develop`: integration branch, and the default branch on GitHub.
- Your work goes on a branch named `feat/<module>-<topic>`, created from `develop`:

  ```bash
  git checkout develop && git pull
  git checkout -b feat/shopping-offline
  ```

  Modules: `auth`, `recipes`, `meal-plan`, `shopping`, `community`, `sport`. Use `fix/<module>-<topic>` for bug fixes.

- Open a Pull Request **into `develop`**. At least **one other teammate** must review and approve it.
- CI (lint, typecheck, build) must pass. Do not merge a red PR.
- Keep PRs small: one screen or one feature at a time is easier to review.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(recipes): add diet filter chips
fix(shopping): keep checked items after sync
chore: bump dependencies
docs(sport): explain the session generator
```

Common types: `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`.

## Who edits what

| You may edit freely             | Only through a reviewed PR                                 |
| ------------------------------- | ---------------------------------------------------------- |
| `app/(app)/<your routes>`       | `components/ui/*` (shared design system)                   |
| `app/api/<your endpoints>`      | `lib/*` (db, auth, offline, i18n)                          |
| `features/<your module>/`       | `app/layout.tsx`, `app/(app)/layout.tsx`, `proxy.ts`       |
| Your own models in `models/`    | Shared models (`Ingredient`, `User`, `Budget`, `enums.ts`) |
| Your keys in `messages/en.json` | `package.json`, configs, CI                                |

- **Models:** each member only edits the models of their own module (owner is written at the top of each file). If you need a field in someone else's model, ask them or open a PR and request their review.
- **Shared UI components:** new components in `components/ui` must stay generic, small and typed. Module-specific components go in `features/<module>/components`.

## UI text: no hard-coded strings

The app is in English, and every UI string goes through [next-intl](https://next-intl.dev):

1. Add the key in `messages/en.json` under your module's section (e.g. `pages.shopping.offlineBanner`).
2. Use it:
   - Server or shared component: `const t = useTranslations("pages.shopping")`, or `await getTranslations(...)` in async components.
   - Client component: `useTranslations` (the provider is already in the root layout).
3. Keys are type-checked: a typo fails `npm run typecheck`.

This keeps the door open for French later (`messages/fr.json`).

## Code style

- TypeScript strict, no `any` unless justified in a comment.
- Prettier formats everything: run `npm run format` before committing.
- Validate every API input and form with **zod** (see `features/auth/schemas.ts`).
- Anything that imports Mongoose (`lib/db.ts`, `models/*`, `lib/auth.ts`) is server-only. Never import it from a `"use client"` file or from `proxy.ts`.
- Call `await connectToDatabase()` from `@/lib/db` before using a model.

## Before you push

```bash
npm run lint
npm run typecheck
npm run build
```
