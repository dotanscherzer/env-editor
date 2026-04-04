# EnvEditor

Edit `.env` files inside Docker containers through a browser UI. No SSH required after setup.

## Quick Start

```bash
git clone https://github.com/dotanscherzer/env-editor.git
cd env-editor
npm install
cp .env.example .env
# Edit .env — set EDITOR_TOKEN (required)
node server/index.js
```

## Access via SSH Tunnel

The app listens on port 4200 and is **not** exposed publicly. Access it via SSH tunnel:

```bash
ssh -L 4200:localhost:4200 -N root@<VPS_IP>
```

Then open http://localhost:4200 in your browser.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `EDITOR_TOKEN` | Yes | — | Bearer token for all API routes |
| `PORT` | No | `4200` | Port to listen on |
| `ENV_PATHS_OVERRIDE` | No | `{}` | JSON map of container name → .env path |
| `WEBHOOK_SECRET` | No | — | GitHub webhook HMAC secret for auto-deploy |

Generate a token:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Auto-Deploy

On every push to `master`, GitHub sends a webhook to the VPS which runs `git pull + npm install + pm2 restart`.

Webhook URL: `https://n8n.dotai.online/webhook/deploy` (routed via Traefik)

## PM2 (Production)

```bash
pm2 start server/index.js --name env-editor
pm2 save
pm2 startup
```

## API

All routes require `Authorization: Bearer <EDITOR_TOKEN>`.

- `GET /api/containers` — list running containers with .env status
- `GET /api/containers/:id/env` — read .env vars from container
- `PUT /api/containers/:id/env` — write .env vars (auto-backup to .bak)
- `POST /api/containers/:id/restart` — restart container
