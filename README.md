# MealMate

MealMate is a mobile-first **Progressive Web App** for planning meals, managing shopping lists and inventory, tracking nutrition and budget, following a personalised workout plan and sharing progress in a community forum.

Student team project · Next.js · TypeScript · MongoDB · English UI

---

## Team and modules

Each member works **only on their own module**: their routes, their `features/<module>` folder, their Mongoose models and their API routes. Anything outside your module changes only through a Pull Request reviewed by its owner.

| Member             | Module                              | Routes                                                | Folder               |
| ------------------ | ----------------------------------- | ----------------------------------------------------- | -------------------- |
| Youssef            | User: authentication + profile      | `/login`, `/register`, `/forgot-password`, `/profile` | `features/auth`      |
| Neji               | Recipes + ingredients               | `/recipes`, `/recipes/[id]`                           | `features/recipes`   |
| Nada               | Meal planning + Home dashboard      | `/meal-plan`, `/`                                     | `features/meal-plan` |
| Hamza              | Shopping list + inventory           | `/shopping`, `/shopping/inventory`                    | `features/shopping`  |
| Fekri              | Forum + nutrition & budget tracking | `/community`, `/tracking`                             | `features/community` |
| Ala (project lead) | Workout plan + sessions             | `/sport`, `/sport/sessions/[id]`                      | `features/sport`     |

---

## 1. Prerequisites

Install these once on your computer:

| Tool           | Version            | Download                      | Check it works                         |
| -------------- | ------------------ | ----------------------------- | -------------------------------------- |
| Node.js        | 20 or newer (LTS)  | https://nodejs.org            | `node -v`                              |
| Git            | any recent version | https://git-scm.com           | `git --version`                        |
| VS Code        | latest             | https://code.visualstudio.com | —                                      |
| GitHub account | —                  | https://github.com            | Accept the repo invitation sent by Ala |

You also need access to the team's **MongoDB Atlas** database (see step 3). Nothing to install for the database: it runs online, for free.

Set your Git name and email once (use the email of your GitHub account):

```bash
git config --global user.name "First Last"
git config --global user.email "your-github-email@example.com"
```

### Windows users: read this first

- **"Running scripts is disabled on this system" / "l'exécution de scripts est désactivée"** when you run `npm`: open PowerShell and run this once, then try again:

  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```

  (Or use **Command Prompt** instead of PowerShell in the VS Code terminal.)

- **Do not put the project inside OneDrive** (for example `OneDrive\Desktop`). OneDrive tries to sync `node_modules` and makes Next.js slow or crash with `EPERM` errors. Use a normal folder such as `C:\Users\<you>\Projects`.

---

## 2. Clone the project

```bash
cd ~/Projects            # or any folder that is NOT in OneDrive
git clone https://github.com/<ala-github-username>/mealmate.git
cd mealmate
npm install
```

Open it in VS Code:

```bash
code .
```

---

## 3. Database (MongoDB)

Choose **one** database setup: local MongoDB for development, or the shared Atlas cluster.

### 3.1 Local MongoDB (Windows)

Install MongoDB Community Server and make sure the `MongoDB` Windows service is running:

```powershell
Get-Service MongoDB
Start-Service MongoDB  # only if it is stopped; may require an Administrator terminal
```

In `.env`, use a local connection string:

```
MONGODB_URI="mongodb://127.0.0.1:27017/mealmate_local"
```

The app reads and writes recipes, meal plans, shopping items, inventory, posts, workouts, budgets and accounts in this database. Data remains after the app is restarted.

### 3.2 MongoDB Atlas

The team shares **one free Atlas cluster**. Each member uses **their own database name** inside it, so nobody overwrites anyone else's data.

#### Get your database user

Ask **Ala** to create your database user in Atlas (**Database & Network Access → Database Users → Add New Database User**). Ala sends you privately:

- your **username** and **password**
- the **cluster host**, for example `cluster0.xxxxx.mongodb.net`

Never share these in the GitHub repo, issues or group chats.

> **Ala only (already done once):** the cluster's **IP Access List** contains `0.0.0.0/0` (_Allow access from anywhere_) so every member can connect from home or university Wi-Fi.

#### Build your connection string

Use this template and replace the 4 parts (no `< >` left anywhere):

```
mongodb+srv://USERNAME:PASSWORD@CLUSTER_HOST/mealmate_FIRSTNAME?retryWrites=true&w=majority
```

Example for Neji:

```
mongodb+srv://neji:S3cretPass@cluster0.xxxxx.mongodb.net/mealmate_neji?retryWrites=true&w=majority
```

If your password contains special characters (`@ : / ? # %`), replace them: `@` → `%40`, `:` → `%3A`, `/` → `%2F`, `#` → `%23`, `%` → `%25`. Easiest: choose a password with only letters and numbers.

#### Optional: your own free cluster instead

You can also create your own free cluster on https://www.mongodb.com/atlas → **Create** → **Free** card → AWS / Frankfurt → create a database user → **Network Access → Allow access from anywhere** → **Connect → Drivers** → copy the link.

---

## 4. Environment variables (`.env`)

Create a local **`.env`** file in the project folder and fill in both values. For local MongoDB, set `MONGODB_URI` to `mongodb://127.0.0.1:27017/mealmate_local`; for Atlas, use the connection string format below.

