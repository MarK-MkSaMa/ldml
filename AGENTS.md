# AGENTS.md

## Stack and layout

- This is a single-package Next.js 16 App Router app using React 19, strict TypeScript, PostgreSQL, postgres.js, and Drizzle ORM.
- Routes, route handlers, and co-located Server Actions live in `src/app/`. Put database/business logic in `src/lib/`; the schema and shared DB client are `src/db/schema.ts` and `src/db/index.ts`.
- Use the `@/*` alias for `src/*`. User-facing copy is Simplified Chinese.

## Commands

- Install with `npm ci`; the committed lockfile is `package-lock.json`.
- Development: `npm run dev`.
- Focused verification: `npx eslint <changed paths>` then `npx tsc --noEmit`.
- Full verification: `npm run lint`, `npx tsc --noEmit`, then `npm run build` for cross-cutting changes.
- There is no configured test runner or `test` script; do not claim tests passed unless one is added.

## Environment and authentication

- Node-side code loads `.env.local` first, then `.env`; `DATABASE_URL` is required. Env files are gitignored.
- Linux DO OAuth uses Auth.js v5 with JWT sessions. Authorization must use `getCurrentUserFresh()`, `requireCurrentUserFresh()`, or `requireAdminFresh()` from `src/lib/current-user.ts` so bans, trust level, and admin changes are read from the database rather than stale session claims.
- `HTTPS_PROXY`/`HTTP_PROXY` are explicitly installed as an undici global proxy in `src/auth.ts` for OAuth networking.

## Database safety

- `npm run db:push` intentionally runs `npm run db:backup` first. The backup must succeed before Drizzle runs.
- Backups are custom-format dumps under `backups/db/`, ignored by git; the script keeps 20 by default. It requires `pg_dump` in `PATH` or `PG_DUMP_PATH` pointing to the executable. `DB_BACKUP_DIR` and `DB_BACKUP_KEEP` override defaults.
- Never bypass the backup or accept a Drizzle prompt that proposes `TRUNCATE ... CASCADE`. A previous `models` truncate also erased votes, comments, model stats, reactions, and reports through foreign keys.
- `models.modelsDevId` deliberately uses a partial unique index (`WHERE models_dev_id IS NOT NULL`), not `.unique()`. Do not replace it with a normal unique column constraint; that previously caused Drizzle to propose truncating populated `models`.
- For production schema work, prefer `npm run db:generate` plus review of the generated SQL and `npm run db:migrate`. Existing files in `drizzle/` are historical; do not rewrite applied migrations.

## Models and rankings

- Model statuses are `draft`, `observing`, `listed`, and `archived`; keep shared status definitions in `src/lib/model-status.ts`.
- Observing models promote to `listed` when `releasedAt` is at least 7 days old or any dimension reaches 50 votes. Promotion runs after voting or via the admin button; there is no independent promotion cron.
- Rankings use `unstable_cache` with tag `rankings`. Mutations affecting models, dimensions, votes, or ranking-visible data must call `updateTag("rankings")` and revalidate the relevant pages, following existing Server Actions.
- User-submitted model requests are local records (`modelsDevId = null`) and are reviewed at `/admin/model-requests`; approval creates an `observing` model.

## models.dev synchronization

- `npm run models:sync` imports canonical models from the models.dev GitHub repository's `models/**/*.toml`, not provider endpoints from `api.json`.
- Synchronization currently accepts text-output canonical models only; image/video models and manually created records must not be changed by this sync.
- Sync is incremental: only models with `release_date >= sync_states['models.dev'].lastSyncedAt` are processed. If no state exists, the cutoff is `2026-04-01`; a successful run advances the state to the run start time.
- To deliberately replay from the default cutoff, delete only the `models.dev` row from `sync_states`; do not truncate model tables.
- The protected HTTP sync endpoint is `/api/admin/models-dev/sync`; GET and POST require `Authorization: Bearer $MODELS_SYNC_SECRET`.

## Change hygiene

- Preserve unrelated dirty-worktree changes. Schema/data operations are never part of ordinary UI verification unless explicitly requested.
- After schema changes, tell the user that deployment needs a backed-up migration/push; do not run `db:push`, reset, seed, or sync commands against an important database without an explicit request.
