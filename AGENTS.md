# AGENTS.md

Instructions for AI agents and humans working on this repo. Keep this file short: details live in `ARCHITECTURE.md`, which is the source of truth for design decisions.

## Overview
SmartLog Analyzer is a prototype internal tool for a team with several microservices. Services send logs to a REST API, which validates, normalizes and stores them in PostgreSQL. An LLM analyzes a set of logs (selected with a filter) and returns a natural-language summary, categorized problems and suggested actions. The only client is a CLI. There is no UI.

## Scope
In scope:
- API: `POST /api/logs`, `GET /api/logs`, `POST /api/logs/analyze`, `GET /api/analysis/{id}`, `GET /api/health`.
- PostgreSQL schema, migrations, seed data and at least one aggregation query.
- LLM integration behind an interface (mock + real implementation), with results persisted.
- CLI as a thin HTTP client of the API: `ingest`, `list`, `analyze`, `show`.
- Dockerfile, `docker-compose.yml`, `.env.example`, tests, `README.md`, `ARCHITECTURE.md`.

Out of scope (do not build; mention in README as future work): UI, authentication, rate limiting, streaming (SSE/WebSockets), external queues (Redis, BullMQ, Kafka), free-form chat with the logs.

## Stack
- Node 20+, TypeScript (strict, no `any`). Code lives in `src/`.
- Production deps (only these): `express`, `pg`, `zod`, `commander`, `ora`, `cli-table3`.
- Dev deps: `typescript`, `tsx`, `vitest`, `supertest`, `@types/*`.
- No LLM SDK: the real provider is called with native `fetch`. No ORM, no migration library: migrations are plain SQL in `db/migrations`, run by our own script. Env vars are loaded with `--env-file`.
- Need another library? Stop and ask first.

## Structure
```
src/api/           routes, middleware, error handler
src/services/      business logic (logs, analysis)
src/repositories/  SQL access with pg
src/llm/           analyzer interface, mock, real provider
src/worker/        background runner for analyses
src/cli/           commands + apiClient (HTTP only)
src/config/        env parsing with zod
tests/             unit/ and integration/
db/                migrations/ and seeds/
docs/ai-log.md     log of AI proposals (accepted / rejected)
```

## Commands (keep in sync with package.json)
```
npm run dev          # API with tsx watch
npm test             # unit + integration
npm run migrate      # apply SQL migrations
npm run seed         # load sample logs
npm run cli -- list  # run the CLI
docker compose up    # app + db, no extra steps
```

## Decisions already made
- **Log contract (strict).** Required: `timestamp`, `level`, `service`, `message`. Optional: `trace_id`, `metadata` (jsonb). Extra top-level fields are moved into `metadata`.
- **Normalization.** Timestamp as ISO 8601 with timezone or epoch ms, stored in UTC. Level uppercased, aliases mapped (`warning` → `WARN`). Service lowercased and trimmed.
- **Rejected logs.** Missing timestamp, timestamp without timezone, or unknown level. A batch never fails as a whole: valid logs are stored and rejected ones are reported with `index` and reason.
- **Masking.** Emails, tokens, passwords and card numbers are masked before storing, in `message` and `metadata`.
- **Analysis is async.** `POST /api/logs/analyze` takes a filter (at least one criterion), creates the analysis as `pending` and returns `202` with an id. A background runner in the same process moves it through `running` to `completed` or `failed`. On startup, analyses left in `running` are marked `failed`. Each analysis stores its filter and a `cutoff` (`received_at`) so it is reproducible.
- **LLM.** Always used through the analyzer interface. The mock is the default; the real provider is selected by env. The response is validated with zod before saving. Timeouts and invalid responses become `failed` with an error code. Evidence log ids must belong to the analyzed set.
- **Errors.** One shape everywhere: `{ "error": { "code", "message", "details" } }`.
- **HTTP codes.** `POST /api/logs`: 201 (at least one stored) / 400 (all invalid or bad JSON) / 413 (batch too large). `POST /api/logs/analyze`: 202 / 400 / 422 (no logs match). `GET /api/analysis/{id}`: 200 (any status) / 404. `GET /api/health`: 200 / 503. Unexpected errors: 500 with a generic message.
- **CLI.** HTTP client only, never touches the database. Data to stdout, errors to stderr, `--json` for raw output, non-zero exit code on failure.

## Conventions
- Layers: routes → services → repositories. No SQL outside repositories, no business logic in routes.
- Validate every input and output at the boundary with zod. Queries are always parameterized.
- Config is parsed once from env in `src/config`.
- Never commit secrets. Only `.env.example` with placeholder values.

## Tests
- Every change ships with tests, including edge cases and failures, not only the happy path.
- Vitest + Supertest. Integration tests use a separate test database on the Postgres from docker compose.
- LLM tests use the mock and must cover: valid response, unexpected format, timeout.

## Before each edit
- Explain what you are going to do before implementing it.
- Keep each change small. Don't overbuild or refactor unrelated code.
- If something is ambiguous or needs a design decision, ask. Don't decide silently.

## Git and AI usage
- Small commits, one logical step each, imperative messages (`add logs migration`).
- When an AI proposal is relevant, add a line to `docs/ai-log.md`: what was proposed, accepted or rejected, and why. The README must summarize this.

## Open decisions (ask the human, then record in ARCHITECTURE.md)
- Max logs per analysis and what happens when exceeded (reject or sample).
- Max batch size and payload size limits.