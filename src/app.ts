import express, { type Express } from "express";
import { createHealthRouter } from "./api/routes/health.js";
import type { HealthService } from "./services/health.service.js";

export interface AppDependencies {
  healthService: HealthService;
}

export function createApp({ healthService }: AppDependencies): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use("/api", createHealthRouter(healthService));

  return app;
}
