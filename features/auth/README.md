# Authentication + profile

**Owner:** Member 1

## Scope

- **Screens:** Login, Register, Forgot password, My profile
- **Routes:** `/login`, `/register`, `/forgot-password`, `/profile`
- **API:** `POST /api/auth/register` (done), `POST /api/auth/forgot-password`, `GET/PUT /api/users/me`, `GET/PUT /api/users/preferences`. Sign in / sign out are handled by Auth.js under `/api/auth/*`.
- **Models:** `User` (with embedded `preferences`)
- **Shared UI to deliver (via reviewed PR into `components/ui`):** `AppHeader`, `Button`, `Input`, `Select`, `PasswordInput`

Login, register and logout already work (`components/LoginForm.tsx`, `components/RegisterForm.tsx`, `services/actions.ts`). Still to do: forgot password, the profile form (Personal information, Diet, Your workout rhythm), login attempt limiting, ADMIN-only routes in `lib/auth.config.ts`.

## Folder layout

- `components/`: React components used only by this module
- `services/`: data access, server actions and business rules (server side)
- `types.ts`: types shared between this module's server and client code

Pages live in `app/(app)/...` and stay thin: they render components from this folder.
All UI text goes through next-intl keys in `messages/en.json`.
