# Testing Strategy — env-editor

A small, focused operator tool. The pyramid is intentionally **inverted** — integration tests are the meat; unit tests are thin but valuable for security-critical code.

## Tools
- **Test runner:** Vitest (works with CommonJS — no `"type": "module"` needed)
- **Test location:** `server/__tests__/*.test.js`
- **Docker integration tests:** spin up a real disposable container (e.g. `nginx:alpine`) per test — *future work*, requires a Docker socket in CI which not all runners have

## Pyramid

### Unit (thin but covers the security-critical bits)
- **`server/auth.js`** — bearer-token middleware: missing header, wrong token, right token, Bearer prefix handling
- **`docker.js` helpers** — `getOverrides()`, `detectEnvPath()`, `parseEnv()` — pure functions, no Docker required to test
- **HMAC verification** (currently inline in `index.js`) — *extract to `server/hmac.js` first*, then test signature checking with known good + tampered payloads

### Integration (the meat — future work)
- **`/api/containers` (GET)** — against a real Docker socket, list running containers
- **`/api/containers/:id/env` (GET + PUT)** — round-trip an `.env` change against a disposable container; assert the file on disk matches
- **`/webhook/deploy`** — fire a synthetic GitHub push payload with valid + tampered HMAC signatures

### E2E
None. Manual smoke after deploy:
1. SSH tunnel + browser-load
2. Edit a non-critical container's `.env`
3. Restart the target container manually
4. Verify the change took effect

## Coverage targets
- v1: lines ≥ 50% (small codebase, easy)
- v2: 80% — every line matters because every line touches container fs

## Run locally
```bash
npm test           # unit (currently passing)
npm run test:watch # while developing
```

## "New feature = new tests" — CI gate
`.github/workflows/ci.yml` runs `scripts/check-tests-changed.sh` on PRs. Fails when files in `server/` change without a corresponding test-file change.

**Escape hatch:** `[skip-tests]` in any commit message on the branch.

## Priority scenarios to add first
1. **HMAC signature verification** — invalid signature returns 401; valid signature triggers deploy. Currently inline; extract to `server/hmac.js` to make testable.
2. **Auth bypass attempts** — missing header, wrong token, partial Bearer prefix, header with whitespace
3. **`.env` round-trip** — write + read back yields identical content; multi-line values, unicode, equals-signs in values
4. **`isAllowedStorageKey`-style path safety** — `docker.readEnv` / `writeEnv` should not allow `../` traversal in container paths
5. **GitHub webhook auto-deploy** — `git pull && npm install && pm2 restart env-editor` happens only with valid signature

## Note on integration tests
The real integration tests need a Docker daemon. Three options:
- **Local-only** — mark them `it.skip` in CI, run via `npm run test:integration` locally
- **Docker-in-Docker in CI** — works on GitHub Actions but heavier setup
- **`testcontainers`** library — orchestrates real containers; nice DX

For now, the CI workflow runs unit only.

## Notable: there's no E2E here, and that's fine
- 1 user (you)
- SSH tunnel access pattern
- The VPS firewall is the real security boundary (tested at the infrastructure layer, not in this repo)
