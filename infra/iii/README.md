# iii engine — Railway deploy

The iii engine is a Rust binary that workers connect to over WebSocket. Gaia runs it as a **separate Railway service** alongside the API. The API service points `III_URL` at the engine via Railway's private DNS — no public exposure.

## Engine ports

| Port  | Purpose                                                        | Probe               |
| ----- | -------------------------------------------------------------- | ------------------- |
| 3111  | HTTP API (HTTP triggers register here — no built-in `/health`) | `nc -zv host 3111`  |
| 3112  | Streams API                                                    | —                   |
| 49134 | Worker WebSocket — `gaia-api` connects here via `III_URL`      | `nc -zv host 49134` |
| 9464  | Prometheus metrics (`/metrics`)                                | scrape from Prom    |

> **Heads-up on health probes.** iii's engine exposes _functions_, not HTTP routes. There's no built-in `/health` URL. Railway uses TCP probes when `healthcheckPath` is unset — that's what `infra/iii/railway.toml` does. To get a real HTTP health probe, register an `http`-type trigger for `engine::health::check` in your worker, or write your own `health::check` function with `iii.registerTrigger({ type: 'http', config: { api_path: '/health', http_method: 'GET' } })`.

## One-time setup

1. **Create a new Railway service** in the same project as `gaia-api`.
   - Name: `iii` (it's referenced as `${{iii.RAILWAY_PRIVATE_DOMAIN}}` below).
   - Source: same GitHub repo as `gaia-api`.

2. **Service settings:**

   | Field           | Value                     |
   | --------------- | ------------------------- |
   | Root Directory  | _leave empty (repo root)_ |
   | Config Path     | `infra/iii/railway.toml`  |
   | Build Type      | Dockerfile                |
   | Dockerfile Path | `infra/iii/Dockerfile`    |

   The Dockerfile is a thin wrapper over the official upstream image (`iiidev/iii:latest`) — it inherits entrypoint, exposed ports, and the non-root UID 65532. We add Gaia's `iii-config.yaml` at `/app/config.yaml`. That's the entire delta.

3. **Attach a Volume** mounted at `/data` (Railway → service → Volumes → New Volume → Mount path: `/data`). The queue and state stores write here; without persistence, an engine restart drops in-flight jobs.

4. **Service variables** (Railway → service → Variables):

   ```
   III_VERSION=latest                 # pin to a release tag (e.g. 0.11.3) for reproducible builds
   ```

5. **Wire the API service** (`gaia-api`) to reach the engine. On `gaia-api`'s Variables tab:

   ```
   III_URL=ws://${{iii.RAILWAY_PRIVATE_DOMAIN}}:49134
   III_WORKER_NAME=gaia-api-worker
   ```

   Railway resolves `${{iii.RAILWAY_PRIVATE_DOMAIN}}` to `iii.railway.internal`. IPv6-only, never leaves the project's private network.

## Deploying

After the one-time setup, every push to the configured branch deploys both services. Order doesn't matter — the API worker reconnects automatically when the engine comes up.

```sh
git push origin main
```

Watch the engine logs first; then the API logs should print `workflows.registered { count: N }` once iii accepts the worker.

## Verifying

From a local machine with `railway` CLI installed:

```sh
railway logs --service iii          # engine boot + accepted workers
railway logs --service gaia-api     # workflows.registered + reconnect attempts (should stop)
```

Verify connectivity from the API container (Railway's internal DNS):

```sh
railway run --service gaia-api -- nc -zv ${{iii.RAILWAY_PRIVATE_DOMAIN}} 49134
```

A successful boot logs:

```
[engine]  iii v0.x.x — listening on :3111 (http) :3112 (streams) :49134 (workers)
[engine]  worker connected: gaia-api-worker
[api]     INFO  workflows.registered { count: N }
```

If the API keeps printing `[iii] Reconnecting in …`, check:

- The engine service is `Active` (not crash-looping at boot).
- `III_URL` in `gaia-api` resolves to the right service name.
- The volume is mounted at `/data` — the file-based queue/state stores need write access.

## Local development

`docker compose up -d` runs the engine alongside Postgres, with all four ports forwarded to localhost. Verify it's up with `nc -zv localhost 49134` (worker WS) or `nc -zv localhost 3111` (HTTP API).

For native development (no Docker):

```sh
curl -fsSL https://install.iii.dev/iii/main/install.sh | sh
iii --config iii-config.yaml      # runs in foreground; default config path is ./config.yaml
```

Binary lands at `~/.local/bin/iii`; override with `BIN_DIR=/usr/local/bin` if you want it on the system path.

## Why a separate service

- **Durability boundary.** The engine owns queue state; the API owns request handling. Restarting one doesn't drop the other's work.
- **Scaling axis.** API scales with HTTP load; the engine scales with queue throughput. Different vertical sizings.
- **Blast radius.** A bad deploy of the API doesn't affect in-flight workflows. A bad deploy of the engine doesn't drop user requests.

## Why no public exposure

The engine has no auth in alpha. Public-internet exposure = anyone can connect a worker and impersonate Gaia. Railway's private network keeps it scoped to the project. If you need a public dashboard, expose port 3111 behind a Caddy/Nginx with auth — never raw.

## Going beyond a single replica

The current setup is single-replica with file-based stores at `/data`. To run multiple engine instances:

1. Switch the queue + state adapters from `builtin` (file) → `redis` in `iii-config.yaml`.
2. Provision a Redis service on Railway (their built-in template works).
3. Set `REDIS_URL` on the engine service.
4. Bump `numReplicas` in `infra/iii/railway.toml`.

iii's deployment docs cover this — see `https://iii.dev/docs/advanced/deployment`.

## Cost note

The image is small (distroless, ~30 MB) and idle resident is light. Volume cost dominates — size for queue retention, not throughput. Railway's smallest service tier handles a Gaia-scale workload comfortably.
