# Personalised workout plan

**Owner:** Member 6

## Scope

- **Screens:** My sport, Session detail
- **Routes:** `/sport`, `/sport/sessions/[id]`
- **API:** `GET/POST /api/sport-plans`, `PUT/DELETE /api/sport-plans/[id]`, `POST /api/workout-sessions`, `PUT /api/workout-sessions/[id]`
- **Models:** `SportPlan`, `WorkoutSession` (embedded exercises)
- **Shared UI to deliver (via reviewed PR into `components/ui`):** `ProgressBar`

Rule-based generator from the profile (goal, level, days, duration, equipment), e.g. 3 beginner days = Full body A / B / C. Week strip, sessions progress, warm-up / exercises / cool-down, "Mark as done", "not medical advice" note on each screen, session available offline.

The training studio generates a complete AI program using the existing Gemini configuration. The user reviews the warm-up, exercises, rest, form tips, and cool-down before confirming. The save endpoint writes the new plan and sessions for next week before deactivating the previous plan; existing sessions are retained.

The preview uses `POST /api/sport-plans/generate`; confirmation submits the validated preview to `POST /api/sport-plans/save-generated`.
Workout session details support editing the schedule, warm-up, exercises and cool-down, as well as deleting the session.
Exercise photos are matched automatically against the French and English wger catalogue. Photos are only shown when a matching exercise and its license are available; the source and license are linked, and missing photos never block a workout.

## Folder layout

- `components/`: React components used only by this module
- `services/`: data access, server actions and business rules (server side)
- `types.ts`: types shared between this module's server and client code

Pages live in `app/(app)/...` and stay thin: they render components from this folder.
All UI text goes through next-intl keys in `messages/en.json`.
