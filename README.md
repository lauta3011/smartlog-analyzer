# SmartLog Analyzer

Prototype of an internal tool that receives logs from microservices, stores them in PostgreSQL and (eventually) analyzes them with an LLM. The only client is a CLI; there is no UI.

Current status: the API boots, validates its configuration and exposes a health check. Log ingestion and analysis endpoints are not implemented yet.

## Requirements

- Docker with Docker Compose (Docker Desktop includes both — check with `docker compose version`)
- Node.js 20.6+ (only for local development without Docker)

## Start the app

Start the API and its database together with one command, from the repository root:

```sh
docker compose up --build
```

That single command does everything:

1. Builds the API image from the `Dockerfile`.
2. Pulls and starts PostgreSQL 16 as the `db` service.
3. Waits until `db` passes its health check (`pg_isready`) before starting `api`.
4. Starts `api` with `NODE_ENV=production`, `PORT=3000` and a `DATABASE_URL` that points at `db:5432`.
5. Publishes the API on <http://localhost:3000> and the database on `localhost:5432`.

The first run takes longer because the image has to be built and the Postgres image downloaded. When the API is ready you will see:

```text
SmartLog Analyzer API listening on http://localhost:3000
```

Verify it from another terminal:

```sh
curl http://localhost:3000/api/health
# {"status":"ok","checks":{"database":"up"}}
```

Useful variations of the same command:

```sh
docker compose up --build -d      # run in the background
docker compose logs -f api        # follow API logs
docker compose ps                 # see status and health
docker compose down               # stop and remove the containers
docker compose down -v            # also delete the Postgres volume (all data)
```

Run `docker compose up --build` again after changing code: the source is copied into the image at build time, so there is no hot reload in the container.

### Configuration

Compose reads an optional `.env` file in the repository root. To customize ports or credentials:

```sh
cp .env.example .env
```

Then edit `.env` and start with the same `docker compose up --build`. Without a `.env`, the defaults below are used. `.env` is git-ignored and is not copied into the image; the API always receives `DATABASE_URL` from Compose.

| Variable            | Used by      | Default    | Description                                                                        |
| ------------------- | ------------ | ---------- | ---------------------------------------------------------------------------------- |
| `DATABASE_URL`      | API          | —          | Required by the API. Compose builds it from the `POSTGRES_*` values.               |
| `PORT`              | API          | `3000`     | Port the API listens on inside its container.                                      |
| `API_PORT`          | Compose      | `3000`     | Host port mapped to the API.                                                       |
| `POSTGRES_USER`     | Compose / DB | `smartlog` | Database user, interpolated into `DATABASE_URL`.                                   |
| `POSTGRES_PASSWORD` | Compose / DB | `smartlog` | Database password, interpolated into `DATABASE_URL`.                               |
| `POSTGRES_DB`       | Compose / DB | `smartlog` | Database name, interpolated into `DATABASE_URL`.                                   |
| `POSTGRES_PORT`     | Compose      | `5432`     | Host port mapped to PostgreSQL.                                                    |

## CLI

The CLI is a thin HTTP client. It runs on your machine, talks to the API over HTTP and never touches PostgreSQL. It is not part of the Compose stack.

Start the API first (`docker compose up -d --build`), then:

```sh
npm install
npm run cli -- health
# API: ok (database: up)

npm run cli -- health --json
# {"status":"ok","checks":{"database":"up"}}
```

`health` checks that the API is reachable and that it can reach its database. Exit code is `0` only when both are healthy; a `degraded` API, an unreachable API or an invalid response exits `1`.

The base URL defaults to `http://localhost:3000`. Override it with the `SMARTLOG_API_URL` environment variable or the `--api-url` flag (the flag wins):

```sh
npm run cli -- health --api-url http://localhost:8080
```

`--json` can be placed before or after the command. Data goes to stdout, errors to stderr, so the output can be piped.

Only `health` exists for now; `seed`, `list`, `analyze` and `show` will be added as separate commands.

## Troubleshooting

- **`Invalid API configuration: DATABASE_URL: ... undefined`** — the image was started on its own (`docker run` or Docker Desktop's "Run" button) instead of with Compose. A bare `docker run` does not read `docker-compose.yml` or `.env`, so `DATABASE_URL` is missing. Start the stack with `docker compose up --build`; do not run the `api` image directly.
- **Port already in use** — another process or an old stack is using 3000/5432. Set `API_PORT` / `POSTGRES_PORT` in `.env`, or stop the other stack with `docker compose down`.
- **Health returns `503` / API marked unhealthy** — the API cannot reach Postgres. Check `docker compose ps` and `docker compose logs db`.

## Local development

Run everything on the host instead of in Docker:

```sh
npm install
cp .env.example .env   # then adjust DATABASE_URL if needed
npm run dev            # tsx watch, loads .env automatically
```

The API expects PostgreSQL at the host in `DATABASE_URL` (`localhost:5432` by default). You can start only the database with Docker:

```sh
docker compose up -d db
```

Other scripts:

```sh
npm run build      # compile to dist/
npm start          # run dist/index.js (does NOT load .env; export the variables yourself)
npm test           # unit + integration tests
npm run typecheck  # type-check without emitting
```

## Future work

Not implemented yet: log ingestion (`POST /api/logs`), log listing, async LLM analysis, most CLI commands (`seed`, `list`, `analyze`, `show` — only `health` exists), and database migrations/seed data. Authentication, rate limiting, streaming and a UI are out of scope for this prototype.
