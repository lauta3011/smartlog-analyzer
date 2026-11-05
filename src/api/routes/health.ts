import { Router } from "express";
import type { HealthService } from "../../services/health.service.js";

export function createHealthRouter(healthService: HealthService): Router {
  const router = Router();

  router.get("/health", async (_request, response) => {
    const result = await healthService.check();
    response.status(result.status === "ok" ? 200 : 503).json(result);
  });

  return router;
}
