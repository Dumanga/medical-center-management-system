# Deployment Guide (Vercel + Railway)

This guide explains, from A → Z, how to deploy the Medical Center Management System on Vercel with a Railway MySQL database, apply Prisma migrations, seed the default admin user, and verify invoices (PDF) work in a serverless environment.

---

## 1) Prerequisites

- GitHub repository connected (this repo)
- Railway account (MySQL database)
- Vercel account (Next.js deployment)

---

## 2) Create the Railway MySQL database

1. In Railway, create a new MySQL service.
2. Open the service → “Variables” tab.
3. Copy the “Public Prisma URL” (MYSQL_PUBLIC_URL). It will look like:
   - `mysql://root:<PASSWORD>@gondola.proxy.rlwy.net:<PORT>/railway`
4. For CI and Vercel, append an SSL flag:
   - Start with `?sslaccept=strict`
   - If you see TLS errors in CI/production, use `?sslaccept=accept_invalid_certs` instead.

Example (CI‑friendly):

```
mysql://root:<PASSWORD>@gondola.proxy.rlwy.net:<PORT>/railway?sslaccept=accept_invalid_certs
```

Note: Railway may rotate credentials; always copy via the copy‑icon to avoid typos.

---

## 3) Configure GitHub Actions secrets

We pre‑created three workflows to run migrations and seed the admin user from GitHub (Ubuntu runners). Add secrets:

- Go to GitHub → Repo → Settings → Secrets and variables → Actions → “New repository secret”
  - `DATABASE_URL` = your Railway URL (include `?sslaccept=accept_invalid_certs` for Actions)
  - Optional: `ADMIN_USERNAME` (default: `admin`)
  - Optional: `ADMIN_PASSWORD` (default: `admin123`)

Workflows in this repo:

- `.github/workflows/migrate.yml` → “Prisma Migrate Deploy”
- `.github/workflows/migrate-repair.yml` → “Prisma Migrate Repair and Deploy” (marks a failed migration as rolled back, then deploys)
- `.github/workflows/seed-admin.yml` → “Seed Admin User”

---

## 4) Apply Prisma migrations (one‑time, against Railway)

Preferred path (CI):

1. GitHub → Actions → “Prisma Migrate Deploy” → Run workflow (main branch)
2. If you get TLS error `P1011`, confirm `DATABASE_URL` contains `?sslaccept=accept_invalid_certs`.
3. If you get auth error `P1000`, rotate the password in Railway and re‑update the secret with the **new** Public Prisma URL.
4. If you see `P3009` (failed migration recorded), run “Prisma Migrate Repair and Deploy” once (it executes `prisma migrate resolve --rolled-back <name>` then deploys again).

Alternative (local WSL):

```
export DATABASE_URL='mysql://root:...@gondola.proxy.rlwy.net:PORT/railway?sslaccept=strict'
npx prisma migrate deploy
```

---

## 5) Seed the default admin user

Use the CI workflow (idempotent):

1. GitHub → Actions → “Seed Admin User” → Run workflow
   - Uses `ADMIN_USERNAME` and `ADMIN_PASSWORD` secrets if provided; otherwise defaults to `admin` / `admin123`.
2. Login on the deployed app with those credentials (username is case‑sensitive).

Manual SQL alternative (if ever needed):

```
INSERT INTO `Admin` (`username`, `password`)
VALUES ('admin', '<BCRYPT_HASH>')
ON DUPLICATE KEY UPDATE `password` = VALUES(`password`);
```

Where `<BCRYPT_HASH>` can be generated with bcryptjs.

---

## 6) Configure Vercel project

1. In Vercel, import the GitHub repo if not already done.
2. Project → Settings → Environment Variables:
   - `DATABASE_URL` = your Railway URL
     - Start with `?sslaccept=strict`; if runtime shows TLS issues, switch to `?sslaccept=accept_invalid_certs`.
3. Deploy.

Notes:

- We swapped the invoice PDF engine to `puppeteer-core + @sparticuz/chromium` (Vercel‑friendly). No extra config needed.
- `vercel.json` scopes memory/time for App Router route handlers:

```
{
  "functions": {
    "src/app/**/route.js": { "memory": 1536, "maxDuration": 60 },
    "src/app/**/route.ts": { "memory": 1536, "maxDuration": 60 }
  }
}
```

- Some server pages use `export const dynamic = 'force-dynamic'` to avoid pre‑rendering at build (prevents build‑time DB calls).

---

## 7) Verify deployment

1. Login with the seeded admin credentials.
2. Create a patient; confirm the list updates.
3. Create a session and “Download Invoice” — PDF should render (A5).
4. Dashboard should show counts/appointments; it is resilient to optional KPI errors.

---

## 8) Day‑2 operations (schema changes)

1. After editing `prisma/schema.prisma`, create a migration locally:

```
npx prisma migrate dev --name <change_name>
git add . && git commit -m "feat(db): <change_name>"
git push
```

2. Apply to Railway using the CI workflow:
   - Actions → “Prisma Migrate Deploy”
   - If a migration fails midway (e.g., case‑sensitive table name on Linux), fix the migration file, push, then run “Prisma Migrate Repair and Deploy”.

---

## 9) Troubleshooting

- P1000 (Authentication failed)
  - Railway password changed or URL pasted incorrectly. Re‑copy MYSQL_PUBLIC_URL and update `DATABASE_URL` secret/env.

- P1011 (TLS/certificate error)
  - Use `?sslaccept=accept_invalid_certs` in CI/Production if `?sslaccept=strict` fails on your runner/platform.

- P3009 (Found failed migrations)
  - Run the “Prisma Migrate Repair and Deploy” workflow once to mark the failed migration as rolled back, then deploy.

- “Function Runtimes must have a valid version” (Vercel build)
  - Caused by a legacy `runtime` in `vercel.json`. We already removed it and scoped functions to route files.

- Dashboard shows “Unable to connect…”
  - The page now uses `Promise.allSettled` and isolates optional KPIs. If you still see the banner, check Vercel logs for “Dashboard: all core queries failed” — that indicates a true DB outage or a critical query failure. Otherwise, individual sections will default gracefully.

- Invoice PDF timeouts
  - Cold starts can take a few seconds. If persistent, increase memory/maxDuration in `vercel.json` slightly.

- MySQL table name case sensitivity (Linux)
  - Ensure migration SQL uses the exact model table name (e.g., `Appointment` not `appointment`).

---

## 10) Optional: local development tips (Windows)

- Use WSL (Ubuntu) for Prisma/SSL stability:
  - `wsl --install`
  - In WSL: `npm ci`, set `DATABASE_URL`, run `npx prisma migrate deploy`

---

## 11) Admin seeding (summary)

- CI workflow: “Seed Admin User” (uses `prisma/seed.js`)
- Defaults: `admin` / `admin123`
- You can override via `ADMIN_USERNAME` and `ADMIN_PASSWORD` secrets.

---

## 12) Rollbacks / Safety

- Use GitHub “Revert” to undo a commit safely (keeps history linear).
- For emergency hotfixes, create a new commit and redeploy — avoid force‑push on main.

---

If you need me to automate migrations on every push to `main`, I can add a guarded workflow (manual approval) or run on tagged releases only.

