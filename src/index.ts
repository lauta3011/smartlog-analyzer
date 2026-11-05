import { createApp } from "./app.js";
import { parseApiConfig, type ApiConfig } from "./config/api.js";
import { createDatabasePool } from "./repositories/database.js";
import { createHealthRepository } from "./repositories/health.repository.js";
import { createHealthService } from "./services/health.service.js";

function start(): void {
  let config: ApiConfig;

  try {
    config = parseApiConfig(process.env);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
    return;
  }

  const pool = createDatabasePool(config.databaseUrl);
  const healthService = createHealthService(createHealthRepository(pool));
  const app = createApp({ healthService });
  const server = app.listen(config.port, () => {
    process.stdout.write(`SmartLog Analyzer API listening on http://localhost:${config.port}\n`);
  });

  let shuttingDown = false;

  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    process.stdout.write(`${signal} received, shutting down\n`);

    server.close((serverError) => {
      void pool
        .end()
        .catch((poolError: unknown) => {
          console.error("[api] failed to close database pool", poolError);
        })
        .finally(() => {
          if (serverError) {
            console.error("[api] failed to close HTTP server", serverError);
            process.exitCode = 1;
          }
        });
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start();
