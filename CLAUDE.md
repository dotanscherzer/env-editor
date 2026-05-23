# env-editor

Browser UI for editing `.env` files inside Docker containers on the Hostinger VPS. Publicly routed via Traefik at `https://env.dotai.online`, bearer-token authenticated.

## Repo identity

- **Owner:** `dotanscherzer` (personal account) — **private** repo at `github.com/dotanscherzer/env-editor`
- **Not** related to the `ai4u` org. Don't reference `ai4u` in commits, PRs, or generated docs.
- Solo project.
- Branch: `master`

If your `gh` CLI is logged into `ai4u-dev`, switch before pushing:

```sh
gh auth switch -u dotanscherzer
```

If `git config` drifts:

```sh
git config user.name "dotanscherzer"
git config user.email "dotan.scherzer@gmail.com"
```

## Layout

```
env-editor/
├── server/
│   ├── index.js       Express app + /webhook/deploy (HMAC verified)
│   ├── auth.js        Bearer-token middleware (EDITOR_TOKEN)
│   ├── docker.js      dockerode + tar-stream helpers
│   └── routes/        containers + env routes (mounted under /api/containers)
├── client/
│   └── index.html     single-file static UI
└── __tests__/         Vitest unit tests (sanity + future security tests)
```

Runs as a **pm2** process on the VPS (`pm2 list` shows `env-editor`).

## VPS deploy (live)

- **Public URL:** `https://env.dotai.online` (Traefik file route in `/opt/traefik/dynamic/env-editor-routes.yml`)
- **Deploy directory on VPS:** `/opt/env-editor/`
- **Port:** `process.env.PORT || 4200` (binds all interfaces — protected by bearer token, not firewall)

## Auto-deploy

`POST https://env.dotai.online/webhook/deploy` accepts pushes from GitHub, verifies the HMAC signature with `WEBHOOK_SECRET`, then runs:

```sh
git pull origin master && npm install --production && pm2 restart env-editor
```

## Security model — important

Two separate auth paths, both publicly reachable via Traefik:

1. **`/api/*` routes** — `EDITOR_TOKEN` bearer auth. **This is the single point of failure for the service's security.** Rotate if leaked.
2. **`POST /webhook/deploy`** — HMAC SHA-256 with `WEBHOOK_SECRET`.

The Docker socket access = effectively root on the host. Compromise of `EDITOR_TOKEN` = full container takeover. Treat the token as a high-value secret.

⚠️ Earlier versions of the docs claimed this was firewall-protected / SSH-tunnel-only. **That was wrong** — verified 2026-05-24 against the VPS. The Traefik route is real and public.

## Testing

See [TESTING.md](TESTING.md). Vitest with CommonJS. CI runs on every PR via `.github/workflows/ci.yml`, with the "new code = new tests" gate.

```sh
npm test           # vitest --run
npm run test:watch # while developing
```

## Env vars

- `EDITOR_TOKEN` — bearer auth for `/api/*` routes (the entire security model)
- `WEBHOOK_SECRET` — HMAC secret for GitHub auto-deploy
- `PORT` (optional, defaults to 4200)

## What to avoid

- Don't expose `/api/*` without `EDITOR_TOKEN` checks
- Don't add a second deploy path that bypasses HMAC verification on the webhook
- Don't commit `.env` files
- Don't add CI workflows beyond the existing `ci.yml` without good reason — solo private repo
- Don't auto-restart target containers after `.env` edits — explicit is safer (a typo in `.env` shouldn't immediately kill a service)

## Linear

[env-editor](https://linear.app/dotan-scherzer/project/env-editor-b00a0fcbd100) project tracks the open work — primarily the audit-log feature ([DOT-46](https://linear.app/dotan-scherzer/issue/DOT-46)).