```
MONGODB_URI="mongodb+srv://USERNAME:PASSWORD@CLUSTER_HOST/mealmate_FIRSTNAME?retryWrites=true&w=majority"
AUTH_SECRET="paste-a-long-random-string-here"
```

Generate your own `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`.env` is listed in `.gitignore`: it stays on your computer and is **never** committed. Check with `git status`: `.env` must not appear.

---

## 5. Run the project

```bash
npm run db:seed     # clears YOUR database and inserts demo data
npm run dev         # starts the app
```

**Warning:** `npm run db:seed` deletes the collections in the database named by `MONGODB_URI` before inserting sample data. Only run it on a database you are happy to reset.

Open **http://localhost:3000** and sign in with the demo account:

- **Email:** `ahmed.benali@mail.com`
- **Password:** `password123`

Or create your own account on `/register`.

The local demo account is also an administrator. After signing in, use the **Admin** button in the header or open `/admin` to manage the recipe catalogue and review reported community posts. If the account was already signed in when its role changed, sign out and sign in again to refresh the role in the session.

Tip: press **F12**, then **Ctrl + Shift + M** to see the app in phone size (the app is mobile-first).

Stop the app with **Ctrl + C** in the terminal. After changing `.env`, always restart `npm run dev`.

### Useful scripts

| Command             | What it does                               |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Start the app in development mode          |
| `npm run db:seed`   | Reset your database with the demo data     |
| `npm run lint`      | Check code style                           |
| `npm run typecheck` | Check TypeScript types                     |
| `npm run build`     | Production build (run before opening a PR) |
| `npm run format`    | Format the code with Prettier              |

---

## 6. How we work with Git

**Never push directly to `main`.** We work on `develop` and merge through Pull Requests.

```bash
git checkout develop
git pull
git checkout -b feat/<module>-<topic>      # e.g. feat/sport-session-detail
```

Work, then commit and push your branch:

```bash
git add .
git commit -m "feat(sport): add session detail page"
git push -u origin feat/<module>-<topic>
```

On GitHub, open a **Pull Request into `develop`** and ask one teammate to review it.

Before opening a PR, make sure these pass:

```bash
npm run lint
npm run typecheck
npm run build
```

Rules:

- **Branches:** `feat/<module>-<topic>`, `fix/<module>-<topic>`.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`, `chore:`, `docs:`.
- **Your module only:** edit only your routes, `features/<module>`, your models in `models/` and your API routes. Need a change elsewhere? Open a PR and tag the owner.
- **No hard-coded UI text:** use `next-intl` keys in `messages/en.json`. The app is in **English**.
- **Never commit secrets:** no `.env`, no passwords, no connection strings.
- Every day, update your branch: `git checkout develop && git pull && git checkout <your-branch> && git merge develop`.

---

## 7. Project structure

```
mealmate/
├─ app/
│  ├─ (auth)/login, register, forgot-password     → Youssef
│  ├─ (app)/layout.tsx  (header + bottom nav)      → shared
│  ├─ (app)/page.tsx  (Home dashboard)             → Nada
│  ├─ (app)/profile                                → Youssef
│  ├─ (app)/recipes, recipes/[id]                  → Neji
│  ├─ (app)/meal-plan                              → Nada
│  ├─ (app)/shopping, shopping/inventory           → Hamza
│  ├─ (app)/community, tracking                    → Fekri
│  ├─ (app)/sport, sport/sessions/[id]             → Ala
│  └─ api/                                         → one folder per module
├─ components/ui/       → shared base components (Button, Input, Card, Chip, AppHeader, BottomNav…)
├─ features/<module>/   → each module's components, services and types
├─ lib/                 → db connection, auth, offline, i18n
├─ models/              → Mongoose models (one file per collection)
├─ messages/en.json     → all UI texts
├─ scripts/seed.ts      → demo data
└─ docs/                → mockup and specification
```

---

## 8. Troubleshooting

| Problem                                                | Fix                                                                                                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm : ... scripts is disabled on this system`         | Run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` in PowerShell (see section 1).                                              |
| `MissingSecret: Please define a secret`                | `AUTH_SECRET` is missing in `.env`. Generate one (section 4) and restart `npm run dev`.                                                                |
| `MongooseServerSelectionError` / cannot connect        | Check the `MONGODB_URI` in `.env`: no `< >`, correct password, correct cluster host. Ask Ala to check that `0.0.0.0/0` is in the Atlas IP Access List. |
| `bad auth : authentication failed`                     | Wrong username or password in `MONGODB_URI`. Ask Ala to reset your database user's password.                                                           |
| Login says "invalid credentials" with the demo account | Run `npm run db:seed`, then try again.                                                                                                                 |
| `EPERM` / very slow on Windows                         | Move the project out of OneDrive (section 1).                                                                                                          |
| Port 3000 already in use                               | Stop the other `npm run dev` (Ctrl + C) or run `npm run dev -- -p 3001`.                                                                               |

---

## Documentation

- Team plan: modules, screens, roadmap and conventions: ask Ala for the shared plan link.
- `docs/maquette.pdf`: the mockup (in French, the app is in English).
- `docs/cahier-des-charges.docx`: the specification.
